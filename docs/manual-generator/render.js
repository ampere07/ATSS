/**
 * Minimal flowing-document layout engine on top of jsPDF.
 * Supports: h1/h2/h3, paragraphs, bullets, numbered steps, key-value tables,
 * callouts, running header/footer, and a generated table of contents.
 */
// jsPDF is not a dependency of this folder; borrow it from the web app's install.
const path = require('path');
const NM = path.resolve(__dirname, '../../ATSS2_0/frontend/node_modules');
function dep(name) {
  try { return require(name); } catch { return require(path.join(NM, name)); }
}
const { jsPDF } = dep('jspdf');
const { autoTable } = dep('jspdf-autotable');

const A4 = { w: 595.28, h: 841.89 };
const M = { top: 64, bottom: 56, left: 54, right: 54 };
const CONTENT_W = A4.w - M.left - M.right;

const INK = [17, 24, 39];
const MUTED = [107, 114, 128];
const RULE = [209, 213, 219];
const ACCENT = [124, 58, 237];
const SOFT = [245, 243, 255];

class Doc {
  constructor(meta) {
    this.d = new jsPDF({ unit: 'pt', format: 'a4' });
    this.meta = meta;
    this.y = M.top;
    this.outline = [];
    this.bodyStart = 1;
    this.section = '';
    this.suppressChrome = true; // cover page
  }

  // ── primitives ────────────────────────────────────────────────────────────
  space(n = 8) { this.y += n; }

  room(h) {
    if (this.y + h > A4.h - M.bottom) { this.page(); return true; }
    return false;
  }

  page() {
    this.d.addPage();
    this.y = M.top;
  }

  text(str, { size = 10, style = 'normal', color = INK, indent = 0, lead = 1.42, width } = {}) {
    const d = this.d;
    d.setFont('helvetica', style);
    d.setFontSize(size);
    d.setTextColor(...color);
    const w = (width || CONTENT_W) - indent;
    const lines = d.splitTextToSize(String(str), w);
    const lh = size * lead;
    for (const line of lines) {
      this.room(lh);
      d.text(line, M.left + indent, this.y + size * 0.86);
      this.y += lh;
    }
  }

  // ── headings ──────────────────────────────────────────────────────────────
  h1(title, { newPage = true } = {}) {
    if (newPage) this.page();
    this.section = title;
    const d = this.d;
    d.setFillColor(...ACCENT);
    d.rect(M.left, this.y, 34, 3, 'F');
    this.y += 16;
    this.text(title, { size: 21, style: 'bold' });
    this.space(4);
    d.setDrawColor(...RULE);
    d.line(M.left, this.y, M.left + CONTENT_W, this.y);
    this.space(14);
    this.outline.push({ level: 1, title, page: d.getNumberOfPages() });
  }

  h2(title) {
    this.room(58);
    this.space(10);
    this.text(title, { size: 14, style: 'bold' });
    this.space(6);
    this.outline.push({ level: 2, title, page: this.d.getNumberOfPages() });
  }

  h3(title) {
    this.room(44);
    this.space(8);
    this.text(title, { size: 11, style: 'bold', color: [55, 65, 81] });
    this.space(3);
    this.outline.push({ level: 3, title, page: this.d.getNumberOfPages() });
  }

  /** Small bold run-in heading used inside a per-screen entry. */
  sub(title) {
    this.room(30);
    this.space(6);
    this.text(String(title).toUpperCase(),
      { size: 7.8, style: 'bold', color: [124, 58, 237] });
    this.space(2);
  }

  /** One-line metadata strip: "Section x · Roles y".
   *  Named metaLine, not meta — this.meta is the document's own metadata. */
  metaLine(pairs) {
    const d = this.d;
    const parts = pairs.filter(Boolean);
    this.room(20);
    d.setFont('helvetica', 'normal'); d.setFontSize(8.2);
    const lines = d.splitTextToSize(parts.join('   ·   '), CONTENT_W - 8);
    d.setFillColor(249, 250, 251);
    d.rect(M.left, this.y, CONTENT_W, lines.length * 11 + 8, 'F');
    d.setTextColor(...MUTED);
    let ty = this.y + 11.5;
    for (const l of lines) { d.text(l, M.left + 5, ty); ty += 11; }
    this.y += lines.length * 11 + 14;
  }

