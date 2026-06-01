const fs = require('fs');

const file = 'src/PdfDocument.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add stripEmojis helper right before the component
const helperStr = `
const stripEmojis = (str) => {
  if (!str) return 'Unnamed';
  return str.replace(/[\\p{Emoji_Presentation}\\p{Extended_Pictographic}]/gu, '').trim();
};

const PdfDocument =`;

content = content.replace(`const PdfDocument =`, helperStr);

// 2. Adjust columns styles
const colStylesOld = `colDate: { width: '12%' },
    colPlatform: { width: '14%' },
    colProject: { width: '24%' },
    colMins: { width: '10%' },
    colRate: { width: '30%' },
    colStatus: { width: '10%' },`;

const colStylesNew = `colDate: { width: '12%' },
    colPlatform: { width: '14%' },
    colProject: { width: '20%' },
    colMins: { width: '10%' },
    colRate: { width: '22%' },
    colTotal: { width: '12%' },
    colStatus: { width: '10%' },`;

content = content.replace(colStylesOld, colStylesNew);

// 3. Adjust Table Header
const headerOld = `<Text style={[styles.colDate, styles.tableHeaderCell]}>Date</Text>
            <Text style={[styles.colPlatform, styles.tableHeaderCell]}>Platform</Text>
            <Text style={[styles.colProject, styles.tableHeaderCell]}>Project Name / ID</Text>
            <Text style={[styles.colMins, styles.tableHeaderCell]}>Time</Text>
            <Text style={[styles.colRate, styles.tableHeaderCell]}>Pay Details</Text>
            <Text style={[styles.colStatus, styles.tableHeaderCell]}>Status</Text>`;

const headerNew = `<Text style={[styles.colDate, styles.tableHeaderCell]}>Date</Text>
            <Text style={[styles.colPlatform, styles.tableHeaderCell]}>Platform</Text>
            <Text style={[styles.colProject, styles.tableHeaderCell]}>Project Name / ID</Text>
            <Text style={[styles.colMins, styles.tableHeaderCell]}>Time</Text>
            <Text style={[styles.colRate, styles.tableHeaderCell]}>Pay Details</Text>
            <Text style={[styles.colTotal, styles.tableHeaderCell]}>Total Pay</Text>
            <Text style={[styles.colStatus, styles.tableHeaderCell]}>Status</Text>`;

content = content.replace(headerOld, headerNew);

// 4. Adjust Table Row
const rowOld = `<Text style={[styles.colProject, styles.tableCell]}>{item.projectName || 'Unnamed'}</Text>
              <Text style={[styles.colMins, styles.tableCell, {fontFamily: 'Courier'}]}>{formatTime(item.minutes)}</Text>
              <Text style={[styles.colRate, styles.tableCell, {fontFamily: 'Courier'}]}>
                {(!item.minutes || item.minutes === 0) 
                  ? \`Fixed = \$\${Number(item.fixedPay || 0).toFixed(2)}\`
                  : \`\${formatTime(item.minutes)} x \$\${Number(item.hourlyRate || 0).toFixed(2)}/h = \$\${getEarnings(item).toFixed(2)}\`
                }
              </Text>
              <Text style={[styles.colStatus, styles.tableCell]}>{item.status}</Text>`;

const rowNew = `<Text style={[styles.colProject, styles.tableCell]}>{stripEmojis(item.projectName)}</Text>
              <Text style={[styles.colMins, styles.tableCell, {fontFamily: 'Courier'}]}>{formatTime(item.minutes)}</Text>
              <Text style={[styles.colRate, styles.tableCell, {fontFamily: 'Courier'}]}>
                {(!item.minutes || item.minutes === 0) 
                  ? \`Fixed Pay\`
                  : \`\${formatTime(item.minutes)} x \$\${Number(item.hourlyRate || 0).toFixed(2)}/h\`
                }
              </Text>
              <Text style={[styles.colTotal, styles.tableCell, {fontFamily: 'Courier'}]}>
                 \$\${getEarnings(item).toFixed(2)}
              </Text>
              <Text style={[styles.colStatus, styles.tableCell]}>{item.status}</Text>`;

content = content.replace(rowOld, rowNew);

fs.writeFileSync(file, content);
console.log("pdf final tweaks applied");
