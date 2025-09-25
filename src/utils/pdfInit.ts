// PDF.js Initialization Utility
// Simple and direct PDF.js worker configuration

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min?url';

// Initialize PDF.js with worker configuration
export function initPDFJS() {
  console.log('Initializing PDF.js...');
  
  // Set worker source using local bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  
  console.log('PDF.js worker configured:', pdfjsLib.GlobalWorkerOptions.workerSrc);
  console.log('PDF.js version:', pdfjsLib.version);
  
  return pdfjsLib;
}

// Test PDF.js functionality
export async function testPDFJS(): Promise<boolean> {
  try {
    const pdfjs = initPDFJS();
    
    // Create a simple test PDF data
    const testPDFData = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3
    ]);
    
    // Try to load the test document
    const loadingTask = pdfjs.getDocument({ data: testPDFData });
    await loadingTask.promise;
    
    console.log('PDF.js test successful');
    return true;
  } catch (error) {
    console.error('PDF.js test failed:', error);
    return false;
  }
}

// Initialize PDF.js when module is imported
if (typeof window !== 'undefined') {
  initPDFJS();
}
