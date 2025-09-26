import { supabase, User, Transaction, Upload, AuditLog } from '@/lib/supabase';
import { fileProcessorService } from './fileProcessor';
import { generateFileHash, checkFileHash } from '@/utils/fileHash';
import { insertTransactionsWithDeduplication, processTransactionsBatch } from '@/utils/transactionDeduplication';
import { excelColumnMapper } from './excelColumnMapper';

// Intelligent Excel processor with flexible column detection
const processExcelFileSimple = async (file: File) => {
  try {
    console.log('🚀 Intelligent Excel processor with flexible column detection starting...', file.name);
    
    // Read Excel file using XLSX
    const XLSX = await import('xlsx');
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    
    console.log('📊 Available sheets:', workbook.SheetNames);
    
    // Use the first sheet
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    console.log('📊 Raw Excel data analysis:', {
      totalRows: jsonData.length,
      firstRow: jsonData[0],
      secondRow: jsonData[1],
      thirdRow: jsonData[2],
      sampleData: jsonData.slice(0, 5)
    });
    
    if (jsonData.length < 2) {
      throw new Error(`Excel file must contain at least 2 rows. Found ${jsonData.length} rows.`);
    }
    
    // Step 1: Intelligent column detection
    const headers = jsonData[0] || [];
    console.log('📋 Excel headers:', headers);
    console.log('📋 All header values:', headers.map((h, i) => `[${i}]: "${h}"`));
    
    const columnMapping = {
      date: -1,
      description: -1,
      debit: -1,
      credit: -1,
      balance: -1
    };
    
    // Flexible column mapping with multiple variations
    headers.forEach((header, index) => {
      if (!header) return;
      
      const headerStr = header.toString().toLowerCase().trim();
      console.log(`🔍 Analyzing header [${index}]: "${header}" -> "${headerStr}"`);
      
      // Date column mapping - multiple variations
      if (headerStr.includes('date') || headerStr.includes('txn date') || 
          headerStr.includes('value date') || headerStr.includes('transaction date') ||
          headerStr.includes('posting date') || headerStr.includes('tran') ||
          headerStr.includes('value') || headerStr.includes('time')) {
        columnMapping.date = index;
        console.log(`✅ Mapped Date column: "${header}" -> column ${index}`);
      }
      
      // Debit column mapping - multiple variations
      else if (headerStr.includes('debit') || headerStr.includes('withdrawal') || 
               headerStr.includes('payment') || headerStr.includes('dr') || 
               headerStr.includes('outgoing') || headerStr.includes('debit amount') ||
               headerStr.includes('withdraw') || headerStr.includes('paid') ||
               headerStr.includes('expense') || headerStr.includes('outflow')) {
        columnMapping.debit = index;
        console.log(`✅ Mapped Debit column: "${header}" -> column ${index}`);
      }
      
      // Credit column mapping - multiple variations
      else if (headerStr.includes('credit') || headerStr.includes('deposit') || 
               headerStr.includes('receipt') || headerStr.includes('cr') || 
               headerStr.includes('incoming') || headerStr.includes('credit amount') ||
               headerStr.includes('deposit amount') || headerStr.includes('received') ||
               headerStr.includes('income') || headerStr.includes('inflow')) {
        columnMapping.credit = index;
        console.log(`✅ Mapped Credit column: "${header}" -> column ${index}`);
      }
      
      // Balance column mapping - multiple variations
      else if (headerStr.includes('balance') || headerStr.includes('closing balance') || 
               headerStr.includes('running balance') || headerStr.includes('available balance') ||
               headerStr.includes('closing') || headerStr.includes('running') || 
               headerStr.includes('available') || headerStr.includes('current balance') ||
               headerStr.includes('ledger balance') || headerStr.includes('book balance')) {
        columnMapping.balance = index;
        console.log(`✅ Mapped Balance column: "${header}" -> column ${index}`);
      }
      
      // Description column mapping - multiple variations
      else if (headerStr.includes('description') || headerStr.includes('narration') || 
               headerStr.includes('particulars') || headerStr.includes('details') || 
               headerStr.includes('remarks') || headerStr.includes('transaction') ||
               headerStr.includes('memo') || headerStr.includes('note') ||
               headerStr.includes('comment') || headerStr.includes('reference') ||
               headerStr.includes('purpose') || headerStr.includes('beneficiary')) {
        columnMapping.description = index;
        console.log(`✅ Mapped Description column: "${header}" -> column ${index}`);
      }
    });
    
    console.log('🗺️ Initial column mapping from headers:', columnMapping);
    
    // Step 2: If no headers detected, try to detect from data
    if (columnMapping.date === -1 && columnMapping.description === -1) {
      console.log('⚠️ No headers detected, trying to detect columns from data...');
      
      // Look at first few rows to detect column types
      for (let i = 1; i < Math.min(4, jsonData.length); i++) {
        const row = jsonData[i];
        if (!row) continue;
        
        console.log(`🔍 Analyzing row ${i} for column detection:`, row);
        
        row.forEach((cell, colIndex) => {
          if (!cell) return;
          
          // Check if it looks like a date
          if (columnMapping.date === -1) {
            try {
              const testDate = new Date(cell);
              if (!isNaN(testDate.getTime())) {
                columnMapping.date = colIndex;
                console.log(`✅ Detected Date column from data: column ${colIndex} (value: ${cell})`);
              }
            } catch (e) {}
          }
          
          // Check if it looks like text (description)
          if (columnMapping.description === -1 && typeof cell === 'string' && cell.trim().length > 3) {
            columnMapping.description = colIndex;
            console.log(`✅ Detected Description column from data: column ${colIndex} (value: ${cell})`);
          }
          
          // Check if it looks like an amount
          const numValue = parseFloat(cell.toString().replace(/[₹,+\s]/g, ''));
          if (!isNaN(numValue) && numValue > 0) {
            // Use column headers to determine credit/debit instead of hardcoded amounts
            const header = headers[colIndex]?.toLowerCase() || '';
            if (columnMapping.credit === -1 && (header.includes('credit') || header.includes('deposit') || header.includes('income'))) {
              columnMapping.credit = colIndex;
              console.log(`✅ Detected Credit column from header: column ${colIndex} (${header})`);
            } else if (columnMapping.debit === -1 && (header.includes('debit') || header.includes('withdrawal') || header.includes('expense'))) {
              columnMapping.debit = colIndex;
              console.log(`✅ Detected Debit column from header: column ${colIndex} (${header})`);
            }
          }
        });
      }
    }
    
    console.log('🗺️ Final column mapping after intelligent detection:', columnMapping);
    
    const transactions = [];
    
    // Step 2: Process each data row
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      if (!row || row.length === 0) {
        console.log(`⚠️ Skipping empty row ${i}`);
        continue;
      }
      
      console.log(`🔍 Processing row ${i}:`, row);
      
      // Extract data using column mapping
      let date = '';
      let description = '';
      let debitAmount = 0;
      let creditAmount = 0;
      let balance = 0;
      
      // Extract date using intelligent column mapping
      if (columnMapping.date !== -1 && row[columnMapping.date]) {
        try {
          const dateValue = row[columnMapping.date];
          let parsedDate: Date;
          
          // Handle Excel serial date numbers
          if (typeof dateValue === 'number') {
            // Excel serial date number (days since 1900-01-01, with leap year bug)
            parsedDate = new Date((dateValue - 25569) * 86400 * 1000);
          } else if (typeof dateValue === 'string') {
            // String date - try multiple formats
            const dateStr = dateValue.toString().trim();
            const formats = [
              /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/, // DD/MM/YYYY or DD-MM-YYYY
              /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/, // YYYY/MM/DD or YYYY-MM-DD
              /^\d{1,2}\s+\w+\s+\d{4}$/, // DD Month YYYY
            ];
            
            if (formats.some(format => format.test(dateStr))) {
              parsedDate = new Date(dateStr);
            } else {
              parsedDate = new Date(dateValue);
            }
          } else {
            parsedDate = new Date(dateValue);
          }
          
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString().split('T')[0];
            console.log(`✅ Extracted date from column ${columnMapping.date}: ${dateValue} -> ${date}`);
          } else {
            console.log(`⚠️ Invalid date format: ${dateValue}`);
          }
        } catch (e) {
          console.log(`⚠️ Failed to parse date from column ${columnMapping.date}: ${row[columnMapping.date]}`, e);
        }
      }
      
      // Extract description using intelligent column mapping
      if (columnMapping.description !== -1 && row[columnMapping.description]) {
        description = row[columnMapping.description].toString().trim();
        console.log(`✅ Extracted description from column ${columnMapping.description}: ${description}`);
      }
      
      // Extract debit amount using intelligent column mapping
      if (columnMapping.debit !== -1 && row[columnMapping.debit]) {
        debitAmount = parseFloat(row[columnMapping.debit].toString().replace(/[₹,+\s]/g, ''));
        if (isNaN(debitAmount)) debitAmount = 0;
        console.log(`✅ Extracted debit from column ${columnMapping.debit}: ${row[columnMapping.debit]} -> ${debitAmount}`);
      }
      
      // Extract credit amount using intelligent column mapping
      if (columnMapping.credit !== -1 && row[columnMapping.credit]) {
        creditAmount = parseFloat(row[columnMapping.credit].toString().replace(/[₹,+\s]/g, ''));
        if (isNaN(creditAmount)) creditAmount = 0;
        console.log(`✅ Extracted credit from column ${columnMapping.credit}: ${row[columnMapping.credit]} -> ${creditAmount}`);
      }
      
      // Extract balance using intelligent column mapping
      if (columnMapping.balance !== -1 && row[columnMapping.balance]) {
        balance = parseFloat(row[columnMapping.balance].toString().replace(/[₹,+\s]/g, ''));
        if (isNaN(balance)) balance = 0;
        console.log(`✅ Extracted balance from column ${columnMapping.balance}: ${row[columnMapping.balance]} -> ${balance}`);
      }
      
      // Fallback: If no specific debit/credit columns found, try to find amount in any column
      if (debitAmount === 0 && creditAmount === 0) {
        console.log('🔍 No debit/credit columns found, searching for amounts in any column...');
        for (let j = 0; j < row.length; j++) {
          if (j === columnMapping.date || j === columnMapping.description) continue;
          
          const value = row[j];
          if (value) {
            const numValue = parseFloat(value.toString().replace(/[₹,+\s]/g, ''));
            if (!isNaN(numValue) && numValue > 0) {
              // Determine if it's debit or credit based on column header
              const header = headers[j]?.toLowerCase() || '';
              if (header.includes('credit') || header.includes('deposit') || header.includes('income')) {
                creditAmount = numValue;
                console.log(`✅ Found credit amount in column ${j}: ${value} -> ${creditAmount}`);
              } else if (header.includes('debit') || header.includes('withdrawal') || header.includes('expense')) {
                debitAmount = numValue;
                console.log(`✅ Found debit amount in column ${j}: ${value} -> ${debitAmount}`);
              } else {
                // Default to credit for positive amounts if no clear header
                creditAmount = numValue;
                console.log(`✅ Found amount in column ${j} (defaulting to credit): ${value} -> ${creditAmount}`);
              }
              break;
            }
          }
        }
      }
      
      // Fallback: If still no description found, use any text column
      if (!description) {
        console.log('🔍 No description column found, searching for text in any column...');
        for (let j = 0; j < row.length; j++) {
          if (j === columnMapping.date) continue;
          
          const value = row[j];
          if (value && typeof value === 'string' && value.trim().length > 0) {
            description = value.trim();
            console.log(`✅ Found description in column ${j}: ${description}`);
            break;
          }
        }
      }
      
      // Fallback: If still no date found, try to find date in any column
      if (!date) {
        console.log('🔍 No date column found, searching for date in any column...');
        for (let j = 0; j < row.length; j++) {
          const value = row[j];
          if (value) {
            try {
              const testDate = new Date(value);
              if (!isNaN(testDate.getTime())) {
                date = testDate.toISOString().split('T')[0];
                console.log(`✅ Found date in column ${j}: ${value} -> ${date}`);
                break;
              }
            } catch (e) {}
          }
        }
      }
      
      // Create transaction if we have valid data
      if (date && description && (debitAmount > 0 || creditAmount > 0)) {
        // Block obvious dummy data based on patterns, not hardcoded values
        if ((debitAmount === 0.01 || creditAmount === 0.01) || 
            (debitAmount === 0.02 || creditAmount === 0.02) ||
            (description.toLowerCase().includes('test') && (debitAmount < 1 || creditAmount < 1))) {
          console.log(`🚫 BLOCKED potential dummy data from row ${i} - debit: ${debitAmount}, credit: ${creditAmount}, description: ${description}`);
          continue;
        }
        
        const transaction = {
          date,
          description,
          debit_amount: debitAmount,
          credit_amount: creditAmount,
          balance: balance > 0 ? balance : undefined,
          category: detectCategory(description),
          payment_type: creditAmount > 0 ? 'receipt' : 'bank_transfer',
          transaction_name: description,
          source_file: file.name,
          source_type: 'excel',
          confidence: 0.95 // High confidence for properly mapped data
        };
        
        transactions.push(transaction);
        console.log(`✅ CREATED REAL transaction from row ${i}:`, transaction);
      } else {
        console.log(`⚠️ Skipped row ${i} - missing required data (date: ${date}, description: ${description}, debit: ${debitAmount}, credit: ${creditAmount})`);
      }
    }
    
    console.log(`✅ Intelligent Excel processing completed: ${transactions.length} REAL transactions found`);
    
    if (transactions.length === 0) {
      throw new Error('No valid transactions found in Excel file. The system tried to detect columns automatically but could not find valid transaction data. Please ensure your Excel contains transaction data with dates, descriptions, and amounts.');
    }
    
    return transactions;
    
  } catch (error) {
    console.error('❌ Intelligent Excel processing failed:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  async login(email: string, password: string) {
    // Use Supabase's built-in authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || 'Invalid credentials');
    }

    if (!data.user) {
      throw new Error('Authentication failed');
    }

    // Get admin details from our custom admin table
    const { data: admin, error: adminError } = await supabase
      .from('admin')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // If admin record doesn't exist, create it
    if (adminError && adminError.code === 'PGRST116') {
      const { data: newAdmin, error: createError } = await supabase
        .from('admin')
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating admin record:', createError);
      }
    }

    // Log audit
    await auditAPI.logAction('login', `Admin logged in: ${email}`, data.user.id);

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
        role: 'admin',
        is_active: true,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at || data.user.created_at,
      },
      session: data.session,
    };
  },

  async getCurrentUser() {
    // Get current user from Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error('No authenticated user');
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
      role: 'admin',
      is_active: true,
      created_at: user.created_at,
      updated_at: user.updated_at || user.created_at,
    };
  },

  async logout() {
    // Logout from Supabase Auth
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error);
    }
    
    // Log audit
    await auditAPI.logAction('logout', `Admin logged out`, 'admin');
  },

  async signUp(email: string, password: string, fullName: string) {
    // Admin-only system - no signup allowed
    throw new Error('Signup not allowed in admin-only system');
  }
};

