const fs = require('fs');

const missingBlock = `
                      <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                        <div style={{color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 700}}>{item.projectName || 'Unnamed Project'}</div>
                        <div style={{fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600}}>
                          {item.payType === 'fixed' ? 'Fixed Pay' : \`\${formatTime(item.minutes)} @ \$\${item.hourlyRate}/h\`} = \$\${getEarnings(item).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <input 
                          type="date"
                          value={item.cashOutDate}
                          onChange={(e) => updateGlobalWorkLogItem(item.logId, item.id, { cashOutDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <select 
                          className={\`status-select status-\${item.status.toLowerCase().replace(' ', '-')}\`}
                          value={item.status}
                          onChange={(e) => updateGlobalWorkLogItem(item.logId, item.id, { status: e.target.value })}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Cleared">Cleared</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Quality Issue">Quality Issue</option>
                        </select>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <button className="icon-only" onClick={() => removeGlobalWorkLog(item.logId, item.id)}>
                          <Trash2 size={18} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ----------------- EDITOR VIEW -----------------
  if (!activeLog) return null;
  
  const totalMins = activeLog.workLogs.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
  const totalEarnings = activeLog.workLogs.reduce((sum, item) => sum + getEarnings(item), 0);
  const totalTransferred = activeLog.payouts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="app-container">
      {/* Action Bar */}
      <div className="editor-top-bar no-print">
        <button className="btn-secondary back-btn" onClick={() => setActiveLogId(null)}>
          <ArrowLeft size={16} /> DASHBOARD
        </button>
        <div className="editor-actions">
          <button className="btn-secondary" onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? 'EXPORTING...' : <><Download size={16} /> DOWNLOAD PDF</>}
          </button>
        </div>
      </div>

      {/* Log Document */}
      <div id="log-document-capture" className={\`invoice-document log-document \${isExporting ? 'exporting' : ''}\`}>
        
        {/* Header Section */}
        <h1 className="doc-title">WORK_LOG</h1>
        
        <div className="metadata-grid">
          <div className="meta-item">
            <label>Name:</label>
            <input 
              className="inline-input"
              value={activeLog.userName}
              onChange={(e) => updateActiveLog({ userName: e.target.value })}
            />
          </div>
          <div className="meta-item">
            <label>Tax Year:</label>
            <input 
              className="inline-input"
              value={activeLog.taxYear}
              onChange={(e) => updateActiveLog({ taxYear: e.target.value })}
            />
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="summary-section">
          <h2>SUMMARY <input 
            className="inline-input summary-month"
            value={activeLog.monthYear}
            onChange={(e) => updateActiveLog({ monthYear: e.target.value.toUpperCase() })}
            placeholder="MAY 2026"
          /></h2>
          <div className="summary-stats">
            <div className="stat-row">
              <span>Total Time:</span>
              <span className="stat-val">{formatTime(totalMins)}</span>
            </div>
            <div className="stat-row">
              <span>Project Earnings:</span>
              <span className="stat-val">\${totalEarnings.toFixed(2)}</span>
            </div>
            <div className="stat-row">
              <span>Transferred:</span>
              <span className="stat-val">\${totalTransferred.toFixed(2)}</span>
            </div>
            <div className="stat-row" style={{borderTop: '2px solid #000', paddingTop: '0.5rem', marginTop: '0.25rem'}}>
              <span>Outstanding:</span>
              <span className="stat-val">
                \${Math.max(0, totalEarnings - totalTransferred).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Work Log Breakdown */}
        <div className="section-block">
          <h3>WORK LOG BREAKDOWN</h3>
          <div className="work-log-table">
            <div className="wl-header">
              <div>Date</div>
              <div>Platform</div>
              <div>Project Name / ID</div>
              <div>Time</div>
              <div>Rate</div>
              <div>Total</div>
              <div>Cash-Out</div>
              <div>Status</div>
              <div className="no-print"></div>
            </div>
            
            {activeLog.workLogs.map((item) => (
              <div key={item.id} className="wl-row">`;

