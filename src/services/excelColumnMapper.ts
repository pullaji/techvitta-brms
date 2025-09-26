import * as XLSX from 'xlsx';

export interface ColumnMapping {
  [key: string]: string;
}

export interface MappedTransaction {
  date: string;
  amount: number;
  type: 'debit' | 'credit';
  credit_amount: number;
  debit_amount: number;
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
  
  // Enhanced bank-specific column mapping
  private standardColumnMap: ColumnMapping = {
    // Date columns - Bank specific formats
    "txn date": "date",
    "transaction date": "date",
    "date": "date",
    "tran date": "date",
    "trans_date": "date",
    "value date": "date",
    "posting date": "date",
    "entry date": "date",
    "transaction_date": "date",
    "tran_date": "date",
    "value_date": "date",
    "posting_date": "date",
    "entry_date": "date",
    "date of transaction": "date",
    "transaction time": "date",
    "processed date": "date",
    
    // Description columns - Bank specific formats
    "description": "description",
    "narration": "description",
    "particulars": "description",
    "details": "description",
    "remarks": "description",
    "transaction name": "description",
    "narrative": "description",
    "memo": "description",
    "note": "description",
    "transaction_description": "description",
    "transaction_details": "description",
    "transaction_particulars": "description",
    "transaction_narration": "description",
    "transaction_remarks": "description",
    "transaction_memo": "description",
    "transaction_note": "description",
    "transaction_info": "description",
    "transaction_summary": "description",
    "transaction_purpose": "description",
    "transaction_reference": "description",
    "transaction_type": "description",
    "transaction_category": "description",
    "transaction_class": "description",
    "transaction_group": "description",
    "transaction_subject": "description",
    "transaction_title": "description",
    "transaction_label": "description",
    "transaction_tag": "description",
    "transaction_comment": "description",
    "transaction_annotation": "description",
    "transaction_explanation": "description",
    "transaction_justification": "description",
    "transaction_reason": "description",
    "transaction_cause": "description",
    "transaction_source": "description",
    "transaction_destination": "description",
    "transaction_origin": "description",
    "transaction_beneficiary": "description",
    "transaction_payee": "description",
    "transaction_payer": "description",
    "transaction_recipient": "description",
    "transaction_sender": "description",
    "transaction_receiver": "description",
    "transaction_creditor": "description",
    "transaction_debtor": "description",
    "transaction_lender": "description",
    "transaction_borrower": "description",
    "transaction_investor": "description",
    "transaction_investee": "description",
    "transaction_buyer": "description",
    "transaction_seller": "description",
    "transaction_customer": "description",
    "transaction_vendor": "description",
    "transaction_supplier": "description",
    "transaction_contractor": "description",
    "transaction_employee": "description",
    "transaction_employer": "description",
    "transaction_partner": "description",
    "transaction_associate": "description",
    "transaction_affiliate": "description",
    "transaction_subsidiary": "description",
    "transaction_parent": "description",
    "transaction_holding": "description",
    "transaction_company": "description",
    "transaction_corporation": "description",
    "transaction_organization": "description",
    "transaction_institution": "description",
    "transaction_establishment": "description",
    "transaction_entity": "description",
    "transaction_individual": "description",
    "transaction_person": "description",
    
    // Debit columns (negative amounts) - Bank specific formats
    "debit": "debit",
    "debit amount": "debit",
    "withdrawal": "debit",
    "payment": "debit",
    "outflow": "debit",
    "expense": "debit",
    "dr": "debit",
    "amount_dr": "debit",
    "debit_amt": "debit",
    "debit_value": "debit",
    "debit_total": "debit",
    "debit_sum": "debit",
    "debit_balance": "debit",
    "debit_transaction": "debit",
    "debit_transaction_amount": "debit",
    "debit_transaction_amt": "debit",
    "debit_transaction_value": "debit",
    "debit_transaction_total": "debit",
    "debit_transaction_sum": "debit",
    "debit_transaction_balance": "debit",
    "debit_amount_dr": "debit",
    "debit_amt_dr": "debit",
    "debit_value_dr": "debit",
    "debit_total_dr": "debit",
    "debit_sum_dr": "debit",
    "debit_balance_dr": "debit",
    "debit_transaction_dr": "debit",
    "debit_transaction_amount_dr": "debit",
    "debit_transaction_amt_dr": "debit",
    "debit_transaction_value_dr": "debit",
    "debit_transaction_total_dr": "debit",
    "debit_transaction_sum_dr": "debit",
    "debit_transaction_balance_dr": "debit",
    "amount_dr": "debit",
    "amt_dr": "debit",
    "value_dr": "debit",
    "total_dr": "debit",
    "sum_dr": "debit",
    "balance_dr": "debit",
    "transaction_dr": "debit",
    "transaction_amount_dr": "debit",
    "transaction_amt_dr": "debit",
    "transaction_value_dr": "debit",
    "transaction_total_dr": "debit",
    "transaction_sum_dr": "debit",
    "transaction_balance_dr": "debit",
    "withdrawal_amount": "debit",
    "withdrawal_amt": "debit",
    "withdrawal_value": "debit",
    "withdrawal_total": "debit",
    "withdrawal_sum": "debit",
    "withdrawal_balance": "debit",
    "payment_amount": "debit",
    "payment_amt": "debit",
    "payment_value": "debit",
    "payment_total": "debit",
    "payment_sum": "debit",
    "payment_balance": "debit",
    "outflow_amount": "debit",
    "outflow_amt": "debit",
    "outflow_value": "debit",
    "outflow_total": "debit",
    "outflow_sum": "debit",
    "outflow_balance": "debit",
    "expense_amount": "debit",
    "expense_amt": "debit",
    "expense_value": "debit",
    "expense_total": "debit",
    "expense_sum": "debit",
    "expense_balance": "debit",
    
    // Credit columns (positive amounts) - Bank specific formats
    "credit": "credit",
    "credit amount": "credit",
    "deposit": "credit",
    "receipt": "credit",
    "inflow": "credit",
    "income": "credit",
    "cr": "credit",
    "amount_cr": "credit",
    "credit_amt": "credit",
    "credit_value": "credit",
    "credit_total": "credit",
    "credit_sum": "credit",
    "credit_balance": "credit",
    "credit_transaction": "credit",
    "credit_transaction_amount": "credit",
    "credit_transaction_amt": "credit",
    "credit_transaction_value": "credit",
    "credit_transaction_total": "credit",
    "credit_transaction_sum": "credit",
    "credit_transaction_balance": "credit",
    "credit_amount_cr": "credit",
    "credit_amt_cr": "credit",
    "credit_value_cr": "credit",
    "credit_total_cr": "credit",
    "credit_sum_cr": "credit",
    "credit_balance_cr": "credit",
    "credit_transaction_cr": "credit",
    "credit_transaction_amount_cr": "credit",
    "credit_transaction_amt_cr": "credit",
    "credit_transaction_value_cr": "credit",
    "credit_transaction_total_cr": "credit",
    "credit_transaction_sum_cr": "credit",
    "credit_transaction_balance_cr": "credit",
    "amount_cr": "credit",
    "amt_cr": "credit",
    "value_cr": "credit",
    "total_cr": "credit",
    "sum_cr": "credit",
    "balance_cr": "credit",
    "transaction_cr": "credit",
    "transaction_amount_cr": "credit",
    "transaction_amt_cr": "credit",
    "transaction_value_cr": "credit",
    "transaction_total_cr": "credit",
    "transaction_sum_cr": "credit",
    "transaction_balance_cr": "credit",
    "deposit_amount": "credit",
    "deposit_amt": "credit",
    "deposit_value": "credit",
    "deposit_total": "credit",
    "deposit_sum": "credit",
    "deposit_balance": "credit",
    "receipt_amount": "credit",
    "receipt_amt": "credit",
    "receipt_value": "credit",
    "receipt_total": "credit",
    "receipt_sum": "credit",
    "receipt_balance": "credit",
    "inflow_amount": "credit",
    "inflow_amt": "credit",
    "inflow_value": "credit",
    "inflow_total": "credit",
    "inflow_sum": "credit",
    "inflow_balance": "credit",
    "income_amount": "credit",
    "income_amt": "credit",
    "income_value": "credit",
    "income_total": "credit",
    "income_sum": "credit",
    "income_balance": "credit",
    
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
    "ref": "reference_id",
    
    // Branch and code fields (explicitly mapped to ignore - never map to amounts)
    "branch code": "ignore",
    "branch_code": "ignore",
    "branch": "ignore",
    "code": "ignore",
    "branch no": "ignore",
    "branch number": "ignore"
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
      console.log('📋 Raw first row data:', jsonData[0]);
      console.log('📋 First few data rows for analysis:', jsonData.slice(1, 4));
      
      // Step 2.5: Analyze actual data to understand the structure
      this.analyzeExcelStructure(jsonData);
      
      // Step 3: Map headers to standard fields
      const columnMapping = this.mapHeadersToStandardFields(headers, jsonData);
      console.log('📋 Column mapping result:', columnMapping);
      console.log('🗺️ Column mapping:', columnMapping);
      
      // Step 4: Process data rows
      console.log('🔄 Starting to process data rows with mapping:', columnMapping);
      const mappedTransactions = this.processDataRows(jsonData, columnMapping);
      
      console.log('📊 Processing results:', {
        totalRows: jsonData.length - 1,
        processedRows: mappedTransactions.length,
        skippedRows: (jsonData.length - 1) - mappedTransactions.length,
        mapping: columnMapping
      });
      
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
  
  // Analyze Excel structure to understand the actual data
  private analyzeExcelStructure(jsonData: any[][]): void {
    console.log('🔍 Analyzing Excel structure...');
    
    // Analyze first few data rows to understand the pattern
    for (let i = 1; i < Math.min(4, jsonData.length); i++) {
      const row = jsonData[i];
      console.log(`📊 Row ${i} analysis:`, {
        rowData: row,
        columnCount: row.length,
        dateLikeColumns: row.map((cell, idx) => ({ idx, value: cell, isDate: this.looksLikeDate(cell) })),
        numericColumns: row.map((cell, idx) => ({ idx, value: cell, isNumeric: this.looksLikeNumber(cell) })),
        textColumns: row.map((cell, idx) => ({ idx, value: cell, isText: this.looksLikeText(cell) }))
      });
    }
  }
  
  // Helper methods to identify data types
  private looksLikeDate(value: any): boolean {
    if (!value) return false;
    const str = value.toString().trim();
    // Check for common date patterns
    return /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(str) || 
           /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(str) ||
           !isNaN(Date.parse(str));
  }
  
  private looksLikeNumber(value: any): boolean {
    if (!value) return false;
    const str = value.toString().trim();
    // Remove currency symbols and commas
    const cleanStr = str.replace(/[₹,$,\s]/g, '');
    return !isNaN(parseFloat(cleanStr)) && isFinite(parseFloat(cleanStr));
  }
  
  private looksLikeText(value: any): boolean {
    if (!value) return false;
    const str = value.toString().trim();
    return str.length > 0 && !this.looksLikeDate(str) && !this.looksLikeNumber(str);
  }
  
  // Find columns that contain actual amounts (not branch codes or other data)
  private findAmountColumns(row: any[]): number[] {
    const amountColumns: number[] = [];
    
    for (let i = 0; i < row.length; i++) {
      const value = row[i];
      const parsed = this.parseAmount(value);
      
      // Only consider it an amount if:
      // 1. It's a valid number
      // 2. It's greater than 0
      // 3. It's not a small number that could be a code (like branch codes)
      // 4. It's not a date serial number
      // 5. It's not a reference number or account number
      if (parsed > 0 && parsed > 100) { // Assume amounts are typically > 100
        // Additional checks to avoid false positives
        const str = value?.toString() || '';
        
        // Skip if it looks like a date, reference number, or account number
        if (!this.looksLikeDate(value) && 
            !str.includes('/') && 
            !str.includes('-') &&
            !this.looksLikeReferenceNumber(str) &&
            !this.looksLikeAccountNumber(str)) {
          amountColumns.push(i);
          console.log(`💰 Column ${i}: "${value}" -> Amount: ${parsed}`);
        } else {
          console.log(`⚠️ Column ${i}: "${value}" -> Skipped (looks like reference/account/date)`);
        }
      } else if (parsed > 0) {
        console.log(`⚠️ Column ${i}: "${value}" -> Small number (${parsed}), likely not an amount`);
      }
    }
    
    return amountColumns;
  }
  
  // Check if a string looks like a reference number
  private looksLikeReferenceNumber(str: string): boolean {
    // Reference numbers are typically 6-12 digits, often with letters
    return /^[A-Z0-9]{6,12}$/i.test(str) || /^\d{6,12}$/.test(str);
  }
  
  // Check if a string looks like an account number
  private looksLikeAccountNumber(str: string): boolean {
    // Account numbers are typically 10-20 digits
    return /^\d{10,20}$/.test(str);
  }
  
  // Check if a string looks like a branch code
  private looksLikeBranchCode(str: string): boolean {
    // Branch codes are typically 3-6 digits, often starting with 0
    return /^0?\d{2,5}$/.test(str) || /^\d{3,6}$/.test(str);
  }
  
  // Create intelligent mapping based on data analysis
  private createIntelligentMapping(headers: string[], jsonData: any[][]): ColumnMapping {
    const mapping: ColumnMapping = {};
    
    console.log('🧠 Creating intelligent mapping based on data analysis...');
    console.log(`📊 Analyzing ${headers.length} columns with ${jsonData.length - 1} data rows`);
    
    // Analyze the first few data rows to understand column types
    const sampleRows = jsonData.slice(1, Math.min(4, jsonData.length));
    
    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const columnValues = sampleRows.map(row => row[colIndex]).filter(val => val !== undefined && val !== null && val !== '');
      
      if (columnValues.length === 0) continue;
      
      console.log(`🔍 Analyzing column ${colIndex}:`, {
        header: headers[colIndex] || `Column ${colIndex + 1}`,
        sampleValues: columnValues.slice(0, 3),
        valueCount: columnValues.length
      });
      
      // Check if this column contains dates
      const dateCount = columnValues.filter(val => this.looksLikeDate(val)).length;
      if (dateCount > columnValues.length * 0.5) {
        mapping[colIndex.toString()] = 'date';
        console.log(`✅ Column ${colIndex} mapped to 'date' (${dateCount}/${columnValues.length} values look like dates)`);
        continue;
      }
      
      // Check if this column contains amounts
      const amountCount = columnValues.filter(val => {
        const parsed = this.parseAmount(val);
        return parsed > 0 && !this.looksLikeReferenceNumber(val.toString()) && 
               !this.looksLikeAccountNumber(val.toString()) && 
               !this.looksLikeBranchCode(val.toString());
      }).length;
      
      if (amountCount > columnValues.length * 0.3) {
        // Determine if it's credit or debit based on context
        const avgAmount = columnValues.reduce((sum, val) => {
          const parsed = this.parseAmount(val);
          return sum + (parsed > 0 ? parsed : 0);
        }, 0) / amountCount;
        
        if (avgAmount > 1000) { // Likely credit amounts are larger
          mapping[colIndex.toString()] = 'credit';
          console.log(`✅ Column ${colIndex} mapped to 'credit' (${amountCount}/${columnValues.length} values look like amounts, avg: ${avgAmount})`);
    } else {
          mapping[colIndex.toString()] = 'debit';
          console.log(`✅ Column ${colIndex} mapped to 'debit' (${amountCount}/${columnValues.length} values look like amounts, avg: ${avgAmount})`);
        }
        continue;
      }
      
      // Check if this column contains text (descriptions)
      const textCount = columnValues.filter(val => this.looksLikeText(val)).length;
      if (textCount > columnValues.length * 0.5) {
        mapping[colIndex.toString()] = 'description';
        console.log(`✅ Column ${colIndex} mapped to 'description' (${textCount}/${columnValues.length} values look like text)`);
        continue;
      }
    }
    
    console.log(`🎯 Intelligent mapping created:`, mapping);
    
    // Validate that we have essential fields
    const hasDate = Object.values(mapping).includes('date');
    const hasAmount = Object.values(mapping).includes('credit') || Object.values(mapping).includes('debit');
    
    if (!hasDate || !hasAmount) {
      console.log(`⚠️ Intelligent mapping incomplete - missing essential fields:`);
      console.log(`   Date field: ${hasDate ? '✅' : '❌'}`);
      console.log(`   Amount field: ${hasAmount ? '✅' : '❌'}`);
      console.log(`   Please check your Excel file format`);
    }
    
    return mapping;
  }
  
