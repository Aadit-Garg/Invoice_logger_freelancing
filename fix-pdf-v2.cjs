const fs = require('fs');

const file = 'src/PdfDocument.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Emoji support
const registerEmoji = `Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZJhjp-Ek-_EeA.woff2'
});`;

const newRegisterEmoji = `Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZJhjp-Ek-_EeA.woff2'
});

Font.registerEmojiSource({
  format: 'png',
  url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/',
});`;

content = content.replace(registerEmoji, newRegisterEmoji);

// 2. Sort workLogs
const mapStart = `{log.workLogs.map(item => (`;
const newMapStart = `{[...log.workLogs].sort((a, b) => new Date(a.dateWorked) - new Date(b.dateWorked)).map(item => (`;

content = content.replace(mapStart, newMapStart);

// 3. Replace the row logic in PdfDocument.jsx
const rowStart = `<View style={[styles.colRate, {flexDirection: 'column'}]}>`;
const rowEnd = `<Text style={[styles.colStatus, styles.tableCell]}>{item.status}</Text>`;

const rowStartIndex = content.indexOf(rowStart);
const rowEndIndex = content.indexOf(rowEnd) + rowEnd.length;

if (rowStartIndex !== -1 && rowEndIndex !== -1) {
  const newRow = `<Text style={[styles.colRate, styles.tableCell, {fontFamily: 'Courier'}]}>
                {(!item.minutes || item.minutes === 0) 
                  ? \`Fixed = \$\${Number(item.fixedPay || 0).toFixed(2)}\`
                  : \`\${formatTime(item.minutes)} x \$\${Number(item.hourlyRate || 0).toFixed(2)}/h = \$\${getEarnings(item).toFixed(2)}\`
                }
              </Text>
              <Text style={[styles.colStatus, styles.tableCell]}>{item.status}</Text>`;
  
  content = content.substring(0, rowStartIndex) + newRow + content.substring(rowEndIndex);
} else {
  console.log("Could not find row block");
}

fs.writeFileSync(file, content);
console.log('pdf features applied');
