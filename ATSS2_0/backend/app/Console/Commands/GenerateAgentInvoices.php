<?php

namespace App\Console\Commands;

use App\Services\AgentInvoiceService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Weekly agent referral invoices.
 *
 * Runs every Monday at 00:00 (Asia/Manila) and bills the week that has just
 * ended — one invoice per team, one per agent who belongs to no team.
 *
 * Safe to run as often as you like. An owner already invoiced for the week is
 * skipped, and a customer already billed to that owner is refused by the
 * database, so a second run in the same morning creates nothing.
 *
 *     php artisan cron:generate-agent-invoices
 *
 * Options:
 *     --week=YYYY-MM-DD   bill the week containing this date instead of the last
 *     --agent=ID          only the owner this agent belongs to (a team or
 *                         themselves), for testing one case
 *     --dry-run           report what would be billed without writing anything
 */
class GenerateAgentInvoices extends Command
{
    protected $signature = 'cron:generate-agent-invoices
                            {--week= : Bill the week containing this date (YYYY-MM-DD)}
                            {--agent= : Only the owner this agent id belongs to}
                            {--dry-run : Report what would be billed without writing it}';

    protected $description = 'Generate the weekly referral invoice for every agent team and solo agent.';

    public function handle(AgentInvoiceService $service): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $weekOf = null;

        if ($week = $this->option('week')) {
            try {
                $weekOf = Carbon::parse($week);
            } catch (Throwable $e) {
                $this->error("[AGENT INVOICES] Could not read --week=\"{$week}\": " . $e->getMessage());
                return self::FAILURE;
            }
        }

        $agentId = $this->option('agent');
        $agentId = ($agentId === null || $agentId === '') ? null : (int) $agentId;

        $this->info('[AGENT INVOICES] Starting...' . ($dryRun ? ' (dry run)' : ''));

        if ($dryRun) {
            return $this->reportDryRun($service, $weekOf, $agentId);
        }

        try {
            $summary = $service->generateForWeek($weekOf, $agentId);
        } catch (Throwable $e) {
            $this->error('[AGENT INVOICES] Fatal error: ' . $e->getMessage());
            Log::channel('single')->error('[AGENT INVOICES] Fatal error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return self::FAILURE;
        }

        $this->info(sprintf(
            '[AGENT INVOICES] Week %s to %s — Owners: %d, Invoices: %d, Already invoiced: %d, Nothing to bill: %d, '
            . 'Customers: %d, Already billed: %d, Amount: %s, PDFs: %d (failed %d), Errors: %d',
            $summary['period_start'],
            $summary['period_end'],
            $summary['owners_evaluated'],
            $summary['invoices_created'],
            $summary['invoices_skipped'],
            $summary['owners_no_work'],
            $summary['customers_billed'],
            $summary['customers_skipped'],
            number_format($summary['amount_invoiced'], 2),
            $summary['pdfs_written'],
            $summary['pdf_failures'],
            $summary['errors']
        ));

        return $summary['errors'] > 0 ? self::FAILURE : self::SUCCESS;
    }

    /** List the owners that would be billed, writing nothing. */
    private function reportDryRun(AgentInvoiceService $service, ?Carbon $weekOf, ?int $agentId): int
    {
        try {
            $owners = $service->resolveOwners($agentId);
        } catch (Throwable $e) {
            $this->error('[AGENT INVOICES] Could not list agents: ' . $e->getMessage());
            return self::FAILURE;
        }

        $anchor = $weekOf ? $weekOf->copy() : Carbon::now()->subDay();
        $this->line(sprintf(
            '  week %s to %s',
            $anchor->copy()->startOfWeek()->format('Y-m-d'),
            $anchor->copy()->endOfWeek()->format('Y-m-d')
        ));

        foreach ($owners as $owner) {
            $this->line(sprintf(
                '  %-14s %s (%d agent(s))',
                $owner['type'],
                $owner['team_name'] ?? $owner['agent_name'],
                count($owner['members'])
            ));
        }

        $this->info('[AGENT INVOICES] Dry run — ' . count($owners) . ' owner(s) would be evaluated, nothing written.');

        return self::SUCCESS;
    }
}