  // Create intelligent mapping for a single row
  private createIntelligentMappingForRow(row: any[]): ColumnMapping {
    const mapping: ColumnMapping = {};
    
    console.log('🧠 Creating intelligent mapping for row:', row);
    
    for (let i = 0; i < row.length; i++) {
      const value = row[i];
      if (!value) continue;
      
      // Check if it's a date
      if (this.looksLikeDate(value)) {
        mapping[i.toString()] = 'date';
        console.log(`✅ Column ${i} mapped to 'date': ${value}`);
        continue;
      }
      
      // Check if it's an amount
      const amount = this.parseAmount(value);
      if (amount > 0 && !this.looksLikeReferenceNumber(value.toString()) && 
          !this.looksLikeAccountNumber(value.toString()) && 
          !this.looksLikeBranchCode(value.toString())) {
        
        // Determine if it's credit or debit based on context
        if (amount > 1000) { // Likely credit amounts are larger
          mapping[i.toString()] = 'credit';
          console.log(`✅ Column ${i} mapped to 'credit': ${value}`);
        } else {
          mapping[i.toString()] = 'debit';
          console.log(`✅ Column ${i} mapped to 'debit': ${value}`);
        }
        continue;
      }
      
      // Check if it's text (description)
      if (this.looksLikeText(value)) {
        mapping[i.toString()] = 'description';
        console.log(`✅ Column ${i} mapped to 'description': ${value}`);
        continue;
      }
    }
    
    console.log(`🎯 Row-level intelligent mapping:`, mapping);
    return mapping;
  }
  