  p(str, opts = {}) { this.text(str, { size: 10, ...opts }); this.space(6); }

  small(str) { this.text(str, { size: 8.6, color: MUTED }); this.space(5); }

  bullets(items, { indent = 12 } = {}) {
    for (const it of items) {
      const [head, rest] = Array.isArray(it) ? it : [null, it];
      this.room(16);
      const d = this.d;
      d.setFillColor(...MUTED);
      d.circle(M.left + indent - 6, this.y + 5, 1.7, 'F');
      if (head) {
        d.setFont('helvetica', 'bold'); d.setFontSize(10); d.setTextColor(...INK);
        const hw = d.getTextWidth(head + '  ');
        // Bold lead-in, then wrapped remainder beneath it.
        d.text(head, M.left + indent, this.y + 8.6);
        d.setFont('helvetica', 'normal');
        const lines = d.splitTextToSize(String(rest), CONTENT_W - indent - hw);
        d.setTextColor(...INK);
        if (lines.length) d.text(lines[0], M.left + indent + hw, this.y + 8.6);
        this.y += 14.2;
        for (const line of lines.slice(1)) {
          this.room(14.2);
          d.text(line, M.left + indent, this.y + 8.6);
          this.y += 14.2;
        }
      } else {
        this.text(rest, { indent });
      }
      this.space(1.5);
    }
    this.space(4);
  }

  steps(items, { start = 1 } = {}) {
    let n = start;
    for (const it of items) {
      this.room(18);
      const d = this.d;
      const label = `${n}.`;
      d.setFont('helvetica', 'bold'); d.setFontSize(10); d.setTextColor(...ACCENT);
      d.text(label, M.left + 2, this.y + 8.6);
      d.setFont('helvetica', 'normal'); d.setTextColor(...INK);
      const indent = 20;
      const lines = d.splitTextToSize(String(it), CONTENT_W - indent);
      d.text(lines[0], M.left + indent, this.y + 8.6);
      this.y += 14.4;
      for (const line of lines.slice(1)) {
        this.room(14.4);
        d.text(line, M.left + indent, this.y + 8.6);
        this.y += 14.4;
      }
      this.space(2.5);
      n++;
    }
    this.space(4);
  }

  callout(label, body) {
    const d = this.d;
    d.setFont('helvetica', 'normal'); d.setFontSize(9.4);
    const inner = CONTENT_W - 28;
    const lines = d.splitTextToSize(String(body), inner);
    const h = 24 + lines.length * 13;
    this.room(h + 8);
    d.setFillColor(...SOFT);
    d.roundedRect(M.left, this.y, CONTENT_W, h, 5, 5, 'F');
    d.setFillColor(...ACCENT);
    d.rect(M.left, this.y, 3, h, 'F');
    d.setFont('helvetica', 'bold'); d.setFontSize(8.4); d.setTextColor(...ACCENT);
    d.text(String(label).toUpperCase(), M.left + 14, this.y + 15);
    d.setFont('helvetica', 'normal'); d.setFontSize(9.4); d.setTextColor(60, 60, 70);
    let ty = this.y + 29;
    for (const line of lines) { d.text(line, M.left + 14, ty); ty += 13; }
    this.y += h + 12;
  }

  table(head, body, { widths, fontSize = 8.6, align } = {}) {
    if (!body || !body.length) return;
    const colStyles = {};
    if (widths) {
      // Scale so the columns always fill the text block exactly — autoTable warns
      // when explicit widths do not add up to tableWidth.
      const sum = widths.reduce((a, b) => a + b, 0);
      const k = CONTENT_W / sum;
      widths.forEach((w, i) => { colStyles[i] = { cellWidth: w * k }; });
    }
    if (align) Object.entries(align).forEach(([i, a]) => {
      colStyles[i] = { ...(colStyles[i] || {}), halign: a };
    });
    autoTable(this.d, {
      startY: this.y + 2,
      margin: { left: M.left, right: M.right, top: M.top, bottom: M.bottom },
      head: head ? [head] : undefined,
      body,
      styles: { fontSize, cellPadding: 4.4, lineColor: RULE, lineWidth: 0.4,
                textColor: INK, overflow: 'linebreak', valign: 'top' },
      headStyles: { fillColor: [243, 240, 255], textColor: [76, 29, 149],
                    fontStyle: 'bold', fontSize: fontSize + 0.2 },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      columnStyles: colStyles,
      tableWidth: CONTENT_W,
    });
    this.y = this.d.lastAutoTable.finalY + 14;
  }

