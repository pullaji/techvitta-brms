import { supabase, User, Transaction, Upload, AuditLog } from '@/lib/supabase';
import { fileProcessorService } from './fileProcessor';
import { generateFileHash, checkFileHash } from '@/utils/fileHash';
import { insertTransactionsWithDeduplication, processTransactionsBatch } from '@/utils/transactionDeduplication';
import { excelColumnMapper } from './excelColumnMapper';

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
    } catch (error) {
      console.log('Uploads table not available, using defaults');
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
    
    // Check for duplicate file upload (with safe column check)
    try {
      const fileHashCheck = await checkFileHash(file);
      console.log('File hash:', fileHashCheck.hash);
      
      // Check if file with this hash already exists (only if file_hash column exists)
      try {
        const { data: existingUpload, error: hashCheckError } = await supabase
          .from('uploads')
          .select('id, file_name, status, extracted_transactions_count')
          .eq('file_hash', fileHashCheck.hash)
          .single();
        
        if (existingUpload && !hashCheckError) {
          console.log('⚠️ Duplicate file detected:', existingUpload);
          return {
            ...existingUpload,
            duplicate: true,
            message: `File already uploaded as "${existingUpload.file_name}" with ${existingUpload.extracted_transactions_count || 0} transactions extracted.`
          };
        }
      } catch (columnError: any) {
        // If file_hash column doesn't exist, skip duplicate check
        if (columnError.message?.includes('column "file_hash" does not exist')) {
          console.log('file_hash column not available, skipping duplicate check');
        } else {
          throw columnError;
        }
      }
    } catch (error) {
      console.log('File hash check failed, continuing with upload:', error);
    }
    
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
        // Use Excel column mapper for Excel files
        console.log('📊 Processing Excel file with column mapping...');
        
        const excelResult = await excelColumnMapper.processExcelFile(file);
        
        if (!excelResult.success) {
          throw new Error(excelResult.error || 'Excel processing failed');
        }
        
        console.log('✅ Excel processing completed:', {
          totalRows: excelResult.totalRows,
          processedRows: excelResult.processedRows,
          skippedRows: excelResult.skippedRows,
          columnMapping: excelResult.columnMapping
        });
        
        // Convert mapped transactions to your existing format
        parsedTransactions = excelResult.mappedTransactions.map(tx => ({
          date: tx.date,
          description: tx.description,
          credit_amount: tx.type === 'credit' ? tx.amount : 0,
          debit_amount: tx.type === 'debit' ? tx.amount : 0,
          balance: tx.balance,
          category: detectCategory(tx.description),
          payment_type: tx.payment_type || 'bank_transfer',
          transaction_name: tx.description,
          source_file: file.name,
          source_type: 'excel',
          account_no: tx.account_no,
          reference_id: tx.reference_id,
          confidence: tx.confidence,
          notes: `Excel import - ${tx.type} transaction`
        }));
        
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
          // Try with all fields first
          await supabase
            .from('uploads')
            .update({
              status: 'processing',
              extracted_transactions_count: parsedTransactions.length
            })
            .eq('id', uploadRecord.id);
        } catch (error: any) {
          console.log('Full upload update failed, trying fallback:', error.message);
          // Fallback: try without optional fields
          try {
            await supabase
              .from('uploads')
              .update({ status: 'processing' })
              .eq('id', uploadRecord.id);
          } catch (fallbackError: any) {
            console.log('Fallback upload update failed:', fallbackError.message);
            // Final fallback: try with minimal fields
            try {
              await supabase
                .from('uploads')
                .update({ status: 'processing' })
                .eq('id', uploadRecord.id);
            } catch (finalError: any) {
              console.log('All upload update attempts failed:', finalError.message);
            }
          }
        }
      }

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
          
          console.log('Creating transaction from parsed data:', transaction);
          
          await transactionsAPI.create(transaction);
          successCount++;
          console.log('Transaction created successfully from parsed data');
        } catch (error) {
          console.error('Error creating transaction from parsed data:', error);
        }
      }

      // Update upload record with final processing status (if upload record exists)
      if (uploadRecord) {
        try {
          // Try with all fields first
          await supabase
            .from('uploads')
            .update({
              status: successCount > 0 ? 'processed' : 'failed',
              extracted_transactions_count: successCount,
              processed_at: new Date().toISOString(),
              processing_error: successCount === 0 ? 'No transactions could be created' : null
            })
            .eq('id', uploadRecord.id);
        } catch (error: any) {
          console.log('Full final upload update failed, trying fallback:', error.message);
          // Fallback: try without optional fields
          try {
            await supabase
              .from('uploads')
              .update({
                status: successCount > 0 ? 'processed' : 'failed',
                extracted_transactions_count: successCount
              })
              .eq('id', uploadRecord.id);
          } catch (fallbackError: any) {
            console.log('Fallback final upload update failed:', fallbackError.message);
            // Final fallback: try with minimal fields
            try {
              await supabase
                .from('uploads')
                .update({
                  status: successCount > 0 ? 'processed' : 'failed'
                })
                .eq('id', uploadRecord.id);
            } catch (finalError: any) {
              console.log('All final upload update attempts failed:', finalError.message);
            }
          }
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
        
        // Update upload record with fallback processing status (if upload record exists)
        if (uploadRecord) {
          try {
            // Try with all fields first
            await supabase
              .from('uploads')
              .update({
                status: 'processed',
                extracted_transactions_count: 1,
                processed_at: new Date().toISOString(),
                processing_error: 'Used fallback processing due to parsing error'
              })
              .eq('id', uploadRecord.id);
          } catch (error: any) {
            console.log('Full fallback upload update failed, trying fallback:', error.message);
            // Fallback: try without optional fields
            try {
              await supabase
                .from('uploads')
                .update({
                  status: 'processed',
                  extracted_transactions_count: 1
                })
                .eq('id', uploadRecord.id);
            } catch (fallbackError: any) {
              console.log('Fallback fallback upload update failed:', fallbackError.message);
              // Final fallback: try with minimal fields
              try {
                await supabase
                  .from('uploads')
                  .update({ status: 'processed' })
                  .eq('id', uploadRecord.id);
              } catch (finalError: any) {
                console.log('All fallback upload update attempts failed:', finalError.message);
              }
            }
          }
        }
        
        console.log('Fallback transaction created successfully');
      } catch (fallbackError) {
        console.error('Error creating fallback transaction:', fallbackError);
        
        // Update upload record with failed status (if upload record exists)
        if (uploadRecord) {
          try {
            // Try with all fields first
            await supabase
              .from('uploads')
              .update({
                status: 'failed',
                extracted_transactions_count: 0,
                processed_at: new Date().toISOString(),
                processing_error: `Processing failed: ${fallbackError.message || 'Unknown error'}`
              })
              .eq('id', uploadRecord.id);
          } catch (error: any) {
            console.log('Full failed upload update failed, trying fallback:', error.message);
            // Fallback: try without optional fields
            try {
              await supabase
                .from('uploads')
                .update({
                  status: 'failed',
                  extracted_transactions_count: 0
                })
                .eq('id', uploadRecord.id);
            } catch (fallbackError: any) {
              console.log('Fallback failed upload update failed:', fallbackError.message);
              // Final fallback: try with minimal fields
              try {
                await supabase
                  .from('uploads')
                  .update({ status: 'failed' })
                  .eq('id', uploadRecord.id);
              } catch (finalError: any) {
                console.log('All failed upload update attempts failed:', finalError.message);
              }
            }
          }
        }
      }
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
    } catch (error) {
      console.log('Uploads table not available, returning empty array');
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
