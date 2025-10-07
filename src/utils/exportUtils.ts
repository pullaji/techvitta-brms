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

  // Define CSV headers
  const headers = [
    'Date',
    'Payment Type',
    'Transaction Name',
    'Description',
    'Category',
    'Credit Amount (₹)',
    'Debit Amount (₹)',
    'Balance (₹)',
    'Source File',
    'Proof Upload Link',
    'Notes',
    'Created At'
  ];

  // Convert transactions to CSV rows
  const csvRows = transactions.map(transaction => {
    // Create clickable hyperlink for proof if it exists
    let proofLink = '';
    if (transaction.proof) {
      if (transaction.proof.startsWith('http://') || transaction.proof.startsWith('https://')) {
        // For image URLs, create Excel hyperlink formula
        proofLink = `=HYPERLINK("${transaction.proof}","View Proof")`;
      } else {
        // For text proof, show the text content
        proofLink = transaction.proof;
      }
    }
    
    return [
      formatDateForCSV(transaction.date),
      transaction.payment_type || '',
      transaction.transaction_name || '',
      transaction.description || '',
      transaction.category || '',
      transaction.credit_amount || 0,
      transaction.debit_amount || 0,
      transaction.balance || '',
      transaction.source_file || '',
      proofLink,
      transaction.notes || '',
      formatDateForCSV(transaction.created_at)
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
      // Define headers
      const headers = [
        'Date',
        'Payment Type',
        'Transaction Name',
        'Description',
        'Category',
        'Credit Amount (₹)',
        'Debit Amount (₹)',
        'Balance (₹)',
        'Source File',
        'Proof Upload Link',
        'Notes',
        'Created At'
      ];

      // Convert transactions to Excel rows
      const excelRows = transactions.map(transaction => {
        // Create clickable hyperlink for proof if it exists
        let proofLink = '';
        if (transaction.proof) {
          const proof = transaction.proof.trim();
          
          if (proof.startsWith('http://') || proof.startsWith('https://')) {
            // For web URLs, create Excel hyperlink formula
            proofLink = `=HYPERLINK("${proof}","View Proof")`;
          } else if (proof.includes('.pdf') || proof.includes('.jpg') || proof.includes('.jpeg') || 
                     proof.includes('.png') || proof.includes('.gif') || proof.includes('.webp') ||
                     proof.includes('.doc') || proof.includes('.docx') || proof.includes('.xlsx') ||
                     proof.includes('.csv') || proof.includes('.txt')) {
            // For file names with extensions, create a hyperlink
            if (proof.startsWith('/') || proof.includes('\\')) {
              proofLink = `=HYPERLINK("${proof}","View Proof")`;
            } else {
              proofLink = `=HYPERLINK("${proof}","View Proof - Check file location")`;
            }
          } else if (proof.includes('supabase') || proof.includes('storage')) {
            // For Supabase storage URLs, create hyperlink
            proofLink = `=HYPERLINK("${proof}","View Proof")`;
          } else if (proof.length > 10 && !proof.includes('Output') && !proof.includes('statement')) {
            // For meaningful text proof, show the text content
            proofLink = proof;
          } else {
            // For short or system-generated text, show as is
            proofLink = proof || 'No proof available';
          }
        } else {
          proofLink = 'No proof available';
        }
        
        return [
          formatDateForCSV(transaction.date),
          transaction.payment_type || '',
          transaction.transaction_name || '',
          transaction.description || '',
          transaction.category || '',
          transaction.credit_amount || 0,
          transaction.debit_amount || 0,
          transaction.balance || '',
          transaction.source_file || '',
          proofLink,
          transaction.notes || '',
          formatDateForCSV(transaction.created_at)
        ];
      });

      // Create worksheet data
      const worksheetData = [headers, ...excelRows];

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

       // Set column widths
       const columnWidths = [
         { wch: 12 }, // Date
         { wch: 15 }, // Payment Type
         { wch: 25 }, // Transaction Name
         { wch: 30 }, // Description
         { wch: 20 }, // Category
         { wch: 15 }, // Credit Amount
         { wch: 15 }, // Debit Amount
         { wch: 15 }, // Balance
         { wch: 20 }, // Source File
         { wch: 25 }, // Proof Link
         { wch: 30 }, // Notes
         { wch: 15 }  // Created At
       ];
      worksheet['!cols'] = columnWidths;

      // Add hyperlink formatting for proof links
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let row = 1; row <= range.e.r; row++) {
        const proofCell = XLSX.utils.encode_cell({ r: row, c: 9 }); // Column J (Proof Upload Link)
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

      // Debug: Log hyperlink information
      console.log('📊 Excel Export Debug:', {
        totalTransactions: transactions.length,
        hyperlinkCount: excelRows.filter(row => row[9] && row[9].includes('=HYPERLINK')).length,
        sampleHyperlink: excelRows.find(row => row[9] && row[9].includes('=HYPERLINK'))?.[9]
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

// Format date for CSV export
function formatDateForCSV(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
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
