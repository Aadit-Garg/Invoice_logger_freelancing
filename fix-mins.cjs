const fs = require('fs');

const appFile = 'src/App.jsx';
let app = fs.readFileSync(appFile, 'utf8');

// 1. Storage migration
app = app.replace(
`      const saved = localStorage.getItem('freelanceLogsMulti');
      if (saved) return JSON.parse(saved);`,
`      const saved = localStorage.getItem('freelanceLogsMulti');
      if (saved) {
        let parsed = JSON.parse(saved);
        parsed = parsed.map(log => ({
          ...log,
          workLogs: log.workLogs.map(wl => {
            if (wl.hours !== undefined) {
              const newWl = { ...wl, minutes: Math.round(wl.hours * 60) };
              delete newWl.hours;
              return newWl;
            }
            return wl;
          })
        }));
        return parsed;
      }`
);

// 2. Default objects
app = app.replace(`hours: 4.0,`, `minutes: 240,`);
app = app.replace(`hours: 0,`, `minutes: 0,`);

// 3. Export CSV
app = app.replace(`"Hours",`, `"Minutes",`);
app = app.replace(`wl.hours,`, `wl.minutes,`);
app = app.replace(`(wl.hours * wl.hourlyRate).toFixed(2),`, `((wl.minutes / 60) * wl.hourlyRate).toFixed(2),`);

// 4. Calculations - YTD
app = app.replace(
  `const ytdHours = filteredLogs.reduce((sum, log) => sum + log.workLogs.reduce((s, wl) => s + (Number(wl.hours) || 0), 0), 0);`,
  `const ytdMins = filteredLogs.reduce((sum, log) => sum + log.workLogs.reduce((s, wl) => s + (Number(wl.minutes) || 0), 0), 0);`
);
app = app.replace(
  `const ytdEarnings = filteredLogs.reduce((sum, log) => sum + log.workLogs.reduce((s, wl) => s + ((Number(wl.hours) || 0) * (Number(wl.hourlyRate) || 0)), 0), 0);`,
  `const ytdEarnings = filteredLogs.reduce((sum, log) => sum + log.workLogs.reduce((s, wl) => s + (((Number(wl.minutes) || 0) / 60) * (Number(wl.hourlyRate) || 0)), 0), 0);`
);

// 5. Month / Platform Charts
app = app.replace(
  `const earned = log.workLogs.reduce((sum, wl) => sum + ((Number(wl.hours) || 0) * (Number(wl.hourlyRate) || 0)), 0);`,
  `const earned = log.workLogs.reduce((sum, wl) => sum + (((Number(wl.minutes) || 0) / 60) * (Number(wl.hourlyRate) || 0)), 0);`
);
app = app.replace(
  `platformTotals[plt] = (platformTotals[plt] || 0) + ((Number(wl.hours) || 0) * (Number(wl.hourlyRate) || 0));`,
  `platformTotals[plt] = (platformTotals[plt] || 0) + (((Number(wl.minutes) || 0) / 60) * (Number(wl.hourlyRate) || 0));`
);

// 6. YTD UI
app = app.replace(`<span>Total Hours</span>`, `<span>Total Mins</span>`);
app = app.replace(`{ytdHours.toFixed(1)}`, `{ytdMins}`);

// 7. Monthly List UI
app = app.replace(`<div>Total Hrs</div>`, `<div>Total Mins</div>`);
app = app.replace(
  `const totalHours = log.workLogs.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);`,
  `const totalMins = log.workLogs.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);`
);
app = app.replace(
  `const totalEarnings = log.workLogs.reduce((sum, item) => sum + ((Number(item.hours) || 0) * (Number(item.hourlyRate) || 0)), 0);`,
  `const totalEarnings = log.workLogs.reduce((sum, item) => sum + (((Number(item.minutes) || 0) / 60) * (Number(item.hourlyRate) || 0)), 0);`
);
app = app.replace(`{totalHours.toFixed(1)} hrs`, `{totalMins} mins`);

