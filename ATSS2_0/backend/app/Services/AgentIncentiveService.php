<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use App\Support\CronLog;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Throwable;

/**
 * AgentIncentiveService
 * ---------------------------------------------------------------------------
 * Cron logic that awards quota-based incentives to agents.
 *
 * For each agent it counts the agent's countable Job Orders that have not yet
 * been counted, and for every full multiple of the agent's quota it pays the
 * configured `incentives_value` ONCE:
 *
 *     incentive earned = number of completed quotas x incentives_value
 *
 * A quota of 10 with an incentive value of 100 earns 100 per completed quota.
 * Reaching the quota is what earns the incentive; the referrals inside it are
 * what it takes to get there, not separately paid units. (Commission is the
 * per-referral part of the scheme and is unaffected by this.)
 *
 * Each full quota cycle is a "batch". An agent with 20 completed Job Orders and
 * a quota of 10 is awarded 2 batches in one run (10 Job Orders tagged to each),
 * and batch numbers keep incrementing per agent across runs (batch 1, 2, 3, …).
 * Any remainder (< quota) carries over unprocessed to the next run.
 *
 * WHAT COUNTS AS A REFERRAL
 * ---------------------------------------------------------------------------
 * A Job Order counts when EITHER its onsite status is "Done" or "Completed", OR
 * its `pre_installed` column carries the pre-install marker AND it has not since
 * been abandoned. The second lets a referral earn quota progress once the site
 * has been pre-installed, without waiting for the technician to close the
 * install — the agent's part is done either way.
 *
 * The abandoned qualifier is what stops it paying for work that never landed: a
 * site pre-installed and then Failed or Cancelled counts for nothing, which is
 * how the rest of the scheme already treats it (commission needs the job order
 * approved; achievements and invoice lines need Done or Completed).
 *
 * Counting early does not risk counting twice: a Job Order consumed by a
 * completed quota is recorded in `agent_incentive_history`, and the
 * `whereNotExists` below can never see it again — so its later flip to "Done"
 * picks up nothing.
 *
 * PROGRESS IS NEVER RESET BY A RUN.
 * ---------------------------------------------------------------------------
 * A run does not "start a fresh count". It asks one question — which of this
 * agent's countable Job Orders are NOT yet in `agent_incentive_history` — and
 * that set only ever grows until a quota completes. So an agent on a quota of 5
 * who has Customer 1 and Customer 2 today still has both tomorrow, counted
 * toward the SAME quota, however many times the cron runs in between. Nothing
 * is discarded for want of a full quota; the run simply reports progress
 * (2/5) and awards nothing.
 *
 * When the quota does complete, the opposite applies and it applies
 * permanently: every Job Order that made up the completed quota is written to
 * `agent_incentive_history` inside the same transaction that pays it, tagged
 * with that cycle's `batch_number`. From that moment those customers are
 * consumed — the `whereNotExists` below can never see them again, so they
 * cannot be counted toward a second quota or paid a second time. Only
 * customers arriving afterwards count toward the next one.
 *
 * Only Job Orders onboarded on or after `config('agent.start_date')` are in
 * scope; anything earlier belongs to the period before the scheme and earns
 * nothing. Achievement progress uses the same date, so the two always agree
 * about which of an agent's referrals count.
 *
 * Idempotency / no-double-pay is guaranteed two ways:
 *   1. Only Job Orders absent from `agent_incentive_history` are counted.
 *   2. Every counted Job Order is recorded in `agent_incentive_history`, which
 *      has a UNIQUE key on `job_order_id` — so even concurrent runs cannot
 *      record (and therefore cannot pay for) the same Job Order twice.
 *
 * Job Order ↔ Agent association follows the project's existing convention
 * (see CommissionController): Job Orders are linked to an agent through the
 * related application's `referred_by` field.
 *
 * That field now holds the agent's user id for any referral made through the
 * "Referred By" picker — stored tagged, as `agent:37`, see App\Support\
 * AgentReferral. An id names exactly one account, so those referrals are immune
 * to the name collisions, renames and partial matches that the full-name
 * matching below could never resolve. No new column was needed: the same
 * varchar carries both forms.
 *
 * Older referrals are still free text — agent names, team names, and values
 * like "Walk in" — and are still matched by name, so both forms are queried
 * here and neither has to be migrated before the other works.
 */
class AgentIncentiveService
{
    private string $logName = 'Agent_Incentives';

    /** The two statuses that count as a successful finish. */
    private const SUCCESSFUL_ONSITE_STATUSES = ['done', 'completed'];

