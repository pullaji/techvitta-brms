// Utility functions for exporting transaction data

export interface ExportTransaction {
  date: string;
  payment_type: string;
  transaction_name: string;
  description: string;
  category: string;
  credit_amount: number;
  debit_amount: number;
  balance?: number;
  source_file?: string;
  source_type?: string;
  notes?: string;
  proof?: string;
  created_at: string;
}

// Convert transactions to CSV format
export function exportToCSV(transactions: ExportTransaction[], filename: string = 'transactions.csv'): void {
  if (transactions.length === 0) {
    console.warn('No transactions to export');
    return;
  }

  // Define CSV headers - Removed Transaction Name, Source File, Category, and Created At columns
  const headers = [
    'Date',
    'Payment Type',
    'Description',
    'Credit Amount (₹)',
    'Debit Amount (₹)',
    'Balance (₹)',
    'Proof Upload Link',
    'Notes'
  ];

  // Convert transactions to CSV rows
  const csvRows = transactions.map(transaction => {
    // Handle Proof Upload Link column - filter out system files
    let proofLink = 'Empty';
    if (transaction.proof && transaction.proof.trim() !== '') {
      const proof = transaction.proof.trim();
      
      // Filter out system-generated file names like "Book1 (1).xlsx"
      const isSystemFile = proof.includes('Book1') || 
                          proof.includes('.xlsx') && proof.includes('(') && proof.includes(')') ||
                          proof.includes('Output') ||
                          proof.includes('statement') ||
                          proof.length < 5; // Very short names are likely system generated
      
      if (!isSystemFile) {
        // Check if it's a URL (http/https) - create hyperlink
        if (proof.startsWith('http://') || proof.startsWith('https://')) {
          proofLink = `=HYPERLINK("${proof}","Empty")`;
        } else {
          // For all other valid cases, show the text content
          proofLink = proof;
        }
      }
    }
    
    // Handle Notes column - filter out system-generated notes
    let notes = 'Empty';
    if (transaction.notes && transaction.notes.trim() !== '') {
      const noteText = transaction.notes.trim();
      
      // Filter out system-generated notes like "Uploaded from: Book1 (1).xlsx"
      const isSystemNote = noteText.includes('Uploaded from:') ||
                          noteText.includes('Book1') ||
                          noteText.includes('.xlsx') ||
                          noteText.length < 5; // Very short notes are likely system generated
      
      if (!isSystemNote) {
        notes = noteText;
      }
    }
    
    return [
      formatDateForCSV(transaction.date),
      transaction.payment_type || '',
      transaction.description || '',
      transaction.credit_amount || 0,
      transaction.debit_amount || 0,
      transaction.balance || '',
      proofLink,
      notes
    ];
  });

  // Combine headers and rows
  const csvContent = [headers, ...csvRows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // Create and download file
  downloadFile(csvContent, filename, 'text/csv');
}

// Convert transactions to Excel format with clickable hyperlinks
export function exportToExcel(transactions: ExportTransaction[], filename: string = 'transactions.xlsx'): void {
  if (transactions.length === 0) {
    console.warn('No transactions to export');
    return;
  }

  try {
    // Import xlsx dynamically
    import('xlsx').then((XLSX) => {
      // Define headers - Removed Transaction Name, Source File, Category, and Created At columns
      const headers = [
        'Date',
        'Payment Type',
        'Description',
        'Credit Amount (₹)',
        'Debit Amount (₹)',
        'Balance (₹)',
        'Proof Upload Link',
        'Notes'
      ];

      // Convert transactions to Excel rows
      const excelRows = transactions.map(transaction => {
        // Handle Proof Upload Link column - filter out system files
        let proofLink = 'Empty';
        if (transaction.proof && transaction.proof.trim() !== '') {
          const proof = transaction.proof.trim();
          
          // Filter out system-generated file names like "Book1 (1).xlsx"
          const isSystemFile = proof.includes('Book1') || 
                              proof.includes('.xlsx') && proof.includes('(') && proof.includes(')') ||
                              proof.includes('Output') ||
                              proof.includes('statement') ||
                              proof.length < 5; // Very short names are likely system generated
          
          if (!isSystemFile) {
            // Check if it's a URL (http/https) - create hyperlink
            if (proof.startsWith('http://') || proof.startsWith('https://')) {
              proofLink = `=HYPERLINK("${proof}","Empty")`;
            } else {
              // For all other valid cases, show the text content
              proofLink = proof;
            }
          }
        }
        
        // Handle Notes column - filter out system-generated notes
        let notes = 'Empty';
        if (transaction.notes && transaction.notes.trim() !== '') {
          const noteText = transaction.notes.trim();
          
          // Filter out system-generated notes like "Uploaded from: Book1 (1).xlsx"
          const isSystemNote = noteText.includes('Uploaded from:') ||
                              noteText.includes('Book1') ||
                              noteText.includes('.xlsx') ||
                              noteText.length < 5; // Very short notes are likely system generated
          
          if (!isSystemNote) {
            notes = noteText;
          }
        }
        
        return [
          formatDateForCSV(transaction.date),
          transaction.payment_type || '',
          transaction.description || '',
          transaction.credit_amount || 0,
          transaction.debit_amount || 0,
          transaction.balance || '',
          proofLink,
          notes
        ];
      });

      // Calculate summary data
      const totalTransactions = transactions.length;
      const totalCredits = transactions.reduce((sum, t) => sum + (t.credit_amount || 0), 0);
      const totalDebits = transactions.reduce((sum, t) => sum + (t.debit_amount || 0), 0);
      const currentBalance = transactions.length > 0 && transactions[transactions.length - 1]?.balance ? transactions[transactions.length - 1].balance : 0;
      
      // Calculate date range
      const dates = transactions.map(t => new Date(t.date)).filter(d => !isNaN(d.getTime()));
      const startingDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0] : '';
      const endingDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0] : '';
      
      // Create worksheet data with exact format from image
      const summaryData = [
        // Row 1: Title
        ['Transaction Summary Report', '', '', '', '', '', '', ''],
        
        // Row 2: Empty
        ['', '', '', '', '', '', '', ''],
        
        // Row 3: Total Transactions
        ['Total Transactions', '', totalTransactions, '', '', '', '', ''],
        
        // Row 4: Total Credits
        ['Total Credits (₹)', totalCredits.toFixed(2), '', '', '', '', '', ''],
        
        // Row 5: Total Debits
        ['Total Debits (₹)', totalDebits.toFixed(2), '', '', '', '', '', ''],
        
        // Row 6: Current Balance
        ['Current Balance (₹)', currentBalance.toFixed(2), '', '', '', '', '', ''],
        
        // Row 7: Empty
        ['', '', '', '', '', '', '', ''],
        
        // Row 8: Date Range
        ['Date Range', '', '', '', '', '', '', ''],
        
        // Row 9: Starting Date
        ['Starting Date', startingDate, '', '', '', '', '', ''],
        
        // Row 10: Ending Date
        ['Ending Date', endingDate, '', '', '', '', '', ''],
        
        // Row 11: Empty
        ['', '', '', '', '', '', '', ''],
        
        // Row 12: Transaction Details
        ['Transaction Details', '', '', '', '', '', '', ''],
        
        // Row 13: Empty
        ['', '', '', '', '', '', '', '']
      ];
      
      const worksheetData = [...summaryData, headers, ...excelRows];

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

       // Set column widths - Updated for removed columns
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
      
      // Add hyperlink formatting for proof links (skip summary rows)
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const summaryRows = 13; // Number of summary rows at the top
      
      for (let row = summaryRows + 1; row <= range.e.r; row++) { // Start from after summary rows
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

      // Debug: Log export information with filtering details
      console.log('📊 Excel Export Debug (with summary and filtering):', {
        totalTransactions: transactions.length,
        totalCredits: totalCredits,
        totalDebits: totalDebits,
        currentBalance: currentBalance,
        dateRange: { startingDate, endingDate },
        hyperlinkCount: excelRows.filter(row => row[6] && typeof row[6] === 'string' && row[6].includes('=HYPERLINK')).length,
        emptyProofCount: excelRows.filter(row => row[6] === 'Empty').length,
        emptyNotesCount: excelRows.filter(row => row[7] === 'Empty').length,
        proofAndNotesSample: excelRows.slice(0, 3).map((row, index) => ({
          transactionIndex: index,
          originalProof: transactions[index]?.proof,
          exportedProof: row[6],
          originalNotes: transactions[index]?.notes,
          exportedNotes: row[7]
        }))
      });

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

      // Create and download file
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    }).catch((error) => {
      console.error('Error loading xlsx library:', error);
      // Fallback to CSV export
      exportToCSV(transactions, filename.replace('.xlsx', '.csv'));
    });
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    // Fallback to CSV export
    exportToCSV(transactions, filename.replace('.xlsx', '.csv'));
  }
}

