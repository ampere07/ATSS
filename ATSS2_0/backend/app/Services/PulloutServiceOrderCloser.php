<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Closes a customer's open pullout service orders once their balance is settled.
 *
 * A pullout is raised to recover equipment from an account in arrears. When that
 * account pays up, the pullout is void — so it is marked Failed, on both the
 * support and the visit status, with a remark saying why.
 *
 * ── Why this class exists ───────────────────────────────────────────────────
 *
 * The rule previously lived twice, privately, in PaymentWorkerService and in
 * TransactionController, and both copies selected on
 *
 *     support_status IN ('in progress', 'reschedule')
 *
 * which matched nothing. On pullout service orders that column only ever holds
 * 'For Visit', 'Failed' or 'Resolved' — 'In Progress' and 'Reschedule' are
 * visit_status values. The rule had therefore never once fired, against 1,830
 * genuinely open pullouts.
 *
 * Both copies were also reached only from inside the RADIUS reconnect routine,
 * below four early returns — `already_online`, `no_username`, `no_plan` — so
 * even with the right filter, a customer who paid before being cut off (the
 * common case) would have been skipped. Closing a pullout has nothing to do
 * with whether RADIUS needed touching, so it no longer hangs off it.
 *
 * ── What it selects ─────────────────────────────────────────────────────────
 *
 * Every service order for the account whose concern is "pullout" or "for
 * pullout", in any state EXCEPT:
 *
 *   • support_status = Resolved — the pullout was carried out. Rewriting that to
 *     Failed would erase a completed job, so those are left alone.
 *   • already Failed on both columns — nothing to do, and rewriting would move
 *     updated_at on every later payment.
 *
 * Rows part-way there (support Failed, visit still In Progress or blank) ARE
 * updated, so the two columns end up agreeing.
 */
final class PulloutServiceOrderCloser
{
    /** The concern values that mark a service order as a pullout. */
    private const CONCERNS = ['pullout', 'for pullout'];

    /**
     * How close to zero counts as settled.
     *
     * A cent of rounding residue should not keep a pullout open, and a credit
     * balance is negative, so the test is "at or below this".
     */
    private const SETTLED_EPSILON = 0.01;

    /** Left on the record so the close-out is self-explaining in the UI. */
    private const REMARK = 'auto failed due to client reconnected';

    /**
     * Close the account's open pullouts if its balance is settled.
     *
     * @param  string      $accountNo      the billing account number
     * @param  float|null  $knownBalance   the balance if the caller already read
     *                                     it, saving a query; re-read when null
     * @param  string      $trigger        what prompted this, for the log
     *
     * @return array{closed:int, ids:array<int>, skipped:?string}
     */
    public function closeIfSettled(string $accountNo, ?float $knownBalance = null, string $trigger = 'payment'): array
    {
        $result = ['closed' => 0, 'ids' => [], 'skipped' => null];

        $this->log("[RUNNING] Pullout check for account: {$accountNo} (trigger: {$trigger})");

        try {
            $balance = $knownBalance ?? $this->balanceFor($accountNo);

            if ($balance === null) {
                $result['skipped'] = 'no billing account';
                $this->log("[SKIP] No billing account found for: {$accountNo}");

                return $result;
            }

            if ($balance > self::SETTLED_EPSILON) {
                $result['skipped'] = 'balance positive';
                $this->log('[SKIP] Balance still positive (₱' . number_format($balance, 2) . ") - account: {$accountNo}");

                return $result;
            }

            $ids = $this->openPulloutIds($accountNo);

            if ($ids === []) {
                $result['skipped'] = 'nothing open';
                $this->log("[SKIP] No open pullout service orders for account: {$accountNo}");

                return $result;
            }

            $this->log('[FOUND] ' . count($ids) . " open pullout service order(s) for account: {$accountNo} (IDs: " . implode(', ', $ids) . ')');

            $closed = DB::table('service_orders')
                ->whereIn('id', $ids)
                ->update([
                    'support_status'  => 'Failed',
                    'visit_status'    => 'Failed',
                    'support_remarks' => self::REMARK,
                    'updated_by_user' => 'System',
                    'updated_at'      => now(),
                ]);

            $result['closed'] = $closed;
            $result['ids']    = $ids;

            $this->log("[SUCCESS] Marked {$closed} pullout service order(s) Failed - account: {$accountNo} (IDs: " . implode(', ', $ids) . ')');
        } catch (Throwable $e) {
            $result['skipped'] = 'error';
            $this->log("[FAILED] Account: {$accountNo} - Error: " . $e->getMessage());
        }

        $this->log("[DONE] Pullout check for account: {$accountNo}");

        return $result;
    }

    /** The account's balance, or null when there is no such account. */
    private function balanceFor(string $accountNo): ?float
    {
        $value = DB::table('billing_accounts')
            ->where('account_no', $accountNo)
            ->value('account_balance');

        return $value === null ? null : (float) $value;
    }

    /**
     * The ids of this account's pullouts that are still worth closing.
     *
     * @return array<int>
     */
    private function openPulloutIds(string $accountNo): array
    {
        return DB::table('service_orders')
            ->where('account_no', $accountNo)
            ->whereIn(DB::raw('LOWER(TRIM(concern))'), self::CONCERNS)
            // A completed pullout stays completed.
            ->whereRaw("LOWER(TRIM(COALESCE(support_status, ''))) <> 'resolved'")
            // Already Failed on both columns: nothing to change.
            ->whereRaw(
                "NOT (LOWER(TRIM(COALESCE(support_status, ''))) = 'failed'
                  AND LOWER(TRIM(COALESCE(visit_status, ''))) = 'failed')"
            )
            ->orderBy('id')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * Write to the dedicated pullout log, and mirror to Laravel's.
     *
     * Same file and same [SO Failing Auto] tag the two private copies used, so
     * existing log searches keep working. Never allowed to throw: logging must
     * not be able to break a payment.
     */
    private function log(string $message): void
    {
        $line = '[' . now()->format('Y-m-d H:i:s') . "] [SO Failing Auto] {$message}";

        try {
            file_put_contents(storage_path('logs/sofailingauto.log'), $line . PHP_EOL, FILE_APPEND);
        } catch (Throwable $e) {
            // Never fatal.
        }

        try {
            Log::channel('single')->info('[SO Failing Auto] ' . $message);
        } catch (Throwable $e) {
            // Never fatal.
        }
    }
}
