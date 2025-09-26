// Import PDF.js initialization
import { initPDFJS } from '@/utils/pdfInit';

// Interface for extracted transaction data
export interface BankTransaction {
  date: string;
  paymentType: string;
  transactionName: string;
  category: string;
  amount: number;
  isCredit: boolean;
}

// Interface for parsed bank statement
export interface ParsedBankStatement {
  transactions: BankTransaction[];
  statementPeriod: string;
  accountNumber: string;
  bankName: string;
}

class PDFParserService {
  // Extract text from PDF using PDF.js (browser-compatible)
  async extractTextFromPDF(file: File): Promise<string> {
    try {
      console.log('Attempting to extract text using PDF.js...');
      
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
      
      console.log('Successfully extracted text from PDF');
      return fullText;
      
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error(`PDF text extraction failed: ${error.message || 'Unknown error'}`);
    }
  }

  // Perform OCR on image-based PDF using Tesseract.js
  async performOCR(file: File): Promise<string> {
    try {
      console.log('Performing OCR on image-based PDF...');
      
      // Import required libraries
      const Tesseract = await import('tesseract.js');
      
      // Initialize PDF.js
      const pdfjs = initPDFJS();
      
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load the PDF document
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`Processing page ${pageNum} of ${pdf.numPages}...`);
        
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
        
        // Create canvas to render PDF page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Could not get canvas context');
        }
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        }).promise;
        
        // Convert canvas to image data URL
        const imageDataUrl = canvas.toDataURL('image/png');
        
        // Perform OCR on the rendered image
        const { data: { text } } = await Tesseract.recognize(imageDataUrl, 'eng', {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`Page ${pageNum} OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        });
        
        fullText += text + '\n';
        console.log(`Page ${pageNum} OCR completed`);
      }
      
      console.log('Successfully performed OCR on all PDF pages');
      return fullText;
      
    } catch (error) {
      console.error('Error performing OCR on PDF:', error);
      throw new Error(`OCR processing failed: ${error.message || 'Unknown error'}`);
    }
  }

  // Parse bank statement text to extract transactions
  parseBankStatement(text: string, bankName: string = 'IDFC FIRST Bank'): ParsedBankStatement {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Extract statement metadata
    const statementPeriod = this.extractStatementPeriod(lines);
    const accountNumber = this.extractAccountNumber(lines);
    
    // Extract transactions
    const transactions = this.extractTransactions(lines, bankName);
    
    return {
      transactions,
      statementPeriod,
      accountNumber,
      bankName
    };
  }

  // Extract statement period from text
  private extractStatementPeriod(lines: string[]): string {
    for (const line of lines) {
      // Look for date range patterns
      const dateRangeMatch = line.match(/(\d{1,2}\s+\w+\s+\d{4})\s+to\s+(\d{1,2}\s+\w+\s+\d{4})/i);
      if (dateRangeMatch) {
        return `${dateRangeMatch[1]} to ${dateRangeMatch[2]}`;
      }
      
      // Look for "Upto" patterns
      const uptoMatch = line.match(/upto\s+(\d{1,2}\s+\w+,\s+\d{4})/i);
      if (uptoMatch) {
        return `Upto ${uptoMatch[1]}`;
      }
    }
    
    return 'Period not found';
  }

  // Extract account number from text
  private extractAccountNumber(lines: string[]): string {
    for (const line of lines) {
      // Look for account number patterns
      const accountMatch = line.match(/account[s]?\s*:\s*([a-zA-Z0-9\s]+)/i);
      if (accountMatch) {
        return accountMatch[1].trim();
      }
      
      // Look for IDFC account pattern
      const idfcMatch = line.match(/IDFC\s+FIRST\s+xx\s+\d+\s+(\d+)/i);
      if (idfcMatch) {
        return `IDFC FIRST xx ${idfcMatch[1]}`;
      }
    }
    
    return 'Account not found';
  }

  // Extract transactions from text
  private extractTransactions(lines: string[], bankName: string): BankTransaction[] {
    const transactions: BankTransaction[] = [];
    
    // Find the transactions table section
    let inTransactionSection = false;
    let tableHeadersFound = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for transaction table start
      if (line.toLowerCase().includes('transactions based on applied selections') || 
          line.toLowerCase().includes('date') && line.toLowerCase().includes('amount')) {
        inTransactionSection = true;
        tableHeadersFound = true;
        continue;
      }
      
      // Stop if we hit the end of transactions
      if (inTransactionSection && (line.toLowerCase().includes('important message') || 
          line.toLowerCase().includes('page') || 
          line.toLowerCase().includes('total'))) {
        break;
      }
      
      // Skip header lines
      if (inTransactionSection && tableHeadersFound && line.toLowerCase().includes('date')) {
        continue;
      }
      
      // Parse transaction lines
      if (inTransactionSection && tableHeadersFound) {
        const transaction = this.parseTransactionLine(line);
        if (transaction) {
          transactions.push(transaction);
        }
      }
    }
    
    return transactions;
  }

  // Enhanced transaction line parsing with multiple bank format support
  private parseTransactionLine(line: string): BankTransaction | null {
    try {
      console.log('Parsing transaction line:', line);
      
      // Try different parsing strategies based on bank format
      const strategies = [
        this.parseIDFCFormat.bind(this),
        this.parseHDFCFormat.bind(this),
        this.parseSBICFormat.bind(this),
        this.parseICICIFormat.bind(this),
        this.parseAxisFormat.bind(this),
        this.parseGenericFormat.bind(this)
      ];
      
      for (const strategy of strategies) {
        try {
          const transaction = strategy(line);
          if (transaction) {
            console.log('Successfully parsed transaction:', transaction);
            return transaction;
          }
        } catch (error) {
          console.log(`Strategy failed, trying next:`, error.message);
          continue;
        }
      }
      
      console.log('All parsing strategies failed for line:', line);
      return null;
      
    } catch (error) {
      console.error('Error parsing transaction line:', line, error);
      return null;
    }
  }

  // IDFC FIRST Bank format parser
  private parseIDFCFormat(line: string): BankTransaction | null {
    const parts = line.split(/\s{2,}|\t+/).filter(part => part.trim().length > 0);
    
    if (parts.length < 5) return null;
    
    const dateStr = parts[0].trim();
      const paymentType = parts[1].trim();
      const transactionName = parts[2].trim();
    const amountStr = parts[parts.length - 1].trim();
    
    // Validate amount format
    if (!this.isAmount(amountStr)) return null;
    
    const date = this.parseDate(dateStr);
      const amount = this.parseAmount(amountStr);
    const isCredit = amountStr.includes('+') || amountStr.includes('Cr');
    const category = this.determineCategory(transactionName, paymentType);
      
    return {
        date,
        paymentType,
        transactionName,
        category,
        amount: Math.abs(amount),
        isCredit
      };
  }

  // HDFC Bank format parser
  private parseHDFCFormat(line: string): BankTransaction | null {
    // HDFC format: Date | Description | Ref No | Debit | Credit | Balance
    const parts = line.split(/\s{2,}|\t+/).filter(part => part.trim().length > 0);
    
    if (parts.length < 4) return null;
    
    const dateStr = parts[0].trim();
    const description = parts[1].trim();
    const debitStr = parts[2]?.trim() || '0';
    const creditStr = parts[3]?.trim() || '0';
    
    const date = this.parseDate(dateStr);
    const debitAmount = this.parseAmount(debitStr);
    const creditAmount = this.parseAmount(creditStr);
    
    if (debitAmount === 0 && creditAmount === 0) return null;
    
    const isCredit = creditAmount > 0;
    const amount = isCredit ? creditAmount : debitAmount;
    const category = this.determineCategory(description, isCredit ? 'credit' : 'debit');
    
    return {
      date,
      paymentType: isCredit ? 'credit' : 'debit',
      transactionName: description,
      category,
      amount,
      isCredit
    };
  }

  // SBI Bank format parser
  private parseSBICFormat(line: string): BankTransaction | null {
    // SBI format: Date | Description | Debit | Credit | Balance
    const parts = line.split(/\s{2,}|\t+/).filter(part => part.trim().length > 0);
    
    if (parts.length < 3) return null;
    
    const dateStr = parts[0].trim();
    const description = parts[1].trim();
    const amountStr = parts[2]?.trim() || parts[3]?.trim() || '0';
    
    if (!this.isAmount(amountStr)) return null;
    
    const date = this.parseDate(dateStr);
    const amount = this.parseAmount(amountStr);
    const isCredit = amountStr.includes('+') || amountStr.includes('Cr') || amountStr.includes('Credit');
    const category = this.determineCategory(description, isCredit ? 'credit' : 'debit');
    
    return {
      date,
      paymentType: isCredit ? 'credit' : 'debit',
      transactionName: description,
      category,
      amount: Math.abs(amount),
      isCredit
    };
  }

  // ICICI Bank format parser
  private parseICICIFormat(line: string): BankTransaction | null {
    // ICICI format: Date | Description | Amount | Balance
    const parts = line.split(/\s{2,}|\t+/).filter(part => part.trim().length > 0);
    
    if (parts.length < 3) return null;
    
    const dateStr = parts[0].trim();
    const description = parts[1].trim();
    const amountStr = parts[2].trim();
    
    if (!this.isAmount(amountStr)) return null;
    
    const date = this.parseDate(dateStr);
    const amount = this.parseAmount(amountStr);
    const isCredit = amountStr.includes('+') || amountStr.includes('Cr');
    const category = this.determineCategory(description, isCredit ? 'credit' : 'debit');
    
    return {
      date,
      paymentType: isCredit ? 'credit' : 'debit',
      transactionName: description,
      category,
      amount: Math.abs(amount),
      isCredit
    };
  }

  // Axis Bank format parser
  private parseAxisFormat(line: string): BankTransaction | null {
    // Axis format: Date | Description | Debit | Credit | Balance
    const parts = line.split(/\s{2,}|\t+/).filter(part => part.trim().length > 0);
    
    if (parts.length < 4) return null;
    
    const dateStr = parts[0].trim();
    const description = parts[1].trim();
    const debitStr = parts[2]?.trim() || '0';
    const creditStr = parts[3]?.trim() || '0';
    
    const date = this.parseDate(dateStr);
    const debitAmount = this.parseAmount(debitStr);
    const creditAmount = this.parseAmount(creditStr);
    
    if (debitAmount === 0 && creditAmount === 0) return null;
    
    const isCredit = creditAmount > 0;
    const amount = isCredit ? creditAmount : debitAmount;
    const category = this.determineCategory(description, isCredit ? 'credit' : 'debit');
    
    return {
      date,
      paymentType: isCredit ? 'credit' : 'debit',
      transactionName: description,
      category,
      amount,
      isCredit
    };
  }

  // Generic format parser (fallback)
  private parseGenericFormat(line: string): BankTransaction | null {
    const parts = line.split(/\s{2,}|\t+/).filter(part => part.trim().length > 0);
    
    if (parts.length < 3) return null;
    
    // Look for amount in any part
    let amountStr = '';
    let amountIndex = -1;
    
    for (let i = 0; i < parts.length; i++) {
      if (this.isAmount(parts[i])) {
        amountStr = parts[i];
        amountIndex = i;
        break;
      }
    }
    
    if (!amountStr) return null;
    
    // Assume first part is date, last part before amount is description
    const dateStr = parts[0].trim();
    const description = parts.slice(1, amountIndex).join(' ').trim();
    
    const date = this.parseDate(dateStr);
    const amount = this.parseAmount(amountStr);
    const isCredit = amountStr.includes('+') || amountStr.includes('Cr') || amountStr.includes('Credit');
    const category = this.determineCategory(description, isCredit ? 'credit' : 'debit');
    
    return {
      date,
      paymentType: isCredit ? 'credit' : 'debit',
      transactionName: description,
      category,
      amount: Math.abs(amount),
      isCredit
    };
  }

  // Enhanced date parsing for multiple bank formats
  private parseDate(dateStr: string): string {
    try {
      console.log('Parsing date:', dateStr);
      
      // Clean the date string
      const cleanDateStr = dateStr.trim().replace(/[^\w\s\/\-\.\,]/g, '');
      
      // Try different date formats commonly used by Indian banks
      const dateFormats = [
        // "15 May, 2025" format
        () => {
          if (cleanDateStr.includes(',')) {
            const cleanDate = cleanDateStr.replace(',', '');
        const date = new Date(cleanDate);
            if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
          }
          return null;
        },
        
        // "15/05/2025" format
        () => {
          if (cleanDateStr.includes('/')) {
            const parts = cleanDateStr.split('/');
            if (parts.length === 3) {
              // Try DD/MM/YYYY format
              const date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
              if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
              
              // Try MM/DD/YYYY format
              const date2 = new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
              if (!isNaN(date2.getTime())) return date2.toISOString().split('T')[0];
            }
          }
          return null;
        },
        
        // "15-05-2025" format
        () => {
          if (cleanDateStr.includes('-')) {
            const parts = cleanDateStr.split('-');
            if (parts.length === 3) {
              // Try DD-MM-YYYY format
              const date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
              if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
              
              // Try YYYY-MM-DD format
              const date2 = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
              if (!isNaN(date2.getTime())) return date2.toISOString().split('T')[0];
            }
          }
          return null;
        },
        
        // "15.05.2025" format
        () => {
          if (cleanDateStr.includes('.')) {
            const parts = cleanDateStr.split('.');
            if (parts.length === 3) {
              // Try DD.MM.YYYY format
              const date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
              if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
            }
          }
          return null;
        },
        
        // "15 May 2025" format (without comma)
        () => {
          const date = new Date(cleanDateStr);
          if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
          return null;
        },
        
        // "2025-05-15" ISO format
        () => {
          if (cleanDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const date = new Date(cleanDateStr);
            if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
          }
          return null;
        }
      ];
      
      // Try each format
      for (const format of dateFormats) {
        try {
          const result = format();
          if (result) {
            console.log('Parsed date successfully:', result);
            return result;
          }
        } catch (error) {
          console.log('Date format failed:', error.message);
          continue;
        }
      }
      
      console.log('All date formats failed, using current date');
        return new Date().toISOString().split('T')[0];
      
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
      return new Date().toISOString().split('T')[0];
    }
  }

  // Enhanced amount parsing for multiple bank formats
  private parseAmount(amountStr: string): number {
    try {
      console.log('Parsing amount:', amountStr);
      
      if (!amountStr || amountStr.trim() === '') {
        return 0;
      }
      
      // Remove currency symbols, commas, spaces, and other formatting
      let cleanAmount = amountStr
        .replace(/[₹$€£¥,+\s]/g, '') // Remove currency symbols, commas, plus signs, spaces
        .replace(/[^\d\.\-]/g, '') // Keep only digits, dots, and minus signs
        .trim();
      
      // Handle negative amounts
      const isNegative = amountStr.includes('-') || amountStr.includes('Dr') || amountStr.includes('Debit');
      
      // Parse the number
      const amount = parseFloat(cleanAmount);
      
      if (isNaN(amount)) {
        console.log('Amount parsing failed, returning 0');
        return 0;
      }
      
      const finalAmount = isNegative ? -Math.abs(amount) : Math.abs(amount);
      console.log('Parsed amount:', finalAmount);
      return finalAmount;
      
    } catch (error) {
      console.error('Error parsing amount:', amountStr, error);
      return 0;
    }
  }

  // Enhanced amount detection for multiple formats
  private isAmount(str: string): boolean {
    if (!str || str.trim() === '') return false;
    
    // Check for common amount patterns
    const amountPatterns = [
      /^[₹$€£¥]?\s*\d+[,.]?\d*$/, // Basic amount with currency
      /^\d+[,.]?\d*\s*[₹$€£¥]?$/, // Amount with currency at end
      /^[+-]?\s*[₹$€£¥]?\s*\d+[,.]?\d*$/, // Amount with sign
      /^\d+[,.]?\d*\s*[+-]?$/, // Amount with sign at end
      /^(Cr|Dr|Credit|Debit)\s*\d+[,.]?\d*$/i, // Bank format with Cr/Dr
      /^\d+[,.]?\d*\s*(Cr|Dr|Credit|Debit)$/i, // Bank format with Cr/Dr at end
    ];
    
    return amountPatterns.some(pattern => pattern.test(str.trim()));
  }

  // Enhanced category determination with bank-specific patterns
  private determineCategory(transactionName: string, paymentType: string): string {
    const name = transactionName.toLowerCase();
    const type = paymentType.toLowerCase();
    
    // Income categories
    if (name.includes('salary') || name.includes('wage') || name.includes('payroll')) return 'salary';
    if (name.includes('interest') || name.includes('dividend') || name.includes('fd interest')) return 'investment';
    if (name.includes('refund') || name.includes('return') || name.includes('reversal')) return 'refund';
    if (name.includes('credit') || name.includes('deposit') || name.includes('credit transfer')) return 'transfer_in';
    if (name.includes('business income') || name.includes('revenue') || name.includes('sales')) return 'business_income';
    
    // Banking operations
    if (name.includes('atm withdrawal') || name.includes('cash withdrawal')) return 'withdrawal';
    if (name.includes('cash deposit') || name.includes('deposit')) return 'deposit';
    if (name.includes('neft') || name.includes('rtgs') || name.includes('imps')) return 'bank_transfer';
    if (name.includes('upi') || name.includes('paytm') || name.includes('phonepe') || name.includes('gpay')) return 'upi';
    if (name.includes('cheque') || name.includes('chq')) return 'bank_transfer';
    
    // Expense categories
    if (name.includes('food') || name.includes('restaurant') || name.includes('lunch') || name.includes('dining')) return 'meals_entertainment';
    if (name.includes('fuel') || name.includes('petrol') || name.includes('gas') || name.includes('diesel')) return 'fuel';
    if (name.includes('medical') || name.includes('hospital') || name.includes('doctor') || name.includes('pharmacy')) return 'medical';
    if (name.includes('school') || name.includes('education') || name.includes('tuition') || name.includes('college')) return 'education';
    if (name.includes('insurance') || name.includes('premium') || name.includes('policy')) return 'insurance';
    if (name.includes('loan') || name.includes('emi') || name.includes('installment')) return 'loan_payment';
    if (name.includes('shopping') || name.includes('mall') || name.includes('store') || name.includes('amazon') || name.includes('flipkart')) return 'shopping';
    if (name.includes('entertainment') || name.includes('movie') || name.includes('game') || name.includes('netflix') || name.includes('spotify')) return 'entertainment';
    if (name.includes('travel') || name.includes('taxi') || name.includes('uber') || name.includes('ola') || name.includes('metro')) return 'travel_transport';
    if (name.includes('utility') || name.includes('electricity') || name.includes('water') || name.includes('gas bill') || name.includes('internet')) return 'utilities';
    if (name.includes('office') || name.includes('supplies') || name.includes('stationery') || name.includes('equipment')) return 'office_supplies';
    if (name.includes('software') || name.includes('subscription') || name.includes('saas') || name.includes('cloud')) return 'software_subscriptions';
    if (name.includes('rent') || name.includes('rental') || name.includes('lease')) return 'business_expense';
    if (name.includes('maintenance') || name.includes('repair') || name.includes('service')) return 'maintenance';
    
    // Bank-specific patterns
    if (name.includes('charges') || name.includes('fee') || name.includes('penalty')) return 'business_expense';
    if (name.includes('commission') || name.includes('brokerage')) return 'business_expense';
    if (name.includes('gst') || name.includes('tax') || name.includes('tds')) return 'business_expense';
    
    // Default categories based on payment type
    if (type.includes('upi')) return 'business_expense';
    if (type.includes('transfer') && name.includes('to')) return 'transfer_out';
    if (type.includes('transfer') && !name.includes('to')) return 'transfer_in';
    if (type.includes('withdrawal')) return 'withdrawal';
    if (type.includes('deposit')) return 'deposit';
    if (type.includes('credit')) return 'transfer_in';
    if (type.includes('debit')) return 'business_expense';
    
    // Default fallback
    return 'business_expense';
  }

  // Main method to parse PDF bank statement
  async parseBankStatementPDF(file: File): Promise<ParsedBankStatement> {
    console.log('Starting PDF bank statement parsing...');
    
    let text = '';
    let extractionMethod = '';
    
    try {
      // First, try to extract text directly using PDF.js
      text = await this.extractTextFromPDF(file);
      extractionMethod = 'PDF.js text extraction';
      console.log('Successfully extracted text from PDF using PDF.js');
      console.log('Extracted text preview:', text.substring(0, 500));
    } catch (error) {
      console.log('PDF.js text extraction failed, attempting OCR on rendered pages...');
      console.log('Error details:', error);
      
      // If direct text extraction fails, try OCR on rendered pages
      try {
        text = await this.performOCR(file);
        extractionMethod = 'OCR on rendered pages';
        console.log('Successfully extracted text using OCR');
        console.log('OCR text preview:', text.substring(0, 500));
      } catch (ocrError) {
        console.error('Both PDF text extraction and OCR failed:');
        console.error('PDF.js error:', error);
        console.error('OCR error:', ocrError);
        
        // Provide detailed error message
        const errorMessage = `Unable to extract text from PDF. 
        
Possible reasons:
1. PDF is corrupted or password-protected
2. PDF contains only images without text layer
3. PDF format is not supported
4. File is too large or complex

Please try:
- A different PDF file
- Converting the PDF to images and uploading those instead
- Ensuring the PDF is not password-protected
- Checking that the PDF contains readable text

Technical details:
- PDF.js error: ${error.message || 'Unknown error'}
- OCR error: ${ocrError.message || 'Unknown error'}`;
        
        throw new Error(errorMessage);
      }
    }
    
    if (!text || text.trim().length === 0) {
      throw new Error(`No text could be extracted from the PDF using ${extractionMethod}. The PDF might be empty or contain only images without text.`);
    }
    
    console.log('Parsing bank statement text...');
    const parsedStatement = this.parseBankStatement(text);
    
    if (parsedStatement.transactions.length === 0) {
      throw new Error(`No transactions found in the extracted text. The PDF might not contain bank statement data or the format is not recognized.

Extraction method used: ${extractionMethod}
Extracted text length: ${text.length} characters
Text preview: ${text.substring(0, 200)}...

Please ensure the PDF contains a standard bank statement format with transaction data.`);
    }
    
    console.log(`Successfully parsed ${parsedStatement.transactions.length} transactions using ${extractionMethod}`);
    return parsedStatement;
  }
}

export const pdfParserService = new PDFParserService();
