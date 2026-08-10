<?php

return [

    /*
    |--------------------------------------------------------------------------
    | RADIUS operation queue
    |--------------------------------------------------------------------------
    |
    | Settings for the retry queue that re-applies RADIUS operations which could
    | not be completed at the time they were requested. Everything the retry
    | mechanism needs is declared here — nothing is hardcoded in the service —
    | so the schedule can be tuned without touching the processing logic.
    |
    */
    'queue' => [

        /*
        | How many times a single queued operation may be attempted in total,
        | counting the first attempt. Once this many attempts have failed the
        | job is marked permanently failed and is never retried automatically.
        */
        'max_attempts' => (int) env('RADIUS_QUEUE_MAX_ATTEMPTS', 10),

        /*
        | Progressive retry schedule, in MINUTES.
        |
        | Index 0 is the wait after the 1st attempt fails, index 1 the wait after
        | the 2nd, and so on. With the default 10 max attempts there are 9 waits,
        | the last one being before the 10th and final attempt:
        |
        |   attempt 1 fails -> wait 15m -> attempt 2
        |   attempt 2 fails -> wait 25m -> attempt 3
        |   attempt 3 fails -> wait 35m -> attempt 4   ... and so on
        |
        | To change the pacing, edit this list. It does not have to be the same
        | length as max_attempts: if it runs out, the last value is reused for
        | every remaining attempt.
        */
        'retry_delays' => [15, 25, 35, 45, 55, 65, 75, 85, 95],

        /*
        | Guard against the same operation being queued twice while an earlier
        | copy is still waiting. A retry never inserts a new row — it updates the
        | existing one — so this only affects callers queueing the same
        | source/operation again before the first copy has finished.
        */
        'prevent_duplicates' => (bool) env('RADIUS_QUEUE_PREVENT_DUPLICATES', true),

        /*
        | A worker that is killed mid-item leaves that row marked 'processing'.
        | Any row that has been 'processing' for longer than this many minutes is
        | assumed to belong to a dead worker and is returned to the queue, so a
        | restart cannot strand a job. Must comfortably exceed the longest time a
        | single operation can legitimately take.
        */
        'stale_processing_minutes' => (int) env('RADIUS_QUEUE_STALE_MINUTES', 15),

        /*
        | Default number of items processed per run of the queue command.
        */
        'batch_size' => (int) env('RADIUS_QUEUE_BATCH_SIZE', 20),
    ],

];
