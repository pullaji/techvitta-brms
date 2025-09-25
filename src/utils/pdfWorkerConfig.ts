// PDF.js Worker Configuration Utility
// This utility ensures PDF.js worker is properly configured for different environments

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min?url';

// Configure PDF.js worker
export function configurePDFWorker() {
  try {
    // Check if worker is already configured
    if (pdfjsLib.GlobalWorkerOptions.workerSrc) {
      console.log('PDF.js worker already configured:', pdfjsLib.GlobalWorkerOptions.workerSrc);
      return;
    }

    // Try to use the bundled worker first, then fallback to CDN
    let workerSrc: string;
    
    try {
      // Use bundled worker if available (for Vite/React)
      workerSrc = pdfWorker;
      console.log('Using bundled PDF.js worker:', workerSrc);
    } catch (error) {
      // Fallback to CDN worker
      workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      console.log('Using CDN PDF.js worker:', workerSrc);
    }
    
    // Set the worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    
    console.log('PDF.js worker configured:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    console.log('PDF.js version:', pdfjsLib.version);
    
    // Verify the worker is accessible (only for CDN workers)
    if (workerSrc.startsWith('http')) {
      fetch(workerSrc, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            console.log('PDF.js worker is accessible');
          } else {
            console.warn('PDF.js worker might not be accessible:', response.status);
          }
        })
        .catch(error => {
          console.warn('Could not verify PDF.js worker accessibility:', error);
        });
    }
    
  } catch (error) {
    console.error('Error configuring PDF.js worker:', error);
    throw new Error('Failed to configure PDF.js worker');
  }
}

// Initialize PDF.js with proper configuration
export async function initializePDFJS(): Promise<void> {
  try {
    configurePDFWorker();
    
    // Test PDF.js functionality
    console.log('PDF.js initialized successfully');
    console.log('Available PDF.js features:', {
      version: pdfjsLib.version,
      workerSrc: pdfjsLib.GlobalWorkerOptions.workerSrc,
      isSupported: pdfjsLib.GlobalWorkerOptions.workerSrc !== null
    });
    
  } catch (error) {
    console.error('Failed to initialize PDF.js:', error);
    throw new Error('PDF.js initialization failed');
  }
}

// Test PDF.js functionality with a simple operation
export async function testPDFJS(): Promise<boolean> {
  try {
    // Create a simple test PDF document
    const testData = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3
    ]);
    
    // Try to load the test document
    const loadingTask = pdfjsLib.getDocument({ data: testData });
    await loadingTask.promise;
    
    console.log('PDF.js test successful');
    return true;
    
  } catch (error) {
    console.error('PDF.js test failed:', error);
    return false;
  }
}

// Get PDF.js configuration info
export function getPDFJSInfo() {
  return {
    version: pdfjsLib.version,
    workerSrc: pdfjsLib.GlobalWorkerOptions.workerSrc,
    isConfigured: !!pdfjsLib.GlobalWorkerOptions.workerSrc
  };
}

// Error handling for PDF.js operations
export function handlePDFJSError(error: any): string {
  if (error.name === 'InvalidPDFException') {
    return 'The PDF file is corrupted or invalid. Please try a different file.';
  }
  
  if (error.name === 'MissingPDFException') {
    return 'The PDF file is missing or could not be loaded.';
  }
  
  if (error.name === 'UnexpectedResponseException') {
    return 'Unexpected response from PDF server. The file might be corrupted.';
  }
  
  if (error.message?.includes('worker')) {
    return 'PDF.js worker is not properly configured. Please refresh the page and try again.';
  }
  
  if (error.message?.includes('password')) {
    return 'The PDF file is password-protected. Please remove the password and try again.';
  }
  
  return `PDF processing error: ${error.message || 'Unknown error'}`;
}

// Initialize PDF.js when the module is imported
if (typeof window !== 'undefined') {
  // Only initialize in browser environment
  initializePDFJS().catch(error => {
    console.warn('PDF.js initialization failed:', error);
  });
}
