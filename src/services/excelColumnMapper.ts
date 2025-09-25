import * as XLSX from 'xlsx';

export interface ColumnMapping {
  [key: string]: string;
}

export interface MappedTransaction {
  date: string;
  amount: number;
  type: 'debit' | 'credit';
  description: string;
  balance?: number;
  account_no?: string;
  reference_id?: string;
  payment_type?: string;
  confidence: number;
}

export interface ExcelProcessingResult {
  success: boolean;
  mappedTransactions: MappedTransaction[];
  columnMapping: ColumnMapping;
  headers: string[];
  totalRows: number;
  processedRows: number;
  skippedRows: number;
  error?: string;
}

class ExcelColumnMapper {
  
  // Standard column mapping for different header variations
  private standardColumnMap: ColumnMapping = {
    // Date columns
    "txn date": "date",
    "transaction date": "date",
    "date": "date",
    "tran date": "date",
    "trans_date": "date",
    "value date": "date",
    "posting date": "date",
    "entry date": "date",
    
    // Description columns
    "description": "description",
    "narration": "description",
    "particulars": "description",
    "details": "description",
    "remarks": "description",
    "transaction name": "description",
    "narrative": "description",
    "memo": "description",
    "note": "description",
    
    // Debit columns (negative amounts)
    "debit": "debit",
    "debit amount": "debit",
    "withdrawal": "debit",
    "payment": "debit",
    "outflow": "debit",
    "expense": "debit",
    "dr": "debit",
    "amount_dr": "debit",
    
    // Credit columns (positive amounts)
    "credit": "credit",
    "credit amount": "credit",
    "deposit": "credit",
    "receipt": "credit",
    "inflow": "credit",
    "income": "credit",
    "cr": "credit",
    "amount_cr": "credit",
    
    // Balance columns
    "balance": "balance",
    "closing balance": "balance",
    "running balance": "balance",
    "available balance": "balance",
    "balance_after": "balance",
    "running bal": "balance",
    "closing bal": "balance",
    
    // Amount columns (single column with +/-)
    "amount": "amount",
    "value": "amount",
    "total": "amount",
    "transaction_amount": "amount",
    "amt": "amount",
    
    // Customer columns (for auto-description generation)
    "customer": "customer",
    "customer name": "customer",
    "name": "customer",
    "client": "customer",
    "party": "customer",
    
    // Payment method columns
    "payment method": "payment_method",
    "payment_method": "payment_method",
    "method": "payment_method",
    "payment_type": "payment_method",
    "mode": "payment_method",
    
    // Additional fields
    "account": "account_no",
    "account no": "account_no",
    "account number": "account_no",
    "reference": "reference_id",
    "reference id": "reference_id",
    "transaction id": "reference_id",
    "ref": "reference_id"
  };

  // Main processing method
  async processExcelFile(file: File): Promise<ExcelProcessingResult> {
    try {
      console.log('🚀 Starting Excel processing with column mapping...');
      
      // Step 1: Read Excel file
      const workbook = await this.readExcelFile(file);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (jsonData.length < 2) {
        throw new Error('Excel file must contain at least a header row and one data row');
      }
      
      // Step 2: Detect columns (first row)
      const headers = (jsonData[0] as string[]).map(h => h ? h.toString().trim() : '');
      console.log('📋 Excel headers detected:', headers);
      
      // Step 3: Map headers to standard fields
      const columnMapping = this.mapHeadersToStandardFields(headers);
      console.log('🗺️ Column mapping:', columnMapping);
      
      // Step 4: Process data rows
      const mappedTransactions = this.processDataRows(jsonData, columnMapping);
      
      return {
        success: true,
        mappedTransactions,
        columnMapping,
        headers,
        totalRows: jsonData.length - 1, // Excluding header
        processedRows: mappedTransactions.length,
        skippedRows: (jsonData.length - 1) - mappedTransactions.length
      };
      
    } catch (error: any) {
      console.error('❌ Excel processing failed:', error);
      return {
        success: false,
        mappedTransactions: [],
        columnMapping: {},
        headers: [],
        totalRows: 0,
        processedRows: 0,
        skippedRows: 0,
        error: error.message
      };
    }
  }
  
