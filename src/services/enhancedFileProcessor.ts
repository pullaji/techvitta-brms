// Enhanced file processing service for comprehensive bank statement parsing
// Supports PDF, Excel, CSV, and Image files with proper transaction extraction

import { pdfParserService } from './pdfParser';
import { supabase } from '@/lib/supabase';
import { initPDFJS } from '@/utils/pdfInit';

// Enhanced transaction interface matching database schema
export interface EnhancedTransaction {
  date: string;
  payment_type: string;
  transaction_name: string;
  description: string;
  category: string;
  credit_amount: number;
  debit_amount: number;
  balance?: number;
  source_file: string;
  source_type: 'pdf' | 'excel' | 'csv' | 'image' | 'manual';
  proof?: string;
  notes?: string;
}

// Processing result interface
export interface EnhancedProcessingResult {
  success: boolean;
  transactions: EnhancedTransaction[];
  error?: string;
  metadata?: {
    totalTransactions: number;
    totalCredits: number;
    totalDebits: number;
    fileType: string;
    processingTime: number;
    extractedText?: string;
  };
}

// Enhanced category detection patterns
const ENHANCED_CATEGORY_PATTERNS = {
  // Income categories
  salary: ['salary', 'wage', 'payroll', 'bonus', 'incentive', 'stipend'],
  business_income: ['business', 'revenue', 'sales', 'income', 'earning', 'profit'],
  investment: ['interest', 'dividend', 'investment', 'return', 'yield', 'capital gain', 'cma interest', 'macquarie'],
  refund: ['refund', 'return', 'reimbursement', 'cashback', 'rebate'],
  transfer_in: ['transfer', 'deposit', 'credit', 'received', 'incoming'],
  
  // Expense categories
  business_expense: ['business', 'office', 'work', 'professional', 'corporate', 'asic', 'bpay'],
  personal_expense: ['personal', 'private', 'individual'],
  travel_transport: ['uber', 'ola', 'bus', 'train', 'metro', 'taxi', 'flight', 'hotel', 'travel', 'transport', 'fuel', 'petrol', 'diesel'],
  meals_entertainment: ['swiggy', 'zomato', 'restaurant', 'food', 'lunch', 'dinner', 'cafe', 'pizza', 'burger', 'movie', 'cinema', 'netflix', 'spotify', 'entertainment', 'game', 'gaming'],
  office_supplies: ['stationery', 'supplies', 'equipment', 'office', 'work', 'business'],
  software_subscriptions: ['software', 'subscription', 'saas', 'app', 'license', 'premium'],
  utilities: ['electricity', 'gas', 'water', 'phone', 'internet', 'mobile', 'utility', 'bill', 'power'],
  medical: ['hospital', 'doctor', 'medical', 'pharmacy', 'medicine', 'health', 'clinic', 'dental'],
  education: ['school', 'college', 'university', 'education', 'tuition', 'course', 'training', 'book'],
  insurance: ['insurance', 'premium', 'policy', 'coverage', 'life insurance', 'health insurance'],
  shopping: ['amazon', 'flipkart', 'myntra', 'shopping', 'mall', 'store', 'market', 'retail', 'purchase'],
  loan_payment: ['loan', 'emi', 'installment', 'repayment', 'mortgage'],
  maintenance: ['repair', 'maintenance', 'service', 'fix', 'upkeep'],
  withdrawal: ['withdrawal', 'cash', 'atm', 'withdraw'],
  transfer_out: ['transfer', 'payment', 'sent', 'outgoing', 'trustee', 'non-con contribut']
};

class EnhancedFileProcessorService {
  private startTime: number = 0;

