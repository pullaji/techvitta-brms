import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, FileSpreadsheet, Info } from 'lucide-react';

export const ExcelTemplateDownloader: React.FC = () => {
  const downloadTemplate = (format: 'separate' | 'single') => {
    // Create sample data based on format
    let headers: string[];
    let sampleData: any[][];
    
    if (format === 'separate') {
      headers = ['Date', 'Description', 'Credit', 'Debit', 'Balance'];
      sampleData = [
        ['YYYY-MM-DD', 'Transaction Description', 'Credit Amount', 'Debit Amount', 'Balance'],
        ['2024-01-15', 'Sample Credit Transaction', 1000, '', 1000],
        ['2024-01-16', 'Sample Debit Transaction', '', 500, 500],
        ['2024-01-17', 'Another Credit Transaction', 2000, '', 2500],
        ['2024-01-18', 'Another Debit Transaction', '', 300, 2200]
      ];
    } else {
      headers = ['Date', 'Description', 'Amount', 'Balance'];
      sampleData = [
        ['YYYY-MM-DD', 'Transaction Description', 'Amount (+/-)', 'Balance'],
        ['2024-01-15', 'Sample Credit Transaction', 1000, 1000],
        ['2024-01-16', 'Sample Debit Transaction', -500, 500],
        ['2024-01-17', 'Another Credit Transaction', 2000, 2500],
        ['2024-01-18', 'Another Debit Transaction', -300, 2200]
      ];
    }
    
    // Create workbook
    const XLSX = require('xlsx');
    const workbook = XLSX.utils.book_new();
    
    // Create worksheet with headers and sample data
    const worksheetData = [headers, ...sampleData];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Add some styling (basic)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) continue;
        
        // Header row styling
        if (row === 0) {
          worksheet[cellAddress].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "E6F3FF" } },
            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" }
            }
          };
        }
      }
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    
    // Add instructions sheet
    const instructions = [
      ['Excel Template Instructions'],
      [''],
      ['This template shows the correct format for uploading bank statement data.'],
      [''],
      ['Required Columns:'],
      ['- Date: Transaction date (YYYY-MM-DD format recommended)'],
      ['- Description: Transaction description or narration'],
      [format === 'separate' ? '- Credit: Amount received (leave empty if no credit)' : '- Amount: Positive for credits, negative for debits'],
      [format === 'separate' ? '- Debit: Amount spent (leave empty if no debit)' : ''],
      ['- Balance: Running balance (optional)'],
      [''],
      ['Tips:'],
      ['- Use clear, descriptive transaction descriptions'],
      ['- Ensure dates are in a recognizable format'],
      ['- Remove any empty rows before uploading'],
      ['- Save as .xlsx format for best compatibility']
    ];
    
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
    
    // Generate filename
    const filename = `bank_statement_template_${format}_columns.xlsx`;
    
    // Save file
    XLSX.writeFile(workbook, filename);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-3 mb-4">
        <FileSpreadsheet className="w-6 h-6 text-green-600" />
        <h3 className="text-lg font-semibold">Excel Template Download</h3>
      </div>
      
      <p className="text-muted-foreground mb-6">
        Download a properly formatted Excel template to ensure your bank statement data is processed correctly.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">Separate Credit/Debit Columns</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Recommended format with separate columns for credits and debits. Best for detailed bank statements.
          </p>
          <Button 
            onClick={() => downloadTemplate('separate')}
            variant="outline"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
        </div>
        
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">Single Amount Column</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Simple format with positive amounts for credits and negative for debits.
          </p>
          <Button 
            onClick={() => downloadTemplate('single')}
            variant="outline"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Instructions:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Download the template that matches your data format</li>
              <li>Replace the sample data with your actual bank statement data</li>
              <li>Keep the column headers exactly as shown</li>
              <li>Save your file and upload it to the system</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
};
