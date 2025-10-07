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
          margin: 1in;
        }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0;
          padding: 20px;
          line-height: 1.6;
          color: #333;
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
          border-collapse: collapse; 
          margin: 20px 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .summary-table th, .summary-table td { 
          border: 1px solid #e5e7eb; 
          padding: 10px; 
          text-align: left; 
          font-size: 14px;
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
          font-size: 12px;
        }
        .transactions-table th, .transactions-table td {
          padding: 8px;
          font-size: 12px;
        }
        .transactions-table th {
          background-color: #f1f5f9;
        }
        @media print {
          body { margin: 0; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
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
    </body>
    </html>
  `;
}

export function downloadTaxSummaryPDF(data: TaxSummaryData, filename: string = 'tax-summary-report.pdf'): void {
  const htmlContent = generateTaxSummaryHTML(data);
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Close the window after printing
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }, 500);
    };
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