  // Main processing method
  async processFile(file: File): Promise<EnhancedProcessingResult> {
    this.startTime = Date.now();
    
    try {
      // Validate file
      this.validateFile(file);
      
      const fileType = this.getFileType(file);
      console.log(`Processing ${fileType} file: ${file.name}`);

      let transactions: EnhancedTransaction[] = [];
      let extractedText = '';

      switch (fileType) {
        case 'pdf':
          const pdfResult = await this.processPDF(file);
          transactions = pdfResult.transactions;
          extractedText = pdfResult.extractedText;
          break;
        case 'excel':
          transactions = await this.processExcel(file);
          break;
        case 'csv':
          transactions = await this.processCSV(file);
          break;
        case 'image':
          const imageResult = await this.processImage(file);
          transactions = imageResult.transactions;
          extractedText = imageResult.extractedText;
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Validate extracted transactions
      if (transactions.length === 0) {
        throw new Error('No transactions could be extracted from the file. Please ensure the file contains valid transaction data.');
      }

      // Post-process transactions
      const processedTransactions = this.postProcessTransactions(transactions, file.name, fileType);

      const processingTime = Date.now() - this.startTime;
      const totalCredits = processedTransactions.reduce((sum, t) => sum + t.credit_amount, 0);
      const totalDebits = processedTransactions.reduce((sum, t) => sum + t.debit_amount, 0);

      return {
        success: true,
        transactions: processedTransactions,
        metadata: {
          totalTransactions: processedTransactions.length,
          totalCredits,
          totalDebits,
          fileType,
          processingTime,
          extractedText: extractedText.substring(0, 1000) // First 1000 chars for debugging
        }
      };

    } catch (error: any) {
      console.error('Enhanced file processing error:', error);
      
      return {
        success: false,
        transactions: [],
        error: error.message || 'Unknown processing error'
      };
    }
  }

  // Validate file before processing
  private validateFile(file: File): void {
    // Check file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds the maximum allowed size of 10MB.`);
    }

    // Check if file is empty
    if (file.size === 0) {
      throw new Error('File is empty. Please select a valid file with content.');
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}. Please upload a PDF, Excel, CSV, or image file.`);
    }
  }

  // Get file type from file extension
  private getFileType(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'xlsx':
      case 'xls':
        return 'excel';
      case 'csv':
        return 'csv';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'image';
      default:
        throw new Error(`Unsupported file extension: ${extension}`);
    }
  }

  // Process PDF files with enhanced parsing
  private async processPDF(file: File): Promise<{ transactions: EnhancedTransaction[], extractedText: string }> {
    try {
      console.log('Processing PDF file with enhanced parser:', file.name);
      
      // Use the existing PDF parser service
      const parsedStatement = await pdfParserService.parseBankStatementPDF(file);
      
      // Convert to enhanced transaction format
      const transactions: EnhancedTransaction[] = parsedStatement.transactions.map(transaction => ({
        date: transaction.date,
        payment_type: transaction.paymentType,
        transaction_name: transaction.transactionName,
        description: transaction.transactionName, // Use transaction name as description
        category: transaction.category,
        credit_amount: transaction.isCredit ? transaction.amount : 0,
        debit_amount: !transaction.isCredit ? transaction.amount : 0,
        source_file: file.name,
        source_type: 'pdf' as const,
        notes: `Parsed from PDF bank statement`
      }));

      return {
        transactions,
        extractedText: `PDF processed: ${parsedStatement.transactions.length} transactions found`
      };
      
    } catch (error: any) {
      console.error('Enhanced PDF processing error:', error);
      
      // If PDF parsing fails, try to extract text manually
      try {
        const text = await this.extractTextFromPDF(file);
        const transactions = this.parseTextForTransactions(text, file.name, 'pdf');
        
        return {
          transactions,
          extractedText: text.substring(0, 2000)
        };
      } catch (fallbackError) {
        throw new Error(`PDF processing failed: ${error.message}`);
      }
    }
  }

  // Extract text from PDF using PDF.js with proper worker configuration
  private async extractTextFromPDF(file: File): Promise<string> {
    try {
      // Initialize PDF.js
      const pdfjs = initPDFJS();
      
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load the PDF document
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      if (!fullText || fullText.trim().length === 0) {
        throw new Error('No text could be extracted from the PDF');
      }
      
      return fullText;
      
    } catch (error) {
      console.error('PDF text extraction error:', error);
      throw new Error(`PDF text extraction failed: ${error.message || 'Unknown error'}`);
    }
  }

  // Process Excel files with enhanced parsing and comprehensive debugging
  private async processExcel(file: File): Promise<EnhancedTransaction[]> {
    try {
      console.log('🚀 Processing Excel file:', file.name);
      
      // Import XLSX library dynamically
      const XLSX = await import('xlsx');
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get the first worksheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            console.log('📊 Excel Info:', {
              fileName: file.name,
              sheetName,
              totalSheets: workbook.SheetNames.length,
              range: worksheet['!ref']
            });
            
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length < 2) {
              throw new Error('Excel file must contain at least a header row and one data row');
            }
            
            console.log('📋 Excel Data Preview:', {
              totalRows: jsonData.length,
              headers: jsonData[0],
              firstDataRow: jsonData[1]
            });
            
            const headers = (jsonData[0] as string[]).map(h => h ? h.toString().toLowerCase().trim() : '');
            const transactions: EnhancedTransaction[] = [];
            
            console.log('🔍 Headers with indexes:', headers.map((h, i) => `${i}: "${h}"`));
            
            // Enhanced column detection with more patterns
            const dateIndex = this.findColumnIndex(headers, [
              'date', 'transaction_date', 'tran_date', 'trans_date', 'value_date', 
              'posting_date', 'entry_date', 'transaction date', 'tran date', 'value date'
            ]);
            
            const descriptionIndex = this.findColumnIndex(headers, [
              'description', 'narration', 'particulars', 'details', 'transaction_name',
              'transaction name', 'narrative', 'memo', 'remarks', 'note', 'reference'
            ]);
            
            // Look for separate credit and debit columns with more patterns
            const creditIndex = this.findColumnIndex(headers, [
              'credit', 'credit amount', 'deposit', 'receipt', 'inflow', 'income',
              'credit_amount', 'credit_amt', 'cr', 'dr_cr', 'amount_cr', 'credit_balance'
            ]);
            
            const debitIndex = this.findColumnIndex(headers, [
              'debit', 'debit amount', 'withdrawal', 'payment', 'outflow', 'expense',
              'debit_amount', 'debit_amt', 'dr', 'amount_dr', 'debit_balance'
            ]);
            
            // Also support single amount column as fallback
            const amountIndex = this.findColumnIndex(headers, [
              'amount', 'value', 'total', 'transaction_amount', 'amt', 'balance_change'
            ]);
            
            const balanceIndex = this.findColumnIndex(headers, [
              'balance', 'closing_balance', 'running_balance', 'available_balance',
              'balance_after', 'running bal', 'closing bal', 'current_balance'
            ]);
            
            const typeIndex = this.findColumnIndex(headers, [
              'type', 'transaction_type', 'payment_type', 'mode', 'method',
              'transaction type', 'payment type', 'transaction_mode'
            ]);
            
            console.log('📊 Column mapping results:', {
              date: dateIndex,
              description: descriptionIndex,
              credit: creditIndex,
              debit: debitIndex,
              amount: amountIndex,
              balance: balanceIndex,
              type: typeIndex
            });
            
            // Enhanced validation with better error messages
            if (dateIndex === -1) {
              throw new Error(`Date column not found. Available columns: ${headers.join(', ')}`);
            }
            
            if (creditIndex === -1 && debitIndex === -1 && amountIndex === -1) {
              throw new Error(`No amount columns found. Looking for: credit, debit, or amount columns. Available columns: ${headers.join(', ')}`);
            }
            
            let processedRows = 0;
            let skippedRows = 0;
            
            // Process each row with detailed debugging
            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              
              // Skip completely empty rows
              if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
                skippedRows++;
                continue;
              }
              
              console.log(`🔄 Processing row ${i}:`, row);
              
              // More flexible date handling
              const dateValue = row[dateIndex];
              if (!dateValue) {
                console.log(`⚠️ Skipping row ${i}: No date value`);
                skippedRows++;
                continue;
              }
              
              const date = this.parseDate(dateValue);
              const description = row[descriptionIndex] || `Transaction ${i}`;
              const balance = balanceIndex !== -1 ? this.parseAmount(row[balanceIndex]) : undefined;
              const paymentType = row[typeIndex] || 'bank_transfer';
              
              let creditAmount = 0;
              let debitAmount = 0;
              
              // Handle separate credit/debit columns
              if (creditIndex !== -1 && debitIndex !== -1) {
                creditAmount = this.parseAmount(row[creditIndex]);
                debitAmount = this.parseAmount(row[debitIndex]);
                console.log(`💰 Row ${i} amounts: Credit=${creditAmount}, Debit=${debitAmount}`);
              }
              // Handle single amount column
              else if (amountIndex !== -1) {
                const amount = this.parseAmount(row[amountIndex]);
                if (amount > 0) {
                  creditAmount = Math.abs(amount);
                } else if (amount < 0) {
                  debitAmount = Math.abs(amount);
                }
                console.log(`💰 Row ${i} amount: ${amount} → Credit=${creditAmount}, Debit=${debitAmount}`);
              }
              
              // Skip if no amount data
              if (creditAmount === 0 && debitAmount === 0) {
                console.log(`⚠️ Skipping row ${i}: No amount data`);
                skippedRows++;
                continue;
              }
              
              const transaction: EnhancedTransaction = {
                date,
                payment_type: paymentType,
                transaction_name: description,
                description,
                category: this.detectCategory(description, paymentType),
                credit_amount: creditAmount,
                debit_amount: debitAmount,
                balance,
                source_file: file.name,
                source_type: 'excel' as const,
                notes: `Imported from Excel file, row ${i}`
              };
              
              console.log(`✅ Created transaction:`, transaction);
              transactions.push(transaction);
              processedRows++;
            }
            
            console.log(`🎉 Excel processing completed: ${processedRows} transactions processed, ${skippedRows} rows skipped`);
            
            if (transactions.length === 0) {
              throw new Error(`No valid transactions found. Processed ${processedRows} rows, skipped ${skippedRows} rows. Please check your Excel format.`);
            }
            
            resolve(transactions);
          } catch (error: any) {
            console.error('❌ Excel processing error:', error);
            reject(new Error(`Excel processing failed: ${error.message}`));
          }
        };
        
        reader.onerror = () => reject(new Error('Failed to read Excel file'));
        reader.readAsArrayBuffer(file);
      });
    } catch (error: any) {
      console.error('Enhanced Excel processing error:', error);
      throw new Error(`Excel processing failed: ${error.message}`);
    }
  }

  // Process CSV files with enhanced parsing
  private async processCSV(file: File): Promise<EnhancedTransaction[]> {
    try {
      console.log('Processing CSV file with enhanced parser:', file.name);
      
      // Import PapaParse library dynamically
      const Papa = await import('papaparse');
      
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              if (results.errors.length > 0) {
                console.warn('CSV parsing warnings:', results.errors);
              }
              
              const data = results.data as any[];
              if (data.length === 0) {
                throw new Error('CSV file is empty or has no valid data');
              }
              
              const headers = Object.keys(data[0]).map(h => h.toLowerCase().trim());
              const transactions: EnhancedTransaction[] = [];
              
              // Find required columns with enhanced pattern matching
              const dateIndex = this.findColumnIndex(headers, ['date', 'transaction_date', 'tran_date', 'trans_date']);
              const descriptionIndex = this.findColumnIndex(headers, ['description', 'narration', 'particulars', 'details', 'transaction_name']);
              
              // Look for separate credit and debit columns (ABC Super Fund format)
              const creditIndex = this.findColumnIndex(headers, ['credit', 'credit amount', 'deposit', 'receipt', 'inflow', 'income']);
              const debitIndex = this.findColumnIndex(headers, ['debit', 'debit amount', 'withdrawal', 'payment', 'outflow', 'expense']);
              
              // Also support single amount column as fallback (legacy format)
              const amountIndex = this.findColumnIndex(headers, ['amount', 'value', 'total', 'transaction_amount']);
              
              const balanceIndex = this.findColumnIndex(headers, ['balance', 'closing_balance', 'running_balance', 'available_balance']);
              const typeIndex = this.findColumnIndex(headers, ['type', 'transaction_type', 'payment_type', 'mode']);
              
              // Check if we have either separate columns OR single amount
              if (dateIndex === -1 || (creditIndex === -1 && debitIndex === -1 && amountIndex === -1)) {
                throw new Error('CSV file must contain Date and either Credit/Debit columns or Amount column');
              }
              
              // Process each row
              data.forEach((row, index) => {
                const date = this.parseDate(row[headers[dateIndex]]);
                const description = row[headers[descriptionIndex]] || 'CSV Import';
                const balance = balanceIndex !== -1 ? this.parseAmount(row[headers[balanceIndex]]) : undefined;
                const paymentType = row[headers[typeIndex]] || 'bank_transfer';
                
                let creditAmount = 0;
                let debitAmount = 0;
                
                // Handle separate credit/debit columns (ABC Super Fund format)
                if (creditIndex !== -1 && debitIndex !== -1) {
                  creditAmount = this.parseAmount(row[headers[creditIndex]]);
                  debitAmount = this.parseAmount(row[headers[debitIndex]]);
                }
                // Handle single amount column (legacy format)
                else if (amountIndex !== -1) {
                  const amount = this.parseAmount(row[headers[amountIndex]]);
                  if (amount > 0) {
                    creditAmount = Math.abs(amount);
                  } else if (amount < 0) {
                    debitAmount = Math.abs(amount);
                  }
                }
                
                // Skip if no amount data
                if (creditAmount === 0 && debitAmount === 0) return;
                
                const transaction: EnhancedTransaction = {
                  date,
                  payment_type: paymentType,
                  transaction_name: description,
                  description,
                  category: this.detectCategory(description, paymentType),
                  credit_amount: creditAmount,
                  debit_amount: debitAmount,
                  balance,
                  source_file: file.name,
                  source_type: 'csv' as const,
                  notes: `Imported from CSV file`
                };
                
                transactions.push(transaction);
              });
              
              resolve(transactions);
            } catch (error: any) {
              reject(new Error(`CSV processing failed: ${error.message}`));
            }
          },
          error: (error) => {
            reject(new Error(`CSV parsing failed: ${error.message}`));
          }
        });
      });
    } catch (error: any) {
      console.error('Enhanced CSV processing error:', error);
      throw new Error(`CSV processing failed: ${error.message}`);
    }
  }

  // Process image files using OCR
  private async processImage(file: File): Promise<{ transactions: EnhancedTransaction[], extractedText: string }> {
    try {
      console.log('Processing image file with OCR:', file.name);
      
      // Import Tesseract.js dynamically
      const Tesseract = await import('tesseract.js');
      
      // Perform OCR on the image
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      console.log('OCR extracted text:', text.substring(0, 500));
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the image. Please ensure the image is clear and contains readable text.');
      }
      
      // Parse the extracted text to find transactions
      const transactions = this.parseTextForTransactions(text, file.name, 'image');
      
      if (transactions.length === 0) {
        throw new Error('No transactions found in the extracted text. The image might not contain bank statement data.');
      }
      
      return {
        transactions,
        extractedText: text.substring(0, 2000)
      };
    } catch (error: any) {
      console.error('Enhanced OCR processing error:', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  // Parse extracted text to find transactions
  private parseTextForTransactions(text: string, fileName: string, sourceType: 'pdf' | 'image'): EnhancedTransaction[] {
    const transactions: EnhancedTransaction[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for transaction patterns in the text
    for (const line of lines) {
      // Try to extract transaction data from each line
      const transaction = this.extractTransactionFromText(line);
      if (transaction) {
        transactions.push({
          ...transaction,
          source_file: fileName,
          source_type: sourceType
        });
      }
    }
    
    return transactions;
  }

  // Extract transaction data from a single line of text
  private extractTransactionFromText(line: string): EnhancedTransaction | null {
    try {
      // Enhanced patterns for bank statement transactions
      const patterns = [
        // Pattern: Date Description Amount
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([+-]?₹?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
        // Pattern: Date Description Amount Balance
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([+-]?₹?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+([+-]?₹?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
        // Pattern with different date format
        /(\d{1,2}\s+\w+\s+\d{2,4})\s+(.+?)\s+([+-]?₹?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
        // Pattern for bank statement format: Date PaymentType TransactionName Category Amount
        /(\d{1,2}\s+\w+\s*,\s*\d{2,4})\s+(\w+)\s+(.+?)\s+(\w+)\s+([+-]?₹?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const dateStr = match[1];
          const description = match[2]?.trim() || 'Unknown Transaction';
          const amountStr = match[3] || match[5]; // Handle different pattern groups
          const paymentType = match[2]?.includes(' ') ? 'bank_transfer' : (match[2] || 'bank_transfer');
          
          // Parse date
          const date = this.parseDate(dateStr);
          
          // Parse amount
          const amount = this.parseAmount(amountStr);
          
          if (amount === 0) continue; // Skip zero amounts
          
          const isCredit = amount > 0;
          
          return {
            date,
            payment_type: paymentType,
            transaction_name: description,
            description,
            category: this.detectCategory(description, paymentType),
            credit_amount: isCredit ? Math.abs(amount) : 0,
            debit_amount: !isCredit ? Math.abs(amount) : 0,
            source_file: '',
            source_type: 'image' as const,
            notes: `Extracted from ${sourceType} file`
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting transaction from text:', line, error);
      return null;
    }
  }

  // Helper method to find column index by name patterns
  private findColumnIndex(headers: string[], patterns: string[]): number {
    for (const pattern of patterns) {
      const index = headers.findIndex(header => 
        header.includes(pattern) || pattern.includes(header)
      );
      if (index !== -1) return index;
    }
    return -1;
  }

  // Parse date from various formats
  private parseDate(dateValue: any): string {
    if (!dateValue) return new Date().toISOString().split('T')[0];
    
    try {
      let date: Date;
      
      // Handle Excel serial date numbers
      if (typeof dateValue === 'number') {
        // Excel serial date number (days since 1900-01-01, with leap year bug)
        date = new Date((dateValue - 25569) * 86400 * 1000);
      } else if (typeof dateValue === 'string') {
        // String date - try multiple formats
        const dateStr = dateValue.toString().trim();
        const formats = [
          /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/, // DD/MM/YYYY or DD-MM-YYYY
          /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/, // YYYY/MM/DD or YYYY-MM-DD
          /^\d{1,2}\s+\w+\s+\d{4}$/, // DD Month YYYY
        ];
        
        if (formats.some(format => format.test(dateStr))) {
          date = new Date(dateStr);
        } else {
          date = new Date(dateValue);
        }
      } else {
        date = new Date(dateValue);
      }
      
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${dateValue}, using current date`);
        return new Date().toISOString().split('T')[0];
      }
      
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.warn(`Date parsing error for: ${dateValue}, using current date`, error);
      return new Date().toISOString().split('T')[0];
    }
  }

  // Parse amount from various formats
  private parseAmount(amountValue: any): number {
    if (!amountValue) return 0;
    
    // Convert to string and clean
    const amountStr = String(amountValue).replace(/[₹,$,\s]/g, '');
    const amount = parseFloat(amountStr);
    
    return isNaN(amount) ? 0 : amount;
  }

  // Enhanced category detection
  private detectCategory(description: string, paymentType: string): string {
    const desc = description.toLowerCase();
    const type = paymentType.toLowerCase();
    
    // Check each category pattern
    for (const [category, patterns] of Object.entries(ENHANCED_CATEGORY_PATTERNS)) {
      if (patterns.some(pattern => desc.includes(pattern) || type.includes(pattern))) {
        return category;
      }
    }
    
    // Default fallback based on payment type
    if (type.includes('upi')) return 'business_expense';
    if (type.includes('transfer')) return 'transfer_out';
    if (type.includes('withdrawal')) return 'withdrawal';
    if (type.includes('deposit')) return 'transfer_in';
    
    return 'business_expense';
  }

  // Post-process transactions (deduplication, validation, etc.)
  private postProcessTransactions(
    transactions: EnhancedTransaction[], 
    fileName: string, 
    fileType: string
  ): EnhancedTransaction[] {
    // Remove duplicates based on date, amount, and description
    const uniqueTransactions = this.removeDuplicates(transactions);
    
    // Sort by date
    uniqueTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate running balance if not provided
    if (uniqueTransactions.length > 0 && !uniqueTransactions[0].balance) {
      this.calculateRunningBalance(uniqueTransactions);
    }
    
    return uniqueTransactions;
  }

  // Remove duplicate transactions
  private removeDuplicates(transactions: EnhancedTransaction[]): EnhancedTransaction[] {
    const seen = new Set<string>();
    return transactions.filter(transaction => {
      const key = `${transaction.date}-${transaction.credit_amount}-${transaction.debit_amount}-${transaction.transaction_name}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Calculate running balance
  private calculateRunningBalance(transactions: EnhancedTransaction[]): void {
    let balance = 0;
    
    transactions.forEach(transaction => {
      balance += transaction.credit_amount - transaction.debit_amount;
      transaction.balance = balance;
    });
  }

  // Save transactions to database
  async saveTransactionsToDatabase(transactions: EnhancedTransaction[]): Promise<{ success: boolean; savedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let savedCount = 0;

    for (const transaction of transactions) {
      try {
        const { error } = await supabase
          .from('transactions')
          .insert({
            date: transaction.date,
            payment_type: transaction.payment_type,
            transaction_name: transaction.transaction_name,
            description: transaction.description,
            category: transaction.category,
            credit_amount: transaction.credit_amount,
            debit_amount: transaction.debit_amount,
            balance: transaction.balance,
            source_file: transaction.source_file,
            source_type: transaction.source_type,
            proof: transaction.proof,
            notes: transaction.notes
          });

        if (error) {
          errors.push(`Failed to save transaction ${transaction.transaction_name}: ${error.message}`);
        } else {
          savedCount++;
        }
      } catch (error: any) {
        errors.push(`Error saving transaction ${transaction.transaction_name}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      savedCount,
      errors
    };
  }
}

export const enhancedFileProcessorService = new EnhancedFileProcessorService();
