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

  // Parse individual transaction line (optimized for your bank statement format)
  private parseTransactionLine(line: string): BankTransaction | null {
    try {
      console.log('Parsing transaction line:', line);
      
      // Split by multiple spaces or tabs
      const parts = line.split(/\s{2,}|\t+/).filter(part => part.trim().length > 0);
      
      console.log('Line parts:', parts);
      
      if (parts.length < 5) {
        console.log('Not enough parts for transaction:', parts.length);
        return null; // Not enough data for a transaction
      }
      
      // Extract date (first part)
      const dateStr = parts[0].trim();
      const date = this.parseDate(dateStr);
      console.log('Parsed date:', date);
      
      // Extract payment type (second part)
      const paymentType = parts[1].trim();
      console.log('Payment type:', paymentType);
      
      // Extract transaction name (third part)
      const transactionName = parts[2].trim();
      console.log('Transaction name:', transactionName);
      
      // Extract category (fourth part)
      const categoryStr = parts[3].trim();
      const category = this.determineCategory(transactionName, paymentType);
      console.log('Category:', category, 'from category string:', categoryStr);
      
      // Extract amount (last part)
      const amountStr = parts[parts.length - 1].trim();
      const amount = this.parseAmount(amountStr);
      const isCredit = amountStr.includes('+');
      console.log('Amount:', amount, 'isCredit:', isCredit);
      
      const transaction = {
        date,
        paymentType,
        transactionName,
        category,
        amount: Math.abs(amount),
        isCredit
      };
      
      console.log('Parsed transaction:', transaction);
      return transaction;
      
    } catch (error) {
      console.error('Error parsing transaction line:', line, error);
      return null;
    }
  }

  // Parse date string to ISO format (optimized for "15 May, 2025" format)
  private parseDate(dateStr: string): string {
    try {
      console.log('Parsing date:', dateStr);
      
      // Handle your specific format: "15 May, 2025"
      if (dateStr.includes(',')) {
        // Remove comma and parse
        const cleanDate = dateStr.replace(',', '');
        const date = new Date(cleanDate);
        if (!isNaN(date.getTime())) {
          console.log('Parsed date successfully:', date.toISOString().split('T')[0]);
          return date.toISOString().split('T')[0];
        }
      }
      
      // Handle formats like "15/05/2025" or other formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.log('Date parsing failed, using current date');
        return new Date().toISOString().split('T')[0];
      }
      
      console.log('Parsed date successfully:', date.toISOString().split('T')[0]);
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
      return new Date().toISOString().split('T')[0];
    }
  }

  // Parse amount string to number (optimized for "+₹20,000.00" format)
  private parseAmount(amountStr: string): number {
    try {
      console.log('Parsing amount:', amountStr);
      
      // Remove currency symbols, commas, and plus signs
      const cleanAmount = amountStr.replace(/[₹,+\s]/g, '');
      const amount = parseFloat(cleanAmount);
      
      console.log('Parsed amount:', amount);
      return amount;
    } catch (error) {
      console.error('Error parsing amount:', amountStr, error);
      return 0;
    }
  }

  // Check if a string looks like an amount
  private isAmount(str: string): boolean {
    return /[₹$]?\d+[,.]?\d*/.test(str) || str.includes('₹') || str.includes('$');
  }

  // Determine transaction category based on name and type
  private determineCategory(transactionName: string, paymentType: string): string {
    const name = transactionName.toLowerCase();
    const type = paymentType.toLowerCase();
    
    // Income categories
    if (name.includes('salary') || name.includes('wage')) return 'salary';
    if (name.includes('interest') || name.includes('dividend')) return 'investment';
    if (name.includes('refund') || name.includes('return')) return 'refund';
    if (type.includes('transfer') && !name.includes('to')) return 'transfer_in';
    
    // Expense categories
    if (name.includes('food') || name.includes('restaurant') || name.includes('lunch')) return 'meals_entertainment';
    if (name.includes('fuel') || name.includes('petrol') || name.includes('gas')) return 'fuel';
    if (name.includes('medical') || name.includes('hospital') || name.includes('doctor')) return 'medical';
    if (name.includes('school') || name.includes('education') || name.includes('tuition')) return 'education';
    if (name.includes('insurance') || name.includes('premium')) return 'insurance';
    if (name.includes('loan') || name.includes('emi')) return 'loan_payment';
    if (name.includes('shopping') || name.includes('mall') || name.includes('store')) return 'shopping';
    if (name.includes('entertainment') || name.includes('movie') || name.includes('game')) return 'entertainment';
    if (name.includes('travel') || name.includes('taxi') || name.includes('uber')) return 'travel_transport';
    if (name.includes('utility') || name.includes('electricity') || name.includes('water')) return 'utilities';
    if (name.includes('office') || name.includes('supplies') || name.includes('stationery')) return 'office_supplies';
    if (name.includes('software') || name.includes('subscription')) return 'software_subscriptions';
    
    // Default categories
    if (type.includes('upi')) return 'business_expense';
    if (type.includes('transfer')) return 'transfer_out';
    if (type.includes('withdrawal')) return 'withdrawal';
    if (type.includes('deposit')) return 'deposit';
    
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
