import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

// PDF Generation Functions using jsPDF
export const generateTransactionPDF = (data: any) => {
  const { transactions, summary, reportName } = data;
  
  // Create new PDF document
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 20;
  
  // Helper function to add text with word wrapping
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    const maxWidth = options.maxWidth || pageWidth - x - 20;
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * (options.lineHeight || 7));
  };
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(reportName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;
  
  // Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction Summary', 20, yPosition);
  yPosition += 10;
  
  // Summary table - ensure amounts are properly formatted
  const totalCredits = summary.totalCredits ? parseFloat(summary.totalCredits) : 0;
  const totalDebits = summary.totalDebits ? parseFloat(summary.totalDebits) : 0;
  const currentBalance = summary.currentBalance ? parseFloat(summary.currentBalance) : 0;
  
  // Format summary amounts exactly like Transactions page
  const summaryData = [
    ['Total Transactions', summary.totalTransactions.toString()],
    ['Total Credits (₹)', `₹${totalCredits.toLocaleString('en-IN')}`],
    ['Total Debits (₹)', `₹${totalDebits.toLocaleString('en-IN')}`],
    ['Current Balance (₹)', `₹${currentBalance.toLocaleString('en-IN')}`],
    ['Date Range', `${summary.startingDate} to ${summary.endingDate}`]
  ];
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202], fontSize: 10, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'right', cellWidth: 40 }
    },
    margin: { top: 20, right: 10, bottom: 20, left: 10 }
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // Transaction Details Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction Details', 20, yPosition);
  yPosition += 10;
  
  // Prepare transaction data
  const transactionData = transactions.map(transaction => {
    // Debug: Log transaction data to see what we're working with
    console.log('PDF Transaction Data:', {
      date: transaction.date,
      credit_amount: transaction.credit_amount,
      debit_amount: transaction.debit_amount,
      balance: transaction.balance,
      payment_type: transaction.payment_type,
      description: transaction.description
    });

    // Format proof text to fit in column
    const proofText = transaction.proof && transaction.proof.trim() !== '' && 
      !transaction.proof.includes('Book1') && 
      !transaction.proof.includes('.xlsx') && 
      !transaction.proof.includes('Output') && 
      transaction.proof.length > 5 ? 
      (transaction.proof.length > 15 ? transaction.proof.substring(0, 12) + '...' : transaction.proof) : '-';
    
    // Format notes text to fit in column
    const notesText = transaction.notes && transaction.notes.trim() !== '' && 
      !transaction.notes.includes('Uploaded from:') && 
      !transaction.notes.includes('Book1') && 
      !transaction.notes.includes('.xlsx') && 
      transaction.notes.length > 5 ? 
      (transaction.notes.length > 15 ? transaction.notes.substring(0, 12) + '...' : transaction.notes) : '-';
    
    // Handle amounts exactly like Transactions page - no conversion needed
    const creditAmount = transaction.credit_amount || 0;
    const debitAmount = transaction.debit_amount || 0;
    const balanceAmount = transaction.balance || 0;
    
    // Format payment type to be shorter
    const paymentType = transaction.payment_type ? 
      transaction.payment_type.replace('_', ' ').substring(0, 8) : 'Unknown';
    
    // Format description to prevent cutting
    const description = transaction.description || transaction.transaction_name || 'No description';
    const shortDescription = description.length > 25 ? description.substring(0, 22) + '...' : description;
    
    // Format amounts exactly like Transactions page
    const creditText = (creditAmount && creditAmount > 0) ? 
      `+₹${creditAmount.toLocaleString()}` : '-';
    
    const debitText = (debitAmount && debitAmount > 0) ? 
      `-₹${debitAmount.toLocaleString()}` : '-';
    
    const balanceText = balanceAmount ? 
      `₹${balanceAmount.toLocaleString()}` : '-';
    
    // Debug: Log the formatted amounts to see if they fit
    console.log('Formatted Amounts:', {
      credit: creditText,
      debit: debitText,
      balance: balanceText,
      creditLength: creditText.length,
      debitLength: debitText.length,
      balanceLength: balanceText.length
    });
    
    return [
      new Date(transaction.date).toLocaleDateString(),
      paymentType,
      shortDescription,
      creditText,
      debitText,
      balanceText,
      proofText,
      notesText
    ];
  });
  
  // Transaction table with better column widths
  autoTable(doc, {
    startY: yPosition,
    head: [['Date', 'Type', 'Description', 'Credit', 'Debit', 'Balance', 'Proof', 'Notes']],
    body: transactionData,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' }, // Date
      1: { cellWidth: 14, halign: 'center' }, // Payment Type
      2: { cellWidth: 28, halign: 'left' }, // Description
      3: { cellWidth: 35, halign: 'right', cellPadding: 2 }, // Credit Amount - Extra width for +₹
      4: { cellWidth: 35, halign: 'right', cellPadding: 2 }, // Debit Amount - Extra width for -₹
      5: { cellWidth: 35, halign: 'right', cellPadding: 2 }, // Balance - Extra width for ₹
      6: { cellWidth: 15, halign: 'left' }, // Proof
      7: { cellWidth: 15, halign: 'left' }  // Notes
    },
    didDrawPage: function (data: any) {
      // Footer on each page
      const pageCount = doc.getNumberOfPages();
      const currentPage = data.pageNumber;
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Page ${currentPage} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
      doc.text('Generated by TechVitta BRMS', 20, pageHeight - 10);
    },
    margin: { top: 20, right: 10, bottom: 20, left: 10 },
    tableWidth: 'wrap',
    showHead: 'everyPage'
  });
  
  return doc;
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  // Save the PDF
  doc.save(filename);
};
