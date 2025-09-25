// PDF Debugger Component
// This component helps debug PDF.js worker issues

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { runAllPDFTests } from '@/utils/testPDFWorker';
import { initPDFJS } from '@/utils/pdfInit';

export function PDFDebugger() {
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const results = await runAllPDFTests();
      setTestResults(results);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  const reinitializePDF = () => {
    try {
      initPDFJS();
      console.log('PDF.js reinitialized');
    } catch (error) {
      console.error('Failed to reinitialize PDF.js:', error);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">PDF.js Debugger</h3>
      
      <div className="space-y-4">
        <div className="flex space-x-2">
          <Button onClick={runTests} disabled={isRunning}>
            {isRunning ? 'Running Tests...' : 'Test PDF.js Worker'}
          </Button>
          <Button onClick={reinitializePDF} variant="outline">
            Reinitialize PDF.js
          </Button>
        </div>

        {testResults && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Test Results:</h4>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p><strong>Worker Source:</strong> Check browser console for PDF.js worker configuration</p>
          <p><strong>Network:</strong> Ensure CDN access is available</p>
          <p><strong>Browser:</strong> Check if Web Workers are supported</p>
        </div>
      </div>
    </Card>
  );
}
