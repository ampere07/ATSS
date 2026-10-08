{{-- One invoice: the header artwork, the banner, the customer table, the
     totals and the sign-off.

     Rendered once for a single-invoice PDF and once per invoice for a bundle,
     so an invoice reads identically either way.

     The page number and the footer are NOT here. Both are position:fixed, which
     Dompdf repeats on every page of the document — declaring them per invoice
     would draw a bundle's copies on top of each other. They belong to the
     document, and each document template carries one.

     Expects: $invoice, $customerPages, $showReferrer, $peso, $invoiceDateLabel,
              $billedToLabel, $periodLabel, $allowanceLines, $allowanceCoverageLabel,
              $headerImage --}}
{{-- Header artwork: the ATSS FIBER mark and watermark, full page width. --}}
@if ($headerImage)
    <img class="header-art" src="{{ $headerImage }}" alt="">
@endif

<div class="sheet">

    @unless ($headerImage)
        {{-- Artwork missing: the invoice still has to be a usable document. --}}
        <div class="brand-fallback"><span class="name">ATSS FIBER</span></div>
    @endunless

    <div class="banner">BOOTH - REFERRAL</div>

    <table class="meta">
        <tr>
            <td class="date">{{ $invoiceDateLabel }}</td>
            <td class="billed">{{ $billedToLabel }}</td>
            <td class="spacer"></td>
        </tr>
    </table>

    {{-- Itemised customers --}}
    {{-- One table per page, with the break placed deliberately between them.

         Left to itself Dompdf fills page one to the paper's edge, then finds
         the totals block will not fit; the block cannot be split, so the whole
         thing moves to page two and page one is left with a hand's depth of
         white space. Deciding the split here keeps the rows and the totals
         together on the last page.

         An invoice whose rows fit on one page is a single chunk and renders
         exactly as it always did. --}}
    @forelse ($customerPages as $pageIndex => $pageRows)
        @if ($pageIndex > 0)
            <div class="page-break"></div>
        @endif

        <table class="items">
            <thead>
            <tr>
                <th class="desc">DESCRIPTION</th>
                <th style="width: 24%;">UNIT PRICE</th>
                <th style="width: 16%;">QTY</th>
                <th style="width: 20%;">TOTAL</th>
            </tr>
            </thead>
            <tbody>
            @foreach ($pageRows as $customer)
                <tr>
                    <td class="desc">
                        {{ $customer['customer_name'] }}
                        @if ($showReferrer && !empty($customer['referred_by_name']))
                            <span class="by">referred by {{ $customer['referred_by_name'] }}</span>
                        @endif
                    </td>
                    <td>{{ $peso }} {{ number_format((float) $customer['unit_price'], 0) }}</td>
                    <td>{{ (int) $customer['quantity'] }}</td>
                    <td>{{ $peso }} {{ number_format((float) $customer['total'], 0) }}</td>
                </tr>
            @endforeach
            </tbody>
        </table>
    @empty
        <table class="items">
            <thead>
            <tr>
                <th class="desc">DESCRIPTION</th>
                <th style="width: 24%;">UNIT PRICE</th>
                <th style="width: 16%;">QTY</th>
                <th style="width: 20%;">TOTAL</th>
            </tr>
            </thead>
            <tbody>
            <tr>
                <td class="desc" colspan="4" style="color:#6b7280;">No referred customers for this period.</td>
            </tr>
            </tbody>
        </table>
    @endforelse

    {{-- Totals, sitting under the right-hand half of the table --}}
    {{-- Two rows, not two columns: the totals sit alone on the first, and the
         signature and sign-off share the second. Putting them in one row is
         what keeps them level — matching offsets by hand would drift the
         moment the totals block gained or lost a line. --}}
    <table class="totals-wrap">
        <tr>
            <td style="width: 52%;"></td>
            <td style="width: 48%;">
                <table class="totals">
                    {{-- Laid out as a sum the reader can follow:
                         TOTAL CLIENT INSTALLED x COMMISSION = TOTAL AMOUNT,
                         then the allowance and incentive added on top to give
                         the SUBTOTAL.

                         TOTAL AMOUNT is the stored `commission` column — the
                         customer table's TOTAL column added up. The per-client
                         COMMISSION is `unit_price`. On a mixed-rate team no one
                         rate multiplies out to that total, so the rate reads
                         VARIES rather than printing a sum that does not add up.

                         INCENTIVE is the completed-quota payout, held in the
                         stored `total_amount` column. The two column names read
                         the other way round to these labels, which is a naming
                         accident on the table rather than a swap: `commission`
                         has always been the per-referral sum and `total_amount`
                         has always been the incentive. --}}
                    @php
                        $clients     = (int) $invoice->total_customers;
                        $rate        = (float) $invoice->unit_price;
                        $referrals   = (float) $invoice->commission;
                        $rateIsExact = abs($clients * $rate - $referrals) < 0.005;
                        $allowance   = (float) ($invoice->allowance ?? 0);
                        // Set only on invoices given an allowance coverage by
                        // hand; they print the allowance after the incentive.
                        $coverage    = $allowanceCoverageLabel ?? null;
                        // The standing allowances the invoice pays, each with
                        // its period and coverage. Whatever the invoice's
                        // allowance holds beyond them was entered on a payout
                        // when it was approved, and keeps its old line.
                        $allowanceLines = $allowanceLines ?? [];
                        $otherAllowance = max(0, round($allowance - array_sum(array_column($allowanceLines, 'amount')), 2));
                    @endphp
                    <tr>
                        <td>TOTAL CLIENT INSTALLED</td>
                        <td class="value">{{ $clients }}</td>
                    </tr>
                    <tr>
                        <td>x COMMISSION</td>
                        <td class="value">
                            @if ($rateIsExact)
                                {{ $peso }} {{ number_format($rate, 2) }}
                            @else
                                VARIES
                            @endif
                        </td>
                    </tr>
                    <tr class="computed">
                        <td>= TOTAL AMOUNT</td>
                        <td class="value">{{ $peso }} {{ number_format($referrals, 2) }}</td>
                    </tr>
                    @if ($otherAllowance > 0 && !$coverage)
                        <tr>
                            <td>+ ALLOWANCE</td>
                            <td class="value">{{ $peso }} {{ number_format($otherAllowance, 2) }}</td>
                        </tr>
                    @endif
                    <tr>
                        <td>+ INCENTIVE</td>
                        <td class="value">{{ $peso }} {{ number_format((float) $invoice->total_amount, 2) }}</td>
                    </tr>
                    {{-- Allowance lines appear only when there is an allowance to
                         pay: an agent with no allowance value gets no line and
                         no coverage, rather than a zero. --}}
                    @foreach ($allowanceLines as $line)
                        @if ($line['amount'] > 0)
                            <tr>
                                <td>+ ALLOWANCE<span class="coverage">{{ $line['detail'] }}</span></td>
                                <td class="value">{{ $peso }} {{ number_format($line['amount'], 2) }}</td>
                            </tr>
                        @endif
                    @endforeach
                    @if ($coverage && $allowanceLines === [] && $otherAllowance > 0)
                        <tr>
                            <td>+ ALLOWANCE<span class="coverage">{{ $coverage }}</span></td>
                            <td class="value">{{ $peso }} {{ number_format($otherAllowance, 2) }}</td>
                        </tr>
                    @endif
                    <tr class="grand">
                        <td>SUBTOTAL</td>
                        <td class="value">{{ $peso }} {{ number_format((float) $invoice->subtotal, 2) }}</td>
                    </tr>
                </table>
            </td>
        </tr>
        {{-- Both cells bottom-aligned, so the rule and the sign-off finish on
             the same line without either being nudged by hand. --}}
        <tr class="sign-off">
            <td>
                <div class="signature">SIGNATURE:</div>
                <div class="signature-line"></div>
            </td>
            <td>
                <div class="thanks">Thank you!</div>
            </td>
        </tr>
    </table>

    {{-- Pre-installation reference.
         Printed only when there is something to print, so an invoice whose
         referrals were all installed outright is unchanged. It sits after the
         sign-off because it explains the document rather than forming part of
         what is being charged. --}}
    @if (!empty($preInstallNotes))
        <table class="pre-install">
            <tr>
                <th colspan="2">PRE-INSTALLATION REMARKS</th>
            </tr>
            @foreach ($preInstallNotes as $note)
                <tr>
                    <td class="who">
                        {{ $note['customer'] }}
                        @if ($note['recorded_at'])
                            <span class="when">{{ $note['recorded_at'] }}</span>
                        @endif
                        @if ($note['recorded_by'])
                            <span class="when">{{ $note['recorded_by'] }}</span>
                        @endif
                    </td>
                    <td class="note">{{ $note['remarks'] }}</td>
                </tr>
            @endforeach
        </table>
    @endif

    <div class="page-note">
        {{ $invoice->invoice_number }} &nbsp;•&nbsp; Billing period {{ $periodLabel }}
    </div>
</div>
