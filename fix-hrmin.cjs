const fs = require('fs');

const appFile = 'src/App.jsx';
let app = fs.readFileSync(appFile, 'utf8');

// Insert helper
const helperStr = `
const formatTime = (totalMins) => {
  const m = Math.round(totalMins || 0);
  const h = Math.floor(m / 60);
  const mins = m % 60;
  if (h === 0) return \`\${mins}m\`;
  if (mins === 0) return \`\${h}h\`;
  return \`\${h}h \${mins}m\`;
};
`;

if (!app.includes('formatTime')) {
  app = app.replace(`const createNewLog = () => {`, helperStr + `\nconst createNewLog = () => {`);
}

// 1. App YTD / Dash
app = app.replace(`<span>Total Mins</span>`, `<span>Total Time</span>`);
app = app.replace(`<span className="ytd-stat-value">{ytdMins}</span>`, `<span className="ytd-stat-value">{formatTime(ytdMins)}</span>`);
app = app.replace(`<div>Total Mins</div>`, `<div>Total Time</div>`);
app = app.replace(`{totalMins} mins`, `{formatTime(totalMins)}`);

// 2. Pending
app = app.replace(`<span>Pending Mins</span>`, `<span>Pending Time</span>`);
app = app.replace(`{displayPendingTasks.reduce((s, wl) => s + (Number(wl.minutes) || 0), 0)}`, `{formatTime(displayPendingTasks.reduce((s, wl) => s + (Number(wl.minutes) || 0), 0))}`);
app = app.replace(`{item.minutes}m @`, `{formatTime(item.minutes)} @`);

// 3. Editor View Top
app = app.replace(`<span>Total Mins:</span>`, `<span>Total Time:</span>`);
app = app.replace(`<span className="stat-val">{totalMins}</span>`, `<span className="stat-val">{formatTime(totalMins)}</span>`);

// 4. Editor Table
app = app.replace(`<div>Mins</div>`, `<div>Time</div>`);

const oldInput = `<div>
                  <input 
                    type="number" 
                    value={item.minutes}
                    onChange={(e) => updateWorkLogItem(item.id, 'minutes', parseInt(e.target.value, 10) || 0)}
                    min="0" step="1"
                  />
                </div>`;

const newInput = `<div>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <input 
                      type="number" 
                      value={Math.floor((item.minutes || 0) / 60)}
                      onChange={(e) => updateWorkLogItem(item.id, 'minutes', (parseInt(e.target.value || 0, 10) * 60) + ((item.minutes || 0) % 60))}
                      min="0" style={{width: '40px', padding: '4px'}}
                    /><span style={{fontSize: '0.8rem', fontWeight: 'bold'}}>h</span>
                    <input 
                      type="number" 
                      value={(item.minutes || 0) % 60}
                      onChange={(e) => updateWorkLogItem(item.id, 'minutes', (Math.floor((item.minutes || 0) / 60) * 60) + parseInt(e.target.value || 0, 10))}
                      min="0" max="59" style={{width: '40px', padding: '4px'}}
                    /><span style={{fontSize: '0.8rem', fontWeight: 'bold'}}>m</span>
                  </div>
                </div>`;

app = app.replace(oldInput, newInput);

fs.writeFileSync(appFile, app);


const pdfFile = 'src/PdfDocument.jsx';
let pdfDoc = fs.readFileSync(pdfFile, 'utf8');

if (!pdfDoc.includes('formatTime')) {
  pdfDoc = pdfDoc.replace(`const styles = StyleSheet.create`, helperStr + `\nconst styles = StyleSheet.create`);
}

pdfDoc = pdfDoc.replace(`>Total Mins:<`, `>Total Time:<`);
pdfDoc = pdfDoc.replace(`>{totalMins}<`, `>{formatTime(totalMins)}<`);
pdfDoc = pdfDoc.replace(`>Mins<`, `>Time<`);
pdfDoc = pdfDoc.replace(`>{item.minutes}<`, `>{formatTime(item.minutes)}<`);
pdfDoc = pdfDoc.replace(`colMins: { width: '8%' }`, `colMins: { width: '12%' }`);
pdfDoc = pdfDoc.replace(`colProject: { width: '30%' }`, `colProject: { width: '26%' }`);

fs.writeFileSync(pdfFile, pdfDoc);

const cssFile = 'src/App.css';
let css = fs.readFileSync(cssFile, 'utf8');
css = css.replace(`grid-template-columns: 125px 130px 1fr 60px 80px 125px 100px 40px;`, `grid-template-columns: 125px 130px 1fr 120px 80px 125px 100px 40px;`);
css = css.replace(`grid-template-columns: 125px 130px 1fr 60px 80px 125px 100px 40px;`, `grid-template-columns: 125px 130px 1fr 120px 80px 125px 100px 40px;`);
fs.writeFileSync(cssFile, css);

console.log("hr+min script complete");