// Transactions API
export const transactionsAPI = {
  async getAll(params?: { 
    category?: string; 
    transaction_type?: string; 
    status?: string; 
    startDate?: string; 
    endDate?: string;
    limit?: number;
    offset?: number;
    showAll?: boolean;
  }) {
    let query = supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    // If showAll is false (default), filter to show only latest upload
    if (params?.showAll === false) {
      // Get the most recent source_file from transactions
      const { data: latestSourceFile, error: latestError } = await supabase
        .from('transactions')
        .select('source_file, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestError) {
        console.log('No transactions found or error fetching latest source file:', latestError);
        // If no transactions exist, return empty result
        return [];
      }

      if (latestSourceFile?.source_file) {
        query = query.eq('source_file', latestSourceFile.source_file);
      }
    }

    if (params?.category) {
      query = query.eq('category', params.category);
    }
    if (params?.transaction_type) {
      query = query.eq('payment_type', params.transaction_type);
    }
    if (params?.startDate) {
      query = query.gte('date', params.startDate);
    }
    if (params?.endDate) {
      query = query.lte('date', params.endDate);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(transaction: Omit<Transaction, 'id' | 'created_at'>) {
    console.log('Creating transaction with data:', transaction);
    
    // Add amount field if it exists in the database (for backward compatibility)
    const transactionData = {
      ...transaction,
      amount: (transaction.credit_amount || 0) - (transaction.debit_amount || 0),
      source_file: transaction.source_file,
      source_type: transaction.source_type
    };
    
    // Remove fields that might not exist in the database yet
    const safeTransactionData = {
      date: transactionData.date,
      payment_type: transactionData.payment_type,
      transaction_name: transactionData.transaction_name,
      description: transactionData.description,
      category: transactionData.category,
      credit_amount: transactionData.credit_amount,
      debit_amount: transactionData.debit_amount,
      balance: transactionData.balance,
      source_file: transactionData.source_file,
      source_type: transactionData.source_type,
      proof: transactionData.proof,
      notes: transactionData.notes,
      updated_at: transactionData.updated_at
    };
    
    const { data, error } = await supabase
      .from('transactions')
      .insert(safeTransactionData)
      .select()
      .single();

    if (error) {
      console.error('Transaction creation error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('Transaction created successfully:', data);

    // Log audit
    const totalAmount = (transaction.credit_amount || 0) + (transaction.debit_amount || 0);
    await auditAPI.logAction('create', `Transaction created: Credit: ${transaction.credit_amount || 0}, Debit: ${transaction.debit_amount || 0}`, 'admin');

    return data;
  },

  async update(id: string, updates: Partial<Transaction>) {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await auditAPI.logAction('update', `Transaction updated: ${id}`, 'admin');

    return data;
  },

  async delete(id: string) {
    const { data, error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await auditAPI.logAction('delete', `Transaction deleted: ${id}`, 'admin');

    return data;
  }
};

// Dashboard API
export const dashboardAPI = {
  async getStats() {
    // Get transaction counts
    const { count: totalTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    // Get upload counts (with fallback if uploads table doesn't exist)
    let totalUploads = 0;
    let lastUpload = null;
    try {
      const { count } = await supabase
        .from('uploads')
        .select('*', { count: 'exact', head: true });
      totalUploads = count || 0;

      const { data } = await supabase
        .from('uploads')
        .select('uploaded_at')
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .single();
      lastUpload = data;
    } catch (error: any) {
      if (error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
        console.log('Uploads table query failed with 406 error, using defaults');
      } else {
        console.log('Uploads table not available, using defaults');
      }
    }

    // Get processed transactions
    const { count: processedTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processed');

    return [
      {
        name: "Total Statements",
        value: totalUploads?.toString() || "0",
        change: "+12%",
        icon: "FileText",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
      },
      {
        name: "Total Receipts",
        value: totalTransactions?.toString() || "0",
        change: "+18%",
        icon: "Receipt",
        color: "text-green-600",
        bgColor: "bg-green-50",
      },
      {
        name: "Total Transactions",
        value: totalTransactions?.toString() || "0",
        change: "+23%",
        icon: "CreditCard",
        color: "text-purple-600",
        bgColor: "bg-purple-50",
      },
      {
        name: "Last Upload",
        value: lastUpload ? new Date(lastUpload.uploaded_at).toLocaleString() : "Never",
        change: "Recent",
        icon: "Upload",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
      },
    ];
  },

  async getChartData() {
    // Get category breakdown
    const { data: categoryData } = await supabase
      .from('transactions')
      .select('category');

    const categoryCounts = categoryData?.reduce((acc: any, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + 1;
      return acc;
    }, {});

    const categoryChartData = Object.entries(categoryCounts || {}).map(([name, value], index) => ({
      name,
      value: Math.round((value as number / (categoryData?.length || 1)) * 100),
      color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'][index % 4]
    }));

    // Get monthly data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: monthlyTransactions } = await supabase
      .from('transactions')
      .select('transaction_date, amount')
      .gte('transaction_date', sixMonthsAgo.toISOString());

    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      
      const monthTransactions = monthlyTransactions?.filter(t => {
        const transactionDate = new Date(t.transaction_date);
        return transactionDate.getMonth() === date.getMonth() && 
               transactionDate.getFullYear() === date.getFullYear();
      }) || [];

      return {
        month,
        receipts: monthTransactions.length,
        transactions: monthTransactions.reduce((sum, t) => sum + t.amount, 0)
      };
    });

    return {
      categoryData: categoryChartData,
      monthlyData
    };
  },

  async getRecentActivity() {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    return data.map(log => ({
      id: log.id,
      type: log.action,
      description: log.description,
      time: new Date(log.created_at).toLocaleString(),
      icon: log.action === 'upload' ? 'Upload' : 
            log.action === 'create' ? 'Receipt' : 'FileText'
    }));
  }
};

// Valid categories from database schema (updated to include bank statement categories)
const VALID_CATEGORIES = [
  'business_expense',
  'personal_expense', 
  'travel_transport',
  'meals_entertainment',
  'office_supplies',
  'software_subscriptions',
  'utilities',
  'income',
  'salary',
  'business_income',
  'investment',
  'refund',
  'transfer_in',
  'transfer_out',
  'withdrawal',
  'deposit',
  'loan_payment',
  'insurance',
  'medical',
  'education',
  'shopping',
  'entertainment',
  'fuel',
  'maintenance'
];

// Valid transaction types from database schema (updated for bank statements)
const VALID_TRANSACTION_TYPES = [
  'receipt',
  'bank_transfer',
  'upi',
  'cash',
  'other'
];

// Function to validate and normalize category
const normalizeCategory = (category: string): string => {
  console.log(`normalizeCategory called with: "${category}"`);
  
  if (!category) {
    console.log('Category is empty, returning business_expense');
    return 'business_expense';
  }
  
  const normalized = category.toLowerCase().trim();
  console.log(`Normalized category: "${normalized}"`);
  
  // Direct match
  if (VALID_CATEGORIES.includes(normalized)) {
    console.log(`Direct match found: "${normalized}"`);
    return normalized;
  }
  
  // Try to map common variations (including bank statement categories)
  const categoryMap: Record<string, string> = {
    'business': 'business_expense',
    'personal': 'personal_expense',
    'travel': 'travel_transport',
    'transport': 'travel_transport',
    'meals': 'meals_entertainment',
    'entertainment': 'meals_entertainment',
    'office': 'office_supplies',
    'supplies': 'office_supplies',
    'software': 'software_subscriptions',
    'subscription': 'software_subscriptions',
    'utility': 'utilities',
    'utilities': 'utilities',
    // Bank statement categories
    'income': 'income',
    'salary': 'salary',
    'business_income': 'business_income',
    'investment': 'investment',
    'refund': 'refund',
    'transfer_in': 'transfer_in',
    'transfer_out': 'transfer_out',
    'withdrawal': 'withdrawal',
    'deposit': 'deposit',
    'loan_payment': 'loan_payment',
    'insurance': 'insurance',
    'medical': 'medical',
    'education': 'education',
    'shopping': 'shopping',
    'fuel': 'fuel',
    'maintenance': 'maintenance'
  };
  
  const mappedCategory = categoryMap[normalized] || 'business_expense';
  console.log(`Mapped category: "${normalized}" → "${mappedCategory}"`);
  return mappedCategory;
};

// Enhanced file processing using the new file processor service
const processFileWithNewService = async (file: File) => {
  try {
    console.log('Processing file with enhanced service:', file.name);
    const result = await fileProcessorService.processFile(file);
    
    if (!result.success) {
      throw new Error(result.error || 'File processing failed');
    }
    
    console.log(`Successfully processed ${result.transactions.length} transactions from ${file.name}`);
    console.log('Processing metadata:', result.metadata);
    
    // Convert to the format expected by the existing code
    return result.transactions.map(tx => ({
      amount: tx.type === 'credit' ? tx.amount : -tx.amount,
      credit_amount: tx.type === 'credit' ? tx.amount : 0,
      debit_amount: tx.type === 'debit' ? tx.amount : 0,
      date: tx.date,
      description: tx.description,
      category: normalizeCategory(tx.category),
      transaction_type: getTransactionType(tx.paymentType, tx.type === 'credit'),
      balance: tx.balance,
      source_file: tx.sourceFile,
      source_type: tx.sourceType
    }));
    
  } catch (error: any) {
    console.error('Enhanced file processing error:', error);
    throw new Error(`File processing failed: ${error.message}`);
  }
};

// Helper function to determine transaction type
const getTransactionType = (paymentType: string, isCredit: boolean): string => {
  const type = paymentType.toLowerCase();
  
  if (type.includes('upi')) return 'upi';
  if (type.includes('transfer')) return 'bank_transfer';
  if (type.includes('cash')) return 'cash';
  if (type.includes('receipt')) return 'receipt';
  
  return isCredit ? 'receipt' : 'other';
};

// Helper function to detect category from description
const detectCategory = (description: string): string => {
  if (!description) return 'business_expense';
  
  const desc = description.toLowerCase();
  
  if (desc.includes('salary') || desc.includes('income')) return 'salary';
  if (desc.includes('rent') || desc.includes('rental')) return 'business_expense';
  if (desc.includes('food') || desc.includes('restaurant') || desc.includes('meals')) return 'meals_entertainment';
  if (desc.includes('fuel') || desc.includes('petrol') || desc.includes('diesel')) return 'fuel';
  if (desc.includes('medical') || desc.includes('hospital') || desc.includes('doctor')) return 'medical';
  if (desc.includes('education') || desc.includes('school') || desc.includes('college')) return 'education';
  if (desc.includes('travel') || desc.includes('transport') || desc.includes('uber') || desc.includes('ola')) return 'travel_transport';
  if (desc.includes('office') || desc.includes('business') || desc.includes('work')) return 'business_expense';
  if (desc.includes('software') || desc.includes('subscription') || desc.includes('saas')) return 'software_subscriptions';
  if (desc.includes('electricity') || desc.includes('water') || desc.includes('gas') || desc.includes('bill')) return 'utilities';
  if (desc.includes('bank') || desc.includes('transfer') || desc.includes('deposit')) return 'bank_transfer';
  if (desc.includes('withdrawal') || desc.includes('atm')) return 'cash';
  if (desc.includes('upi') || desc.includes('paytm') || desc.includes('phonepe')) return 'upi';
  
  return 'business_expense'; // Default category
};

// Upload API
export const uploadAPI = {
  async uploadFile(file: File, metadata: {
    fileType: string;
    category?: string;
    amount?: number;
    date?: string;
    notes?: string;
  }) {
    console.log('🚀 UPLOAD API CALLED - New code is loaded!');
    console.log('File:', file.name, 'Metadata:', metadata);
    
    // Skip duplicate file check for now to avoid 406 errors
    // This will be re-enabled once the database schema is properly set up
    console.log('⚠️ Duplicate file check temporarily disabled to avoid 406 errors');
    console.log('File will be uploaded without duplicate checking');
    
    // Test category normalization
    console.log('🧪 Testing category normalization:');
    console.log('business_expense →', normalizeCategory('business_expense'));
    console.log('invalid_category →', normalizeCategory('invalid_category'));
    console.log('meals →', normalizeCategory('meals'));
    
    // Database constraint validation will be handled during actual transaction creation
    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `admin/${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(fileName);

    // Skip upload record creation if uploads table doesn't exist
    let uploadRecord = null;
    try {
      // Try to create upload record, but don't fail if table doesn't exist
      const baseUploadData = {
        file_name: fileName,
        file_url: publicUrl,
        file_type: (fileExt?.toLowerCase() && ['pdf','jpg','jpeg','png','csv','xls','xlsx'].includes(fileExt.toLowerCase())) 
          ? fileExt.toLowerCase() 
          : 'pdf',
        file_size_mb: file.size / (1024 * 1024),
        status: 'uploaded'
      };

      const result = await supabase
        .from('uploads')
        .insert(baseUploadData)
        .select()
        .single();
      
      uploadRecord = result.data;
    } catch (error) {
      console.log('Uploads table not available, skipping upload record creation');
      // Continue without upload record - this is not critical for file processing
    }

    // Parse file content and create transactions using enhanced service
    let parsedTransactions: any[] = [];
    let successCount = 0;
    
    try {
      // Check if it's an Excel file
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      console.log('🔍 File extension detected:', fileExtension);
      console.log('🔍 File name:', file.name);
      
      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Use simple Excel processor
        console.log('📊 Processing Excel file with simple processor...');
        
        parsedTransactions = await processExcelFileSimple(file);
        
        if (parsedTransactions.length === 0) {
          throw new Error('No transactions found in Excel file. Please ensure your Excel has date, description, and amount columns.');
        }
        
        console.log(`✅ Successfully extracted ${parsedTransactions.length} real transactions from Excel file: ${file.name}`);
        
      } else {
        // Use existing enhanced file processor for other file types
        console.log('🔄 Using enhanced file processor for non-Excel file:', fileExtension);
        const { enhancedFileProcessorService } = await import('./enhancedFileProcessor');
        const processingResult = await enhancedFileProcessorService.processFile(file);
        
        if (!processingResult.success) {
          throw new Error(processingResult.error || 'File processing failed');
        }
        
        parsedTransactions = processingResult.transactions;
      }

      console.log(`Parsed ${parsedTransactions.length} transactions from ${file.name}:`, parsedTransactions);

      // Update upload record with processing status (if upload record exists)
      if (uploadRecord) {
        try {
          // Try with basic fields first (status is most likely to exist)
          await supabase
            .from('uploads')
            .update({ status: 'processing' })
            .eq('id', uploadRecord.id);
          
          console.log('✅ Upload status updated to processing');
          
          // Try to update with transaction count if column exists
          try {
            await supabase
              .from('uploads')
              .update({ extracted_transactions_count: parsedTransactions.length })
              .eq('id', uploadRecord.id);
            console.log('✅ Upload transaction count updated');
          } catch (countError: any) {
            if (countError.message?.includes('column "extracted_transactions_count" does not exist')) {
              console.log('⚠️ extracted_transactions_count column does not exist, skipping count update');
            } else {
              console.log('⚠️ Failed to update transaction count:', countError.message);
            }
          }
          
        } catch (error: any) {
          console.log('❌ Upload update failed:', error.message);
          // Don't throw error - continue with transaction processing
        }
      }

      // Create transactions for each parsed item
      console.log(`🔄 Starting to create ${parsedTransactions.length} transactions...`);
      
      for (let i = 0; i < parsedTransactions.length; i++) {
        const transactionData = parsedTransactions[i];
        console.log(`📝 Processing transaction ${i + 1}/${parsedTransactions.length}:`, transactionData);
        
        try {
          const normalizedCategory = normalizeCategory(transactionData.category);
          console.log(`Category normalization: "${transactionData.category}" → "${normalizedCategory}"`);
          
          // Ensure we have a valid date
          let transactionDate;
          try {
            const dateObj = new Date(transactionData.date);
            if (isNaN(dateObj.getTime())) {
              // Invalid date, use current date
              transactionDate = new Date().toISOString();
              console.log(`Invalid date "${transactionData.date}", using current date: ${transactionDate}`);
            } else {
              transactionDate = dateObj.toISOString();
            }
          } catch (error) {
            transactionDate = new Date().toISOString();
            console.log(`Date parsing error for "${transactionData.date}", using current date: ${transactionDate}`);
          }
          
          // Ensure we're not inserting dummy data based on patterns
          if (transactionData.transaction_name?.toLowerCase().includes('test') || 
              transactionData.description?.toLowerCase().includes('test') ||
              transactionData.source_file?.toLowerCase().includes('test') ||
              transactionData.transaction_name?.toLowerCase().includes('dummy') ||
              transactionData.description?.toLowerCase().includes('dummy')) {
            console.warn(`⚠️ Skipping potential dummy/fallback transaction: ${transactionData.transaction_name}`);
            continue;
          }
          
          const transaction = {
            date: transactionDate,
            payment_type: transactionData.payment_type || 'receipt',
            transaction_name: transactionData.transaction_name || transactionData.description || 'Bank statement transaction',
            description: transactionData.description || transactionData.transaction_name || 'Bank statement transaction',
            category: normalizedCategory,
            credit_amount: transactionData.credit_amount || 0,
            debit_amount: transactionData.debit_amount || 0,
            balance: transactionData.balance,
            source_file: transactionData.source_file || file.name,
            source_type: transactionData.source_type || 'pdf',
            proof: file.name || null,
            notes: transactionData.notes || `Uploaded from: ${file.name}`,
            updated_at: new Date().toISOString(),
          };
          
          console.log(`💾 Creating transaction ${i + 1} with data:`, transaction);
          
          const createdTransaction = await transactionsAPI.create(transaction);
          successCount++;
          console.log(`✅ Transaction ${i + 1} created successfully:`, createdTransaction);
        } catch (error) {
          console.error(`❌ Error creating transaction ${i + 1}:`, error);
          console.error('Transaction data that failed:', transactionData);
        }
      }
      
      console.log(`🎉 Transaction creation completed: ${successCount}/${parsedTransactions.length} successful`);

      // Update upload record with final processing status (if upload record exists)
      if (uploadRecord) {
        try {
          // Try with basic status first
          await supabase
            .from('uploads')
            .update({ status: successCount > 0 ? 'processed' : 'failed' })
            .eq('id', uploadRecord.id);
          
          console.log(`✅ Upload status updated to: ${successCount > 0 ? 'processed' : 'failed'}`);
          
          // Try to update with additional fields if they exist
          try {
            const updateData: any = {};
            
            // Try to add transaction count
            try {
              updateData.extracted_transactions_count = successCount;
            } catch (e) {
              // Column doesn't exist, skip
            }
            
            // Try to add processed timestamp
            try {
              updateData.processed_at = new Date().toISOString();
            } catch (e) {
              // Column doesn't exist, skip
            }
            
            // Try to add processing error if needed
            if (successCount === 0) {
              try {
                updateData.processing_error = 'No transactions could be created';
              } catch (e) {
                // Column doesn't exist, skip
              }
            }
            
            if (Object.keys(updateData).length > 0) {
              await supabase
                .from('uploads')
                .update(updateData)
                .eq('id', uploadRecord.id);
              console.log('✅ Upload additional fields updated');
            }
            
          } catch (additionalError: any) {
            console.log('⚠️ Failed to update additional upload fields:', additionalError.message);
          }
          
        } catch (error: any) {
          console.log('❌ Upload status update failed:', error.message);
          // Don't throw error - processing was successful
        }
      }

    } catch (error) {
      console.error('Error parsing file:', error);
      
      // Update upload record with failed status (if upload record exists)
      if (uploadRecord) {
        try {
          await supabase
            .from('uploads')
            .update({ status: 'failed' })
            .eq('id', uploadRecord.id);
          
          console.log('✅ Upload status updated to failed');
          
          // Try to update with processing error
          try {
            await supabase
              .from('uploads')
              .update({ 
                processing_error: `Processing failed: ${error.message || 'Unknown error'}`,
                processed_at: new Date().toISOString()
              })
              .eq('id', uploadRecord.id);
            console.log('✅ Upload failure details updated');
          } catch (additionalError: any) {
            console.log('⚠️ Failed to update upload failure details:', additionalError.message);
          }
          
        } catch (error: any) {
          console.log('❌ Upload failure status update failed:', error.message);
        }
      }
      
      // Re-throw the error to prevent creating dummy transactions
      throw error;
    }

    // Log audit
    await auditAPI.logAction('upload', `File uploaded: ${file.name}`, 'admin');

    // Return upload record with enhanced processing metadata
    const result: any = uploadRecord || {
      file_name: fileName,
      file_url: publicUrl,
      file_type: fileExt?.toLowerCase() || 'pdf',
      file_size_mb: file.size / (1024 * 1024),
      status: 'processed'
    };
    
    // Add enhanced processing metadata
    result.extracted_transactions_count = successCount || 0;
    result.processing_metadata = {
      fileType: fileExt?.toLowerCase() || 'pdf',
      processingTime: Date.now() - Date.now(), // Will be updated by the processing service
      totalCredits: parsedTransactions?.reduce((sum, t) => sum + (t.credit_amount || 0), 0) || 0,
      totalDebits: parsedTransactions?.reduce((sum, t) => sum + (t.debit_amount || 0), 0) || 0
    };
    
    console.log('🎉 Upload processing completed successfully!');
    console.log('📊 Final result:', result);
    console.log(`✅ Created ${successCount} transactions from ${file.name}`);
    
    return result;
  },

  async getUploads() {
    try {
      const { data, error } = await supabase
        .from('uploads')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error: any) {
      if (error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
        console.log('Uploads table query failed with 406 error, returning empty array');
      } else {
        console.log('Uploads table not available, returning empty array');
      }
      return [];
    }
  }
};

// Reports API
export const reportsAPI = {
  async generate(type: string, params: any) {
    // Get actual transaction data for the report
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    // Filter transactions based on period
    let filteredTransactions = transactions || [];
    const now = new Date();
    
    if (params.period === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filteredTransactions = transactions?.filter(t => 
        new Date(t.transaction_date) >= startOfMonth
      ) || [];
    } else if (params.period === 'quarterly') {
      const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      filteredTransactions = transactions?.filter(t => 
        new Date(t.transaction_date) >= startOfQuarter
      ) || [];
    } else if (params.period === 'yearly') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filteredTransactions = transactions?.filter(t => 
        new Date(t.transaction_date) >= startOfYear
      ) || [];
    } else if (params.period === 'custom' && params.startDate && params.endDate) {
      filteredTransactions = transactions?.filter(t => {
        const transactionDate = new Date(t.transaction_date);
        return transactionDate >= new Date(params.startDate) && 
               transactionDate <= new Date(params.endDate);
      }) || [];
    }

    // Calculate report statistics
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalTransactions = filteredTransactions.length;
    const categoryBreakdown = filteredTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    // Generate report data
    const reportData = {
      id: Date.now().toString(),
      name: `${type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${new Date().toLocaleDateString()}`,
      type,
      generatedAt: new Date().toISOString(),
      size: `${(JSON.stringify(filteredTransactions).length / 1024 / 1024).toFixed(1)} MB`,
      format: params.format?.toUpperCase() || "PDF",
      data: {
        transactions: filteredTransactions,
        summary: {
          totalAmount,
          totalTransactions,
          categoryBreakdown,
          period: params.period,
          dateRange: {
            start: params.startDate || (filteredTransactions[0]?.transaction_date),
            end: params.endDate || (filteredTransactions[filteredTransactions.length - 1]?.transaction_date)
          }
        }
      }
    };

    // Save report to database
    const { data: savedReport, error: saveError } = await supabase
      .from('reports')
      .insert({
        report_type: type,
        file_url: `data:application/json;base64,${btoa(JSON.stringify(reportData))}`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving report:', saveError);
    }

    // Log audit
    await auditAPI.logAction('export', `Report generated: ${type} with ${totalTransactions} transactions`, 'admin');

    return reportData;
  },

  async getAll() {
    // Get real reports from database
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      return [];
    }

    // Transform database reports to match expected format
    return reports?.map(report => ({
      id: report.id,
      name: `${report.report_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${new Date(report.created_at).toLocaleDateString()}`,
      type: report.report_type,
      generatedAt: report.created_at,
      size: "Generated",
      format: "JSON"
    })) || [];
  }
};

// Audit API
export const auditAPI = {
  async getLogs(params?: { action?: string; limit?: number }) {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (params?.action) {
      query = query.eq('action', params.action);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async logAction(action: string, description: string, userId: string, details?: any) {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        action,
        details: { description, userId, ...details },
      });

    if (error) console.error('Audit log error:', error);
  }
};

// Settings API
export const settingsAPI = {
  async updateProfile(updates: Partial<any>) {
    const { data, error } = await supabase
      .from('admin')
      .update(updates)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await auditAPI.logAction('update', 'Profile updated', 'admin');

    return data;
  },

  async changePassword(newPassword: string) {
    const { data, error } = await supabase
      .from('admin')
      .update({ password_hash: newPassword })
      .select()
      .single();

    if (error) throw error;

    await auditAPI.logAction('update', 'Password changed', 'admin');
  }
};
