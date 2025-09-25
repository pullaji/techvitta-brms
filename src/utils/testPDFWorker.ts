// Test PDF.js Worker Configuration
// This utility tests if PDF.js worker is properly configured

import { initPDFJS } from './pdfInit';

export async function testPDFWorker(): Promise<boolean> {
  try {
    console.log('🧪 Testing PDF.js worker configuration...');
    
    // Initialize PDF.js
    const pdfjs = initPDFJS();
    
    console.log('PDF.js worker source:', pdfjs.GlobalWorkerOptions.workerSrc);
    console.log('PDF.js version:', pdfjs.version);
    
    // Create a minimal valid PDF for testing
    const testPDFData = new Uint8Array([
      // PDF header
      0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A,
      // Minimal PDF content
      0x31, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A, 0x3C, 0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65, 0x2F, 0x43, 0x61, 0x74, 0x61, 0x6C, 0x6F, 0x67, 0x3E, 0x3E, 0x0A,
      0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A,
      0x78, 0x72, 0x65, 0x66, 0x0A, 0x30, 0x20, 0x31, 0x0A, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x36, 0x35, 0x35, 0x33, 0x35, 0x20, 0x66, 0x0A,
      0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6E, 0x0A,
      0x74, 0x72, 0x61, 0x69, 0x6C, 0x65, 0x72, 0x0A, 0x3C, 0x3C, 0x2F, 0x53, 0x69, 0x7A, 0x65, 0x20, 0x31, 0x3E, 0x3E, 0x0A,
      0x73, 0x74, 0x61, 0x72, 0x74, 0x78, 0x72, 0x65, 0x66, 0x0A, 0x30, 0x0A,
      0x25, 0x25, 0x45, 0x4F, 0x46
    ]);
    
    // Try to load the test PDF
    const loadingTask = pdfjs.getDocument({ data: testPDFData });
    const pdf = await loadingTask.promise;
    
    console.log('✅ PDF.js worker test successful!');
    console.log('PDF loaded successfully, pages:', pdf.numPages);
    
    return true;
    
  } catch (error) {
    console.error('❌ PDF.js worker test failed:', error);
    console.error('Error details:', error);
    
    return false;
  }
}

// Test worker accessibility
export async function testWorkerAccessibility(): Promise<boolean> {
  try {
    const pdfjs = initPDFJS();
    const workerSrc = pdfjs.GlobalWorkerOptions.workerSrc;
    
    if (!workerSrc) {
      console.error('❌ Worker source not configured');
      return false;
    }
    
    console.log('🔍 Testing worker accessibility:', workerSrc);
    
    // For local bundled workers, we don't need to test HTTP accessibility
    if (workerSrc.startsWith('/') || workerSrc.startsWith('./') || workerSrc.startsWith('blob:')) {
      console.log('✅ Local bundled worker detected');
      return true;
    }
    
    // For external workers, test accessibility
    const response = await fetch(workerSrc, { method: 'HEAD' });
    
    if (response.ok) {
      console.log('✅ Worker is accessible');
      return true;
    } else {
      console.error('❌ Worker not accessible, status:', response.status);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Worker accessibility test failed:', error);
    return false;
  }
}

// Run all tests
export async function runAllPDFTests(): Promise<{
  workerTest: boolean;
  accessibilityTest: boolean;
  overallSuccess: boolean;
}> {
  console.log('🚀 Running all PDF.js tests...');
  
  const workerTest = await testPDFWorker();
  const accessibilityTest = await testWorkerAccessibility();
  
  const overallSuccess = workerTest && accessibilityTest;
  
  console.log('📊 Test Results:');
  console.log('- Worker Test:', workerTest ? '✅ PASS' : '❌ FAIL');
  console.log('- Accessibility Test:', accessibilityTest ? '✅ PASS' : '❌ FAIL');
  console.log('- Overall:', overallSuccess ? '✅ SUCCESS' : '❌ FAILURE');
  
  return {
    workerTest,
    accessibilityTest,
    overallSuccess
  };
}
