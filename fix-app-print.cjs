const fs = require('fs');

const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
content = content.replace(`import { pdf } from '@react-pdf/renderer';\nimport { PdfDocument } from './PdfDocument';`, `import { useReactToPrint } from 'react-to-print';\nimport { PrintInvoice } from './PrintInvoice';\nimport { useRef } from 'react';`);

// 2. handleExportPDF
const handleExportPDFOld = `const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = <PdfDocument log={activeLog} />;
      const asPdf = pdf([]);
      asPdf.updateContainer(doc);
      const blob = await asPdf.toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = \`Freelance_Log_\${activeLog.monthYear.replace(' ', '_')}.pdf\`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };`;

const handleExportPDFNew = `const printRef = useRef();
  
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: activeLog ? \`Freelance_Log_\${activeLog.monthYear.replace(' ', '_')}\` : 'Work_Log',
    onBeforeGetContent: () => setIsExporting(true),
    onAfterPrint: () => setIsExporting(false),
  });

  const handleExportPDF = () => {
    if (activeLog) {
      handlePrint();
    }
  };`;

content = content.replace(handleExportPDFOld, handleExportPDFNew);

// 3. Render <PrintInvoice /> at the very end before the closing div
const closingDivs = `</div>\n    </div>\n  );\n}\n\nexport default App;`;
const closingDivsNew = `</div>\n      <div style={{ display: 'none' }}>\n        <PrintInvoice ref={printRef} log={activeLog} />\n      </div>\n    </div>\n  );\n}\n\nexport default App;`;

content = content.replace(closingDivs, closingDivsNew);

fs.writeFileSync(file, content);
console.log('App.jsx print updated');