  // ── cover, TOC, chrome ────────────────────────────────────────────────────
  cover() {
    const d = this.d;
    d.setFillColor(...ACCENT);
    d.rect(0, 0, A4.w, 200, 'F');
    d.setFont('helvetica', 'bold'); d.setFontSize(34); d.setTextColor(255, 255, 255);
    d.text(this.meta.title, M.left, 108, { maxWidth: CONTENT_W });
    d.setFont('helvetica', 'normal'); d.setFontSize(13);
    d.text(this.meta.subtitle, M.left, 146, { maxWidth: CONTENT_W });

    this.y = 250;
    this.text(this.meta.blurb, { size: 11, color: [55, 65, 81] });
    this.space(24);
    this.table(null, this.meta.facts, { widths: [150, CONTENT_W - 150], fontSize: 9.4 });

    this.y = A4.h - 150;
    this.text(this.meta.footNote, { size: 8.6, color: MUTED });
  }

  buildToc() {
    const d = this.d;
    const entries = this.outline.filter(e => e.level <= 2);
    const perPage = 40;
    const pages = Math.max(1, Math.ceil(entries.length / perPage));

    for (let i = 0; i < pages; i++) d.insertPage(2);
    this.bodyStart = 2 + pages;

    let idx = 0;
    for (let pg = 0; pg < pages; pg++) {
      d.setPage(2 + pg);
      let y = M.top;
      if (pg === 0) {
        d.setFont('helvetica', 'bold'); d.setFontSize(19); d.setTextColor(...INK);
        d.text('Contents', M.left, y + 16);
        y += 40;
      }
      while (idx < entries.length && y < A4.h - M.bottom - 14) {
        const e = entries[idx++];
        const shownPage = e.page + pages; // body shifted by inserted TOC pages
        const bold = e.level === 1;
        d.setFont('helvetica', bold ? 'bold' : 'normal');
        d.setFontSize(bold ? 10 : 9.2);
        d.setTextColor(...(bold ? INK : [75, 85, 99]));
        const indent = bold ? 0 : 16;
        const label = d.splitTextToSize(e.title, CONTENT_W - indent - 42)[0];
        d.text(label, M.left + indent, y);
        const num = String(shownPage);
        const numW = d.getTextWidth(num);
        d.text(num, M.left + CONTENT_W - numW, y);
        // leader dots
        const startX = M.left + indent + d.getTextWidth(label) + 5;
        const endX = M.left + CONTENT_W - numW - 5;
        if (endX > startX) {
          d.setTextColor(...RULE);
          const dots = '.'.repeat(Math.max(0, Math.floor((endX - startX) / d.getTextWidth('.'))));
          d.text(dots, startX, y);
        }
        y += bold ? 17 : 13.6;
      }
    }
  }

  chrome() {
    const d = this.d;
    const total = d.getNumberOfPages();
    for (let i = this.bodyStart; i <= total; i++) {
      d.setPage(i);
      d.setDrawColor(...RULE);
      d.line(M.left, M.top - 26, M.left + CONTENT_W, M.top - 26);
      d.setFont('helvetica', 'normal'); d.setFontSize(7.8); d.setTextColor(...MUTED);
      d.text(this.meta.runningHeader, M.left, M.top - 32);
      const pg = `Page ${i} of ${total}`;
      d.text(pg, M.left + CONTENT_W - d.getTextWidth(pg), M.top - 32);
      d.line(M.left, A4.h - M.bottom + 20, M.left + CONTENT_W, A4.h - M.bottom + 20);
      d.text(this.meta.runningFooter, M.left, A4.h - M.bottom + 34);
    }
  }

  save(path) {
    require('fs').writeFileSync(path, Buffer.from(this.d.output('arraybuffer')));
    return { pages: this.d.getNumberOfPages() };
  }
}

module.exports = { Doc, CONTENT_W };
