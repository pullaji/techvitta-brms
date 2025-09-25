// Duplicate detection utilities for transactions

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  credit_amount?: number;
  debit_amount?: number;
  category: string;
  payment_type: string;
  transaction_name: string;
}

export interface DuplicateMatch {
  originalTransaction: Transaction;
  duplicateTransaction: Transaction;
  similarityScore: number;
  matchType: 'exact' | 'fuzzy' | 'similar';
  reasons: string[];
}

// Calculate similarity between two strings using Levenshtein distance
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Normalize amount for comparison (handle both positive and negative amounts)
function normalizeAmount(transaction: Transaction): number {
  if (transaction.credit_amount && transaction.credit_amount > 0) {
    return transaction.credit_amount;
  }
  if (transaction.debit_amount && transaction.debit_amount > 0) {
    return -transaction.debit_amount;
  }
  return transaction.amount || 0;
}

// Check if two dates are within a certain range (in days)
function areDatesClose(date1: string, date2: string, maxDaysDiff: number = 1): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d1.getTime() - d2.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= maxDaysDiff;
}

// Detect exact duplicates
function detectExactDuplicates(transactions: Transaction[]): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = [];
  const seen = new Set<string>();
  
  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const t1 = transactions[i];
      const t2 = transactions[j];
      
      // Create a unique key for exact matching
      const key1 = `${t1.date}-${normalizeAmount(t1)}-${t1.transaction_name.toLowerCase()}`;
      const key2 = `${t2.date}-${normalizeAmount(t2)}-${t2.transaction_name.toLowerCase()}`;
      
      if (key1 === key2 && !seen.has(key1)) {
        seen.add(key1);
        duplicates.push({
          originalTransaction: t1,
          duplicateTransaction: t2,
          similarityScore: 1.0,
          matchType: 'exact',
          reasons: ['Same date, amount, and transaction name']
        });
      }
    }
  }
  
  return duplicates;
}

// Detect fuzzy duplicates
function detectFuzzyDuplicates(transactions: Transaction[], threshold: number = 0.8): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = [];
  
  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const t1 = transactions[i];
      const t2 = transactions[j];
      
      // Skip if already detected as exact duplicate
      if (t1.id === t2.id) continue;
      
      const reasons: string[] = [];
      let similarityScore = 0;
      let matchCount = 0;
      
      // Check amount similarity (exact match required for fuzzy detection)
      const amount1 = normalizeAmount(t1);
      const amount2 = normalizeAmount(t2);
      if (amount1 === amount2) {
        similarityScore += 0.4;
        matchCount++;
        reasons.push('Same amount');
      }
      
      // Check date proximity
      if (areDatesClose(t1.date, t2.date, 3)) {
        similarityScore += 0.3;
        matchCount++;
        reasons.push('Similar date');
      }
      
      // Check description similarity
      const descSimilarity = calculateStringSimilarity(
        t1.transaction_name.toLowerCase(),
        t2.transaction_name.toLowerCase()
      );
      if (descSimilarity > 0.7) {
        similarityScore += descSimilarity * 0.3;
        matchCount++;
        reasons.push('Similar description');
      }
      
      // Check category match
      if (t1.category === t2.category) {
        similarityScore += 0.1;
        matchCount++;
        reasons.push('Same category');
      }
      
      // Check payment type match
      if (t1.payment_type === t2.payment_type) {
        similarityScore += 0.1;
        matchCount++;
        reasons.push('Same payment type');
      }
      
      if (similarityScore >= threshold && matchCount >= 2) {
        duplicates.push({
          originalTransaction: t1,
          duplicateTransaction: t2,
          similarityScore,
          matchType: 'fuzzy',
          reasons
        });
      }
    }
  }
  
  return duplicates;
}

// Main duplicate detection function
export function detectDuplicates(transactions: Transaction[]): {
  exactDuplicates: DuplicateMatch[];
  fuzzyDuplicates: DuplicateMatch[];
  allDuplicates: DuplicateMatch[];
  summary: {
    totalDuplicates: number;
    exactCount: number;
    fuzzyCount: number;
    potentialSavings: number;
  };
} {
  // Detect exact duplicates
  const exactDuplicates = detectExactDuplicates(transactions);
  
  // Detect fuzzy duplicates (excluding exact duplicates)
  const nonExactTransactions = transactions.filter(t => 
    !exactDuplicates.some(d => d.originalTransaction.id === t.id || d.duplicateTransaction.id === t.id)
  );
  const fuzzyDuplicates = detectFuzzyDuplicates(nonExactTransactions);
  
  const allDuplicates = [...exactDuplicates, ...fuzzyDuplicates];
  
  // Calculate potential savings (sum of duplicate amounts)
  const potentialSavings = allDuplicates.reduce((sum, duplicate) => {
    const amount = Math.abs(normalizeAmount(duplicate.duplicateTransaction));
    return sum + amount;
  }, 0);
  
  return {
    exactDuplicates,
    fuzzyDuplicates,
    allDuplicates,
    summary: {
      totalDuplicates: allDuplicates.length,
      exactCount: exactDuplicates.length,
      fuzzyCount: fuzzyDuplicates.length,
      potentialSavings
    }
  };
}

// Get duplicate statistics for a transaction
export function getTransactionDuplicateInfo(transactionId: string, duplicates: DuplicateMatch[]): {
  isDuplicate: boolean;
  duplicateOf?: Transaction;
  matchType?: 'exact' | 'fuzzy';
  similarityScore?: number;
} {
  const duplicate = duplicates.find(d => 
    d.originalTransaction.id === transactionId || d.duplicateTransaction.id === transactionId
  );
  
  if (!duplicate) {
    return { isDuplicate: false };
  }
  
  const isOriginal = duplicate.originalTransaction.id === transactionId;
  
  return {
    isDuplicate: true,
    duplicateOf: isOriginal ? duplicate.duplicateTransaction : duplicate.originalTransaction,
    matchType: duplicate.matchType,
    similarityScore: duplicate.similarityScore
  };
}

// Remove duplicates from transaction list
export function removeDuplicates(transactions: Transaction[], duplicates: DuplicateMatch[]): Transaction[] {
  const duplicateIds = new Set<string>();
  
  // Mark all duplicate transactions for removal (keep the first occurrence)
  duplicates.forEach(duplicate => {
    duplicateIds.add(duplicate.duplicateTransaction.id);
  });
  
  return transactions.filter(transaction => !duplicateIds.has(transaction.id));
}
