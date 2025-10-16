// PDF Generation Utility for Tax Summary Reports
// This utility generates proper PDF reports with calculated tax summaries

export interface TaxSummaryData {
  title: string;
  generatedAt: string;
  period: string;
  summary: {
    totalTransactions: number;
    totalAmount: number;
    deductibleAmount: number;
    taxSavings: number;
  };
  categoryBreakdown: Record<string, number>;
  deductibleTransactions: Array<{
    transaction_date: string;
    notes?: string;
    category: string;
    amount: number;
  }>;
}

export function generateTaxSummaryHTML(data: TaxSummaryData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${data.title}</title>
      <style>
        @page {
          size: A4;
          margin: 0.5in;
        }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0;
          padding: 15px;
          line-height: 1.5;
          color: #333;
          max-width: 100%;
          box-sizing: border-box;
        }
        * {
          box-sizing: border-box;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #2563eb;
          margin: 0;
          font-size: 24px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
        }
        .summary-table { 
          width: 100%; 
          max-width: 100%;
          border-collapse: collapse; 
          margin: 20px 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          table-layout: fixed;
        }
        .summary-table th, .summary-table td { 
          border: 1px solid #e5e7eb; 
          padding: 8px; 
          text-align: left; 
          font-size: 13px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .summary-table th:first-child, .summary-table td:first-child {
          width: 60%;
        }
        .summary-table th:last-child, .summary-table td:last-child {
          width: 40%;
        }
        .summary-table th { 
          background-color: #f8fafc;
          font-weight: 600;
          color: #374151;
        }
        .highlight { 
          background-color: #dbeafe; 
          font-weight: bold;
          color: #1e40af;
        }
        .section { 
          margin: 30px 0; 
        }
        .section h2 {
          color: #2563eb;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
          margin-bottom: 20px;
          font-size: 18px;
        }
        .category-breakdown { 
          margin: 15px 0; 
        }
        .category-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px;
        }
        .category-item:last-child {
          border-bottom: none;
        }
        .footer { 
          margin-top: 50px; 
          text-align: center; 
          color: #6b7280;
          font-size: 12px;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }
        .amount {
          font-weight: 600;
          color: #059669;
        }
        .tax-highlight {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
        }
        .tax-highlight h3 {
          margin: 0 0 10px 0;
          color: #92400e;
        }
        .transactions-table {
          font-size: 11px;
          width: 100%;
          max-width: 100%;
          table-layout: fixed;
        }
        .transactions-table th, .transactions-table td {
          padding: 6px;
          font-size: 11px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .transactions-table th {
          background-color: #f1f5f9;
        }
        .transactions-table th:nth-child(1), .transactions-table td:nth-child(1) {
          width: 15%;
        }
        .transactions-table th:nth-child(2), .transactions-table td:nth-child(2) {
          width: 40%;
        }
        .transactions-table th:nth-child(3), .transactions-table td:nth-child(3) {
          width: 25%;
        }
        .transactions-table th:nth-child(4), .transactions-table td:nth-child(4) {
          width: 20%;
        }
        @media print {
          body { margin: 0; }
          .section { page-break-inside: avoid; }
        }
        .container {
          max-width: 100%;
          overflow-x: hidden;
        }
        .section {
          max-width: 100%;
          overflow-x: hidden;
        }
        .category-item {
          max-width: 100%;
          overflow-x: hidden;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${data.title}</h1>
          <p><strong>Generated on:</strong> ${data.generatedAt}</p>
          <p><strong>Report Period:</strong> ${data.period}</p>
        </div>
      
      <div class="tax-highlight">
        <h3>💰 Tax Savings Summary</h3>
        <p><strong>Total Tax Deductible Expenses:</strong> <span class="amount">₹${data.summary.deductibleAmount.toLocaleString()}</span></p>
        <p><strong>Estimated Tax Savings (30%):</strong> <span class="amount">₹${data.summary.taxSavings.toLocaleString()}</span></p>
      </div>
      
      <div class="section">
        <h2>📊 Financial Summary</h2>
        <table class="summary-table">
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
          <tr>
            <td>Total Transactions</td>
            <td>${data.summary.totalTransactions}</td>
          </tr>
          <tr>
            <td>Total Amount</td>
            <td class="amount">₹${data.summary.totalAmount.toLocaleString()}</td>
          </tr>
          <tr class="highlight">
            <td>Tax Deductible Expenses</td>
            <td class="amount">₹${data.summary.deductibleAmount.toLocaleString()}</td>
          </tr>
          <tr class="highlight">
            <td>Estimated Tax Savings (30%)</td>
            <td class="amount">₹${data.summary.taxSavings.toLocaleString()}</td>
          </tr>
        </table>
      </div>
      
      <div class="section">
        <h2>📋 Category Breakdown</h2>
        <div class="category-breakdown">
          ${Object.entries(data.categoryBreakdown).map(([category, amount]: [string, number]) => `
            <div class="category-item">
              <span><strong>${category}</strong></span>
              <span class="amount">₹${amount.toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="section">
        <h2>🧾 Tax Deductible Transactions</h2>
        <table class="summary-table transactions-table">
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount (₹)</th>
          </tr>
          ${data.deductibleTransactions.map((t) => `
            <tr>
              <td>${new Date(t.transaction_date).toLocaleDateString()}</td>
              <td>${t.notes || 'No description'}</td>
              <td>${t.category}</td>
              <td class="amount">₹${t.amount.toLocaleString()}</td>
            </tr>
          `).join('')}
        </table>
      </div>
      
        <div class="footer">
          <p><strong>Disclaimer:</strong> This report is generated for tax filing purposes. Please consult with a tax professional for accurate calculations and compliance with current tax laws.</p>
          <p>Generated by TechVitta BRMS - Business Receipt Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function downloadTaxSummaryPDF(data: TaxSummaryData, filename: string = 'tax-summary-report.pdf'): void {
  const htmlContent = generateTaxSummaryHTML(data);
  
  // Create a temporary container to render the HTML
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '800px';
  container.style.backgroundColor = 'white';
  container.style.overflow = 'visible';
  document.body.appendChild(container);
  
  // Try to use jsPDF with html2canvas
  try {
    Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]).then(([jsPDFModule, html2canvasModule]) => {
      const jsPDF = jsPDFModule.default;
      const html2canvas = html2canvasModule.default;
      
      // Find the body element in the container
      const element = container.querySelector('body') || container;
      
      html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        width: 800,
        height: element.scrollHeight,
        windowWidth: 800
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // A4 dimensions with proper margins
        const pageWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const margin = 10; // 10mm margin on all sides
        const contentWidth = pageWidth - (margin * 2);
        const contentHeight = pageHeight - (margin * 2);
        
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = margin;
        
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= contentHeight;
        
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight + margin;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
          heightLeft -= contentHeight;
        }
        
        pdf.save(filename);
        
        // Clean up
        document.body.removeChild(container);
      }).catch((error) => {
        console.error('Error generating PDF with html2canvas:', error);
        document.body.removeChild(container);
        // Fallback to HTML download
        downloadTaxSummaryHTML(data, filename.replace('.pdf', '.html'));
      });
    }).catch((error) => {
      console.error('Error loading PDF libraries:', error);
      document.body.removeChild(container);
      // Fallback: Download as HTML
      downloadTaxSummaryHTML(data, filename.replace('.pdf', '.html'));
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    document.body.removeChild(container);
    // Fallback: Download as HTML
    downloadTaxSummaryHTML(data, filename.replace('.pdf', '.html'));
  }
}

export function downloadTaxSummaryHTML(data: TaxSummaryData, filename: string = 'tax-summary-report.html'): void {
  const htmlContent = generateTaxSummaryHTML(data);
  
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
