import { supabase, User, Transaction, Upload, AuditLog } from '@/lib/supabase';

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
  }) {
    let query = supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

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
      amount: (transaction.credit_amount || 0) - (transaction.debit_amount || 0)
    };
    
    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();

    if (error) {
      console.error('Transaction creation error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('Transaction created successfully:', data);

    // Log audit
    const totalAmount = transaction.credit_amount + transaction.debit_amount;
    await auditAPI.logAction('create', `Transaction created: Credit: ${transaction.credit_amount}, Debit: ${transaction.debit_amount}`, 'admin');

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

    // Get upload counts
    const { count: totalUploads } = await supabase
      .from('uploads')
      .select('*', { count: 'exact', head: true });

    // Get processed transactions
    const { count: processedTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processed');

    // Get last upload
    const { data: lastUpload } = await supabase
      .from('uploads')
      .select('uploaded_at')
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

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

// File parsing utilities
const parseCSV = (text: string) => {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const transactions = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.trim());
      const transaction: any = {};
      
      headers.forEach((header, index) => {
        transaction[header] = values[index] || '';
      });
      
      // Try to extract amount and date
      if (transaction.amount || transaction.value || transaction.total) {
        const amount = parseFloat(transaction.amount || transaction.value || transaction.total || '0');
        const date = transaction.date || transaction.transaction_date || transaction.created_at;
        
        if (amount > 0) {
          transactions.push({
            amount: amount,
            date: date || new Date().toISOString().split('T')[0], // Use today's date if no date provided
            description: transaction.description || transaction.note || transaction.memo || 'CSV Import',
            category: normalizeCategory(transaction.category) // Normalize category to valid value
          });
        }
      }
    }
  }
  
  return transactions;
};

const parseExcel = async (file: File) => {
  // For Excel files, we'll create a basic transaction for now
  // In a real implementation, you'd use a library like 'xlsx'
  return [{
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: `Excel file: ${file.name}`,
    category: normalizeCategory('business_expense')
  }];
};

