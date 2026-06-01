const fs = require('fs');

const pdfFile = 'src/PdfDocument.jsx';
let pdfDoc = fs.readFileSync(pdfFile, 'utf8');

// 1. Update Column Widths
pdfDoc = pdfDoc.replace(`colDate: { width: '15%' }`, `colDate: { width: '12%' }`);
pdfDoc = pdfDoc.replace(`colPlatform: { width: '15%' }`, `colPlatform: { width: '14%' }`);
pdfDoc = pdfDoc.replace(`colProject: { width: '21%' }`, `colProject: { width: '24%' }`);
pdfDoc = pdfDoc.replace(`colMins: { width: '12%' }`, `colMins: { width: '10%' }`);
pdfDoc = pdfDoc.replace(`colRate: { width: '15%' }`, `colRate: { width: '30%' }`);
// We will just remove colCashOut entirely.
pdfDoc = pdfDoc.replace(`colCashOut: { width: '12%' },`, ``);


// 2. Remove CashOut from Header
const headerSearch = `<Text style={[styles.colRate, styles.tableHeaderCell]}>Pay Details</Text>
            <Text style={[styles.colCashOut, styles.tableHeaderCell]}>Cash-Out</Text>
            <Text style={[styles.colStatus, styles.tableHeaderCell]}>Status</Text>`;
const headerReplace = `<Text style={[styles.colRate, styles.tableHeaderCell]}>Pay Details</Text>
            <Text style={[styles.colStatus, styles.tableHeaderCell]}>Status</Text>`;
pdfDoc = pdfDoc.replace(headerSearch, headerReplace);

// 3. Replace Row Content
const rowSearch = `<View style={[styles.colRate, {flexDirection: 'column'}]}>
                <Text style={[styles.tableCell, {fontFamily: 'Courier'}]}>
                  {item.payType === 'fixed' ? \`\$\${Number(item.fixedPay || 0).toFixed(2)} (Fixed)\` : \`\$\${item.hourlyRate}/h\`}
                </Text>
                <Text style={[styles.tableCell, {fontFamily: 'Courier', fontSize: 7, color: '#666', marginTop: 2}]}>
                  {item.payType === 'fixed' && item.minutes > 0 ? \`~\$\${(item.fixedPay / (item.minutes / 60)).toFixed(2)}/h\` : ''}
                  {item.payType !== 'fixed' ? \`Tot: \$\${getEarnings(item).toFixed(2)}\` : ''}
                </Text>
              </View>
              <Text style={[styles.colCashOut, styles.tableCell, {fontFamily: 'Courier'}]}>{item.cashOutDate}</Text>
              <Text style={[styles.colStatus, styles.tableCell]}>{item.status}</Text>`;

const rowReplace = `<Text style={[styles.colRate, styles.tableCell, {fontFamily: 'Courier'}]}>
                {item.payType === 'fixed' 
                  ? \`Fixed = \$\${Number(item.fixedPay || 0).toFixed(2)}\`
                  : \`\${formatTime(item.minutes)} x \$\${Number(item.hourlyRate || 0).toFixed(2)}/hr = \$\${getEarnings(item).toFixed(2)}\`
                }
              </Text>
              <Text style={[styles.colStatus, styles.tableCell]}>{item.status}</Text>`;

pdfDoc = pdfDoc.replace(rowSearch, rowReplace);

fs.writeFileSync(pdfFile, pdfDoc);
console.log("pdf script complete");
