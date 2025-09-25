// Transaction Deduplication Utility
// Prevents duplicate transactions from being inserted into the database

import { supabase } from '@/lib/supabase';

// Enhanced transaction interface for deduplication
export interface TransactionForDeduplication {
  date: string;
  payment_type: string;
  transaction_name: string;
  description: string;
  category: string;
  credit_amount: number;
  debit_amount: number;
  balance?: number;
  source_file: string;
  source_type: string;
  proof?: string;
  notes?: string;
}

// Normalize transaction text for comparison
export function normalizeTransactionText(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    // Remove reference numbers (like IMPS/1234, UPI/5678)
    .replace(/\b(imps|upi|neft|rtgs)\/\d+\b/gi, '')
    // Remove transaction IDs
    .replace(/\b\w+\d{4,}\b/g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Remove special characters except spaces
    .replace(/[^\w\s]/g, '')
    .trim();
}

// Check if two transactions are duplicates
export function areTransactionsDuplicate(
  transaction1: TransactionForDeduplication,
  transaction2: TransactionForDeduplication,
  tolerance: number = 0.01 // 1 cent tolerance for amounts
): {
  isDuplicate: boolean;
  confidence: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let confidence = 0;
  
  // Check date match (exact)
  if (transaction1.date === transaction2.date) {
    confidence += 25;
  } else {
    reasons.push('Dates differ');
  }
  
  // Check amount match (with tolerance)
  const amount1 = transaction1.credit_amount - transaction1.debit_amount;
  const amount2 = transaction2.credit_amount - transaction2.debit_amount;
  const amountDiff = Math.abs(amount1 - amount2);
  
  if (amountDiff <= tolerance) {
    confidence += 30;
  } else {
    reasons.push(`Amounts differ: ${amount1} vs ${amount2}`);
  }
  
  // Check transaction name similarity (normalized)
  const name1 = normalizeTransactionText(transaction1.transaction_name);
  const name2 = normalizeTransactionText(transaction2.transaction_name);
  
  if (name1 === name2) {
    confidence += 25;
  } else {
    // Check for partial match
    const nameSimilarity = calculateTextSimilarity(name1, name2);
    if (nameSimilarity > 0.8) {
      confidence += 20;
    } else {
      reasons.push(`Names differ: "${transaction1.transaction_name}" vs "${transaction2.transaction_name}"`);
    }
  }
  
  // Check payment type match
  if (transaction1.payment_type === transaction2.payment_type) {
    confidence += 10;
  } else {
    reasons.push('Payment types differ');
  }
  
  // Check category match
  if (transaction1.category === transaction2.category) {
    confidence += 10;
  } else {
    reasons.push('Categories differ');
  }
  
  return {
    isDuplicate: confidence >= 80, // 80% confidence threshold
    confidence,
    reasons
  };
}

// Calculate text similarity using Levenshtein distance
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  const len1 = text1.length;
  const len2 = text2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
  
  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = text1[i - 1] === text2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : (maxLen - matrix[len2][len1]) / maxLen;
}

// Check for existing transactions in database
export async function checkExistingTransactions(
  transactions: TransactionForDeduplication[]
): Promise<{
  duplicates: Array<{
    transaction: TransactionForDeduplication;
    existingId: string;
    confidence: number;
    reasons: string[];
  }>;
  unique: TransactionForDeduplication[];
}> {
  const duplicates: Array<{
    transaction: TransactionForDeduplication;
    existingId: string;
    confidence: number;
    reasons: string[];
  }> = [];
  const unique: TransactionForDeduplication[] = [];
  
  for (const transaction of transactions) {
    try {
      // Query for potential duplicates
      const { data: existingTransactions, error } = await supabase
        .from('transactions')
        .select('id, date, payment_type, transaction_name, description, category, credit_amount, debit_amount')
        .eq('date', transaction.date)
        .eq('payment_type', transaction.payment_type);
      
      if (error) {
        console.error('Error checking existing transactions:', error);
        // If we can't check, assume it's unique to be safe
        unique.push(transaction);
        continue;
      }
      
      let isDuplicate = false;
      let bestMatch: any = null;
      let bestConfidence = 0;
      let bestReasons: string[] = [];
      
      // Check against each existing transaction
      for (const existing of existingTransactions || []) {
        const comparison = areTransactionsDuplicate(transaction, existing);
        
        if (comparison.isDuplicate && comparison.confidence > bestConfidence) {
          isDuplicate = true;
          bestMatch = existing;
          bestConfidence = comparison.confidence;
          bestReasons = comparison.reasons;
        }
      }
      
      if (isDuplicate && bestMatch) {
        duplicates.push({
          transaction,
          existingId: bestMatch.id,
          confidence: bestConfidence,
          reasons: bestReasons
        });
      } else {
        unique.push(transaction);
      }
      
    } catch (error) {
      console.error('Error processing transaction for duplicates:', error);
      // If there's an error, assume it's unique to be safe
      unique.push(transaction);
    }
  }
  
  return { duplicates, unique };
}

// Insert transactions with duplicate prevention
export async function insertTransactionsWithDeduplication(
  transactions: TransactionForDeduplication[]
): Promise<{
  inserted: number;
  duplicates: number;
  errors: string[];
}> {
  const result = {
    inserted: 0,
    duplicates: 0,
    errors: [] as string[]
  };
  
  try {
    // Check for existing transactions
    const { duplicates, unique } = await checkExistingTransactions(transactions);
    
    result.duplicates = duplicates.length;
    
    // Log duplicates found
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate transactions:`);
      duplicates.forEach((dup, index) => {
        console.log(`Duplicate ${index + 1}:`, {
          transaction: dup.transaction.transaction_name,
          existingId: dup.existingId,
          confidence: `${Math.round(dup.confidence)}%`,
          reasons: dup.reasons
        });
      });
    }
    
    // Insert unique transactions
    if (unique.length > 0) {
      const { data, error } = await supabase
        .from('transactions')
        .insert(unique)
        .select('id');
      
      if (error) {
        result.errors.push(`Database insertion error: ${error.message}`);
        console.error('Error inserting unique transactions:', error);
      } else {
        result.inserted = data?.length || 0;
        console.log(`Successfully inserted ${result.inserted} unique transactions`);
      }
    }
    
  } catch (error: any) {
    result.errors.push(`Processing error: ${error.message}`);
    console.error('Error in deduplication process:', error);
  }
  
  return result;
}

// Batch processing with deduplication
export async function processTransactionsBatch(
  transactions: TransactionForDeduplication[],
  batchSize: number = 50
): Promise<{
  totalProcessed: number;
  inserted: number;
  duplicates: number;
  errors: string[];
}> {
  const result = {
    totalProcessed: transactions.length,
    inserted: 0,
    duplicates: 0,
    errors: [] as string[]
  };
  
  // Process in batches
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    
    try {
      const batchResult = await insertTransactionsWithDeduplication(batch);
      
      result.inserted += batchResult.inserted;
      result.duplicates += batchResult.duplicates;
      result.errors.push(...batchResult.errors);
      
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}: ${batchResult.inserted} inserted, ${batchResult.duplicates} duplicates`);
      
    } catch (error: any) {
      result.errors.push(`Batch processing error: ${error.message}`);
      console.error('Error processing batch:', error);
    }
  }
  
  return result;
}