    /**
     * Onsite statuses that abandon a job order, so a pre-installation visit on
     * it earns nothing.
     *
     * Derived from JobOrder's own list of statuses that finish a job order for
     * good, less the two that finish it successfully — so adding a terminal
     * status to the model closes this hole for that status too, without anyone
     * having to remember this file.
     *
     * @return array<int, string>
     */
    private static function abandonedOnsiteStatuses(): array
    {
        return array_values(array_diff(
            \App\Models\JobOrder::TECHNICIAN_QUEUE_CLOSED_ONSITE_STATUSES,
            self::SUCCESSFUL_ONSITE_STATUSES
        ));
    }

    /**
     * The day the agent programme starts counting, or null to count everything.
     *
     * Shared with achievement progress, so a referral is either in scope for
     * both or for neither.
     */
    public static function startDate(): ?Carbon
    {
        return \App\Support\AgentProgramme::startDate();
    }

    /**
     * Process incentives for every agent.
     *
     * @return array Summary counters for the run.
     */
    public function process(): array
    {
        $summary = [
            'agents_processed'    => 0,
            'agents_awarded'      => 0,
            'incentive_awards'    => 0,   // total number of quota cycles awarded across all agents
            'amount_awarded'      => 0.0, // total currency awarded
            'job_orders_recorded' => 0,
            'skipped'             => 0,   // agents skipped (no user / not configured)
            'skipped_job_orders'  => 0,   // completed job orders skipped (already processed)
            // Job orders held as unfinished quota progress at the end of the
            // run. They are NOT lost — the next run counts them toward the same
            // quota — and this is the figure that proves it.
            'job_orders_carried'  => 0,
            'errors'              => 0,
        ];

        $this->writeLog("╔════════════════════════════════════════════════════════════════╗");
        $this->writeLog("║            AGENT QUOTA INCENTIVE PROCESSING START              ║");
        $this->writeLog("╚════════════════════════════════════════════════════════════════╝");
        $startTime = Carbon::now();
        $this->writeLog("Start Time: " . $startTime->format('Y-m-d H:i:s'));

        // One small query: every agent's incentive configuration.
        $balances = DB::table('agent_balance')->get();
        $total = $balances->count();
        $this->writeLog("[QUERY] Found {$total} agent balance record(s) to evaluate");
        $this->writeLog("─────────────────────────────────────────────────────────────────");

        $counter = 0;
        foreach ($balances as $balance) {
            $counter++;
            $summary['agents_processed']++;

            $this->writeLog("");
            $this->writeLog("[{$counter}/{$total}] ══════════════════════════════════════════════");

            try {
                $this->processAgent($balance, $summary, $counter, $total);
            } catch (Throwable $e) {
                // One agent's failure must never stop the rest of the run.
                $summary['errors']++;
                $this->writeLog("  [ERROR] Agent #{$balance->agent_id}: " . $e->getMessage());
                $this->writeLog("[{$counter}/{$total}] ✗ ERROR");
                Log::channel('single')->error("[{$this->logName}] Agent #{$balance->agent_id} failed: " . $e->getMessage(), [
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        $endTime = Carbon::now();
        $duration = $endTime->diffInSeconds($startTime);

        $this->writeLog("");
        $this->writeLog("╔════════════════════════════════════════════════════════════════╗");
        $this->writeLog("║            AGENT QUOTA INCENTIVE PROCESSING COMPLETE           ║");
        $this->writeLog("╚════════════════════════════════════════════════════════════════╝");
        $this->writeLog("Summary:");
        $this->writeLog("  • Agents Evaluated:    {$summary['agents_processed']}");
        $this->writeLog("  • Agents Awarded:      {$summary['agents_awarded']}");
        $this->writeLog("  • Incentive Cycles:    {$summary['incentive_awards']}");
        $this->writeLog("  • Amount Awarded:      " . number_format($summary['amount_awarded'], 2));
        $this->writeLog("  • Job Orders Recorded: {$summary['job_orders_recorded']}");
        $this->writeLog("  • Agents Skipped:      {$summary['skipped']}");
        $this->writeLog("  • Job Orders Skipped:  {$summary['skipped_job_orders']}");
        $this->writeLog("  • Job Orders Carried:  {$summary['job_orders_carried']} (unfinished quota progress kept for the next run)");
        $this->writeLog("  • Errors:              {$summary['errors']}");
        $this->writeLog("  • Duration:            {$duration} second(s)");
        $this->writeLog("End Time: " . $endTime->format('Y-m-d H:i:s'));
        $this->writeLog("");

        return $summary;
    }

    /**
     * Evaluate and (if the quota is reached) award incentives for a single agent.
     */
    private function processAgent(object $balance, array &$summary, int $counter = 0, int $total = 0): void
    {
        $agentId           = (int) $balance->agent_id;
        $quota             = (int) ($balance->quota ?? 0);
        $incentiveValue    = (float) ($balance->incentives_value ?? 0);
        $currentIncentives = (float) ($balance->incentives ?? 0);

        // Resolve the agent's name (job orders are matched by full name).
        $user = DB::table('users')->where('id', $agentId)->first();
        if (!$user) {
            $summary['skipped']++;
            $this->writeLog("  [SKIP] Agent #{$agentId}: no matching user record");
            $this->writeLog("[{$counter}/{$total}] ⊘ SKIPPED");
            return;
        }

        $agentName = $this->buildFullName($user);
        $this->writeLog("  [AGENT] {$agentName} (#{$agentId})");
        $this->writeLog("  [CONFIG] Quota: {$quota} | Incentive Value: " . number_format($incentiveValue, 2) . " | Current Incentives: " . number_format($currentIncentives, 2));

        // Nothing to do if the agent is not configured for incentives.
        if ($quota <= 0 || $incentiveValue <= 0) {
            $summary['skipped']++;
            $this->writeLog("  [SKIP] Quota or incentive value not configured — nothing to award");
            $this->writeLog("[{$counter}/{$total}] ⊘ SKIPPED");
            return;
        }

        $nameVariants = $this->nameVariants($user);

        // Referrals made through the agent picker are stored as the agent's user
        // id rather than their name, so the id is matched alongside the name
        // variants. Without it every referral made since the picker started
        // writing ids would earn this agent no quota progress at all — the value
        // holds none of the words the LIKEs below look for.
        $taggedId = \App\Support\AgentReferral::encode($user->id ?? null);

        if (empty($nameVariants) && $taggedId === null) {
            $summary['skipped']++;
            $this->writeLog("  [SKIP] Unable to build a name to match job orders");
            $this->writeLog("[{$counter}/{$total}] ⊘ SKIPPED");
            return;
        }
        $this->writeLog("  [MATCH] Matching job orders via referred_by: "
            . implode(' | ', array_filter(array_merge($nameVariants, [$taggedId]))));

        // Base query for this agent's countable job orders, matched by the
        // related application's referred_by — the agent's id where the referral
        // was made through the picker, their name where it is older free text.
        //
        // A job order counts when EITHER is true:
        //
        //   • its onsite status is "Done" — the install finished, or
        //   • it is marked pre-installed, whatever its onsite status says.
        //
        // The second is what lets a referral earn quota progress before the
        // install itself is finished: the agent's work of bringing the customer
        // in is done once the site has been pre-installed, and holding the
        // referral back until the technician closes the job order would delay a
        // payout the agent has already earned.
        //
        // Counting it early does NOT mean counting it twice. A job order taken
        // into a completed quota is written to agent_incentive_history in the
        // same transaction that pays it, and the whereNotExists below can never
        // see it again — so when the install later flips to "Done" it is not
        // picked up a second time. The UNIQUE key on job_order_id is the
        // backstop if two runs ever race for it.
        $completedBase = DB::table('job_orders')
            ->join('applications', 'job_orders.application_id', '=', 'applications.id')
            ->where(function ($q) {
                // "done" AND "completed", matching achievement progress
                // (CommissionController::onboardedReferralIds) and the weekly
                // invoice run (AgentInvoiceService::billableCustomers). This
                // clause used to accept "done" alone, so a job order closed as
                // "Completed" moved an agent's achievement count and was
                // billed, but earned no quota progress at all — three parts of
                // one scheme disagreeing about what "onboarded" means.
                $q->whereIn(DB::raw('LOWER(TRIM(job_orders.onsite_status))'), self::SUCCESSFUL_ONSITE_STATUSES)
                  // The pre-installation marker, which lets a referral earn
                  // quota progress before the technician closes the install —
                  // the agent's part is done once the site has been prepared.
                  //
                  // ...unless the job order has since been abandoned. The marker
                  // used to be an unqualified OR, so a site that was
                  // pre-installed and then FAILED still completed a quota and
                  // paid the incentive. Every other part of the scheme pays
                  // nothing for a failed job — commission needs approval,
                  // achievements and invoice lines need Done — so this was the
                  // one path that paid for a customer who never arrived.
                  //
                  // The abandoned list is derived from the model's own
                  // "finished for good" statuses so the two cannot drift.
                  ->orWhere(function ($p) {
                      $p->whereRaw('LOWER(TRIM(job_orders.pre_installed)) = ?', ['preinstalled'])
                        // COALESCE so a pre-installed job order with no status
                        // yet still counts; only an explicit failure excludes it.
                        ->whereNotIn(
                            DB::raw("LOWER(TRIM(COALESCE(job_orders.onsite_status, '')))"),
                            self::abandonedOnsiteStatuses()
                        );
                  });
            })
            ->where(function ($q) use ($nameVariants, $taggedId) {
                // Matched as a whole value, not a fragment: an id is exact, and
                // a LIKE on it would let "agent:3" also match "agent:37".
                if ($taggedId !== null) {
                    $q->orWhere('applications.referred_by', $taggedId);
                }
                foreach ($nameVariants as $variant) {
                    $q->orWhereRaw('LOWER(applications.referred_by) LIKE ?', ['%' . $variant . '%']);
                }
            });

        // Referrals onboarded before the programme began earn nothing. Applied
        // to the base query so they are neither awarded nor reported as skipped
        // — they are not part of this scheme at all.
        //
        // The installation date decides when a referral counts, falling back to
        // when the job order was raised, exactly as achievement progress decides
        // it — so an agent's incentive and their achievement count can never
        // disagree about which referrals are in scope.
        $startDate = self::startDate();
        if ($startDate !== null) {
            $completedBase->whereRaw(
                \App\Support\AgentProgramme::onboardedAtSql('job_orders') . ' >= ?',
                [$startDate->format('Y-m-d H:i:s')]
            );
            $this->writeLog("  [SCOPE] Counting referrals onboarded on or after {$startDate->format('Y-m-d')}");
        }

        // Total countable (for logging how many are skipped because already processed).
        $totalCompleted = (clone $completedBase)->count();

        // Only the countable job orders NOT yet recorded in history are available.
        //
        // Each carries the incentive value it was approved at. That snapshot is
        // what the award is built from, so an administrator raising the rate
        // tomorrow does not restate work already settled at the old one.
        $countable = (clone $completedBase)
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('agent_incentive_history as aih')
                    ->whereColumn('aih.job_order_id', 'job_orders.id');
            })
            ->orderBy('job_orders.id', 'asc')
            ->get(['job_orders.id', 'job_orders.incentive_value']);

        $jobOrderIds = [];
        // job order id => the rate it was approved at.
        $rateFor = [];

        foreach ($countable as $row) {
            $id = (int) $row->id;
            $jobOrderIds[] = $id;

            // A job order approved before the snapshot column existed has no
            // rate of its own; the agent's current one stands in, which is the
            // behaviour this cron had before snapshots were introduced.
            $rateFor[$id] = $row->incentive_value !== null && (float) $row->incentive_value > 0
                ? (float) $row->incentive_value
                : $incentiveValue;
        }

        $available        = count($jobOrderIds);
        $alreadyProcessed = max(0, $totalCompleted - $available);

        $this->writeLog("  [QUERY] Countable (done or pre-installed): {$totalCompleted} | Already processed (skipped): {$alreadyProcessed} | New & countable: {$available}");
        if ($alreadyProcessed > 0) {
            $summary['skipped_job_orders'] = ($summary['skipped_job_orders'] ?? 0) + $alreadyProcessed;
        }

        // How many full quota cycles can we award right now?
        $cycles = intdiv($available, $quota);

        if ($cycles < 1) {
            // Progress only — not enough to award yet.
            //
            // Nothing is written and nothing is discarded. These job orders stay
            // absent from agent_incentive_history, so the NEXT run finds exactly
            // the same ones plus whatever arrived since, and counts them all
            // toward this same quota. Naming them makes that checkable: the same
            // IDs should reappear in the next run's log.
            $summary['job_orders_carried'] += $available;

            $this->writeLog("  [PROGRESS] {$available}/{$quota} toward next incentive — quota not reached, no award");
            if ($available > 0) {
                $this->writeLog("  [CARRY] Kept for the next run (not reset): job order ID(s) " . implode(', ', $jobOrderIds));
            }
            $this->writeLog("[{$counter}/{$total}] ✓ DONE (no award)");
            return;
        }

        // Only the job orders that actually contribute to a full cycle are processed.
        // Any remainder stays unprocessed and carries over to the next run.
        $processCount  = $cycles * $quota;
        $idsToProcess  = array_slice($jobOrderIds, 0, $processCount);

        // Reaching the quota is what earns the incentive, so a completed cycle
        // pays the incentive value ONCE — not once per referral in it. A quota
        // of 10 at 100 earns 100 per completed quota, not 1,000.
        //
        // The rate applied is the one carried by the job order that COMPLETED
        // the cycle, so a batch pays what was in force at the moment the quota
        // was reached. Job orders are consumed oldest-first, so that is the
        // most recent referral in the batch.
        $awardForCycle = function (array $cycleIds) use ($rateFor): float {
            if (empty($cycleIds)) {
                return 0.0;
            }
            $completingId = end($cycleIds);
            return round((float) ($rateFor[$completingId] ?? 0.0), 2);
        };

        // Worked out per cycle up front: the same figures drive the log, the
        // ledger rows and the balance, so the three cannot drift apart.
        $cycleAwards = [];
        for ($c = 0; $c < $cycles; $c++) {
            $cycleAwards[$c] = $awardForCycle(array_slice($idsToProcess, $c * $quota, $quota));
        }

        $totalAward = round(array_sum($cycleAwards), 2);
        $awardStr      = number_format($totalAward, 2, '.', ''); // numeric-only, safe for raw SQL
        $now           = Carbon::now();
        $orgId         = $balance->organization_id ?? null;

        // Batches are numbered per-agent and keep incrementing across runs so the
        // history reads as batch 1, 2, 3, … over the agent's lifetime. Each full
        // quota cycle awarded in this run gets its own consecutive batch number.
        $lastBatch  = (int) DB::table('agent_incentive_history')
            ->where('agent_id', $agentId)
            ->max('batch_number');
        $startBatch = $lastBatch + 1;
        $endBatch   = $startBatch + $cycles - 1;

        $this->writeLog("  [CALC] Quota reached x{$cycles} → awarding " . number_format($totalAward, 2)
            . " (the incentive value once per completed quota of {$quota}, not once per job order)"
            . " — batch(es) {$startBatch}" . ($cycles > 1 ? "-{$endBatch}" : ""));

        // Per-cycle detail (auditable, mirrors AutoDisconnect's per-item logging).
        for ($c = 0; $c < $cycles; $c++) {
            $cycleIds     = array_slice($idsToProcess, $c * $quota, $quota);
            $batchNumber  = $startBatch + $c;
            $completingId = end($cycleIds);
            $this->writeLog("    [BATCH {$batchNumber}] (cycle " . ($c + 1) . "/{$cycles}) +" . number_format($cycleAwards[$c], 2)
                . " (quota of " . count($cycleIds) . " completed by job order #{$completingId})"
                . " for job order ID(s): " . implode(', ', $cycleIds));
        }

        $this->writeLog("  [DB] Recording {$processCount} job order(s) to agent_incentive_history and updating balance...");

        // All-or-nothing per agent: record the ledger rows and bump the balance
        // together. If the history insert collides (UNIQUE job_order_id) the whole
        // award rolls back, so a Job Order can never be paid without being recorded.
        DB::transaction(function () use ($idsToProcess, $quota, $cycleAwards, $orgId, $now, $balance, $awardStr, $startBatch) {
            $rows = [];
            foreach ($idsToProcess as $index => $jobOrderId) {
                // Every $quota job orders form one cycle → the next batch number.
                $cycleIndex  = intdiv($index, $quota);
                $batchNumber = $startBatch + $cycleIndex;

                // The award belongs to the cycle, not to each job order in it.
                // It is recorded against the job order that COMPLETED the cycle
                // — the one whose arrival earned it — and the rest of the batch
                // carries 0. Every job order is still recorded (that is what
                // stops it being counted twice), and summing the column over the
                // history reproduces the balance exactly.
                $completesCycle = (($index + 1) % $quota) === 0;

                $rows[] = [
                    'agent_id'        => (int) $balance->agent_id,
                    'job_order_id'    => $jobOrderId,
                    'quota_reached'   => $quota,
                    // (agent_id, batch_number) is what says "these customers
                    // are the ones that completed THIS quota" — the record the
                    // invoice run and any later audit read to tie a payout back
                    // to the customers that earned it.
                    'batch_number'    => $batchNumber,
                    'incentive_value' => $completesCycle ? ($cycleAwards[$cycleIndex] ?? 0.0) : 0.0,
                    'organization_id' => $orgId,
                    // When the quota was reached. The weekly invoice run bills
                    // by this, so it is what decides which invoice period a
                    // completed quota belongs to.
                    'processed_at'    => $now,
                    // agent_invoice_id / invoiced_at are left NULL: earned, not
                    // yet billed. The weekly run claims them exactly once.
                    'created_at'      => $now,
                    'updated_at'      => $now,
                ];
            }

            foreach (array_chunk($rows, 500) as $chunk) {
                DB::table('agent_incentive_history')->insert($chunk);
            }

            // COALESCE guards against a NULL incentives column and avoids a stale read.
            DB::table('agent_balance')
                ->where('id', $balance->id)
                ->update([
                    'incentives' => DB::raw("COALESCE(incentives, 0) + {$awardStr}"),
                    'updated_at' => $now,
                ]);
        });

        $newIncentives = $currentIncentives + $totalAward;

        $summary['agents_awarded']++;
        $summary['incentive_awards']    += $cycles;
        $summary['amount_awarded']      += $totalAward;
        $summary['job_orders_recorded'] += $processCount;

        $this->writeLog("  [DB] ✓ COMMIT SUCCESSFUL");
        $this->writeLog("  [AWARD] Incentives: " . number_format($currentIncentives, 2) . " → " . number_format($newIncentives, 2) . " (+" . number_format($totalAward, 2) . ")");
        if ($available > $processCount) {
            // The remainder that did not make up a full quota. Left unrecorded
            // on purpose, so it becomes the opening progress of the next quota
            // rather than being thrown away.
            $carried = array_slice($jobOrderIds, $processCount);
            $summary['job_orders_carried'] += count($carried);
            $this->writeLog("  [CARRY] " . count($carried) . " completed job order(s) carried over to next run (not reset): job order ID(s) " . implode(', ', $carried));
        }
        $this->writeLog("  [COMPLETE] {$agentName} (#{$agentId}) — awarded incentive x{$cycles}, recorded {$processCount} job order(s)");
        $this->writeLog("[{$counter}/{$total}] ✓ SUCCESS");
    }

    /**
     * Build all lowercased name variants used to match against applications.referred_by.
     * Mirrors the matching used by CommissionController for consistency.
     */
    private function nameVariants(object $user): array
    {
        $first  = trim((string) ($user->first_name ?? ''));
        $middle = trim((string) ($user->middle_initial ?? ''));
        $last   = trim((string) ($user->last_name ?? ''));

        $variants = [];

        // first last
        $simple = trim($first . ' ' . $last);
        if ($simple !== '') {
            $variants[] = strtolower($simple);
        }

        // first M. last  (matches the User::full_name accessor format)
        $full = trim($first . ' ' . ($middle !== '' ? $middle . '. ' : '') . $last);
        if ($full !== '') {
            $variants[] = strtolower($full);
        }

        return array_values(array_unique(array_filter($variants)));
    }

    /**
     * Human-readable full name for logging.
     */
    private function buildFullName(object $user): string
    {
        $first  = trim((string) ($user->first_name ?? ''));
        $middle = trim((string) ($user->middle_initial ?? ''));
        $last   = trim((string) ($user->last_name ?? ''));
        $name   = trim($first . ' ' . ($middle !== '' ? $middle . '. ' : '') . $last);

        return $name !== '' ? $name : ('Agent #' . ($user->id ?? '?'));
    }

    /**
     * Write to a dedicated log file (and mirror to the default log).
     */
    private function writeLog(string $message): void
    {
        // Errors and run summaries only - see App\Support\CronLog. This is a raw
        // file write, so LOG_LEVEL never reached it and the narration accumulated
        // no matter how the channels were configured.
        if (!CronLog::shouldWrite($message)) {
            return;
        }

        $timestamp = Carbon::now()->format('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] [{$this->logName}] {$message}";

        $logDir = storage_path('logs/agentincentives');
        $logFile = $logDir . '/agent_incentives.log';

        if (!file_exists($logDir)) {
            mkdir($logDir, 0755, true);
        }

        file_put_contents($logFile, $logMessage . PHP_EOL, FILE_APPEND);
        // Only faults are mirrored, and as ->error(). Every line used to be
        // duplicated into laravel.log at info level, which doubled the volume
        // and misreported the severity of all of it.
        if (CronLog::isError($message)) {
            Log::channel('single')->error("[{$this->logName}] {$message}");
        }
    }
}
