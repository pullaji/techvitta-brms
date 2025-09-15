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
      .order('transaction_date', { ascending: false });

    if (params?.category) {
      query = query.eq('category', params.category);
    }
    if (params?.transaction_type) {
      query = query.eq('transaction_type', params.transaction_type);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.startDate) {
      query = query.gte('transaction_date', params.startDate);
    }
    if (params?.endDate) {
      query = query.lte('transaction_date', params.endDate);
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
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await auditAPI.logAction('create', `Transaction created: ${transaction.amount}`, 'admin');

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

// Upload API
export const uploadAPI = {
  async uploadFile(file: File, metadata: {
    fileType: string;
    category?: string;
    amount?: number;
    date?: string;
    notes?: string;
  }) {
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
        file_type: metadata.fileType as any,
        file_size_mb: file.size / (1024 * 1024),
        status: 'uploaded',
      })
      .select()
      .single();

    if (recordError) throw recordError;

    // If it's a receipt, create a transaction
    if (metadata.fileType === 'receipt' && metadata.amount && metadata.date) {
      await transactionsAPI.create({
        amount: metadata.amount,
        transaction_type: 'receipt',
        category: metadata.category || 'business_expense',
        status: 'pending',
        notes: metadata.notes,
        transaction_date: metadata.date,
      });
    }

    // Log audit
    await auditAPI.logAction('upload', `File uploaded: ${file.name}`, 'admin');

    return uploadRecord;
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
    // This would typically generate a report and return a download URL
    // For now, we'll return mock data
    const reportData = {
      id: Date.now().toString(),
      name: `${type} Report - ${new Date().toLocaleDateString()}`,
      type,
      generatedAt: new Date().toISOString(),
      size: "2.4 MB",
      format: "PDF",
    };

    // Log audit
    await auditAPI.logAction('export', `Report generated: ${type}`, 'admin');

    return reportData;
  },

  async getAll() {
    // Return mock recent reports
    return [
      {
        id: 1,
        name: "Q1 2024 Tax Summary",
        type: "tax_summary",
        generatedAt: "2024-04-01",
        size: "2.4 MB",
        format: "PDF",
      },
      {
        id: 2,
        name: "March 2024 Expenses",
        type: "monthly_expense",
        generatedAt: "2024-03-31",
        size: "1.8 MB",
        format: "Excel",
      },
    ];
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
