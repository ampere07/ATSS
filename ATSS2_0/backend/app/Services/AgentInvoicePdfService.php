<?php

namespace App\Services;

use App\Models\AgentInvoice;
use Carbon\Carbon;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\View;
use Throwable;

/**
 * Renders an agent invoice to a PDF on disk.
 *
 * Uses Dompdf directly, matching how PdfGenerationService renders the billing
 * documents, and writes under storage/app/public so the stored path can be
 * served straight back to the invoice page.
 *
 * The PDF is written once, when the invoice is generated, and the path is kept
 * on the invoice row. Opening the invoice page serves that file; it is only
 * rendered again if the file has gone missing or a caller asks for it.
 */
class AgentInvoicePdfService
{
    /**
     * The branded header and footer artwork, which carry the ATSS FIBER mark
     * and the company's contact details.
     *
     * Embedded as data URIs rather than linked: Dompdf runs with remote loading
     * off, and a data URI cannot be broken by a moved file or a wrong document
     * root on the server.
     */
    private const HEADER_IMAGE = 'agentinvoiceheader.png';
    private const FOOTER_IMAGE = 'agentinvoicefooter.png';

    /**
     * The layout's version, carried in every PDF's filename.
     *
     * A PDF is written once, at generation, and served from disk forever after —
     * so a change to the template or to this service left every invoice already
     * issued showing the old layout, with no way to refresh it short of deleting
     * files off the server by hand.
     *
     * Putting the version in the filename makes that self-correcting: after a
     * bump the stored path no longer matches the expected one, the next request
     * re-renders once and stores the new path, and the invoice is up to date.
     * The record itself never changes — only its rendering.
     *
     * Bump this whenever the template or the page geometry changes:
     *   1  the original layout
     *   2  fonts applied (the family names were being HTML-escaped), and the
     *      customer table paginated so the totals block stops being orphaned
     */
    private const LAYOUT_VERSION = 2;

    /** A4 portrait, in points — what setPaper('A4') gives Dompdf. */
    private const PAGE_WIDTH_PT = 595.28;

    /**
     * The band reserved at the top of every page for the page number.
     *
     * Wide enough for the figure and clear air beneath it. On page one the
     * header artwork cancels this with an equal negative margin, so the sheet
     * still opens flush with the paper edge.
     */
    private const TOP_BAND_PT = 46.0;

    /**
     * Air between the footer artwork and the last line of flowing content.
     *
     * The reserved bottom band is the artwork's own height plus this.
     */
    private const FOOTER_CLEARANCE_PT = 8.0;

    /** Fallback footer height when the artwork cannot be measured. */
    private const FOOTER_FALLBACK_PT = 101.0;

    /**
     * The six typefaces the invoice is set in, one per slot.
     *
     * Each slot resolves in order: the licensed face if it has been installed,
     * then an open-licensed stand-in of the same character, then Helvetica. A
     * missing font therefore makes the invoice plainer, never unissuable.
     *
     * Slots whose specified face is a commercial one ship with a stand-in only;
     * dropping the licensed .ttf in under the primary name takes over with no
     * other change. See resources/fonts/README.md.
     */
    private const FONT_SLOTS = [
        // BOOTH - REFERRAL banner — Knockout Featherweight
        'title'  => 'invoice-title.ttf',
        // Invoice date, and the team or agent name — Agrandir Narrow
        'meta'   => 'invoice-meta.ttf',
        // Table column headings — Open Sans
        'head'   => 'invoice-head.ttf',
        // Customer rows — Arimo
        'body'   => 'invoice-body.ttf',
        // Totals block — Arial MT Pro
        'totals' => 'invoice-totals.ttf',
        // Thank you! sign-off — Halimum
        'script' => 'invoice-script.ttf',
    ];

