const fs = require('fs');

const appFile = 'src/App.jsx';
let app = fs.readFileSync(appFile, 'utf8');

const helperStr = `
const getEarnings = (wl) => {
  if (wl.payType === 'fixed') return Number(wl.fixedPay) || 0;
  return ((Number(wl.minutes) || 0) / 60) * (Number(wl.hourlyRate) || 0);
};
`;

if (!app.includes('getEarnings')) {
  app = app.replace(`const createNewLog = () => {`, helperStr + `\nconst createNewLog = () => {`);
}

// Default models
app = app.replace(`minutes: 240, \n        hourlyRate: 25.0,`, `minutes: 240, \n        hourlyRate: 25.0, \n        payType: 'hourly', \n        fixedPay: 0,`);
app = app.replace(`minutes: 0, \n      hourlyRate: 20,`, `minutes: 0, \n      hourlyRate: 20, \n      payType: 'hourly', \n      fixedPay: 0,`);

// Replacements
app = app.replaceAll(`(((Number(wl.minutes) || 0) / 60) * (Number(wl.hourlyRate) || 0))`, `getEarnings(wl)`);
app = app.replaceAll(`(((Number(item.minutes) || 0) / 60) * (Number(item.hourlyRate) || 0))`, `getEarnings(item)`);
app = app.replace(
  `{formatTime(item.minutes)} @ \${item.hourlyRate}/h = \${((item.minutes / 60) * item.hourlyRate).toFixed(2)}`,
  `{item.payType === 'fixed' ? 'Fixed Pay' : \`\${formatTime(item.minutes)} @ \$\${item.hourlyRate}/h\`} = \$\${getEarnings(item).toFixed(2)}`
);

app = app.replace(`<div>Rate</div>`, `<div>Pay Details</div>`);

const oldRateInput = `<div>
                  <div className="input-with-prefix">
                    <span>$</span>
                    <input 
                      type="number" 
                      value={item.hourlyRate}
                      onChange={(e) => updateWorkLogItem(item.id, 'hourlyRate', parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                </div>`;

const newRateInput = `<div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                  <select 
                    value={item.payType || 'hourly'}
                    onChange={(e) => updateWorkLogItem(item.id, 'payType', e.target.value)}
                    style={{padding: '2px', fontSize: '0.8rem'}}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="fixed">Fixed</option>
                  </select>
                  
                  {(!item.payType || item.payType === 'hourly') ? (
                    <>
                      <div className="input-with-prefix">
                        <span>$</span>
                        <input 
                          type="number" 
                          value={item.hourlyRate}
                          onChange={(e) => updateWorkLogItem(item.id, 'hourlyRate', parseFloat(e.target.value) || 0)}
                          min="0" style={{padding: '4px'}}
                        /><span style={{fontSize:'0.8rem', fontWeight:'bold'}}>/h</span>
                      </div>
                      <div style={{fontSize: '0.8rem', fontWeight: 'bold', textAlign: 'right'}}>
                        Total: \${getEarnings(item).toFixed(2)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="input-with-prefix">
                        <span>$</span>
                        <input 
                          type="number" 
                          value={item.fixedPay || 0}
                          onChange={(e) => updateWorkLogItem(item.id, 'fixedPay', parseFloat(e.target.value) || 0)}
                          min="0" style={{padding: '4px'}}
                        /><span style={{fontSize:'0.8rem', fontWeight:'bold'}}>tot</span>
                      </div>
                      {item.minutes > 0 && (
                        <div style={{fontSize: '0.8rem', fontWeight: 'bold', textAlign: 'right', color: 'var(--text-muted)'}}>
                          ~\${(item.fixedPay / (item.minutes / 60)).toFixed(2)}/h
                        </div>
                      )}
                    </>
                  )}
                </div>`;

app = app.replace(oldRateInput, newRateInput);

// CSV fixes
app = app.replace(`((wl.minutes / 60) * wl.hourlyRate).toFixed(2),`, `getEarnings(wl).toFixed(2),`);

fs.writeFileSync(appFile, app);


const pdfFile = 'src/PdfDocument.jsx';
let pdfDoc = fs.readFileSync(pdfFile, 'utf8');

if (!pdfDoc.includes('getEarnings')) {
  pdfDoc = pdfDoc.replace(`const styles = StyleSheet.create`, helperStr + `\nconst styles = StyleSheet.create`);
}

pdfDoc = pdfDoc.replaceAll(`(((Number(item.minutes) || 0) / 60) * (Number(item.hourlyRate) || 0))`, `getEarnings(item)`);
pdfDoc = pdfDoc.replace(`>Rate<`, `>Pay Details<`);

const oldPdfRate = `<Text style={[styles.colRate, styles.tableCell, {fontFamily: 'Courier'}]}>\${item.hourlyRate}</Text>`;
const newPdfRate = `<View style={[styles.colRate, {flexDirection: 'column'}]}>
                <Text style={[styles.tableCell, {fontFamily: 'Courier'}]}>
                  {item.payType === 'fixed' ? \`\$\${Number(item.fixedPay || 0).toFixed(2)} (Fixed)\` : \`\$\${item.hourlyRate}/h\`}
                </Text>
                <Text style={[styles.tableCell, {fontFamily: 'Courier', fontSize: 7, color: '#666', marginTop: 2}]}>
                  {item.payType === 'fixed' && item.minutes > 0 ? \`~\$\${(item.fixedPay / (item.minutes / 60)).toFixed(2)}/h\` : ''}
                  {item.payType !== 'fixed' ? \`Tot: \$\${getEarnings(item).toFixed(2)}\` : ''}
                </Text>
              </View>`;

pdfDoc = pdfDoc.replace(oldPdfRate, newPdfRate);
pdfDoc = pdfDoc.replace(`colRate: { width: '10%' }`, `colRate: { width: '15%' }`);
pdfDoc = pdfDoc.replace(`colProject: { width: '26%' }`, `colProject: { width: '21%' }`);

fs.writeFileSync(pdfFile, pdfDoc);

const cssFile = 'src/App.css';
let css = fs.readFileSync(cssFile, 'utf8');
css = css.replace(`grid-template-columns: 125px 130px 1fr 120px 80px 125px 100px 40px;`, `grid-template-columns: 125px 130px 1fr 120px 110px 125px 100px 40px;`);
css = css.replace(`grid-template-columns: 125px 130px 1fr 120px 80px 125px 100px 40px;`, `grid-template-columns: 125px 130px 1fr 120px 110px 125px 100px 40px;`);
fs.writeFileSync(cssFile, css);

console.log("paytypes script complete");
