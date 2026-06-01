const fs = require('fs');

const appFile = 'src/App.jsx';
let app = fs.readFileSync(appFile, 'utf8');

const oldHours = `<input 
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
                    />`;

const newHours = `<input 
                      type="number" 
                      value={Math.floor((item.minutes || 0) / 60) === 0 ? '' : Math.floor((item.minutes || 0) / 60)}
                      onChange={(e) => updateWorkLogItem(item.id, (prev) => {
                        const val = e.target.value;
                        const newMins = ((val === '' ? 0 : parseInt(val, 10)) * 60) + ((prev.minutes || 0) % 60);
                        if (prev.payType === 'fixed') {
                          return { minutes: newMins, hourlyRate: newMins > 0 ? (parseFloat(prev.fixedPay) || 0) / (newMins / 60) : 0 };
                        }
                        return { minutes: newMins, fixedPay: (newMins / 60) * (parseFloat(prev.hourlyRate) || 0) };
                      })}
                      min="0" style={{width: '35px', padding: '2px', fontSize: '0.75rem'}}
                    />`;

app = app.replace(oldHours, newHours);

const oldMins = `<input 
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
                    />`;

const newMins = `<input 
                      type="number" 
                      value={(item.minutes || 0) % 60 === 0 ? '' : (item.minutes || 0) % 60}
                      onChange={(e) => updateWorkLogItem(item.id, (prev) => {
                        const val = e.target.value;
                        const newMins = (Math.floor((prev.minutes || 0) / 60) * 60) + (val === '' ? 0 : parseInt(val, 10));
                        if (prev.payType === 'fixed') {
                          return { minutes: newMins, hourlyRate: newMins > 0 ? (parseFloat(prev.fixedPay) || 0) / (newMins / 60) : 0 };
                        }
                        return { minutes: newMins, fixedPay: (newMins / 60) * (parseFloat(prev.hourlyRate) || 0) };
                      })}
                      min="0" max="59" style={{width: '35px', padding: '2px', fontSize: '0.75rem'}}
                    />`;

app = app.replace(oldMins, newMins);

const oldRate = `<input 
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
                    />`;

const newRate = `<input 
                      type="number" 
                      value={item.hourlyRate === 0 ? '' : item.hourlyRate}
                      onChange={(e) => updateWorkLogItem(item.id, (prev) => {
                        const val = e.target.value;
                        return { 
                          hourlyRate: val, 
                          fixedPay: ((prev.minutes || 0) / 60) * (parseFloat(val) || 0),
                          payType: 'hourly'
                        };
                      })}
                      min="0" step="any" style={{padding: '2px', fontSize: '0.75rem', width: '50px'}}
                    />`;

app = app.replace(oldRate, newRate);

const oldTotal = `<input 
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
                    />`;

const newTotal = `<input 
                      type="number" 
                      value={item.fixedPay === 0 ? '' : item.fixedPay}
                      onChange={(e) => updateWorkLogItem(item.id, (prev) => {
                        const val = e.target.value;
                        return {
                          fixedPay: val,
                          hourlyRate: (prev.minutes || 0) > 0 ? (parseFloat(val) || 0) / ((prev.minutes || 0) / 60) : 0,
                          payType: 'fixed'
                        };
                      })}
                      min="0" step="any" style={{padding: '2px', fontSize: '0.75rem', width: '60px'}}
                    />`;

app = app.replace(oldTotal, newTotal);

fs.writeFileSync(appFile, app);
console.log("resistance script complete");