  // Read Excel file
  private async readExcelFile(file: File): Promise<XLSX.WorkBook> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          resolve(workbook);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    });
  }
  
  // Map Excel headers to standard fields
  private mapHeadersToStandardFields(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};
    
    headers.forEach((header) => {
      const normalizedHeader = header.toLowerCase().trim();
      const standardField = this.standardColumnMap[normalizedHeader];
      
      if (standardField) {
        mapping[header] = standardField;
        console.log(`✅ Mapped "${header}" → "${standardField}"`);
      } else {
        console.log(`⚠️ No mapping found for "${header}"`);
      }
    });
    
    return mapping;
  }
  
  // Process data rows with mapping
  private processDataRows(jsonData: any[][], columnMapping: ColumnMapping): MappedTransaction[] {
    const transactions: MappedTransaction[] = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      try {
        const transaction = this.mapRowToTransaction(row, jsonData[0], columnMapping);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        console.warn(`⚠️ Skipping row ${i + 1}: ${error}`);
      }
    }
    
    return transactions;
  }
  
  // Map individual row to transaction
  private mapRowToTransaction(row: any[], headers: string[], columnMapping: ColumnMapping): MappedTransaction | null {
    // Find column indices
    const dateIndex = this.findColumnIndex('date', headers, columnMapping);
    const descriptionIndex = this.findColumnIndex('description', headers, columnMapping);
    const debitIndex = this.findColumnIndex('debit', headers, columnMapping);
    const creditIndex = this.findColumnIndex('credit', headers, columnMapping);
    const amountIndex = this.findColumnIndex('amount', headers, columnMapping);
    const balanceIndex = this.findColumnIndex('balance', headers, columnMapping);
    const accountIndex = this.findColumnIndex('account_no', headers, columnMapping);
    const referenceIndex = this.findColumnIndex('reference_id', headers, columnMapping);
    
    // Find customer and payment method columns for auto-description
    const customerIndex = this.findColumnIndex('customer', headers, columnMapping);
    const paymentMethodIndex = this.findColumnIndex('payment_method', headers, columnMapping);
    
    // Validate required fields
    if (dateIndex === -1) {
      throw new Error('Date column not found');
    }
    
    if (debitIndex === -1 && creditIndex === -1 && amountIndex === -1) {
      throw new Error('No amount columns found (debit, credit, or amount)');
    }
    
    // Extract data
    const date = this.parseDate(row[dateIndex]);
    if (!date) {
      throw new Error('Invalid date');
    }
    
    // Auto-generate description from Customer + Payment Method if no description column
    let description = row[descriptionIndex];
    if (!description && customerIndex !== -1 && paymentMethodIndex !== -1) {
      const customer = row[customerIndex] || 'Unknown';
      const paymentMethod = row[paymentMethodIndex] || 'Unknown';
      description = `${customer} - ${paymentMethod} payment`;
      console.log(`✅ Auto-generated description: "${description}"`);
    } else if (!description) {
      description = 'Excel Import';
    }
    
    // Determine amount and type
    let amount = 0;
    let type: 'debit' | 'credit' = 'credit';
    
    if (debitIndex !== -1 && creditIndex !== -1) {
      // Separate debit/credit columns
      const debitAmount = this.parseAmount(row[debitIndex]);
      const creditAmount = this.parseAmount(row[creditIndex]);
      
      console.log(`Row ${row}: Debit=${debitAmount}, Credit=${creditAmount}`);
      
      if (debitAmount > 0) {
        amount = debitAmount;
        type = 'debit';
      } else if (creditAmount > 0) {
        amount = creditAmount;
        type = 'credit';
      } else {
        console.log(`No amount data found in debit/credit columns: ${row[debitIndex]}, ${row[creditIndex]}`);
        throw new Error('No amount data found');
      }
    } else if (amountIndex !== -1) {
      // Single amount column
      const rawAmount = this.parseAmount(row[amountIndex]);
      amount = Math.abs(rawAmount);
      type = rawAmount >= 0 ? 'credit' : 'debit';
      console.log(`Row ${row}: Single amount=${rawAmount}, processed=${amount}, type=${type}`);
    }
    
    // Allow zero amounts for balance entries or informational rows
    if (amount === 0) {
      console.log(`⚠️ Row has zero amount - skipping as it may be a balance entry or informational row`);
      return null;
    }
    
    // Optional fields
    const balance = balanceIndex !== -1 ? this.parseAmount(row[balanceIndex]) : undefined;
    const account_no = accountIndex !== -1 ? row[accountIndex]?.toString() : undefined;
    const reference_id = referenceIndex !== -1 ? row[referenceIndex]?.toString() : undefined;
    
    // Get payment method for better categorization
    const paymentMethod = paymentMethodIndex !== -1 ? row[paymentMethodIndex]?.toString().toLowerCase() : 'unknown';
    let paymentType = 'bank_transfer';
    
    // Map payment method to payment type
    if (paymentMethod.includes('upi')) {
      paymentType = 'upi';
    } else if (paymentMethod.includes('cash')) {
      paymentType = 'cash';
    } else if (paymentMethod.includes('credit card')) {
      paymentType = 'credit_card';
    }
    
    return {
      date,
      amount,
      type,
      description,
      balance,
      account_no,
      reference_id,
      payment_type: paymentType,
      confidence: 0.95
    };
  }
  
  // Find column index by standard field name
  private findColumnIndex(fieldName: string, headers: string[], columnMapping: ColumnMapping): number {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (columnMapping[header] === fieldName) {
        return i;
      }
    }
    return -1;
  }
  
  // Parse date from various formats
  private parseDate(dateValue: any): string | null {
    if (!dateValue) return null;
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }
  
  // Parse amount from various formats
  private parseAmount(amountValue: any): number {
    if (!amountValue) return 0;
    
    // Handle different data types
    if (typeof amountValue === 'number') {
      return isNaN(amountValue) ? 0 : amountValue;
    }
    
    const amountStr = String(amountValue).replace(/[₹,$,\s]/g, '');
    const amount = parseFloat(amountStr);
    return isNaN(amount) ? 0 : amount;
  }
  
  // Get mapping suggestions for unmapped headers
  getColumnMappingSuggestions(headers: string[]): { [key: string]: string[] } {
    const suggestions: { [key: string]: string[] } = {};
    
    headers.forEach((header) => {
      const normalizedHeader = header.toLowerCase().trim();
      
      if (!this.standardColumnMap[normalizedHeader]) {
        // Find similar mappings
        const possibleMappings: string[] = [];
        
        Object.keys(this.standardColumnMap).forEach((standardKey) => {
          if (standardKey.includes(normalizedHeader) || normalizedHeader.includes(standardKey)) {
            possibleMappings.push(this.standardColumnMap[standardKey]);
          }
        });
        
        if (possibleMappings.length > 0) {
          suggestions[header] = [...new Set(possibleMappings)];
        }
      }
    });
    
    return suggestions;
  }
}

export const excelColumnMapper = new ExcelColumnMapper();
