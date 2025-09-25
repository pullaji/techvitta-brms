// Test utility for Excel processing
// This can be used to test the Excel column mapper without uploading files

import { excelColumnMapper } from '@/services/excelColumnMapper';

// Test data simulating different Excel formats
const testData = {
  hdfc: {
    headers: ['Txn Date', 'Description', 'Debit', 'Credit', 'Balance'],
    rows: [
      ['2024-01-15', 'Salary Credit', '', '50000', '50000'],
      ['2024-01-16', 'Rent Payment', '15000', '', '35000'],
      ['2024-01-17', 'Grocery Shopping', '2500', '', '32500']
    ]
  },
  icici: {
    headers: ['Date', 'Narration', 'Withdrawal', 'Deposit', 'Balance'],
    rows: [
      ['2024-01-15', 'Salary Credit', '', '50000', '50000'],
      ['2024-01-16', 'Office Rent', '15000', '', '35000'],
      ['2024-01-17', 'Food & Beverages', '2500', '', '32500']
    ]
  },
  sbi: {
    headers: ['Transaction Date', 'Particulars', 'Amount', 'Balance'],
    rows: [
      ['2024-01-15', 'Salary Credit', '50000', '50000'],
      ['2024-01-16', 'Office Rent', '-15000', '35000'],
      ['2024-01-17', 'Food & Beverages', '-2500', '32500']
    ]
  },
  axis: {
    headers: ['Value Date', 'Description', 'Dr', 'Cr', 'Balance'],
    rows: [
      ['2024-01-15', 'Salary Credit', '', '50000', '50000'],
      ['2024-01-16', 'Office Rent', '15000', '', '35000'],
      ['2024-01-17', 'Food & Beverages', '2500', '', '32500']
    ]
  },
  custom: {
    headers: ['Entry Date', 'Details', 'Payment', 'Receipt', 'Closing Balance', 'Account No', 'Reference'],
    rows: [
      ['2024-01-15', 'Salary Credit', '', '50000', '50000', '1234567890', 'TXN001'],
      ['2024-01-16', 'Office Rent', '15000', '', '35000', '1234567890', 'TXN002'],
      ['2024-01-17', 'Food & Beverages', '2500', '', '32500', '1234567890', 'TXN003']
    ]
  }
};

export const testExcelColumnMapping = async () => {
  console.log('🧪 Testing Excel Column Mapping...');
  
  for (const [bankName, data] of Object.entries(testData)) {
    console.log(`\n📊 Testing ${bankName.toUpperCase()} format:`);
    console.log('Headers:', data.headers);
    
    // Test column mapping
    const columnMapping = excelColumnMapper['mapHeadersToStandardFields'](data.headers);
    console.log('Column Mapping:', columnMapping);
    
    // Test data processing
    const jsonData = [data.headers, ...data.rows];
    const mappedTransactions = excelColumnMapper['processDataRows'](jsonData, columnMapping);
    
    console.log(`✅ Processed ${mappedTransactions.length} transactions:`);
    mappedTransactions.forEach((tx, index) => {
      console.log(`  ${index + 1}. ${tx.date} - ${tx.description} - ${tx.type} ₹${tx.amount}`);
    });
  }
  
  console.log('\n🎉 Excel column mapping test completed!');
};

// Test category detection
export const testCategoryDetection = () => {
  console.log('🏷️ Testing Category Detection...');
  
  const testDescriptions = [
    'Salary Credit',
    'Office Rent Payment',
    'Food & Beverages',
    'Petrol Expense',
    'Medical Bill',
    'School Fees',
    'Uber Ride',
    'Software Subscription',
    'Electricity Bill',
    'Bank Transfer',
    'ATM Withdrawal',
    'UPI Payment'
  ];
  
  // Import the detectCategory function from supabaseApi
  // This would need to be imported or copied here for testing
  console.log('Category detection test ready - run with actual upload to see results');
};

// Run tests if called directly
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).testExcelProcessing = {
    testColumnMapping: testExcelColumnMapping,
    testCategoryDetection: testCategoryDetection
  };
  console.log('🔧 Test functions available at window.testExcelProcessing');
}
