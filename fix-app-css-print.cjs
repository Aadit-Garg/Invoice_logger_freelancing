const fs = require('fs');
const file = 'src/App.css';
let content = fs.readFileSync(file, 'utf8');

const printStyles = `

/* =========================================
   PRINT STYLES (react-to-print)
========================================= */

@media print {
  @page {
    size: A4;
    margin: 20mm;
  }
  
  body {
    background: #fff;
    color: #000;
  }

  .print-container {
    font-family: 'Inter', system-ui, sans-serif;
    color: #000;
    width: 100%;
    max-width: 100%;
  }

  .print-header {
    text-align: right;
    border-bottom: 2px solid #000;
    margin-bottom: 20px;
    padding-bottom: 5px;
  }
  
  .print-header h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .print-meta {
    margin-bottom: 30px;
    font-size: 0.9rem;
  }
  
  .meta-row {
    margin-bottom: 4px;
  }
  
  .meta-row span {
    font-weight: 700;
    display: inline-block;
    width: 80px;
  }

  .print-summary {
    margin-bottom: 30px;
    border: 2px solid #000;
    padding: 15px;
  }
  
  .print-summary h3 {
    margin: 0 0 15px 0;
    font-size: 1.1rem;
    font-weight: 800;
  }
  
  .summary-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 0.95rem;
  }
  
  .summary-row span:first-child {
    font-weight: 700;
  }
  
  .summary-total {
    border-top: 2px solid #000;
    padding-top: 8px;
    margin-top: 8px;
    font-weight: 800;
    font-size: 1rem;
  }

  .print-work, .print-payouts {
    margin-bottom: 30px;
  }
  
  .print-work h3, .print-payouts h3 {
    font-size: 1.2rem;
    font-weight: 800;
    margin: 0 0 15px 0;
    border-bottom: 2px solid #000;
    padding-bottom: 5px;
  }

  .platform-group {
    margin-bottom: 20px;
  }
  
  .platform-title {
    margin: 0 0 10px 0;
    font-size: 1.05rem;
    font-weight: 800;
    background: #f1f1f1;
    padding: 5px 10px;
    border-left: 4px solid #000;
  }

  .print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  
  .print-table th {
    text-align: left;
    padding: 8px 5px;
    border-bottom: 2px solid #000;
    font-weight: 800;
  }
  
  .print-table td {
    padding: 8px 5px;
    border-bottom: 1px solid #ccc;
    vertical-align: top;
  }
  
  .print-table tr:last-child td {
    border-bottom: none;
  }
}
`;

content += printStyles;
fs.writeFileSync(file, content);
console.log('App.css print styles added');
