/**
 * Sample agent referral invoice.
 *
 * Draws the same document resources/views/pdf/agent_invoice.blade.php produces,
 * so the layout, colours, columns and totals can be reviewed before the backend
 * dependencies are installed.
 *
 * NOTE: production renders that Blade template through Dompdf. This file draws
 * the identical design with jsPDF because Dompdf needs the Composer packages,
 * which are not installed in this checkout. Treat it as a faithful proof of the
 * layout, not as byte-identical output — the script "Thank you!" and the logo
 * mark are the two places a real render will differ most.
 *
 *   node agent_invoice_sample.js            # writes ../SAMPLE-Agent-Invoice.pdf
 *   node agent_invoice_sample.js --solo     # the solo-agent variant
 */

const path = require('path');
const fs = require('fs');

// jsPDF is not a dependency of this folder; borrow it from the web app's install.
const NM = path.resolve(__dirname, '../../ATSS2_0/frontend/node_modules');
function dep(name) {
  try { return require(name); } catch { return require(path.join(NM, name)); }
}
const { jsPDF } = dep('jspdf');

// ── Design tokens, matching the Blade template ──────────────────────────────
// #1a2e46 — a shade off the navy in the header and footer artwork (#192d46),
// so the table and totals blocks read as one piece with the bars above and
// below them.
const NAVY = [26, 46, 70];
const RED = [208, 32, 47];
const INK = [31, 41, 55];
const MUTED = [107, 114, 128];
const WHITE = [255, 255, 255];
const SOFT_RED = [255, 90, 90];

const A4 = { w: 595.28, h: 841.89 };
const M = { left: 40, right: 40, top: 34 };
const CONTENT_W = A4.w - M.left - M.right;

// The supplied artwork: the ATSS FIBER mark and watermark at the top, the
// angled bars and contact strip at the foot. Read from the backend copy, which
// is what production embeds.
const ART = path.resolve(__dirname, '../../ATSS2_0/backend/resources/images');
const png = dep('fast-png');

/**
 * The artwork, with its blank top and bottom bands trimmed off.
 *
 * The supplied header carries about a hundred points of empty space above the
 * logo, which at full page width opened a gap at the top of the sheet. The trim
 * is measured, not fixed, so replacing the artwork with differently-padded art
 * still comes out tight — and it mirrors what AgentInvoicePdfService does, so
 * the preview and production agree.
 */
const dataUri = (file) => {
  const p = path.join(ART, file);
  if (!fs.existsSync(p)) throw new Error('Missing invoice artwork: ' + p);

  const img = png.decode(fs.readFileSync(p));
  const { width, height, channels, data } = img;

  // A row counts as content only once it covers a percent of the width. The
  // supplied header carries a four-pixel speck in its top corner; at a lower
  // threshold that speck reads as content and the blank band below it survives
  // the trim. Real content rows run to seventy-odd pixels, so the two separate
  // cleanly. Kept in step with AgentInvoicePdfService.
  const minPixels = Math.max(5, Math.round(width * 0.01));
  const hasContent = (y) => {
    let found = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (channels === 4 && data[i + 3] < 8) continue;
      if (data[i] > 247 && data[i + 1] > 247 && data[i + 2] > 247) continue;
      if (++found >= minPixels) return true;
    }
    return false;
  };

  let top = 0;
  while (top < height && !hasContent(top)) top++;
  let bottom = height - 1;
  while (bottom > top && !hasContent(bottom)) bottom--;

  if (top === 0 && bottom === height - 1) {
    return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
  }

  const cropH = bottom - top + 1;
  const cropped = new Uint8Array(width * cropH * channels);
  cropped.set(data.subarray(top * width * channels, (bottom + 1) * width * channels));

  const encoded = png.encode({ width, height: cropH, channels, data: cropped });
  return 'data:image/png;base64,' + Buffer.from(encoded).toString('base64');
};

/**
 * The six typefaces the invoice is set in, one per slot.
 *
 * Resolved exactly as the backend resolves them: the licensed face if it has
 * been installed, then the open-licensed stand-in, then Helvetica. Reading from
 * the same folder means this preview cannot drift from what production prints.
 */
