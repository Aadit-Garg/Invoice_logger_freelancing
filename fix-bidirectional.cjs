const fs = require('fs');

const appFile = 'src/App.jsx';
let app = fs.readFileSync(appFile, 'utf8');

// We need to replace the updateWorkLogItem to support multi-field updates
// Wait, updateWorkLogItem currently only takes (itemId, field, value)
// We will replace updateWorkLogItem completely.
app = app.replace(
`  const updateWorkLogItem = (itemId, field, value) => {
    if (!activeLog) return;
    const newItems = activeLog.workLogs.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    );
    updateActiveLog({ workLogs: newItems });
  };`,
`  const updateWorkLogItem = (itemId, updates) => {
    if (!activeLog) return;
    const newItems = activeLog.workLogs.map(item => {
      if (item.id === itemId) {
        if (typeof updates === 'function') {
          return { ...item, ...updates(item) };
        }
        return { ...item, ...updates };
      }
      return item;
    });
    updateActiveLog({ workLogs: newItems });
  };`
);

// We must also update all single-field updateWorkLogItem calls!
// E.g. updateWorkLogItem(item.id, 'dateWorked', e.target.value) -> updateWorkLogItem(item.id, { dateWorked: e.target.value })
app = app.replaceAll(/updateWorkLogItem\((.*?),\s*'(.*?)',\s*(.*?)\)/g, "updateWorkLogItem($1, { $2: $3 })");


// We must also replace the Time inputs
const timeRegex = /<div style=\{\{ display: 'flex', gap: '2px', alignItems: 'center' \}\}>[\s\S]*?<\/div>/m;
const newTimeInput = `<div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <input 
                      type="number" 
                      value={Math.floor((item.minutes || 0) / 60)}
                      onChange={(e) => updateWorkLogItem(item.id, (prev) => {
                        const newMins = (parseInt(e.target.value || 0, 10) * 60) + ((prev.minutes || 0) % 60);
                        if (prev.payType === 'fixed') {
                          return { minutes: newMins, hourlyRate: newMins > 0 ? (prev.fixedPay || 0) / (newMins / 60) : 0 };
                        }
                        return { minutes: newMins, fixedPay: (newMins / 60) * (prev.hourlyRate || 0) };
                      })}
                      min="0" style={{width: '35px', padding: '2px', fontSize: '0.75rem'}}
                    /><span style={{fontSize: '0.7rem', fontWeight: 'bold'}}>h</span>
                    <input 
                      type="number" 
                      value={(item.minutes || 0) % 60}
                      onChange={(e) => updateWorkLogItem(item.id, (prev) => {
                        const newMins = (Math.floor((prev.minutes || 0) / 60) * 60) + parseInt(e.target.value || 0, 10);
                        if (prev.payType === 'fixed') {
                          return { minutes: newMins, hourlyRate: newMins > 0 ? (prev.fixedPay || 0) / (newMins / 60) : 0 };
                        }
                        return { minutes: newMins, fixedPay: (newMins / 60) * (prev.hourlyRate || 0) };
                      })}
                      min="0" max="59" style={{width: '35px', padding: '2px', fontSize: '0.75rem'}}
                    /><span style={{fontSize: '0.7rem', fontWeight: 'bold'}}>m</span>
                  </div>`;
app = app.replace(timeRegex, newTimeInput);

// We need to replace the Rate header and add Total header
app = app.replace(`<div>Pay Details</div>`, `<div>Rate</div>\n              <div>Total</div>`);

// We need to replace the Rate and Fixed Pay dropdown toggle component
const oldDropdownComponentRegex = /<div style=\{\{display: 'flex', flexDirection: 'column', gap: '4px'\}\}>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/m;
const newBidirectionalInputs = `
                <div>
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
                </div>
`;
// Actually, regex replacement for the old dropdown might be tricky because of nesting.
// I will just use string replacement on a known substring.
// First, find the start and end of the block.
const blockStart = `<div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>`;
const blockStartIndex = app.indexOf(blockStart);
const blockEndStr = `</select>`;
const nextDivEnd = app.indexOf(`<div>\n                  <input \n                    type="date"`, blockStartIndex);
const blockToReplace = app.substring(blockStartIndex, nextDivEnd);
// Wrap it properly
app = app.replace(blockToReplace, newBidirectionalInputs + `\n                `);

fs.writeFileSync(appFile, app);

// Update global CSS
const cssFile = 'src/App.css';
let css = fs.readFileSync(cssFile, 'utf8');

// Decrease font size globally for table inputs
css = css.replace(/padding: 6px 8px;\s*font-size: 0.9rem;/g, `padding: 4px 6px;\n  font-size: 0.75rem;`);
css = css.replace(/font-size: 0.85rem;\s*text-transform: uppercase;/g, `font-size: 0.75rem;\n  text-transform: uppercase;`);

// Adjust grid columns to fit both Rate and Total
// Old: 125px 130px 1fr 120px 110px 125px 100px 40px;
// New: 110px 110px 1fr 110px 85px 85px 110px 90px 30px; (8 columns now)
css = css.replaceAll(`125px 130px 1fr 120px 110px 125px 100px 40px`, `105px 110px 1fr 110px 85px 85px 110px 90px 30px`);
// pending-header: 100px 110px 140px 1fr 130px 120px 40px;
css = css.replaceAll(`100px 110px 140px 1fr 130px 120px 40px`, `90px 100px 120px 1fr 110px 100px 30px`);

fs.writeFileSync(cssFile, css);

console.log("bidirectional script complete");