// 8. Pending UI
app = app.replace(
  `\${displayPendingTasks.reduce((s, wl) => s + ((Number(wl.hours) || 0) * (Number(wl.hourlyRate) || 0)), 0).toFixed(2)}`,
  `\${displayPendingTasks.reduce((s, wl) => s + (((Number(wl.minutes) || 0) / 60) * (Number(wl.hourlyRate) || 0)), 0).toFixed(2)}`
);
app = app.replace(`<span>Pending Hours</span>`, `<span>Pending Mins</span>`);
app = app.replace(
  `{displayPendingTasks.reduce((s, wl) => s + (Number(wl.hours) || 0), 0).toFixed(1)}`,
  `{displayPendingTasks.reduce((s, wl) => s + (Number(wl.minutes) || 0), 0)}`
);

app = app.replace(
  `{item.hours}h @ \${item.hourlyRate}/h = \${(item.hours * item.hourlyRate).toFixed(2)}`,
  `{item.minutes}m @ \${item.hourlyRate}/h = \${((item.minutes / 60) * item.hourlyRate).toFixed(2)}`
);

// 9. Editor Top
app = app.replace(
  `const totalHours = activeLog.workLogs.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);`,
  `const totalMins = activeLog.workLogs.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);`
);
app = app.replace(
  `const totalEarnings = activeLog.workLogs.reduce((sum, item) => sum + ((Number(item.hours) || 0) * (Number(item.hourlyRate) || 0)), 0);`,
  `const totalEarnings = activeLog.workLogs.reduce((sum, item) => sum + (((Number(item.minutes) || 0) / 60) * (Number(item.hourlyRate) || 0)), 0);`
);
app = app.replace(`<span>Total Hours:</span>`, `<span>Total Mins:</span>`);
app = app.replace(`{totalHours.toFixed(1)}`, `{totalMins}`);

// 10. Editor Table
app = app.replace(`<div>Hrs</div>`, `<div>Mins</div>`);
app = app.replace(
  `                    value={item.hours}
                    onChange={(e) => updateWorkLogItem(item.id, 'hours', parseFloat(e.target.value) || 0)}
                    min="0" step="0.1"`,
  `                    value={item.minutes}
                    onChange={(e) => updateWorkLogItem(item.id, 'minutes', parseInt(e.target.value, 10) || 0)}
                    min="0" step="1"`
);

fs.writeFileSync(appFile, app);


const pdfFile = 'src/PdfDocument.jsx';
let pdfDoc = fs.readFileSync(pdfFile, 'utf8');

pdfDoc = pdfDoc.replace(
  `const totalHours = log.workLogs.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);`,
  `const totalMins = log.workLogs.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);`
);
pdfDoc = pdfDoc.replace(
  `const totalEarnings = log.workLogs.reduce((sum, item) => sum + ((Number(item.hours) || 0) * (Number(item.hourlyRate) || 0)), 0);`,
  `const totalEarnings = log.workLogs.reduce((sum, item) => sum + (((Number(item.minutes) || 0) / 60) * (Number(item.hourlyRate) || 0)), 0);`
);

pdfDoc = pdfDoc.replace(`colHrs: { width: '8%' }`, `colMins: { width: '8%' }`);
pdfDoc = pdfDoc.replace(`styles.colHrs`, `styles.colMins`);
pdfDoc = pdfDoc.replace(`styles.colHrs`, `styles.colMins`);

pdfDoc = pdfDoc.replace(`>Total Hours:<`, `>Total Mins:<`);
pdfDoc = pdfDoc.replace(`{totalHours.toFixed(1)}`, `{totalMins}`);
pdfDoc = pdfDoc.replace(`>Hrs<`, `>Mins<`);

pdfDoc = pdfDoc.replace(`{item.hours}`, `{item.minutes}`);

fs.writeFileSync(pdfFile, pdfDoc);
console.log("Migration script complete");
