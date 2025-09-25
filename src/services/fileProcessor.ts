// Comprehensive file processing service for bank statements

// Enhanced transaction interface
export interface ProcessedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance?: number;
  category: string;
  paymentType: string;
  transactionName: string;
  sourceFile: string;
  sourceType: 'pdf' | 'excel' | 'csv' | 'image' | 'manual';
}

// Processing result interface
export interface ProcessingResult {
  success: boolean;
  transactions: ProcessedTransaction[];
  error?: string;
  metadata?: {
    totalTransactions: number;
    totalCredits: number;
    totalDebits: number;
    fileType: string;
    processingTime: number;
  };
}

// Category detection patterns
const CATEGORY_PATTERNS = {
  food: ['swiggy', 'zomato', 'restaurant', 'food', 'lunch', 'dinner', 'cafe', 'pizza', 'burger'],
  travel: ['uber', 'ola', 'bus', 'train', 'metro', 'taxi', 'flight', 'hotel', 'travel', 'transport'],
  shopping: ['amazon', 'flipkart', 'myntra', 'shopping', 'mall', 'store', 'market', 'retail'],
  bills: ['electricity', 'gas', 'water', 'phone', 'internet', 'mobile', 'utility', 'bill'],
  salary: ['salary', 'credit', 'income', 'wage', 'payroll', 'bonus', 'incentive'],
  entertainment: ['movie', 'cinema', 'netflix', 'spotify', 'entertainment', 'game', 'gaming'],
  medical: ['hospital', 'doctor', 'medical', 'pharmacy', 'medicine', 'health', 'clinic'],
  education: ['school', 'college', 'university', 'education', 'tuition', 'course', 'training'],
  insurance: ['insurance', 'premium', 'policy', 'coverage'],
  fuel: ['petrol', 'diesel', 'fuel', 'gas station', 'pump'],
  others: []
};

class FileProcessorService {
  private startTime: number = 0;