const FONT_DIR = path.resolve(__dirname, '../../ATSS2_0/backend/resources/fonts');
const FONT_SLOTS = ['title', 'meta', 'head', 'body', 'totals', 'script'];

/** Register each slot's face with the document; returns which resolved. */
function registerFonts(doc) {
  const resolved = {};

  for (const slot of FONT_SLOTS) {
    const licensed = path.join(FONT_DIR, `invoice-${slot}.ttf`);
    const standIn = path.join(FONT_DIR, `invoice-${slot}.fallback.ttf`);
    const file = [licensed, standIn].find(p => fs.existsSync(p));
    if (!file) continue;

    const alias = 'Invoice' + slot[0].toUpperCase() + slot.slice(1);
    const vfsName = alias + '.ttf';
    doc.addFileToVFS(vfsName, fs.readFileSync(file).toString('base64'));
    doc.addFont(vfsName, alias, 'normal');

    resolved[slot] = { alias, file, isStandIn: file === standIn };
  }

  return resolved;
}

/** Select a slot's face, falling back to a Helvetica style. */
function useFont(doc, fonts, slot, fallbackStyle = 'normal') {
  if (fonts[slot]) doc.setFont(fonts[slot].alias, 'normal');
  else doc.setFont('helvetica', fallbackStyle);
}

// ── The sample invoice ──────────────────────────────────────────────────────
// A team invoice for a three-agent team, which is the case worth reviewing:
// it shows the per-customer referring agent that a solo invoice omits.
const TEAM_SAMPLE = {
  invoiceNumber: 'ATSS-AGT-000042',
  type: 'team',
  billedTo: 'TEAM BETH',
  invoiceDate: 'AUGUST 24, 2026',
  periodLabel: 'Aug 17 – Aug 23, 2026',
  unitPrice: 100,
  installationFee: 500,
  // Commission is earned per referral at the referring agent's own rate, so it
  // is summed from the rows below rather than stated here.
  customers: [
    { name: 'Maricel Taoatao', by: 'Beth Reyes', rate: 400 },
    { name: 'Romulo Oria', by: 'Beth Reyes', rate: 400 },
    { name: 'Atila Abundo', by: 'Carlo Mendoza', rate: 400 },
    { name: 'Rowendo Taroy', by: 'Carlo Mendoza', rate: 400 },
    { name: 'Ricky San Juan', by: 'Carlo Mendoza', rate: 400 },
    { name: 'Kheythlyn Dasig', by: 'Divina Lopez', rate: 400 },
    { name: 'Rachel Salamida', by: 'Divina Lopez', rate: 400 },
    { name: 'Ana Saurane', by: 'Divina Lopez', rate: 400 },
    { name: 'Ana Corpuz', by: 'Divina Lopez', rate: 400 },
  ],
};

const SOLO_SAMPLE = {
  invoiceNumber: 'ATSS-AGT-000043',
  type: 'solo',
  billedTo: 'JUAN CRUZ',
  invoiceDate: 'AUGUST 24, 2026',
  periodLabel: 'Aug 17 – Aug 23, 2026',
  unitPrice: 100,
  installationFee: 500,
  customers: [
    { name: 'Marites Villanueva', rate: 400 },
    { name: 'Eduardo Bautista', rate: 400 },
    { name: 'Liza Fernandez', rate: 400 },
    { name: 'Noel Ramirez', rate: 400 },
  ],
};

const peso = (n) => 'P ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pesoFlat = (n) => 'P ' + Number(n).toLocaleString('en-US');

