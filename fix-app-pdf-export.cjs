const fs = require('fs');

const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Swap import
content = content.replace(`import { useReactToPrint } from 'react-to-print';`, `import html2pdf from 'html2pdf.js';`);

// 2. Replace handlePrint and handleExportPDF
const handleExportPDFOld = `const printRef = useRef();
  
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

const handleExportPDFNew = `const printRef = useRef();

  const handleExportPDF = async () => {
    if (!activeLog) return;
    setIsExporting(true);
    
    // Slight delay to ensure React finishes rendering any conditional UI states
    setTimeout(() => {
      const element = printRef.current;
      const opt = {
        margin:       15,
        filename:     \`Freelance_Log_\${activeLog.monthYear.replace(' ', '_')}.pdf\`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        setIsExporting(false);
      }).catch(err => {
        console.error("PDF Export failed:", err);
        setIsExporting(false);
      });
    }, 100);
  };`;

content = content.replace(handleExportPDFOld, handleExportPDFNew);

// 3. Change wrapper div style from `display: 'none'` to position off-screen
const closingDivsOld = `<div style={{ display: 'none' }}>
        <PrintInvoice ref={printRef} log={activeLog} />
      </div>`;

const closingDivsNew = `<div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '210mm' }}>
        <PrintInvoice ref={printRef} log={activeLog} />
      </div>`;

content = content.replace(closingDivsOld, closingDivsNew);

fs.writeFileSync(file, content);
console.log('App.jsx PDF export updated');