    /**
     * Render the invoice and return its path relative to storage/app/public.
     *
     * @param  bool  $force  render again even if a file is already on disk
     */
    public function render(AgentInvoice $invoice, bool $force = false): string
    {
        $relativePath = $this->pathFor($invoice);
        $absolutePath = storage_path('app/public/' . $relativePath);

        // Already on disk, and rendered by the current layout — opening the page
        // must not re-render it. The path comparison is what makes a layout bump
        // take effect: a file stored under an older version no longer matches
        // and is rendered again.
        if (!$force && $invoice->pdf_path === $relativePath && is_file($absolutePath)) {
            return $invoice->pdf_path;
        }

        $html  = View::make('pdf.agent_invoice', $this->viewData($invoice))->render();
        $bytes = $this->htmlToPdf($html);

        $directory = dirname($absolutePath);
        if (!is_dir($directory)) {
            Storage::makeDirectory('public/' . dirname($relativePath));

            if (!is_dir($directory)) {
                @mkdir($directory, 0775, true);
            }
        }

        $written = @file_put_contents($absolutePath, $bytes);

        if ($written === false) {
            throw new \RuntimeException("Could not write the invoice PDF to {$absolutePath}");
        }

        Log::info('[AGENT INVOICES] PDF written', [
            'invoice_number' => $invoice->invoice_number,
            'path'           => $relativePath,
            'bytes'          => $written,
        ]);

        return $relativePath;
    }

    /**
     * Render several invoices into one PDF, and return its bytes.
     *
     * A single document rather than a merge of finished PDFs: Dompdf lays every
     * invoice out in one pass, each opening on a fresh page, which needs no PDF
     * merging library and gives one continuously numbered document.
     *
     * The artwork, the fonts and the page geometry are resolved once and shared,
     * so a bundle of fifty carries one copy of the letterhead rather than fifty.
     *
     * @param  iterable<AgentInvoice>  $invoices
     */
    public function renderBundle(iterable $invoices): string
    {
        $entries = [];

        foreach ($invoices as $invoice) {
            $entries[] = $this->invoiceViewData($invoice);
        }

        if ($entries === []) {
            throw new \RuntimeException('Refusing to render a bundle with no invoices.');
        }

        $html = View::make('pdf.agent_invoices_bundle', [
            'invoices' => $entries,
        ] + $this->sharedViewData())->render();

        return $this->htmlToPdf($html);
    }

