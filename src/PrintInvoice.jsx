import React, { forwardRef } from 'react';

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

const formatDate = (isoString) => {
  if (!isoString) return '';
  const parts = isoString.split('-');
  if (parts.length !== 3) return isoString;
  const yy = parts[0].slice(2);
  return `${parts[2]}/${parts[1]}/${yy}`;
};

/* ── shared style constants ── */
const FONT = "'Inter', 'Segoe UI', system-ui, sans-serif";
const BLACK = '#111';
const GRAY = '#555';
const LIGHT = '#f5f5f5';
const BORDER = '#ddd';

const S = {
  page: {
    fontFamily: FONT,
    color: BLACK,
    padding: '40px 48px',
    width: '100%',
    boxSizing: 'border-box',
    background: '#fff',
    lineHeight: 1.55,
  },

  /* ── header ── */
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottom: `3px solid ${BLACK}`,
    paddingBottom: 10,
    marginBottom: 28,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: '-0.03em',
    textTransform: 'uppercase',
  },
  subtitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: GRAY,
    textAlign: 'right',
  },

  /* ── meta block ── */
  metaWrap: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 40,
  },
  metaCol: { flex: 1 },
  metaLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: GRAY,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 10,
  },

  /* ── summary card ── */
  summaryCard: {
    display: 'flex',
    gap: 0,
    marginBottom: 32,
    border: `2px solid ${BLACK}`,
    borderRadius: 0,
    overflow: 'hidden',
  },
  summaryItem: {
    flex: 1,
    padding: '14px 18px',
    borderRight: `1px solid ${BORDER}`,
  },
  summaryItemLast: {
    flex: 1,
    padding: '14px 18px',
    background: BLACK,
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
  },
  summaryLabelWhite: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
    color: 'rgba(255,255,255,0.65)',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 900,
  },
  summaryValueWhite: {
    fontSize: 20,
    fontWeight: 900,
    color: '#fff',
  },

  /* ── section headings ── */
  sectionHead: {
    fontSize: 14,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: `2px solid ${BLACK}`,
    paddingBottom: 6,
    marginTop: 8,
    marginBottom: 16,
  },

  /* ── platform group ── */
  platformWrap: { marginBottom: 22 },
  platformTitle: {
    fontSize: 12,
    fontWeight: 800,
    padding: '6px 12px',
    background: LIGHT,
    borderLeft: `4px solid ${BLACK}`,
    marginBottom: 8,
    marginTop: 0,
  },

  /* ── table ── */
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 11,
    marginBottom: 4,
  },
  th: {
    textAlign: 'left',
    fontWeight: 800,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    padding: '8px 6px',
    borderBottom: `2px solid ${BLACK}`,
    color: GRAY,
  },
  td: {
    padding: '7px 6px',
    borderBottom: `1px solid ${BORDER}`,
    verticalAlign: 'top',
    fontSize: 11,
    fontWeight: 500,
  },
  tdBold: {
    padding: '7px 6px',
    borderBottom: `1px solid ${BORDER}`,
    verticalAlign: 'top',
    fontSize: 11,
    fontWeight: 700,
  },

  /* ── divider ── */
  hr: {
    border: 'none',
    borderTop: `1px solid ${BORDER}`,
    margin: '24px 0',
  },

  /* ── footer ── */
  footer: {
    textAlign: 'center',
    fontSize: 9,
    color: '#999',
    marginTop: 36,
    paddingTop: 12,
    borderTop: `1px solid ${BORDER}`,
  },
};

