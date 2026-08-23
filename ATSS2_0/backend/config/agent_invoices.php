<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Weekly agent referral invoices
    |--------------------------------------------------------------------------
    */

    // Prefix for the invoice number: ATSS-AGT-000001.
    'number_prefix' => env('AGENT_INVOICE_PREFIX', 'ATSS-AGT'),

    // How many digits the running number is padded to.
    'number_padding' => 6,

    /*
    | The fallback rate shown as UNIT PRICE when it cannot be derived.
    |
    | It is only ever a DISPLAY figure now, and it does NOT drive any total.
    | The invoice states the rate one completed quota was worth, and that is
    | read back from the incentives the cron actually awarded, so the printed
    | rate always agrees with the printed total even after an administrator
    | changes the setting.
    |
    | This value stands in only where no rate can be derived — a week with no
    | incentive at all, or a team whose members earned at different rates, where
    | no single figure is the truth. It then falls back to the agent's own
    | configured `agent_balance.incentives_value` before reaching this.
    */
    'unit_price' => env('AGENT_INVOICE_UNIT_PRICE', 100),

    /*
    | The installation fee stated on the invoice. It is not derivable from a
    | referral count — the reference document states it rather than calculating
    | it — and it does not form part of what is owed.
    |
    | COMMISSION is NOT configured here. It is earned per referral at the rate
    | on the referring agent's own record (agent_balance.commission), so the
    | invoice total is the sum across its customers. A team on one rate bills
    | customers x rate; a team on mixed rates bills each customer at theirs.
    |
    | TOTAL AMOUNT is the incentive, and it is NOT configured or calculated
    | anywhere in the invoice run either. It is read from the completed quotas
    | the incentive cron awarded inside the invoice's own billing week
    | (agent_incentive_history), and each one is billed exactly once. Whether a
    | quota was reached is the cron's decision to make, because only it can see
    | progress accumulating across weeks.
    |
    | SUBTOTAL is TOTAL AMOUNT + COMMISSION.
    */
    'installation_fee' => env('AGENT_INVOICE_INSTALLATION_FEE', 500),

    // Where the generated PDFs live, under storage/app/public.
    'pdf_folder' => 'agent-invoices',

    /*
    | How many referred customers the first page of the PDF carries.
    |
    | Page one gives most of its height to the header artwork and the banner, so
    | it holds fewer rows than the pages after it. Left to itself Dompdf fills
    | page one to the paper's edge and then finds the totals block will not fit
    | — and that block cannot be split — so it moves the whole thing to page two
    | and leaves a hand's depth of white space behind.
    |
    | Capping page one is what avoids that: the rows that would have caused the
    | overflow start page two instead, and the totals follow them.
    */
    'first_page_rows' => env('AGENT_INVOICE_FIRST_PAGE_ROWS', 10),

    /*
    | How many rows each page after the first carries.
    |
    | Those pages have no header artwork, so they fit more.
    */
    'rows_per_page' => env('AGENT_INVOICE_ROWS_PER_PAGE', 18),

    /*
    | Only referrals installed on or after the agent programme start date are
    | ever billed. Shared with incentives and achievements so all three agree
    | about which referrals count — see config/agent.php.
    */

    // How many agents/teams to hold in memory at once during a run.
    'chunk_size' => 200,

];