const appFile = 'src/App.jsx';
let app = fs.readFileSync(appFile, 'utf8');

// The corrupted block starts after `item.platform` in pending row.
const anchor = `<div style={{color: 'var(--text-main)', fontWeight: 700}}>{item.platform}</div>`;
const anchorIndex = app.indexOf(anchor);

if (anchorIndex === -1) {
  console.log("Anchor not found!");
  process.exit(1);
}

// Find the start of the bad block (which is the bidirectional input)
// Find the first `<div>` after anchor
const badStart = app.indexOf(`\n                <div>\n                  <div className="input-with-prefix">`, anchorIndex);

// Find the end of the bad block, which ends with `</div>\n                </div>` right before `<div>\n                  <input \n                    type="date"`
const editorDateInput = `<div>\n                  <input \n                    type="date"`;
const badEnd = app.indexOf(editorDateInput, badStart);

if (badStart === -1 || badEnd === -1) {
  console.log("Bad boundaries not found!");
  process.exit(1);
}

// Replace the bad block with the missing block!
const before = app.substring(0, badStart);
const after = app.substring(badEnd);

app = before + missingBlock + "\n                " + after;

// Now, we need to correctly replace the OLD dropdown in the Editor section.
// The dropdown is still there!
const dropdownBlockStart = `<div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                  <select 
                    value={item.payType || 'hourly'}`;

const bidirectionalInputs = `<div>
                  <div className="input-with-prefix">
                    <span style={{fontSize: '0.75rem'}}>$</span>
                    <input 
                      type="number" 
                      value={item.hourlyRate ? Number(item.hourlyRate).toFixed(2) : ''}
                      onChange={(e) => updateWorkLogItem(item.id, (prev) => {
                        const newRate = parseFloat(e.target.value) || 0;
                        return { 
                          hourlyRate: newRate, 
                          fixedPay: ((prev.minutes || 0) / 60) * newRate,
                          payType: 'hourly'
                        };
                      })}
                      min="0" style={{padding: '2px', fontSize: '0.75rem', width: '50px'}}
                    /><span style={{fontSize:'0.7rem', fontWeight:'bold'}}>/h</span>
                  </div>
                </div>
                <div>
                  <div className="input-with-prefix">
                    <span style={{fontSize: '0.75rem'}}>$</span>
                    <input 
                      type="number" 
                      value={item.fixedPay !== undefined ? Number(item.fixedPay).toFixed(2) : ''}
                      onChange={(e) => updateWorkLogItem(item.id, (prev) => {
                        const newTotal = parseFloat(e.target.value) || 0;
                        return {
                          fixedPay: newTotal,
                          hourlyRate: (prev.minutes || 0) > 0 ? newTotal / ((prev.minutes || 0) / 60) : 0,
                          payType: 'fixed'
                        };
                      })}
                      min="0" style={{padding: '2px', fontSize: '0.75rem', width: '60px'}}
                    />
                  </div>
                </div>`;

const ddStart = app.indexOf(dropdownBlockStart);
if (ddStart !== -1) {
  const ddEnd = app.indexOf(`</div>\n                <div>\n                  <input \n                    type="date"`, ddStart);
  if (ddEnd !== -1) {
    app = app.substring(0, ddStart) + bidirectionalInputs + "\n" + app.substring(ddEnd);
  } else {
    console.log("Could not find end of dropdown block");
  }
} else {
  console.log("Dropdown block not found, maybe already fixed?");
}

// Ensure the syntax error is fixed everywhere just in case
app = app.replaceAll(/parseFloat\(e\.target\.value \}\) \|\| 0\)\}/g, "parseFloat(e.target.value) || 0 })}");
app = app.replace(`{ hourlyRate: parseFloat(e.target.value }) || 0}`, `{ hourlyRate: parseFloat(e.target.value) || 0 }`);
app = app.replace(`{ fixedPay: parseFloat(e.target.value }) || 0}`, `{ fixedPay: parseFloat(e.target.value) || 0 }`);

fs.writeFileSync(appFile, app);
console.log("Repair script complete");
