import * as XLSX from 'xlsx';

export interface TransactionData {
  date: string;
  payment_type: string;
  transaction_name: string;
  description: string;
  category: string;
  credit_amount: number | null;
  debit_amount: number | null;
  balance: number | null;
  source_file: string;
  source_type: string;
  notes: string;
  proof: string;
  created_at: string;
}

export interface SummaryData {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  currentBalance: number;
  startingDate: string;
  endingDate: string;
}

export interface ExcelExportData {
  transactions: TransactionData[];
  summary: SummaryData;
  reportName: string;
}

export function generateTransactionExcel(data: ExcelExportData): XLSX.WorkBook {
  const { transactions, summary, reportName } = data;
  
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Format date to match image format (DD/MM/YYYY)
  const formatDateForExcel = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };
  
  // Prepare transaction data for Excel - matching exact image format
  const transactionRows = transactions.map(transaction => {
    const creditAmount = transaction.credit_amount || 0;
    const debitAmount = transaction.debit_amount || 0;
    const balanceAmount = transaction.balance || 0;
    
    // Format proof link - create hyperlink if it's a URL
    let proofLink = 'Empty';
    if (transaction.proof && transaction.proof.trim() !== '') {
      const proof = transaction.proof.trim();
      
      // Filter out system-generated file names
      const isSystemFile = proof.includes('Book1') || 
                          proof.includes('.xlsx') && proof.includes('(') && proof.includes(')') ||
                          proof.includes('Output') ||
                          proof.includes('statement') ||
                          proof.length < 5;
      
      if (!isSystemFile) {
        // Check if it's a URL (http/https) - create hyperlink
        if (proof.startsWith('http://') || proof.startsWith('https://')) {
          proofLink = `=HYPERLINK("${proof}","Empty")`;
        } else {
          // For other valid cases, show the text content
          proofLink = proof;
        }
      }
    }
    
    // Format notes - filter out system-generated notes
    let notes = 'Empty';
    if (transaction.notes && transaction.notes.trim() !== '') {
      const noteText = transaction.notes.trim();
      
      const isSystemNote = noteText.includes('Uploaded from:') ||
                          noteText.includes('Book1') ||
                          noteText.includes('.xlsx') ||
                          noteText.length < 5;
      
      if (!isSystemNote) {
        notes = noteText;
      }
    }
    
    return [
      formatDateForExcel(transaction.date),                    // Date
      transaction.payment_type || '',                          // Payment Type
      transaction.description || '',                           // Description
      creditAmount,                                            // Credit Amount (₹)
      debitAmount,                                             // Debit Amount (₹)
      balanceAmount,                                           // Balance (₹)
      proofLink,                                               // Proof Upload Link
      notes                                                    // Notes
    ];
  });
  
  // Create worksheet data with exact format from image
  const worksheetData = [
    // Row 1: Title
    ['Transaction Summary Report', '', '', '', '', '', '', ''],
    
    // Row 2: Empty
    ['', '', '', '', '', '', '', ''],
    
    // Row 3: Total Transactions
    ['Total Transactions', '', summary.totalTransactions, '', '', '', '', ''],
    
    // Row 4: Total Credits
    ['Total Credits (₹)', summary.totalCredits.toFixed(2), '', '', '', '', '', ''],
    
    // Row 5: Total Debits
    ['Total Debits (₹)', summary.totalDebits.toFixed(2), '', '', '', '', '', ''],
    
    // Row 6: Current Balance
    ['Current Balance (₹)', summary.currentBalance.toFixed(2), '', '', '', '', '', ''],
    
    // Row 7: Empty
    ['', '', '', '', '', '', '', ''],
    
    // Row 8: Date Range
    ['Date Range', '', '', '', '', '', '', ''],
    
    // Row 9: Starting Date
    ['Starting Date', summary.startingDate, '', '', '', '', '', ''],
    
    // Row 10: Ending Date
    ['Ending Date', summary.endingDate, '', '', '', '', '', ''],
    
    // Row 11: Empty
    ['', '', '', '', '', '', '', ''],
    
    // Row 12: Transaction Details
    ['Transaction Details', '', '', '', '', '', '', ''],
    
    // Row 13: Empty
    ['', '', '', '', '', '', '', ''],
    
    // Row 14: Column Headers
    ['Date', 'Payment Type', 'Description', 'Credit Amount (₹)', 'Debit Amount (₹)', 'Balance (₹)', 'Proof Upload Link', 'Notes'],
    
    // Transaction data rows
    ...transactionRows
  ];
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths to match image layout
  const columnWidths = [
    { wch: 25 }, // Column A - Labels and Date
    { wch: 20 }, // Column B - Values and Payment Type
    { wch: 30 }, // Column C - Description
    { wch: 15 }, // Column D - Credit Amount
    { wch: 15 }, // Column E - Debit Amount
    { wch: 15 }, // Column F - Balance
    { wch: 25 }, // Column G - Proof Link
    { wch: 30 }  // Column H - Notes
  ];
  worksheet['!cols'] = columnWidths;
  
  // Add styling to match image format exactly
  const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 }); // A1
  if (!worksheet[titleCell].s) worksheet[titleCell].s = {};
  worksheet[titleCell].s.font = { bold: true, size: 16, color: { rgb: "000000" } };
  worksheet[titleCell].s.fill = { fgColor: { rgb: "C6EFCE" } }; // Light green background
  worksheet[titleCell].s.alignment = { horizontal: 'center' };
  
  // Merge cells for title to center it across columns A-H
  const titleRange = { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } };
  if (!worksheet['!merges']) worksheet['!merges'] = [];
  worksheet['!merges'].push(titleRange);
  
  // Apply light yellow background to summary row (Row 3 - Total Transactions, Credits, Debits, Balance)
  for (let col = 0; col < 8; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 2, c: col }); // Row 3 (0-indexed)
    const cell = worksheet[cellRef];
    if (cell) {
      if (!cell.s) cell.s = {};
      cell.s.fill = { fgColor: { rgb: "FFFFCC" } }; // Light yellow background
    }
  }
  
  // Make summary labels bold with black text
  const summaryLabels = ['A3', 'A4', 'A5', 'A6', 'A8', 'A9', 'A10', 'A12'];
  summaryLabels.forEach(cellRef => {
    const cell = worksheet[cellRef];
    if (cell) {
      if (!cell.s) cell.s = {};
      cell.s.font = { bold: true, color: { rgb: "000000" } };
    }
  });
  
  // Make column headers bold with light green background and black text
  const headerRow = 13; // Row 14 (0-indexed)
  for (let col = 0; col < 8; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: col });
    const cell = worksheet[cellRef];
    if (cell) {
      if (!cell.s) cell.s = {};
      cell.s.font = { bold: true, color: { rgb: "000000" } };
      cell.s.fill = { fgColor: { rgb: "C6EFCE" } }; // Light green background
      cell.s.alignment = { horizontal: 'center', vertical: 'center' };
    }
  }
  
  // Add hyperlink formatting for proof links
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const summaryRows = 14; // Number of summary rows at the top
  
  for (let row = summaryRows; row <= range.e.r; row++) {
    const proofCell = XLSX.utils.encode_cell({ r: row, c: 6 }); // Column G (Proof Upload Link)
    if (worksheet[proofCell] && worksheet[proofCell].v && worksheet[proofCell].v.includes('=HYPERLINK')) {
      // Set hyperlink cell style
      if (!worksheet[proofCell].s) worksheet[proofCell].s = {};
      worksheet[proofCell].s.font = { 
        color: { rgb: "0000FF" }, 
        underline: true,
        bold: false
      };
      // Add hyperlink property for better Excel compatibility
      worksheet[proofCell].l = {
        Target: worksheet[proofCell].v.match(/HYPERLINK\("([^"]+)"/)?.[1] || '',
        Tooltip: 'Click to open proof document'
      };
    }
  }
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transaction Summary');
  
  return workbook;
}

export function downloadExcel(workbook: XLSX.WorkBook, filename: string): void {
  // Generate Excel file
  XLSX.writeFile(workbook, filename);
}