  // Main processing method
  async processFile(file: File): Promise<ProcessingResult> {
    this.startTime = Date.now();
    
    try {
      // Validate file
      this.validateFile(file);
      
      const fileType = this.getFileType(file);
      console.log(`Processing ${fileType} file: ${file.name}`);

      let transactions: ProcessedTransaction[] = [];

      switch (fileType) {
        case 'pdf':
          transactions = await this.processPDF(file);
          break;
        case 'excel':
          transactions = await this.processExcel(file);
          break;
        case 'csv':
          transactions = await this.processCSV(file);
          break;
        case 'image':
          transactions = await this.processImage(file);
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
      const totalCredits = processedTransactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalDebits = processedTransactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        success: true,
        transactions: processedTransactions,
        metadata: {
          totalTransactions: processedTransactions.length,
          totalCredits,
          totalDebits,
          fileType,
          processingTime
        }
      };

    } catch (error: any) {
      console.error('File processing error:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message || 'Unknown processing error';
      
      if (errorMessage.includes('PDF parsing failed')) {
        errorMessage = 'Failed to extract text from PDF. The file might be image-based or corrupted.';
      } else if (errorMessage.includes('Excel processing failed')) {
        errorMessage = 'Failed to read Excel file. Please ensure the file is not corrupted and contains transaction data.';
      } else if (errorMessage.includes('CSV processing failed')) {
        errorMessage = 'Failed to parse CSV file. Please check the file format and ensure it contains valid transaction data.';
      } else if (errorMessage.includes('Image processing failed')) {
        errorMessage = 'Failed to process image file. OCR functionality is currently being improved.';
      }
      
      return {
        success: false,
        transactions: [],
        error: errorMessage
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

  // Process PDF files
  private async processPDF(file: File): Promise<ProcessedTransaction[]> {
    try {
      console.log('Processing PDF file:', file.name);
      
      // Try to use pdfjs-dist for browser-compatible PDF parsing
      try {
        const pdfjsLib = await import('pdfjs-dist');
        
        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Load the PDF document
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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
        
        console.log('PDF extracted text:', fullText.substring(0, 500));
        
        if (!fullText || fullText.trim().length === 0) {
          throw new Error('No text could be extracted from the PDF. The file might be image-based or corrupted.');
        }
        
        // Parse the extracted text to find transactions
        const transactions = this.parseTextForTransactions(fullText, file.name);
        
        if (transactions.length === 0) {
          throw new Error('No transactions found in the PDF. The file might not contain bank statement data.');
        }
        
        return transactions;
        
      } catch (pdfjsError) {
        console.warn('PDF.js parsing failed, using fallback approach:', pdfjsError);
        
        // Fallback: Create a placeholder transaction for manual entry
        const fallbackTransaction: ProcessedTransaction = {
          date: new Date().toISOString().split('T')[0],
          description: `PDF Bank Statement: ${file.name} (Manual Entry Required)`,
          amount: 0, // User can edit this amount
          type: 'debit',
          category: 'business_expense',
          paymentType: 'receipt',
          transactionName: `PDF Bank Statement: ${file.name}`,
          sourceFile: file.name,
          sourceType: 'pdf' as const
        };
        
        console.log('PDF processing: Created fallback transaction for manual entry');
        return [fallbackTransaction];
      }
      
    } catch (error: any) {
      console.error('PDF processing error:', error);
      
      // If all PDF parsing fails, provide a helpful error message
      if (error.message.includes('No text could be extracted')) {
        throw new Error('Failed to extract text from PDF. The file might be image-based or corrupted.');
      } else if (error.message.includes('No transactions found')) {
        throw new Error('No transaction data found in the PDF. Please upload a valid bank statement PDF.');
      } else {
        throw new Error(`PDF processing failed: ${error.message}`);
      }
    }
  }

  // Process Excel files
  private async processExcel(file: File): Promise<ProcessedTransaction[]> {
    try {
      console.log('Processing Excel file:', file.name);
      
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
            
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length < 2) {
              throw new Error('Excel file must contain at least a header row and one data row');
            }
            
            const headers = (jsonData[0] as string[]).map(h => h.toLowerCase().trim());
            const transactions: ProcessedTransaction[] = [];
            
            // Find required columns
            const dateIndex = this.findColumnIndex(headers, ['date', 'transaction_date', 'tran_date']);
            const descriptionIndex = this.findColumnIndex(headers, ['description', 'narration', 'particulars', 'details']);
            const amountIndex = this.findColumnIndex(headers, ['amount', 'value', 'total', 'debit', 'credit']);
            const balanceIndex = this.findColumnIndex(headers, ['balance', 'closing_balance', 'running_balance']);
            
            if (dateIndex === -1 || amountIndex === -1) {
              throw new Error('Excel file must contain Date and Amount columns');
            }
            
            // Process each row
            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              
              if (!row[dateIndex] || !row[amountIndex]) continue;
              
              const date = this.parseDate(row[dateIndex]);
              const amount = this.parseAmount(row[amountIndex]);
              const description = row[descriptionIndex] || 'Excel Import';
              const balance = balanceIndex !== -1 ? this.parseAmount(row[balanceIndex]) : undefined;
              
              if (amount === 0) continue;
              
              const transaction: ProcessedTransaction = {
                date,
                description,
                amount: Math.abs(amount),
                type: amount > 0 ? 'credit' : 'debit',
                balance,
                category: this.detectCategory(description),
                paymentType: 'bank_transfer',
                transactionName: description,
                sourceFile: file.name,
                sourceType: 'excel' as const
              };
              
              transactions.push(transaction);
            }
            
            resolve(transactions);
          } catch (error: any) {
            reject(new Error(`Excel processing failed: ${error.message}`));
          }
        };
        
        reader.onerror = () => reject(new Error('Failed to read Excel file'));
        reader.readAsArrayBuffer(file);
      });
    } catch (error: any) {
      console.error('Excel processing error:', error);
      throw new Error(`Excel processing failed: ${error.message}`);
    }
  }

  // Process CSV files
  private async processCSV(file: File): Promise<ProcessedTransaction[]> {
    try {
      console.log('Processing CSV file:', file.name);
      
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
              const transactions: ProcessedTransaction[] = [];
              
              // Find required columns
              const dateIndex = this.findColumnIndex(headers, ['date', 'transaction_date', 'tran_date']);
              const descriptionIndex = this.findColumnIndex(headers, ['description', 'narration', 'particulars', 'details']);
              const amountIndex = this.findColumnIndex(headers, ['amount', 'value', 'total', 'debit', 'credit']);
              const balanceIndex = this.findColumnIndex(headers, ['balance', 'closing_balance', 'running_balance']);
              
              if (dateIndex === -1 || amountIndex === -1) {
                throw new Error('CSV file must contain Date and Amount columns');
              }
              
              // Process each row
              data.forEach((row, index) => {
                const date = this.parseDate(row[headers[dateIndex]]);
                const amount = this.parseAmount(row[headers[amountIndex]]);
                const description = row[headers[descriptionIndex]] || 'CSV Import';
                const balance = balanceIndex !== -1 ? this.parseAmount(row[headers[balanceIndex]]) : undefined;
                
                if (amount === 0) return;
                
                const transaction: ProcessedTransaction = {
                  date,
                  description,
                  amount: Math.abs(amount),
                  type: amount > 0 ? 'credit' : 'debit',
                  balance,
                  category: this.detectCategory(description),
                  paymentType: 'bank_transfer',
                  transactionName: description,
                  sourceFile: file.name,
                  sourceType: 'csv' as const
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
      console.error('CSV processing error:', error);
      throw new Error(`CSV processing failed: ${error.message}`);
    }
  }

  // Process image files using OCR
  private async processImage(file: File): Promise<ProcessedTransaction[]> {
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
      const transactions = this.parseTextForTransactions(text, file.name);
      
      if (transactions.length === 0) {
        throw new Error('No transactions found in the extracted text. The image might not contain bank statement data.');
      }
      
      return transactions;
    } catch (error: any) {
      console.error('OCR processing error:', error);
      
      // If OCR fails, provide a helpful error message
      if (error.message.includes('No text could be extracted')) {
        throw new Error('Failed to extract text from image. Please ensure the image is clear and contains readable text.');
      } else if (error.message.includes('No transactions found')) {
        throw new Error('No transaction data found in the image. Please upload a clear bank statement image.');
      } else {
        throw new Error(`Image processing failed: ${error.message}`);
      }
    }
  }

  // Parse extracted text to find transactions
  private parseTextForTransactions(text: string, fileName: string): ProcessedTransaction[] {
    const transactions: ProcessedTransaction[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for transaction patterns in the text
    for (const line of lines) {
      // Try to extract transaction data from each line
      const transaction = this.extractTransactionFromText(line);
      if (transaction) {
        transactions.push({
          ...transaction,
          sourceFile: fileName,
          sourceType: 'image' as const
        });
      }
    }
    
    return transactions;
  }

  // Extract transaction data from a single line of text
  private extractTransactionFromText(line: string): ProcessedTransaction | null {
    try {
      // Common patterns for bank statement transactions
      const patterns = [
        // Pattern: Date Description Amount
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([+-]?₹?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
        // Pattern: Date Description Amount Balance
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([+-]?₹?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+([+-]?₹?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
        // Pattern with different date format
        /(\d{1,2}\s+\w+\s+\d{2,4})\s+(.+?)\s+([+-]?₹?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const dateStr = match[1];
          const description = match[2].trim();
          const amountStr = match[3];
          
          // Parse date
          const date = this.parseDate(dateStr);
          
          // Parse amount
          const amount = this.parseAmount(amountStr);
          
          if (amount === 0) continue; // Skip zero amounts
          
          return {
            date,
            description,
            amount: Math.abs(amount),
            type: amount > 0 ? 'credit' : 'debit',
            category: this.detectCategory(description),
            paymentType: 'receipt',
            transactionName: description,
            sourceFile: '',
            sourceType: 'image' as const
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
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date: ${dateValue}, using current date`);
      return new Date().toISOString().split('T')[0];
    }
    
    return date.toISOString().split('T')[0];
  }

  // Parse amount from various formats
  private parseAmount(amountValue: any): number {
    if (!amountValue) return 0;
    
    // Convert to string and clean
    const amountStr = String(amountValue).replace(/[₹,$,\s]/g, '');
    const amount = parseFloat(amountStr);
    
    return isNaN(amount) ? 0 : amount;
  }

  // Detect category based on description
  private detectCategory(description: string): string {
    const desc = description.toLowerCase();
    
    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      if (patterns.some(pattern => desc.includes(pattern))) {
        return category;
      }
    }
    
    return 'others';
  }

  // Post-process transactions (deduplication, validation, etc.)
  private postProcessTransactions(
    transactions: ProcessedTransaction[], 
    fileName: string, 
    fileType: string
  ): ProcessedTransaction[] {
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
  private removeDuplicates(transactions: ProcessedTransaction[]): ProcessedTransaction[] {
    const seen = new Set<string>();
    return transactions.filter(transaction => {
      const key = `${transaction.date}-${transaction.amount}-${transaction.description}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Calculate running balance
  private calculateRunningBalance(transactions: ProcessedTransaction[]): void {
    let balance = 0;
    
    transactions.forEach(transaction => {
      if (transaction.type === 'credit') {
        balance += transaction.amount;
      } else {
        balance -= transaction.amount;
      }
      transaction.balance = balance;
    });
  }
}

export const fileProcessorService = new FileProcessorService();
