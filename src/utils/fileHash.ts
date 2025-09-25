// File Hashing Utility
// Generates unique identifiers for uploaded files to prevent duplicate processing

// Generate MD5 hash for a file
export async function generateFileHash(file: File): Promise<string> {
  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Convert to Uint8Array for hashing
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Use Web Crypto API for hashing
    const hashBuffer = await crypto.subtle.digest('SHA-256', uint8Array);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('Error generating file hash:', error);
    throw new Error('Failed to generate file hash');
  }
}

// Generate a simpler hash based on file properties (fallback)
export function generateSimpleHash(file: File): string {
  const properties = [
    file.name,
    file.size.toString(),
    file.type,
    file.lastModified.toString()
  ].join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < properties.length; i++) {
    const char = properties.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
}

// Check if file has been processed before
export async function checkFileHash(file: File): Promise<{
  isDuplicate: boolean;
  hash: string;
  existingUpload?: any;
}> {
  try {
    const hash = await generateFileHash(file);
    
    // Check against stored hashes (you'll need to implement this with your database)
    // For now, return the hash
    return {
      isDuplicate: false, // Will be implemented with database check
      hash
    };
  } catch (error) {
    console.error('Error checking file hash:', error);
    // Fallback to simple hash
    const simpleHash = generateSimpleHash(file);
    return {
      isDuplicate: false,
      hash: simpleHash
    };
  }
}

// File metadata for duplicate detection
export interface FileMetadata {
  hash: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadDate: string;
  processedAt?: string;
  transactionCount?: number;
}

// Compare files for similarity
export function compareFiles(file1: FileMetadata, file2: FileMetadata): {
  isDuplicate: boolean;
  similarity: number;
  differences: string[];
} {
  const differences: string[] = [];
  let similarity = 0;
  
  // Check exact hash match
  if (file1.hash === file2.hash) {
    return {
      isDuplicate: true,
      similarity: 100,
      differences: []
    };
  }
  
  // Check file name similarity
  if (file1.fileName === file2.fileName) {
    similarity += 30;
  } else {
    differences.push(`File names differ: "${file1.fileName}" vs "${file2.fileName}"`);
  }
  
  // Check file size similarity
  const sizeDiff = Math.abs(file1.fileSize - file2.fileSize);
  const sizeSimilarity = Math.max(0, 100 - (sizeDiff / file1.fileSize) * 100);
  similarity += sizeSimilarity * 0.3;
  
  if (sizeDiff > 0) {
    differences.push(`File sizes differ: ${file1.fileSize} vs ${file2.fileSize} bytes`);
  }
  
  // Check file type
  if (file1.fileType === file2.fileType) {
    similarity += 20;
  } else {
    differences.push(`File types differ: "${file1.fileType}" vs "${file2.fileType}"`);
  }
  
  // Check upload date proximity (same day)
  const date1 = new Date(file1.uploadDate);
  const date2 = new Date(file2.uploadDate);
  const dayDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
  
  if (dayDiff < 1) {
    similarity += 20;
  } else {
    differences.push(`Upload dates differ: ${file1.uploadDate} vs ${file2.uploadDate}`);
  }
  
  return {
    isDuplicate: similarity >= 80, // 80% similarity threshold
    similarity,
    differences
  };
}
