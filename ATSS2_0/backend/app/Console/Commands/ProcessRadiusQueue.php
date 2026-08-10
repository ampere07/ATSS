<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\RadiusQueueService;
use App\Support\RadiusRetryPolicy;

class ProcessRadiusQueue extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cron:process-radius-queue
                            {--batch= : Number of items to process per run (defaults to the configured batch size)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process pending RADIUS operations from the retry queue';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $batchSize = $this->option('batch') !== null
            ? (int) $this->option('batch')
            : RadiusRetryPolicy::batchSize();

        $this->info('[RADIUS QUEUE CRON] Starting queue processing...');
        $this->info('[RADIUS QUEUE CRON] Retry policy — max ' . RadiusRetryPolicy::maxAttempts()
            . ' attempts, delays: ' . RadiusRetryPolicy::describeSchedule());

        // Show current stats
        $stats = RadiusQueueService::getStats();
        $this->info("[RADIUS QUEUE CRON] Queue stats — Pending: {$stats['pending']}, Processing: {$stats['processing']}, Success: {$stats['success']}, Failed: {$stats['failed']}");

        // 'processing' rows may belong to a worker that was stopped mid-item, and
        // only processQueue() can return them to the queue — so a run still has
        // work to do when nothing is pending but something is stuck processing.
        if ($stats['pending'] === 0 && $stats['processing'] === 0) {
            $this->info('[RADIUS QUEUE CRON] No pending items. Exiting.');
            return 0;
        }

        // Process the queue
        $service = new RadiusQueueService();
        $results = $service->processQueue($batchSize);

        $this->info("[RADIUS QUEUE CRON] Results — Processed: {$results['processed']}, Succeeded: {$results['succeeded']}, Failed: {$results['failed']}, Skipped: {$results['skipped']}, Reclaimed: {$results['reclaimed']}");

        // Log to file
        \Illuminate\Support\Facades\Log::channel('radiusrelated')->info('[RADIUS QUEUE CRON] Run completed', $results);

        return 0;
    }
}