    /**
     * Turn prepared HTML into PDF bytes.
     *
     * One place for the Dompdf settings, so a single invoice and a bundle are
     * rendered by identical options — remote loading off, the fonts folder
     * inside the chroot, 96dpi.
     */
    private function htmlToPdf(string $html): string
    {
        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'Helvetica');
        $options->set('dpi', 96);
        // The invoice loads its display fonts from resources/fonts, so that
        // folder has to be inside the chroot alongside the output directory.
        $options->set('chroot', [storage_path('app/public'), resource_path()]);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return (string) $dompdf->output();
    }

    /**
     * Split the customer rows into pages.
     *
     * Page one takes `first_page_rows`, every page after it `rows_per_page`.
     * A list that fits on page one comes back as one chunk, so nothing changes
     * for the ordinary invoice.
     *
     * Both settings are clamped to at least one row: a zero or negative value
     * in config would otherwise loop forever.
     *
     * @param  array<int, array>  $rows
     * @return array<int, array<int, array>>
     */
    private function paginateRows(array $rows): array
    {
        if ($rows === []) {
            return [];
        }

        $first = max(1, (int) config('agent_invoices.first_page_rows', 10));
        $rest  = max(1, (int) config('agent_invoices.rows_per_page', 18));

        if (count($rows) <= $first) {
            return [$rows];
        }

        return array_merge(
            [array_slice($rows, 0, $first)],
            array_chunk(array_slice($rows, $first), $rest)
        );
    }

    /** Where this invoice's PDF belongs, relative to storage/app/public. */
    public function pathFor(AgentInvoice $invoice): string
    {
        $folder = trim((string) config('agent_invoices.pdf_folder', 'agent-invoices'), '/');
        $date   = $invoice->period_start instanceof Carbon
            ? $invoice->period_start
            : Carbon::parse((string) $invoice->period_start);

        // Filenames carry the invoice number, which is unique and never reused,
        // so one invoice can never overwrite another's file. The layout version
        // rides alongside it so a template change produces a different name and
        // the old rendering is left behind rather than served forever.
        $safeNumber = preg_replace('/[^A-Za-z0-9\-_]/', '', (string) $invoice->invoice_number);

        return $folder . '/' . $date->format('Y/m') . '/' . $safeNumber . '-v' . self::LAYOUT_VERSION . '.pdf';
    }

    /** Everything the single-invoice template needs, already formatted. */
    private function viewData(AgentInvoice $invoice): array
    {
        return $this->invoiceViewData($invoice) + $this->sharedViewData();
    }

    /**
     * The parts that belong to the document rather than to any one invoice:
     * the fonts, the artwork and the page geometry.
     *
     * Held apart so a bundle resolves them once instead of once per invoice —
     * the artwork alone is a base64 payload of some size, and repeating it
     * fifty times would be fifty copies in the HTML handed to Dompdf.
     */
    private function sharedViewData(): array
    {
        return [
            // Dompdf's core fonts have no peso glyph, so the currency is written
            // as "P" rather than rendering as a blank box on every line.
            'peso'        => 'P',
            'headerImage' => $this->imageData(self::HEADER_IMAGE),
            'footerImage' => $this->imageData(self::FOOTER_IMAGE),
            // slot => font URL, or null where nothing is installed for it.
            'fonts'       => $this->fonts(),
        ] + $this->pageGeometry();
    }

    /** The parts particular to one invoice. */
    private function invoiceViewData(AgentInvoice $invoice): array
    {
        $customers = $invoice->relationLoaded('customers')
            ? $invoice->customers
            : $invoice->customers()->orderBy('id')->get();

        $rows = $customers->map(fn ($c) => [
            'customer_name'    => $c->customer_name,
            'referred_by_name' => $c->referred_by_name,
            'unit_price'       => $c->unit_price,
            'quantity'         => $c->quantity,
            'total'            => $c->total,
        ])->all();

        $periodStart = Carbon::parse((string) $invoice->period_start);
        $periodEnd   = Carbon::parse((string) $invoice->period_end);
        $invoiceDate = Carbon::parse((string) $invoice->invoice_date);

        return [
            'invoice'   => $invoice,
            'customers' => $rows,

            /*
             * The rows split into pages, rather than left to Dompdf.
             *
             * Page one holds fewer, because the header artwork and the banner
             * take most of its height. Letting Dompdf decide fills page one to
             * the paper's edge, discovers the totals block will not fit, and —
             * since that block cannot be split — moves it whole to page two,
             * leaving a large gap behind.
             *
             * A single page of rows stays a single chunk, so the common invoice
             * is unaffected.
             */
            'customerPages' => $this->paginateRows($rows),

            // The reference document shows the date in capitals: AUGUST 10, 2026.
            'invoiceDateLabel' => strtoupper($invoiceDate->format('F j, Y')),
            'billedToLabel'    => strtoupper((string) $invoice->billed_to),
            'periodLabel'      => $periodStart->format('M j') . ' – ' . $periodEnd->format('M j, Y'),

            // A team invoice names who brought each customer in; a solo invoice
            // would only repeat the one name in the heading.
            'showReferrer'     => $invoice->invoice_type === AgentInvoice::TYPE_TEAM,

        ];
    }

    /**
     * The page bands the template reserves, in points.
     *
     * Both pieces of artwork are fully opaque and are painted over the flow, so
     * anything Dompdf lays out beneath them is lost rather than pushed to the
     * next page. The bottom band is therefore measured from the footer artwork
     * itself: it is drawn at the full page width, so its height on the page is
     * its pixel height scaled by (page width / pixel width). Measuring it beats
     * hard-coding, because replacing the artwork with a taller strip would
     * otherwise start swallowing rows again.
     *
     * @return array{pageTopBand: string, pageBottomBand: string,
     *               pageNumberTop: string, footerOffset: string}
     */
    private function pageGeometry(): array
    {
        $footerHeight = $this->imageHeightAtPageWidth(self::FOOTER_IMAGE) ?? self::FOOTER_FALLBACK_PT;
        $bottomBand   = $footerHeight + self::FOOTER_CLEARANCE_PT;

        return [
            'pageTopBand'    => $this->pt(self::TOP_BAND_PT),
            'pageBottomBand' => $this->pt($bottomBand),

            // Dompdf places a fixed box against the content box, not the paper,
            // so both offsets reach back out through their own band: the number
            // up into the top band, the artwork down to the paper's edge.
            'pageNumberTop'  => $this->pt(-(self::TOP_BAND_PT - 16.0)),
            'footerOffset'   => $this->pt(-$bottomBand),
        ];
    }

    /**
     * How tall a full-width image stands on the page, in points, or null when it
     * cannot be measured.
     */
    private function imageHeightAtPageWidth(string $filename): ?float
    {
        $path = resource_path('images/' . $filename);

        if (!is_file($path)) {
            return null;
        }

        $size = @getimagesize($path);
        if ($size === false || empty($size[0])) {
            return null;
        }

        return self::PAGE_WIDTH_PT * ($size[1] / $size[0]);
    }

    /** A CSS length in points, rounded to something a stylesheet can carry. */
    private function pt(float $points): string
    {
        return round($points, 2) . 'pt';
    }

    /**
     * The font file backing each slot, as URLs the template can declare.
     *
     * @return array<string, string|null>
     */
    private function fonts(): array
    {
        $resolved = [];

        foreach (self::FONT_SLOTS as $slot => $filename) {
            $resolved[$slot] = $this->fontUrl($filename)
                // The open-licensed stand-in, used until the licensed face is
                // installed alongside it.
                ?? $this->fontUrl(str_replace('.ttf', '.fallback.ttf', $filename));
        }

        return $resolved;
    }

    /**
     * A font file as a URL Dompdf can load, or null when it is not installed.
     *
     * Returned as a file:// URL rather than a data URI: Dompdf caches fonts it
     * has parsed by path, so a rendered invoice does not re-parse the face on
     * every run.
     */
    private function fontUrl(string $filename): ?string
    {
        $path = resource_path('fonts/' . $filename);

        if (!is_file($path) || !is_readable($path)) {
            return null;
        }

        return 'file://' . str_replace('\\', '/', $path);
    }

    /**
     * One of the brand images as a data URI, or null if it is missing.
     *
     * A missing image must not stop an invoice being produced — the template
     * falls back to plain text, and the invoice is still a valid document.
     */
    private function imageData(string $filename): ?string
    {
        // Dompdf decodes every raster image through GD and throws outright when
        // the extension is absent — "The PHP GD extension is required, but is
        // not installed", from Cpdf, with the whole render lost.
        //
        // The artwork is decoration. An invoice with no letterhead is still a
        // valid invoice; an invoice that cannot be produced at all is not. So
        // where GD is missing the images are dropped and the template's text
        // fallback stands in, rather than the document failing.
        if (!function_exists('imagecreatefrompng')) {
            Log::warning('[AGENT INVOICES] GD is not installed — rendering the invoice without its artwork', [
                'image' => $filename,
            ]);

            return null;
        }

        // The backend's own copy first — it is the only one that exists on the
        // server, since frontend/src is a build input and is never deployed.
        // The frontend original is a convenience for a local checkout that has
        // not had the artwork copied across yet.
        $candidates = [
            resource_path('images/' . $filename),
            base_path('../frontend/src/assets/' . $filename),
        ];

        foreach ($candidates as $path) {
            if (!is_file($path) || !is_readable($path)) {
                continue;
            }

            $bytes = $this->trimmedPng($path);
            if ($bytes === null) {
                continue;
            }

            return 'data:image/png;base64,' . base64_encode($bytes);
        }

        Log::warning('[AGENT INVOICES] Invoice artwork missing, falling back to text', [
            'looked_in' => $candidates,
        ]);

        return null;
    }

    /**
     * A PNG with its blank top and bottom bands removed.
     *
     * The supplied header carries roughly a hundred points of empty space above
     * the logo, which at full page width opened a gap between the top of the
     * sheet and the first thing on it. Trimming is measured rather than fixed,
     * so replacing the artwork with differently-padded art still comes out
     * tight against the edge.
     *
     * The result is cached beside the source and reused until the source
     * changes, so an invoice does not pay to re-scan the image every time.
     *
     * Falls back to the untrimmed bytes if GD is unavailable or the image
     * cannot be read — a gap at the top is a blemish, not a reason to fail.
     */
    private function trimmedPng(string $path): ?string
    {
        $original = @file_get_contents($path);
        if ($original === false || $original === '') {
            return null;
        }

        if (!function_exists('imagecreatefrompng')) {
            return $original;
        }

        $cacheDir  = storage_path('app/agent-invoices/art');
        $cacheFile = $cacheDir . '/' . md5($path . '|' . (@filemtime($path) ?: 0)) . '.png';

        if (is_file($cacheFile)) {
            $cached = @file_get_contents($cacheFile);
            if ($cached !== false && $cached !== '') {
                return $cached;
            }
        }

        try {
            $image = @imagecreatefrompng($path);
            if ($image === false) {
                return $original;
            }

            $width  = imagesx($image);
            $height = imagesy($image);

            // A row counts as content only once it covers a percent of the
            // width. The supplied header carries a four-pixel speck in its top
            // corner; at a lower threshold that speck reads as content and the
            // blank band below it survives the trim. Real content rows on this
            // artwork run to seventy-odd pixels, so the two separate cleanly.
            $minPixels = max(5, (int) round($width * 0.01));

            $hasContent = function (int $y) use ($image, $width, $minPixels): bool {
                $found = 0;

                for ($x = 0; $x < $width; $x++) {
                    $rgba = imagecolorat($image, $x, $y);
                    // 7-bit alpha: 127 is fully transparent.
                    if ((($rgba >> 24) & 0x7F) > 120) {
                        continue;
                    }
                    if (
                        (($rgba >> 16) & 0xFF) > 247
                        && (($rgba >> 8) & 0xFF) > 247
                        && ($rgba & 0xFF) > 247
                    ) {
                        continue;
                    }
                    if (++$found >= $minPixels) {
                        return true;
                    }
                }

                return false;
            };

            $top = 0;
            while ($top < $height && !$hasContent($top)) {
                $top++;
            }

            $bottom = $height - 1;
            while ($bottom > $top && !$hasContent($bottom)) {
                $bottom--;
            }

            if ($top === 0 && $bottom === $height - 1) {
                imagedestroy($image);
                return $original;   // nothing to trim
            }

            $cropped = imagecrop($image, [
                'x' => 0, 'y' => $top, 'width' => $width, 'height' => $bottom - $top + 1,
            ]);
            imagedestroy($image);

            if ($cropped === false) {
                return $original;
            }

            imagealphablending($cropped, false);
            imagesavealpha($cropped, true);

            ob_start();
            imagepng($cropped);
            $bytes = (string) ob_get_clean();
            imagedestroy($cropped);

            if ($bytes === '') {
                return $original;
            }

            if (!is_dir($cacheDir)) {
                @mkdir($cacheDir, 0775, true);
            }
            @file_put_contents($cacheFile, $bytes);

            return $bytes;
        } catch (Throwable $e) {
            Log::warning('[AGENT INVOICES] Could not trim invoice artwork: ' . $e->getMessage());
            return $original;
        }
    }
}