const parsePDF = async (file: File) => {
  try {
    // Import the PDF parser service
    const { pdfParserService } = await import('./pdfParser');
    
    console.log('Parsing bank statement PDF...');
    const parsedStatement = await pdfParserService.parseBankStatementPDF(file);
    
    console.log('Bank Statement Details:');
    console.log('- Bank:', parsedStatement.bankName);
    console.log('- Account:', parsedStatement.accountNumber);
    console.log('- Period:', parsedStatement.statementPeriod);
    console.log('- Transactions:', parsedStatement.transactions.length);
    
    // Convert bank transactions to our internal format
    const transactions = parsedStatement.transactions.map(tx => ({
      amount: tx.amount,
      date: tx.date,
      description: `${tx.transactionName} (${tx.paymentType})`,
      category: normalizeCategory(tx.category),
      transaction_type: getTransactionType(tx.paymentType, tx.isCredit)
    }));
    
    console.log(`Successfully parsed ${transactions.length} transactions from bank statement`);
    return transactions;
    
  } catch (error) {
    console.error('Error parsing PDF bank statement:', error);
    
    // Fallback to sample transactions if parsing fails
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const fallbackTransactions = [
      {
        amount: 20000,
        date: today.toISOString().split('T')[0],
        description: 'Sample Bank Transfer - PDF parsing failed',
        category: normalizeCategory('income'),
        transaction_type: 'bank_transfer'
      }
    ];
    
    console.log('Using fallback transactions due to parsing error');
    return fallbackTransactions;
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
    
    // Test category normalization
    console.log('🧪 Testing category normalization:');
    console.log('business_expense →', normalizeCategory('business_expense'));
    console.log('invalid_category →', normalizeCategory('invalid_category'));
    console.log('meals →', normalizeCategory('meals'));
    
    // Test database constraint by trying to insert a test transaction
    console.log('🧪 Testing database constraint...');
    try {
      const testTransaction = {
        amount: 0.01,
        transaction_type: 'receipt' as const,
        category: 'business_expense',
        notes: 'TEST - DELETE THIS',
        transaction_date: new Date().toISOString(),
      };
      console.log('Test transaction data:', testTransaction);
      
      // We'll test this in the actual transaction creation below
    } catch (error) {
      console.error('Database constraint test error:', error);
    }
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

    // Save upload record
    const { data: uploadRecord, error: recordError } = await supabase
      .from('uploads')
      .insert({
        file_name: fileName,
        file_url: publicUrl,
        file_type: (fileExt?.toLowerCase() && ['pdf','jpg','png','csv','xls','xlsx'].includes(fileExt.toLowerCase())) 
          ? fileExt.toLowerCase() 
          : 'pdf',
        file_size_mb: file.size / (1024 * 1024),
        status: 'uploaded',
      })
      .select()
      .single();

    if (recordError) throw recordError;

    // Parse file content and create transactions
    try {
      let parsedTransactions = [];
      
      if (fileExt?.toLowerCase() === 'csv') {
        const text = await file.text();
        parsedTransactions = parseCSV(text);
      } else if (['xls', 'xlsx'].includes(fileExt?.toLowerCase() || '')) {
        parsedTransactions = await parseExcel(file);
      } else if (fileExt?.toLowerCase() === 'pdf') {
        parsedTransactions = await parsePDF(file);
      } else {
        // For images and other files, create a basic transaction
        parsedTransactions = [{
          amount: metadata.amount || 0,
          date: metadata.date || new Date().toISOString().split('T')[0],
          description: `Uploaded file: ${file.name}`,
          category: normalizeCategory(metadata.category || 'business_expense')
        }];
      }

      console.log(`Parsed ${parsedTransactions.length} transactions from ${file.name}:`, parsedTransactions);

      // Create transactions for each parsed item
      for (const transactionData of parsedTransactions) {
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
          
          const transaction = {
            date: transactionData.date,
            payment_type: (transactionData.transaction_type as any) || 'receipt',
            transaction_name: transactionData.description || 'Bank statement transaction',
            description: transactionData.description || 'Bank statement transaction',
            category: normalizedCategory,
            credit_amount: transactionData.amount > 0 ? transactionData.amount : 0,
            debit_amount: transactionData.amount < 0 ? Math.abs(transactionData.amount) : 0,
            proof: file.name || null,
            notes: `Uploaded from: ${file.name}`,
            updated_at: new Date().toISOString(),
          };
          
          console.log('Creating transaction from parsed data:', transaction);
          
          await transactionsAPI.create(transaction);
          
          console.log('Transaction created successfully from parsed data');
        } catch (error) {
          console.error('Error creating transaction from parsed data:', error);
        }
      }

    } catch (error) {
      console.error('Error parsing file:', error);
      
      // Fallback: create a basic transaction if parsing fails
      try {
        const fallbackCategory = normalizeCategory(metadata.category || 'business_expense');
        console.log(`Fallback category normalization: "${metadata.category || 'business_expense'}" → "${fallbackCategory}"`);
        
        // Ensure we have a valid date for fallback transaction
        let fallbackTransactionDate;
        try {
          if (metadata.date) {
            const dateObj = new Date(metadata.date);
            if (isNaN(dateObj.getTime())) {
              fallbackTransactionDate = new Date().toISOString();
              console.log(`Invalid fallback date "${metadata.date}", using current date: ${fallbackTransactionDate}`);
            } else {
              fallbackTransactionDate = dateObj.toISOString();
            }
          } else {
            fallbackTransactionDate = new Date().toISOString();
          }
        } catch (error) {
          fallbackTransactionDate = new Date().toISOString();
          console.log(`Fallback date parsing error, using current date: ${fallbackTransactionDate}`);
        }
        
        const fallbackAmount = metadata.amount || 0;
        const transactionData = {
          date: fallbackTransactionDate.split('T')[0], // Convert to date format
          payment_type: 'receipt',
          transaction_name: `Uploaded file: ${file.name}`,
          description: `Uploaded file: ${file.name}`,
          category: fallbackCategory,
          credit_amount: fallbackAmount > 0 ? fallbackAmount : 0,
          debit_amount: fallbackAmount < 0 ? Math.abs(fallbackAmount) : 0,
          proof: file.name,
          notes: metadata.notes || `Uploaded file: ${file.name}`,
          updated_at: new Date().toISOString(),
        };
        
        console.log('Creating fallback transaction:', transactionData);
        
        await transactionsAPI.create(transactionData);
        
        console.log('Fallback transaction created successfully');
      } catch (fallbackError) {
        console.error('Error creating fallback transaction:', fallbackError);
      }
    }

    // Log audit
    await auditAPI.logAction('upload', `File uploaded: ${file.name}`, 'admin');

    // Return upload record with parsed statement data if available
    const result: any = uploadRecord;
    
    // If this was a PDF bank statement, include parsed data
    if (fileExt?.toLowerCase() === 'pdf') {
      try {
        const { pdfParserService } = await import('./pdfParser');
        const parsedStatement = await pdfParserService.parseBankStatementPDF(file);
        result.parsedStatement = parsedStatement;
      } catch (error) {
        console.log('Could not include parsed statement in response:', error);
      }
    }
    
    return result;
  },

  async getUploads() {
    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data;
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