  // Map Excel headers to standard fields
  private mapHeadersToStandardFields(headers: string[], jsonData: any[][]): ColumnMapping {
    const mapping: ColumnMapping = {};
    
    // Check if headers are empty or all the same (indicating no proper headers)
    const uniqueHeaders = [...new Set(headers.filter(h => h && h.trim()))];
    const isEmptyHeaders = headers.every(h => !h || h.trim() === '');
    const isNumericHeaders = headers.every(h => !isNaN(Number(h)) && h !== '');
    
    console.log(`🔍 Header analysis:`, {
      headers,
      uniqueHeaders,
      isEmptyHeaders,
      isNumericHeaders,
      headerCount: headers.length
    });
    
    if (isEmptyHeaders || isNumericHeaders || uniqueHeaders.length < 3) {
      console.log(`⚠️ No proper headers detected for ${headers.length} columns`);
      console.log(`⚠️ Headers found:`, headers);
      console.log(`⚠️ Attempting to create intelligent mapping based on data analysis...`);
      
      // Try to create intelligent mapping even with poor headers
      return this.createIntelligentMapping(headers, jsonData);
    } else {
      // Normal header mapping with strict validation
      headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
        
        // Explicitly prevent branch code columns from being mapped to amount fields
        if (normalizedHeader.includes('branch') || normalizedHeader.includes('code')) {
          console.log(`🚫 Preventing "${header}" from being mapped to amount fields - this is a branch/code column`);
          return; // Skip this column entirely
        }
        
      const standardField = this.standardColumnMap[normalizedHeader];
      
      if (standardField) {
          if (standardField === 'ignore') {
            console.log(`🚫 Ignoring "${header}" - this column will not be processed`);
          } else {
        mapping[header] = standardField;
        console.log(`✅ Mapped "${header}" → "${standardField}"`);
          }
      } else {
          console.log(`⚠️ No mapping found for "${header}" - will be ignored`);
        }
      });
      
