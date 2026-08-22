<?php

return [

    /*
    |--------------------------------------------------------------------------
    | RADIUS estate topology
    |--------------------------------------------------------------------------
    |
    | Which of the configured radius_config records this deployment expects to be
    | answering.
    |
    |   'primary' - radius_config #1 carries the estate and the records after it
    |               are failover targets that are normally dark. They are still
    |               searched for an account and still merged into a session sweep
    |               when they answer, but one being unreachable is the steady
    |               state and is not reported as an outage.
    |   'all'     - every record is a live production server and silence from any
    |               of them is a real fault.
    |
    | Only the servers this names as live decide whether a session sweep
    | succeeded - see RadiusServerResolver::activeConfigs(). The class constant
    | DEFAULT_TOPOLOGY is the fallback when this key is absent.
    */
    'topology' => env('RADIUS_TOPOLOGY', 'primary'),

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

    /*
    |--------------------------------------------------------------------------
    | RADIUS status sync
    |--------------------------------------------------------------------------
    |
    | Settings for the status sync (RadiusStatusSyncService) that mirrors User
    | Manager users and sessions into the online_status table.
    |
    | The sync reads each RADIUS server in bulk — two requests per server, never
    | one per subscriber — and then applies the result to the local database
    | BATCH BY BATCH, so peak memory, transaction length and lock footprint stay
    | flat no matter how many accounts exist. Everything the batching needs is
    | declared here; nothing is hardcoded in the service.
    |
    */
    'status_sync' => [

        /*
        | Accounts applied to online_status per batch. A batch is read, compared
        | and written before the next one is read, so the whole account table is
        | never in memory at once and no single transaction spans the run.
        |
        | Larger  = fewer round trips, but more memory and longer row locks.
        | Smaller = gentler on the database, but more round trips.
        | 500 suits MySQL well; lower it if the sync competes with heavy
        | interactive traffic, raise it on a well-resourced server.
        */
        'batch_size' => (int) env('RADIUS_STATUS_SYNC_BATCH_SIZE', 500),

        /*
        | Rows per statement while seeding online_status with accounts that do
        | not have a row yet (the INSERT IGNORE step). Kept separate from
        | batch_size because that step is one set-based insert per window and
        | can afford a longer stride than the per-account comparison pass.
        */
        'seed_batch_size' => (int) env('RADIUS_STATUS_SYNC_SEED_BATCH_SIZE', 2000),

        /*
        | Optional breather between batches, in milliseconds. 0 = run flat out.
        | Set this when the sync should yield database headroom to interactive
        | traffic: it lengthens the run in exchange for a lighter footprint.
        */
        'batch_pause_ms' => (int) env('RADIUS_STATUS_SYNC_BATCH_PAUSE_MS', 0),

        /*
        | Skip the UPDATE when every synced column already holds the value the
        | sync is about to write. Most subscribers do not change state between
        | two-minute runs, so this removes the bulk of the write load, the row
        | locks and the replication traffic. The only visible difference is that
        | online_status.updated_at stops advancing on a run where nothing about
        | the account changed. Set to false to write on every pass.
        */
        'skip_unchanged' => (bool) env('RADIUS_STATUS_SYNC_SKIP_UNCHANGED', true),

        /*
        | How long the merged RADIUS user list may be reused before it is fetched
        | again, in MINUTES. 0 = fetch it every run (the original behaviour).
        |
        | The sync makes two bulk requests per server: the SESSION list, which is
        | what changes from minute to minute, and the USER list, which only says
        | which group each subscriber is in. The user list is the big one, and on
        | a settled estate it is identical run after run — so re-pulling it every
        | few minutes makes RouterOS serialise its whole subscriber table for
        | nothing. Setting this lets sessions stay live while the heavy list is
        | fetched on a slower beat.
        |
        | The trade: a group change made directly on the router (not through this
        | app) can take up to this long to appear in online_status. Changes made
        | through the app are not affected in practice, because the app writes the
        | group itself. Run `cron:sync-radius-status --refresh-users` to force an
        | immediate re-fetch.
        |
        | Only a COMPLETE snapshot is cached: if any server was unreachable, the
        | partial result is used for that run and thrown away, so one bad run
        | cannot leave stale "Not Found" statuses standing.
        */
        'user_cache_minutes' => (int) env('RADIUS_STATUS_SYNC_USER_CACHE_MINUTES', 0),
        /*
        | Per-request timeouts, in seconds, for the User Manager calls. The
        | request timeout has to cover RouterOS serialising an entire user or
        | session list, so the figure grows with the size of the estate — raise
        | it if the larger servers start timing out.
        */
        'connect_timeout' => (int) env('RADIUS_STATUS_SYNC_CONNECT_TIMEOUT', 3),
        'request_timeout' => (int) env('RADIUS_STATUS_SYNC_REQUEST_TIMEOUT', 15),
    ],

    /*
    |--------------------------------------------------------------------------
    | RADIUS circuit breaker
    |--------------------------------------------------------------------------
    |
    | Stops the app from queueing up connection attempts against a RADIUS server
    | that is not answering.
    |
    | Without this, every operation independently rediscovers that a server is
    | down, and pays a full connect timeout to find out. One queue run of 20
    | items, each trying two servers over two protocols, spends several minutes
    | opening sockets that were never going to connect — which is exactly what
    | keeps a struggling RouterOS too busy to accept the connections that would
    | have worked.
    |
    | With it, the first few failures are enough: the endpoint is marked down and
    | every later call skips it outright, with no socket and no timeout, until the
    | cool-off expires and one call is allowed through to see if it is back.
    |
    | Tracking is per BASE URL (scheme + host + port), so http://x and https://x
    | are judged separately. That also means a wrong ssl_type in radius_config
    | costs a couple of failures once, instead of a wasted connect timeout on
    | every single call forever.
    |
    */
    'circuit_breaker' => [

        /*
        | Master switch. Turn off to restore the old behaviour of always
        | attempting every endpoint.
        */
        'enabled' => (bool) env('RADIUS_CIRCUIT_BREAKER_ENABLED', true),

        /*
        | Connection failures against one endpoint, within failure_window_seconds,
        | before it is treated as down. Only connection-level failures count —
        | timeouts and refused connections. Any HTTP answer at all, even a 404,
        | proves the endpoint is alive and clears the count.
        */
        'failure_threshold' => (int) env('RADIUS_CIRCUIT_BREAKER_THRESHOLD', 5),

        /*
        | How long failures are remembered while counting toward the threshold.
        | Occasional failures spread wider apart than this never trip it.
        */
        'failure_window_seconds' => (int) env('RADIUS_CIRCUIT_BREAKER_WINDOW', 120),

        /*
        | How long an endpoint stays skipped once it has been marked down. Keep
        | it short: this is how long a recovered server waits to be noticed.
        */
        'cooldown_seconds' => (int) env('RADIUS_CIRCUIT_BREAKER_COOLDOWN', 60),
    ],

];