function build(sample, outPath) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const fonts = registerFonts(doc);

  // ── Header artwork, full page width ───────────────────────────────────────
  const headerUri = dataUri('agentinvoiceheader.png');
  const headerProps = doc.getImageProperties(headerUri);
  const headerH = (headerProps.height / headerProps.width) * A4.w;
  doc.addImage(headerUri, 'PNG', 0, 0, A4.w, headerH);

  // Breathing room between the header artwork and the banner, so the title is
  // not crowded against the logo. Kept in step with .banner's margin-top in
  // the Blade template (28pt there is 38px at Dompdf's 96dpi).
  let y = headerH + 28;

  // ── Banner ────────────────────────────────────────────────────────────────
  doc.setTextColor(...NAVY);
  useFont(doc, fonts, 'title', 'bold');
  doc.setFontSize(fonts.title ? 52 : 46);
  doc.text('BOOTH - REFERRAL', A4.w / 2, y + 34, { align: 'center' });
  y += 56;

  // ── Date hard left; team or agent name centred on the page ────────────────
  doc.setTextColor(...RED);
  useFont(doc, fonts, 'meta', 'bold');
  doc.setFontSize(13);
  doc.text(sample.invoiceDate, M.left, y);
  doc.text(sample.billedTo, A4.w / 2, y, { align: 'center' });
  y += 16;

  // ── Itemised table ────────────────────────────────────────────────────────
  const colDesc = CONTENT_W * 0.40;
  const colUnit = CONTENT_W * 0.24;
  const colQty = CONTENT_W * 0.16;
  const colTotal = CONTENT_W * 0.20;

  const xDesc = M.left;
  const xUnit = xDesc + colDesc;
  const xQty = xUnit + colUnit;
  const xTotal = xQty + colQty;

  const HEAD_H = 30;
  doc.setFillColor(...NAVY);
  doc.rect(M.left, y, CONTENT_W, HEAD_H, 'F');

  doc.setTextColor(...WHITE);
  useFont(doc, fonts, 'head', 'bold');
  doc.setFontSize(8.5);
  const head = (label, x, w, align) => {
    // jsPDF has no letter-spacing, so the spacing of the original is drawn in.
    const spaced = label.split('').join(' ');
    if (align === 'left') doc.text(spaced, x + 18, y + 19);
    else doc.text(spaced, x + w / 2, y + 19, { align: 'center' });
  };
  head('DESCRIPTION', xDesc, colDesc, 'left');
  head('UNIT PRICE', xUnit, colUnit);
  head('QTY', xQty, colQty);
  head('TOTAL', xTotal, colTotal);

  y += HEAD_H;

  const ROW_H = 30;
  const showReferrer = sample.type === 'team';

  useFont(doc, fonts, 'body');
  sample.customers.forEach((c) => {
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.8);
    doc.rect(xDesc, y, colDesc, ROW_H, 'S');
    doc.rect(xUnit, y, colUnit, ROW_H, 'S');
    doc.rect(xQty, y, colQty, ROW_H, 'S');
    doc.rect(xTotal, y, colTotal, ROW_H, 'S');

    doc.setTextColor(...INK);
    doc.setFontSize(10);

    if (showReferrer && c.by) {
      doc.text(c.name, xDesc + colDesc / 2, y + 14, { align: 'center' });
      doc.setTextColor(...MUTED);
      doc.setFontSize(6.5);
      doc.text('referred by ' + c.by, xDesc + colDesc / 2, y + 23, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(...INK);
    } else {
      doc.text(c.name, xDesc + colDesc / 2, y + ROW_H / 2 + 3.5, { align: 'center' });
    }

    doc.text(pesoFlat(sample.unitPrice), xUnit + colUnit / 2, y + ROW_H / 2 + 3.5, { align: 'center' });
    doc.text('1', xQty + colQty / 2, y + ROW_H / 2 + 3.5, { align: 'center' });
    doc.text(pesoFlat(sample.unitPrice), xTotal + colTotal / 2, y + ROW_H / 2 + 3.5, { align: 'center' });

    y += ROW_H;
  });

  // ── Totals block, under the right-hand half ───────────────────────────────
  const totalAmount = sample.customers.length * sample.unitPrice;
  // Summed from each referral's own agent rate, as the service does it.
  const commission = sample.customers.reduce((sum, c) => sum + (c.rate || 0), 0);
  const subtotal = totalAmount + commission;

  const totalsX = M.left + CONTENT_W * 0.52;
  const totalsW = CONTENT_W * 0.48;
  const totalsRows = [
    ['TOTAL CLIENT INSTALLED', String(sample.customers.length), false],
    ['INSTALLATION FEE', peso(sample.installationFee), false],
    ['TOTAL AMOUNT', peso(totalAmount), false],
    ['COMMISSION', peso(commission), false],
    ['SUBTOTAL', peso(subtotal), true],
  ];

  const TOTAL_ROW_H = 15;
  const totalsTop = y;
  doc.setFillColor(...NAVY);
  doc.rect(totalsX, totalsTop, totalsW, TOTAL_ROW_H * totalsRows.length, 'F');

  useFont(doc, fonts, 'totals', 'bolditalic');
  doc.setFontSize(9);
  totalsRows.forEach(([label, value, isGrand], i) => {
    const ry = totalsTop + i * TOTAL_ROW_H + 11;

    // On the subtotal row only the figure is picked out in red; the label stays
    // white with the rest of the block.
    doc.setTextColor(...WHITE);
    doc.text(label, totalsX + 12, ry);

    doc.setTextColor(...(isGrand ? SOFT_RED : WHITE));
    doc.text(value, totalsX + totalsW - 12, ry, { align: 'right' });
  });

  // ── Signature and sign-off, sharing a baseline ────────────────────────────
  // SIGNATURE: and Thank you! sit on the same line, with the rule to sign on
  // below them. The shared baseline clears the bottom of the totals block,
  // because the script's ascenders rise a long way and would otherwise strike
  // the SUBTOTAL row.
  const totalsBottom = totalsTop + TOTAL_ROW_H * totalsRows.length;
  const labelY = Math.max(totalsTop + 96, totalsBottom + 40);
  const signatureLineY = labelY + 48;

  doc.setTextColor(...RED);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(13);
  doc.text('SIGNATURE:', M.left, labelY);

  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(2.5);
  doc.line(M.left + 8, signatureLineY, M.left + 218, signatureLineY);

  doc.setTextColor(...RED);
  // A script face is already slanted; italic on top would double the slant.
  useFont(doc, fonts, 'script', 'italic');
  doc.setFontSize(fonts.script ? 38 : 28);
  doc.text('Thank you!', totalsX + totalsW - 24, labelY, { align: 'right' });

  // ── Footer artwork, flush to the bottom edge ──────────────────────────────
  const footerUri = dataUri('agentinvoicefooter.png');
  const footerProps = doc.getImageProperties(footerUri);
  const footerH = (footerProps.height / footerProps.width) * A4.w;
  const footerTop = A4.h - footerH;

  // ── Reference line, kept clear of the footer artwork ──────────────────────
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  // Below the rule to sign on, and clear of the footer artwork.
  const refY = Math.min(signatureLineY + 26, footerTop - 16);
  doc.text(
    `${sample.invoiceNumber}  •  Billing period ${sample.periodLabel}`,
    A4.w / 2,
    refY,
    { align: 'center' }
  );

  doc.addImage(footerUri, 'PNG', 0, footerTop, A4.w, footerH);

  fs.writeFileSync(outPath, Buffer.from(doc.output('arraybuffer')));
  console.log('Wrote ' + outPath);

  const standIns = Object.entries(fonts).filter(([, i]) => i.isStandIn).map(([slot]) => slot);
  if (standIns.length) {
    console.log('  stand-in faces still in use: ' + standIns.join(', ')
      + ' — drop the licensed .ttf into backend/resources/fonts to replace them');
  }
}

const wantSolo = process.argv.includes('--solo');
const outDir = path.resolve(__dirname, '..');

if (wantSolo) {
  build(SOLO_SAMPLE, path.join(outDir, 'SAMPLE-Agent-Invoice-Solo.pdf'));
} else {
  build(TEAM_SAMPLE, path.join(outDir, 'SAMPLE-Agent-Invoice-Team.pdf'));
  build(SOLO_SAMPLE, path.join(outDir, 'SAMPLE-Agent-Invoice-Solo.pdf'));
}