// Format date for CSV export - matching image format (DD/MM/YYYY)
function formatDateForCSV(dateString: string): string {
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

// Download file utility
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

// Generate summary report
export function generateSummaryReport(transactions: ExportTransaction[]): {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  netAmount: number;
  categoryBreakdown: Record<string, number>;
  dateRange: { start: string; end: string };
} {
  const totalTransactions = transactions.length;
  
  const totalCredits = transactions.reduce((sum, t) => sum + (t.credit_amount || 0), 0);
  const totalDebits = transactions.reduce((sum, t) => sum + (t.debit_amount || 0), 0);
  const netAmount = totalCredits - totalDebits;
  
  const categoryBreakdown = transactions.reduce((acc, t) => {
    const category = t.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + (t.credit_amount || 0) - (t.debit_amount || 0);
    return acc;
  }, {} as Record<string, number>);
  
  const dates = transactions.map(t => new Date(t.date)).filter(d => !isNaN(d.getTime()));
  const dateRange = {
    start: dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0] : '',
    end: dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0] : ''
  };
  
  return {
    totalTransactions,
    totalCredits,
    totalDebits,
    netAmount,
    categoryBreakdown,
    dateRange
  };
}

// Export summary report as CSV
export function exportSummaryReport(transactions: ExportTransaction[], filename: string = 'transaction_summary.csv'): void {
  const summary = generateSummaryReport(transactions);
  
  const headers = ['Metric', 'Value'];
  const rows = [
    ['Total Transactions', summary.totalTransactions],
    ['Total Credits (₹)', summary.totalCredits],
    ['Total Debits (₹)', summary.totalDebits],
    ['Net Amount (₹)', summary.netAmount],
    ['Date Range', `${summary.dateRange.start} to ${summary.dateRange.end}`],
    ['', ''], // Empty row
    ['Category Breakdown', ''],
    ...Object.entries(summary.categoryBreakdown).map(([category, amount]) => [category, amount])
  ];
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  
  downloadFile(csvContent, filename, 'text/csv');
}
