import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database types
export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  organization?: string;
  role: 'admin' | 'user';
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  // Bank Statement Columns (from your image)
  date: string;
  payment_type: string;
  transaction_name: string;
  description?: string;
  category: string;
  
  // Separate Credit and Debit columns as requested
  credit_amount: number;  // Positive amounts go here
  debit_amount: number;   // Negative amounts go here
  balance?: number;       // Running balance after transaction
  
  // File processing fields
  source_file?: string;   // Original file name
  source_type?: string;   // File type (pdf, excel, csv, etc.)
  
  proof?: string;
  
  // System fields
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Upload {
  id: string;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_type: 'bank_statement' | 'receipt' | 'upi_proof' | 'other';
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  user_id: string;
  processed_data?: any;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  action: 'create' | 'update' | 'delete' | 'upload' | 'download' | 'export' | 'login' | 'logout';
  description: string;
  details?: string;
  user_id: string;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failed' | 'pending';
  created_at: string;
}