      // Validate that we have the essential columns
      const hasDate = Object.values(mapping).includes('date');
      const hasDebit = Object.values(mapping).includes('debit');
      const hasCredit = Object.values(mapping).includes('credit');
      const hasDescription = Object.values(mapping).includes('description');
      
      if (!hasDate) {
        console.log(`❌ No Date column found! Please ensure your Excel has a Date column.`);
      }
      if (!hasDebit && !hasCredit) {
        console.log(`❌ No Debit or Credit columns found! Please ensure your Excel has Debit and/or Credit columns.`);
      }
      if (!hasDescription) {
        console.log(`⚠️ No Description column found. Will use default description.`);
      }
      
      console.log(`📊 Column mapping summary:`, {
        hasDate,
        hasDebit,
        hasCredit,
        hasDescription,
        totalMappedColumns: Object.keys(mapping).length
    });
    }
    
    return mapping;
  }
  
  // Process data rows with mapping
  private processDataRows(jsonData: any[][], columnMapping: ColumnMapping): MappedTransaction[] {
    const transactions: MappedTransaction[] = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      try {
        console.log(`\n🔍 Processing row ${i + 1}:`, row);
        const transaction = this.mapRowToTransaction(row, jsonData[0], columnMapping);
        if (transaction) {
          console.log(`✅ Successfully processed row ${i + 1}:`, transaction);
          transactions.push(transaction);
        } else {
          console.log(`⚠️ Skipped row ${i + 1} (no transaction data)`);
        }
      } catch (error) {
        console.warn(`⚠️ Skipping row ${i + 1}: ${error}`);
      }
    }
    
    return transactions;
  }
  
  // Map individual row to transaction
  private mapRowToTransaction(row: any[], headers: string[], columnMapping: ColumnMapping): MappedTransaction | null {
    // Skip empty rows or rows with only whitespace
    if (!row || row.length === 0 || row.every(cell => !cell || cell.toString().trim() === '')) {
      console.log(`⚠️ Skipping empty row`);
      return null;
    }
    
    // Skip footer rows that contain statement text
    const rowText = row.join(' ').toLowerCase();
    if (rowText.includes('computer generated statement') || 
        rowText.includes('does not require a signature') ||
        rowText.includes('statement') && rowText.includes('generated') ||
        rowText.includes('footer') ||
        rowText.includes('page') && rowText.includes('of')) {
      console.log(`⚠️ Skipping footer row: ${rowText.substring(0, 100)}...`);
      return null;
    }
    
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
    
    // Validate required fields - be more flexible
    if (dateIndex === -1) {
      console.log('⚠️ Date column not found, trying to find date-like data in other columns...');
      // Try to find date in any column
      for (let i = 0; i < row.length; i++) {
        if (this.looksLikeDate(row[i])) {
          console.log(`✅ Found date-like data in column ${i}: ${row[i]}`);
          // Update the mapping temporarily
          columnMapping[i.toString()] = 'date';
          break;
        }
      }
    }
    
    if (debitIndex === -1 && creditIndex === -1 && amountIndex === -1) {
      console.log('⚠️ No amount columns found, trying to find amount-like data in other columns...');
      // Try to find amounts in any column
      for (let i = 0; i < row.length; i++) {
        const value = row[i];
        if (value && this.parseAmount(value) > 0) {
          console.log(`✅ Found amount-like data in column ${i}: ${value}`);
          // Update the mapping temporarily
          columnMapping[i.toString()] = 'amount';
          break;
        }
      }
    }
    
    // Additional validation: ensure we have some column mapping
    if (Object.keys(columnMapping).length === 0) {
      console.log('⚠️ No valid column mapping found, attempting intelligent mapping...');
      // Try to create intelligent mapping for this row
      const intelligentMapping = this.createIntelligentMappingForRow(row);
      Object.assign(columnMapping, intelligentMapping);
    }
    
    // Extract data - be more flexible with date parsing
    let date = this.parseDate(row[dateIndex]);
    if (!date) {
      console.log(`⚠️ Invalid date in row: ${row[dateIndex]}, trying to find date in other columns...`);
      // Try to find a valid date in any column
      for (let i = 0; i < row.length; i++) {
        const testDate = this.parseDate(row[i]);
        if (testDate) {
          date = testDate;
          console.log(`✅ Found valid date in column ${i}: ${row[i]} -> ${date}`);
          break;
        }
      }
    }
    
    if (!date) {
      console.log(`⚠️ No valid date found in row, skipping:`, row);
      return null; // Skip this row instead of throwing error
    }
    
    // Auto-generate description from available data
    let description = row[descriptionIndex];
    if (!description) {
      // Try to find description in other columns
      for (let i = 0; i < row.length; i++) {
        const value = row[i];
        if (value && this.looksLikeText(value) && !this.looksLikeDate(value) && this.parseAmount(value) === 0) {
          description = value.toString();
          console.log(`✅ Found description in column ${i}: ${description}`);
          break;
        }
      }
      
      // If still no description, try to generate from available data
      if (!description) {
        if (customerIndex !== -1 && paymentMethodIndex !== -1) {
          const customer = row[customerIndex] || 'Unknown';
          const paymentMethod = row[paymentMethodIndex] || 'Unknown';
          description = `${customer} - ${paymentMethod} payment`;
          console.log(`✅ Auto-generated description: "${description}"`);
        } else {
          // Try to create description from any text columns
          const textParts = [];
          for (let i = 0; i < row.length; i++) {
            const value = row[i];
            if (value && this.looksLikeText(value) && !this.looksLikeDate(value) && this.parseAmount(value) === 0) {
              textParts.push(value.toString());
            }
          }
          description = textParts.length > 0 ? textParts.join(' - ') : 'Bank Transaction';
          console.log(`✅ Generated description from available data: "${description}"`);
        }
      }
    }
    
    // Determine amounts and type
    let creditAmount = 0;
    let debitAmount = 0;
    let amount = 0;
    let type: 'debit' | 'credit' = 'credit';
    
    console.log(`🔍 Column indices - Debit: ${debitIndex}, Credit: ${creditIndex}, Amount: ${amountIndex}`);
    console.log(`🔍 Row data:`, row);
    
    if (debitIndex !== -1 || creditIndex !== -1) {
      // Handle separate debit/credit columns (one or both may be present)
      if (debitIndex !== -1) {
      debitAmount = this.parseAmount(row[debitIndex]);
        const debitRaw = row[debitIndex]?.toString() || '';
        
        // Skip if the value looks like a code, reference, or branch code
        if (this.looksLikeReferenceNumber(debitRaw) || this.looksLikeAccountNumber(debitRaw) || this.looksLikeBranchCode(debitRaw)) {
          console.log(`⚠️ Debit column contains reference/account/branch code: "${debitRaw}" - skipping`);
          debitAmount = 0;
        }
        
      if (debitAmount > 0) {
        amount = debitAmount;
        type = 'debit';
          console.log(`✅ Processing DEBIT: ${debitAmount} (raw: "${row[debitIndex]}")`);
        }
      }
      
      if (creditIndex !== -1) {
        creditAmount = this.parseAmount(row[creditIndex]);
        const creditRaw = row[creditIndex]?.toString() || '';
        
        // Skip if the value looks like a code, reference, or branch code
        if (this.looksLikeReferenceNumber(creditRaw) || this.looksLikeAccountNumber(creditRaw) || this.looksLikeBranchCode(creditRaw)) {
          console.log(`⚠️ Credit column contains reference/account/branch code: "${creditRaw}" - skipping`);
          creditAmount = 0;
        }
        
      if (creditAmount > 0) {
        amount = creditAmount;
        type = 'credit';
          console.log(`✅ Processing CREDIT: ${creditAmount} (raw: "${row[creditIndex]}")`);
        }
      }
      
      // If both amounts are zero, try to find amounts in other columns
      if (debitAmount === 0 && creditAmount === 0) {
        console.log(`Both debit and credit are zero, trying to find amounts in other columns...`);
        // Try to find amounts in any column
        for (let i = 0; i < row.length; i++) {
          const value = row[i];
          if (value && this.parseAmount(value) > 0) {
            const amount = this.parseAmount(value);
            if (amount > 1000) {
              creditAmount = amount;
              console.log(`✅ Found credit amount in column ${i}: ${value} -> ${amount}`);
            } else {
              debitAmount = amount;
              console.log(`✅ Found debit amount in column ${i}: ${value} -> ${amount}`);
            }
            break;
          }
        }
        
        // If still no amounts found, skip this row
        if (debitAmount === 0 && creditAmount === 0) {
          console.log(`No amounts found in any column - skipping row as it may be a balance entry or informational row`);
          return null;
        }
      }
    } else if (amountIndex !== -1) {
      // Single amount column
      const rawAmount = this.parseAmount(row[amountIndex]);
      amount = Math.abs(rawAmount);
      type = rawAmount >= 0 ? 'credit' : 'debit';
      
      if (type === 'credit') {
        creditAmount = amount;
      } else {
        debitAmount = amount;
      }
      
      console.log(`Row ${row}: Single amount=${rawAmount}, processed=${amount}, type=${type}`);
    } else {
      console.log(`❌ No amount columns found! Debit index: ${debitIndex}, Credit index: ${creditIndex}, Amount index: ${amountIndex}`);
      console.log(`❌ Cannot process transaction without proper Debit/Credit column mapping.`);
      console.log(`❌ Please ensure your Excel file has proper column headers like: Date, Description, Debit, Credit, Balance`);
      
      // Don't try to auto-detect - it's too error-prone and can map branch codes to amounts
      throw new Error('No valid amount columns found - please ensure your Excel has Debit and/or Credit columns with proper headers');
    }
    
    console.log(`🎯 Final amounts: Credit=${creditAmount}, Debit=${debitAmount}, Total=${amount}, type=${type}`);
    
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
      credit_amount: creditAmount,
      debit_amount: debitAmount,
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
    console.log(`🔍 Looking for field "${fieldName}" in mapping:`, columnMapping);
    
    // First try to find by header name
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (columnMapping[header] === fieldName) {
        console.log(`✅ Found "${fieldName}" at index ${i} via header "${header}"`);
        return i;
      }
    }
    
    // Try numeric column indices (from intelligent mapping)
    for (let i = 0; i < headers.length; i++) {
      if (columnMapping[i.toString()] === fieldName) {
        console.log(`✅ Found "${fieldName}" at index ${i} via numeric mapping`);
        return i;
      }
    }
    
    // If not found, try positional mapping
    for (let i = 0; i < headers.length; i++) {
      const columnKey = `Column ${i}`;
      if (columnMapping[columnKey] === fieldName) {
        console.log(`✅ Found "${fieldName}" at index ${i} via positional mapping`);
        return i;
      }
    }
    
    console.log(`❌ Field "${fieldName}" not found in mapping`);
    return -1;
  }
  
  // Parse date from various formats
  private parseDate(dateValue: any): string | null {
    if (!dateValue) return null;
    
    try {
      let date: Date;
      const dateStr = dateValue.toString().trim();
      
      // Skip if it looks like footer text or non-date content
      if (dateStr.includes('computer generated') || 
          dateStr.includes('statement') || 
          dateStr.includes('signature') ||
          dateStr.includes('**') ||
          dateStr.length > 100) {
        console.log(`⚠️ Skipping non-date content: ${dateStr.substring(0, 50)}...`);
        return null;
      }
      
      // Handle different date formats
      if (typeof dateValue === 'number') {
        // Excel serial date number
        date = new Date((dateValue - 25569) * 86400 * 1000);
      } else if (typeof dateValue === 'string') {
        // String date - try multiple formats
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
        console.log(`⚠️ Invalid date: ${dateValue}`);
        return null;
      }
      
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.log(`⚠️ Date parsing error for: ${dateValue}`, error);
      return null;
    }
  }
  
  // Parse amount from various formats
  private parseAmount(amountValue: any): number {
    if (!amountValue) return 0;
    
    // Handle different data types
    if (typeof amountValue === 'number') {
      // Check if it's a date serial number (Excel dates are typically 40000+)
      if (amountValue > 40000 && amountValue < 100000) {
        console.log(`⚠️ Skipping potential date serial number: ${amountValue}`);
        return 0;
      }
      return isNaN(amountValue) ? 0 : amountValue;
    }
    
    // Convert to string and handle whitespace properly
    let amountStr = String(amountValue);
    
    // If it's just whitespace, return 0
    if (amountStr.trim() === '') {
      return 0;
    }
    
    // Skip if it looks like a code (contains letters or special patterns)
    if (/[A-Za-z]/.test(amountStr) || /^\d{4,6}$/.test(amountStr.trim())) {
      console.log(`⚠️ Skipping potential code: ${amountStr}`);
      return 0;
    }
    
    // Skip if it looks like a reference number, account number, or branch code
    if (this.looksLikeReferenceNumber(amountStr) || this.looksLikeAccountNumber(amountStr) || this.looksLikeBranchCode(amountStr)) {
      console.log(`⚠️ Skipping reference/account/branch code: ${amountStr}`);
      return 0;
    }
    
    // Remove currency symbols and commas, but preserve the number structure
    amountStr = amountStr.replace(/[₹,$]/g, '');
    
    // Parse the amount
    const amount = parseFloat(amountStr);
    
    // Additional validation: amounts should be reasonable (not too small or too large)
    if (isNaN(amount) || amount < 0 || amount > 1000000000) {
      console.log(`⚠️ Invalid amount: ${amountValue} -> ${amount}`);
      return 0;
    }
    
    return amount;
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
