import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ── helpers ── */
const fmt = (n) => `$${Number(n).toFixed(2)}`;

const formatTime = (totalMins) => {
  const m = Math.round(totalMins || 0);
  const h = Math.floor(m / 60);
  const mins = m % 60;
  if (h === 0) return `${mins}m`;
  if (mins === 0) return `${h}h`;
  return `${h}h ${mins}m`;
};

const getEarnings = (wl) => {
  if (wl.payType === 'fixed') return Number(wl.fixedPay) || 0;
  return ((Number(wl.minutes) || 0) / 60) * (Number(wl.hourlyRate) || 0);
};

const formatDate = (iso) => {
  if (!iso) return '';
  const p = iso.split('-');
  if (p.length !== 3) return iso;
  return `${p[2]}/${p[1]}/${p[0].slice(2)}`;
};

/* ── colours ── */
const BLACK = [17, 17, 17];
const GRAY = [100, 100, 100];
const LIGHT_BG = [245, 245, 245];
const WHITE = [255, 255, 255];
const BORDER = [200, 200, 200];
const ACCENT = [99, 102, 241];

/* ══════════════════════════════════════════
   Main export function
   ══════════════════════════════════════════ */
export function generateWorkLogPDF(log) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  /* ── HEADER ── */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...ACCENT);
  doc.text('WORK LOG', margin, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(log.monthYear || '', pageW - margin, y + 2, { align: 'right' });

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Generated ${today}`, pageW - margin, y + 7, { align: 'right' });

  y += 12;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  /* ── CONTACT INFO ── */
  const metaLeft = [
    ['Name', log.userName || '—'],
    ['Email', log.userEmail || '—'],
  ];
  const metaMid = [
    ['Phone', log.userPhone || '—'],
    ['Address', log.userAddress || '—'],
  ];
  const metaRight = [
    ['Tax Year', log.taxYear || '—'],
  ];

  const drawMeta = (pairs, x) => {
    let localY = y;
    pairs.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(label.toUpperCase(), x, localY);
      localY += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...BLACK);
      doc.text(String(value), x, localY);
      localY += 7;
    });
  };

  const colW = contentW / 3;
  drawMeta(metaLeft, margin);
  drawMeta(metaMid, margin + colW);
  drawMeta(metaRight, margin + colW * 2);
  y += 24;

  /* ── SUMMARY BAR ── */
  const totalMins = log.workLogs.reduce((s, i) => s + (Number(i.minutes) || 0), 0);
  const totalEarnings = log.workLogs.reduce((s, i) => s + getEarnings(i), 0);
  const totalTransferred = log.payouts.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const outstanding = Math.max(0, totalEarnings - totalTransferred);

  const boxW = contentW / 4;
  const boxH = 18;

  const drawSummaryBox = (x, label, value, inverted) => {
    if (inverted) {
      doc.setFillColor(...ACCENT);
      doc.rect(x, y, boxW, boxH, 'F');
      doc.setTextColor(220, 220, 255);
    } else {
      doc.setDrawColor(...BORDER);
      doc.setFillColor(...WHITE);
      doc.rect(x, y, boxW, boxH, 'FD');
      doc.setTextColor(...GRAY);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(label.toUpperCase(), x + 4, y + 6);

    if (inverted) doc.setTextColor(255, 255, 255);
    else doc.setTextColor(...BLACK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(value, x + 4, y + 14);
  };

  // Outer border
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentW, boxH);

  drawSummaryBox(margin, 'Total Time', formatTime(totalMins), false);
  drawSummaryBox(margin + boxW, 'Earned', fmt(totalEarnings), false);
  drawSummaryBox(margin + boxW * 2, 'Transferred', fmt(totalTransferred), false);
  drawSummaryBox(margin + boxW * 3, 'Outstanding', fmt(outstanding), true);

  y += boxH + 12;

  /* ── SECTION: WORK BREAKDOWN ── */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text('WORK BREAKDOWN', margin, y);
  y += 2;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Group by platform
  const grouped = {};
  log.workLogs.forEach(item => {
    const p = item.platform || 'Other';
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(item);
  });
  Object.values(grouped).forEach(arr =>
    arr.sort((a, b) => new Date(a.dateWorked) - new Date(b.dateWorked))
  );

  Object.keys(grouped).forEach(platform => {
    const items = grouped[platform];
    const platformTotal = items.reduce((s, i) => s + getEarnings(i), 0);
    const platformMins = items.reduce((s, i) => s + (Number(i.minutes) || 0), 0);

    // Check if we need a new page
    if (y > 260) { doc.addPage(); y = margin; }

    // Platform header bar
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.1);
    doc.rect(margin, y - 4, contentW, 8, 'F');
    // Left accent
    doc.setFillColor(...ACCENT);
    doc.rect(margin, y - 4, 1.5, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text(platform, margin + 4, y + 1);

    // Subtotals on the right
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(`${formatTime(platformMins)}  ·  ${fmt(platformTotal)}`, pageW - margin - 2, y + 1, { align: 'right' });

    y += 8;

    // Table for this platform
    const tableBody = items.map(item => {
      const earnings = getEarnings(item);
      const payDetails = (!item.minutes || item.minutes === 0)
        ? 'Fixed'
        : `${formatTime(item.minutes)} × ${fmt(item.hourlyRate)}/hr`;

      // Strip emoji codepoints to text (jsPDF can't render most emoji)
      const projectName = (item.projectName || 'Unnamed')
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')
        .trim() || 'Unnamed';

      return [
        formatDate(item.dateWorked),
        projectName,
        formatTime(item.minutes),
        payDetails,
        fmt(earnings),
        item.status,
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Date', 'Project', 'Time', 'Pay Details', 'Total', 'Status']],
      body: tableBody,
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
        textColor: BLACK,
        lineColor: BORDER,
        lineWidth: 0.1,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: ACCENT,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      },
      columnStyles: {
        0: { cellWidth: 18 },       // Date
        1: { cellWidth: 'auto' },    // Project
        2: { cellWidth: 16 },        // Time
        3: { cellWidth: 38 },        // Pay Details
        4: { cellWidth: 20, halign: 'right', fontStyle: 'bold' }, // Total
        5: { cellWidth: 18, halign: 'center' }, // Status
      },
    });

    y = doc.lastAutoTable.finalY + 8;
  });

  /* ── SEPARATOR ── */
  if (y > 255) { doc.addPage(); y = margin; }
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  /* ── SECTION: PAYOUT HISTORY ── */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text('PAYOUT HISTORY', margin, y);
  y += 2;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  if (log.payouts.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text('No transfers recorded this period.', margin, y + 4);
    y += 12;
  } else {
    const payoutBody = log.payouts.map(p => [
      p.method,
      formatDate(p.date),
      fmt(p.amount),
      p.transferId || '—',
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Method', 'Date', 'Amount', 'Transfer ID']],
      body: payoutBody,
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
        textColor: BLACK,
        lineColor: BORDER,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: ACCENT,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      },
      columnStyles: {
        2: { halign: 'right', fontStyle: 'bold' },
      },
    });

    y = doc.lastAutoTable.finalY + 6;
  }

  /* ── FOOTER ── */
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.15);
  doc.line(margin, pageH - 14, pageW - margin, pageH - 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text('This document was auto-generated. All values are based on manually entered data.', pageW / 2, pageH - 10, { align: 'center' });

  /* ── EMBED DATA ── */
  try {
    const payload = btoa(encodeURIComponent(JSON.stringify(log)));
    doc.setProperties({
      title: `Work_Log_${log.monthYear}`,
      keywords: `FREELOG_DATA:${payload}`
    });
  } catch (err) {
    console.error('Failed to embed metadata', err);
  }

  /* ── SAVE ── */
  const filename = `Work_Log_${(log.monthYear || 'export').replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}