export const PrintInvoice = forwardRef(({ log }, ref) => {
  if (!log) return null;

  const totalMins = log.workLogs.reduce((sum, i) => sum + (Number(i.minutes) || 0), 0);
  const totalEarnings = log.workLogs.reduce((sum, i) => sum + getEarnings(i), 0);
  const totalTransferred = log.payouts.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const outstanding = Math.max(0, totalEarnings - totalTransferred);

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

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div ref={ref} style={S.page}>

      {/* ── HEADER ── */}
      <div style={S.header}>
        <h1 style={S.title}>Work Log</h1>
        <div>
          <div style={S.subtitle}>{log.monthYear}</div>
          <div style={{...S.subtitle, fontSize: 11, marginTop: 2}}>Generated {today}</div>
        </div>
      </div>

      {/* ── META ── */}
      <div style={S.metaWrap}>
        <div style={S.metaCol}>
          <div style={S.metaLabel}>Name</div>
          <div style={S.metaValue}>{log.userName || '—'}</div>
          <div style={S.metaLabel}>Email</div>
          <div style={S.metaValue}>{log.userEmail || '—'}</div>
        </div>
        <div style={S.metaCol}>
          <div style={S.metaLabel}>Phone</div>
          <div style={S.metaValue}>{log.userPhone || '—'}</div>
          <div style={S.metaLabel}>Address</div>
          <div style={S.metaValue}>{log.userAddress || '—'}</div>
        </div>
        <div style={S.metaCol}>
          <div style={S.metaLabel}>Tax Year</div>
          <div style={S.metaValue}>{log.taxYear || '—'}</div>
        </div>
      </div>

      {/* ── SUMMARY ── */}
      <div style={S.summaryCard}>
        <div style={S.summaryItem}>
          <div style={S.summaryLabel}>Total Time</div>
          <div style={S.summaryValue}>{formatTime(totalMins)}</div>
        </div>
        <div style={S.summaryItem}>
          <div style={S.summaryLabel}>Earned</div>
          <div style={S.summaryValue}>${totalEarnings.toFixed(2)}</div>
        </div>
        <div style={S.summaryItem}>
          <div style={S.summaryLabel}>Transferred</div>
          <div style={S.summaryValue}>${totalTransferred.toFixed(2)}</div>
        </div>
        <div style={S.summaryItemLast}>
          <div style={S.summaryLabelWhite}>Outstanding</div>
          <div style={S.summaryValueWhite}>${outstanding.toFixed(2)}</div>
        </div>
      </div>

      {/* ── WORK BREAKDOWN ── */}
      <div style={S.sectionHead}>Work Breakdown</div>

      {Object.keys(grouped).map(platform => {
        const items = grouped[platform];
        const platformTotal = items.reduce((s, i) => s + getEarnings(i), 0);
        const platformMins  = items.reduce((s, i) => s + (Number(i.minutes) || 0), 0);

        return (
          <div key={platform} style={S.platformWrap}>
            <h4 style={S.platformTitle}>
              {platform}
              <span style={{ float: 'right', fontWeight: 600, color: GRAY }}>
                {formatTime(platformMins)} · ${platformTotal.toFixed(2)}
              </span>
            </h4>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{...S.th, width: '12%'}}>Date</th>
                  <th style={{...S.th, width: '34%'}}>Project</th>
                  <th style={{...S.th, width: '10%'}}>Time</th>
                  <th style={{...S.th, width: '22%'}}>Pay Details</th>
                  <th style={{...S.th, width: '12%', textAlign: 'right'}}>Total</th>
                  <th style={{...S.th, width: '10%', textAlign: 'center'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={S.td}>{formatDate(item.dateWorked)}</td>
                    <td style={S.td}>{item.projectName || 'Unnamed'}</td>
                    <td style={S.td}>{formatTime(item.minutes)}</td>
                    <td style={S.td}>
                      {(!item.minutes || item.minutes === 0)
                        ? 'Fixed'
                        : `${formatTime(item.minutes)} × $${Number(item.hourlyRate || 0).toFixed(2)}/hr`
                      }
                    </td>
                    <td style={{...S.tdBold, textAlign: 'right'}}>${getEarnings(item).toFixed(2)}</td>
                    <td style={{...S.td, textAlign: 'center'}}>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* ── PAYOUT HISTORY ── */}
      <hr style={S.hr} />
      <div style={S.sectionHead}>Payout History</div>

      {log.payouts.length === 0 ? (
        <div style={{ fontSize: 12, color: GRAY, fontStyle: 'italic' }}>No transfers recorded this period.</div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{...S.th, width: '25%'}}>Method</th>
              <th style={{...S.th, width: '25%'}}>Date</th>
              <th style={{...S.th, width: '25%', textAlign: 'right'}}>Amount</th>
              <th style={{...S.th, width: '25%'}}>Transfer ID</th>
            </tr>
          </thead>
          <tbody>
            {log.payouts.map(item => (
              <tr key={item.id}>
                <td style={S.td}>{item.method}</td>
                <td style={S.td}>{formatDate(item.date)}</td>
                <td style={{...S.tdBold, textAlign: 'right'}}>${Number(item.amount).toFixed(2)}</td>
                <td style={S.td}>{item.transferId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── FOOTER ── */}
      <div style={S.footer}>
        This document was auto-generated. All values are based on manually entered data.
      </div>
    </div>
  );
});
