import * as pdfjsLib from 'pdfjs-dist';

// Use local worker via Vite's asset URL resolution to prevent CDN fetch failures
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const parseDate = (dStr) => {
  if (!dStr) return '';
  const parts = dStr.split('/');
  if (parts.length === 3) {
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${year}-${parts[1]}-${parts[0]}`;
  }
  return dStr;
};

const parseMins = (tStr) => {
  let mins = 0;
  const hMatch = tStr.match(/(\d+)h/);
  const mMatch = tStr.match(/(\d+)m/);
  if (hMatch) mins += parseInt(hMatch[1]) * 60;
  if (mMatch) mins += parseInt(mMatch[1]);
  return mins;
};

const parseRate = (pStr) => {
  if (pStr.toLowerCase() === 'fixed') return { type: 'fixed', rate: 0 };
  const match = pStr.match(/\$([\d.]+)\/hr/);
  if (match) return { type: 'hourly', rate: parseFloat(match[1]) };
  return { type: 'fixed', rate: 0 };
};

export const parseLegacyPDF = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedarray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        
        const allLines = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          
          const lineMap = {};
          content.items.forEach(item => {
            if (!item.str.trim()) return;
            const y = Math.round(item.transform[5] / 2) * 2;
            if (!lineMap[y]) lineMap[y] = [];
            lineMap[y].push(item);
          });
          
          const sortedY = Object.keys(lineMap).map(Number).sort((a, b) => b - a);
          sortedY.forEach(y => {
            const lineItems = lineMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
            allLines.push(lineItems.map(i => i.str.trim()).filter(Boolean));
          });
        }

        const log = {
          id: Date.now().toString(),
          userName: 'Unknown',
          taxYear: new Date().getFullYear().toString(),
          monthYear: '',
          workLogs: [],
          payouts: []
        };

        let currentSection = 'HEADER';
        let currentPlatform = 'Other';

        for (let i = 0; i < allLines.length; i++) {
          const line = allLines[i];
          const fullText = line.join(' ');

          const monthMatch = fullText.match(/\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+\d{4}\b/i);
          if (monthMatch && !log.monthYear) {
            log.monthYear = monthMatch[0].toUpperCase();
          }

          if (line.includes('TAX YEAR')) {
            const yrIdx = line.indexOf('TAX YEAR') + 1;
            if (line[yrIdx]) log.taxYear = line[yrIdx];
            else if (allLines[i+1]) log.taxYear = allLines[i+1][0];
          }

          if (fullText.includes('WORK BREAKDOWN')) {
            currentSection = 'WORK';
            continue;
          }
          if (fullText.includes('PAYOUT HISTORY')) {
            currentSection = 'PAYOUTS';
            continue;
          }

          if (currentSection === 'WORK') {
            if (line.length >= 1 && line[0] !== 'Date' && !line[0].includes('/')) {
              if (fullText.includes('· $') || line.length <= 2) {
                 if (line[0].length > 3) {
                   currentPlatform = line[0];
                 }
              }
            }

            if (line[0] && line[0].match(/^\d{2}\/\d{2}\/\d{2}$/)) {
              if (line.length >= 5) {
                const status = line[line.length - 1];
                const total = line[line.length - 2].replace('$', '').replace(/,/g, '');
                const payDetails = line[line.length - 3];
                const timeStr = line[line.length - 4];
                const project = line.slice(1, line.length - 4).join(' ') || 'Restored Project';

                const rateInfo = parseRate(payDetails);
                const minutes = parseMins(timeStr);

                log.workLogs.push({
                  id: Date.now() + Math.random(),
                  platform: currentPlatform,
                  dateWorked: parseDate(line[0]),
                  projectName: project,
                  minutes: minutes,
                  hourlyRate: rateInfo.rate,
                  payType: rateInfo.type,
                  fixedPay: rateInfo.type === 'fixed' ? parseFloat(total) : 0,
                  cashOutDate: '',
                  status: status
                });
              }
            }
          }

          if (currentSection === 'PAYOUTS') {
            if (line[1] && line[1].match(/^\d{2}\/\d{2}\/\d{2}$/)) {
               if (line.length >= 3) {
                 const amount = line[line.length - 2] ? line[line.length - 2].replace('$', '').replace(/,/g, '') : '0';
                 const txnId = line.length === 4 ? line[3] : '';
                 
                 log.payouts.push({
                   id: Date.now() + Math.random(),
                   method: line[0],
                   date: parseDate(line[1]),
                   amount: parseFloat(amount),
                   transferId: txnId
                 });
               }
            }
          }
        }
        
        if (log.monthYear) {
          resolve(log);
        } else {
          reject(new Error("Could not extract enough data from this legacy PDF."));
        }

      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};
