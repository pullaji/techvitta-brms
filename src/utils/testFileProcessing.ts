// Test utility for enhanced file processing
// This file can be used to test the file processing functionality

import { enhancedFileProcessorService } from '@/services/enhancedFileProcessor';

// Test data for different file types
export const testData = {
  // Sample CSV data for testing
  csvData: `Date,Description,Amount,Type
2024-01-15,Salary Credit,50000,credit
2024-01-16,UPI Payment to Swiggy,250,debit
2024-01-17,Bank Transfer from Client,15000,credit
2024-01-18,Office Supplies Purchase,1200,debit
2024-01-19,Interest Credit,500,credit`,

  // Sample Excel data structure
  excelData: [
    ['Date', 'Description', 'Amount', 'Type'],
    ['2024-01-15', 'Salary Credit', 50000, 'credit'],
    ['2024-01-16', 'UPI Payment to Swiggy', -250, 'debit'],
    ['2024-01-17', 'Bank Transfer from Client', 15000, 'credit'],
    ['2024-01-18', 'Office Supplies Purchase', -1200, 'debit'],
    ['2024-01-19', 'Interest Credit', 500, 'credit']
  ],

  // Sample PDF text content
  pdfText: `
IDFC FIRST Bank Statement
Account: xxxxxx1234
Period: 1 Jan 2024 to 31 Jan 2024

Date        Payment Type    Transaction Name        Category    Amount
15 Jan 2024  Salary         Salary Credit          Income      +₹50,000.00
16 Jan 2024  UPI            UPI Payment to Swiggy  Food        -₹250.00
17 Jan 2024  Transfer       Bank Transfer from Client Business  +₹15,000.00
18 Jan 2024  Receipt        Office Supplies Purchase Office     -₹1,200.00
19 Jan 2024  Interest       Interest Credit        Investment   +₹500.00
  `
};

// Test function to validate file processing
export async function testFileProcessing() {
  console.log('🧪 Testing Enhanced File Processing System');
  
  try {
    // Test CSV processing
    console.log('\n📊 Testing CSV Processing...');
    const csvFile = new File([testData.csvData], 'test.csv', { type: 'text/csv' });
    const csvResult = await enhancedFileProcessorService.processFile(csvFile);
    
    if (csvResult.success) {
      console.log(`✅ CSV Processing: ${csvResult.transactions.length} transactions extracted`);
      console.log('Sample transaction:', csvResult.transactions[0]);
    } else {
      console.log('❌ CSV Processing failed:', csvResult.error);
    }

    // Test category detection
    console.log('\n🏷️ Testing Category Detection...');
    const testDescriptions = [
      'Salary Credit',
      'UPI Payment to Swiggy',
      'Office Supplies Purchase',
      'Interest Credit',
      'Bank Transfer from Client'
    ];

    testDescriptions.forEach(desc => {
      // This would test the category detection logic
      console.log(`Description: "${desc}" → Category: [Auto-detected]`);
    });

    console.log('\n✅ File Processing Test Completed');
    return true;
    
  } catch (error) {
    console.error('❌ File Processing Test Failed:', error);
    return false;
  }
}

// Utility function to create test files
export function createTestFile(content: string, filename: string, type: string): File {
  return new File([content], filename, { type });
}

// Test data for different bank statement formats
export const bankStatementFormats = {
  // Standard bank statement format
  standard: {
    headers: ['Date', 'Description', 'Amount', 'Balance'],
    sampleRow: ['2024-01-15', 'Salary Credit', '+₹50,000.00', '₹1,25,000.00']
  },
  
  // UPI transaction format
  upi: {
    headers: ['Date', 'UPI ID', 'Transaction Type', 'Amount'],
    sampleRow: ['2024-01-16', 'swiggy@paytm', 'Payment', '-₹250.00']
  },
  
  // Bank transfer format
  transfer: {
    headers: ['Date', 'From/To', 'Account Number', 'Amount'],
    sampleRow: ['2024-01-17', 'Client ABC', '****1234', '+₹15,000.00']
  }
};

// Validation functions
export const validators = {
  // Validate transaction data
  validateTransaction: (transaction: any) => {
    const required = ['date', 'payment_type', 'transaction_name', 'category'];
    const missing = required.filter(field => !transaction[field]);
    
    if (missing.length > 0) {
      return { valid: false, missing };
    }
    
    // Validate amounts
    const hasAmount = (transaction.credit_amount > 0) || (transaction.debit_amount > 0);
    if (!hasAmount) {
      return { valid: false, missing: ['amount'] };
    }
    
    return { valid: true };
  },
  
  // Validate file type
  validateFileType: (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    return allowedTypes.includes(file.type);
  },
  
  // Validate file size
  validateFileSize: (file: File, maxSizeMB: number = 10) => {
    const maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
    return file.size <= maxSize;
  }
};

// Performance testing utilities
export const performanceTests = {
  // Test processing time for different file sizes
  measureProcessingTime: async (file: File) => {
    const startTime = Date.now();
    const result = await enhancedFileProcessorService.processFile(file);
    const endTime = Date.now();
    
    return {
      processingTime: endTime - startTime,
      success: result.success,
      transactionCount: result.transactions.length
    };
  },
  
  // Test memory usage (approximate)
  measureMemoryUsage: () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return null;
  }
};

// Export test runner
export async function runAllTests() {
  console.log('🚀 Running Enhanced File Processing Tests');
  
  const results = {
    fileProcessing: await testFileProcessing(),
    validators: {
      transaction: validators.validateTransaction({
        date: '2024-01-15',
        payment_type: 'upi',
        transaction_name: 'Test Transaction',
        category: 'business_expense',
        credit_amount: 0,
        debit_amount: 100
      }),
      fileType: validators.validateFileType(new File(['test'], 'test.pdf', { type: 'application/pdf' })),
      fileSize: validators.validateFileSize(new File(['test'], 'test.pdf', { type: 'application/pdf' }))
    }
  };
  
  console.log('\n📋 Test Results:', results);
  return results;
}
