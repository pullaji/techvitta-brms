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
    'Source Type',
    'Proof Upload Link',
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
      transaction.source_type || '',
      proofLink,
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
    'Source Type',
    'Proof Upload Link',
    'Created At'
  ];

  // Convert transactions to CSV rows with Excel hyperlinks
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
      transaction.source_type || '',
      proofLink,
      formatDateForCSV(transaction.created_at)
    ];
  });

  // Combine headers and rows
  const csvContent = [headers, ...csvRows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // Create and download file with .xlsx extension for Excel compatibility
  downloadFile(csvContent, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
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
