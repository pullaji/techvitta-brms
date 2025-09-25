import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileSpreadsheet, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface ExcelDebugInfo {
  fileName: string;
  totalRows: number;
  headers: string[];
  headersWithIndex: Array<{ index: number; header: string }>;
  firstDataRow: any[];
  sampleData: any[][];
  detectedColumns: {
    date: number | null;
    description: number | null;
    credit: number | null;
    debit: number | null;
    amount: number | null;
    balance: number | null;
    type: number | null;
  };
  validationResults: {
    hasDate: boolean;
    hasAmount: boolean;
    hasDescription: boolean;
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

interface ExcelDebuggerProps {
  file: File;
  onClose?: () => void;
}

export const ExcelDebugger: React.FC<ExcelDebuggerProps> = ({ file, onClose }) => {
  const [debugInfo, setDebugInfo] = useState<ExcelDebugInfo | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const findColumnIndex = (headers: string[], patterns: string[]): number => {
    for (const pattern of patterns) {
      const index = headers.findIndex(header => 
        header && header.toLowerCase().includes(pattern.toLowerCase())
      );
      if (index !== -1) return index;
    }
    return -1;
  };

  const analyzeExcelFile = async () => {
    setIsAnalyzing(true);
    try {
      const XLSX = await import('xlsx');
      
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length < 2) {
              setDebugInfo({
                fileName: file.name,
                totalRows: jsonData.length,
                headers: [],
                headersWithIndex: [],
                firstDataRow: [],
                sampleData: [],
                detectedColumns: {
                  date: null, description: null, credit: null, debit: null, amount: null, balance: null, type: null
                },
                validationResults: {
                  hasDate: false,
                  hasAmount: false,
                  hasDescription: false,
                  isValid: false,
                  errors: ['Excel file must contain at least a header row and one data row'],
                  warnings: []
                }
              });
              resolve();
              return;
            }
            
            const headers = (jsonData[0] as string[]).map(h => h ? h.toString().trim() : '');
            
            // Detect columns
            const detectedColumns = {
              date: findColumnIndex(headers, ['date', 'transaction_date', 'tran_date', 'trans_date']),
              description: findColumnIndex(headers, ['description', 'narration', 'particulars', 'details', 'transaction_name']),
              credit: findColumnIndex(headers, ['credit', 'credit amount', 'deposit', 'receipt', 'inflow', 'income']),
              debit: findColumnIndex(headers, ['debit', 'debit amount', 'withdrawal', 'payment', 'outflow', 'expense']),
              amount: findColumnIndex(headers, ['amount', 'value', 'total', 'transaction_amount']),
              balance: findColumnIndex(headers, ['balance', 'closing_balance', 'running_balance', 'available_balance']),
              type: findColumnIndex(headers, ['type', 'transaction_type', 'payment_type', 'mode'])
            };
            
            // Validation
            const errors: string[] = [];
            const warnings: string[] = [];
            
            if (detectedColumns.date === -1) {
              errors.push('Date column not found. Please ensure your Excel has a column named "Date" or "Transaction Date"');
            }
            
            const hasAmount = detectedColumns.credit !== -1 || detectedColumns.debit !== -1 || detectedColumns.amount !== -1;
            if (!hasAmount) {
              errors.push('No amount columns found. Please ensure your Excel has "Credit", "Debit", or "Amount" columns');
            }
            
            if (detectedColumns.description === -1) {
              warnings.push('Description column not found. Transactions will use default descriptions');
            }
            
            if (detectedColumns.credit !== -1 && detectedColumns.debit !== -1) {
              warnings.push('Both Credit and Debit columns found. This is the recommended format.');
            } else if (detectedColumns.amount !== -1) {
              warnings.push('Single Amount column found. Positive values will be treated as credits, negative as debits.');
            }
            
            const validationResults = {
              hasDate: detectedColumns.date !== -1,
              hasAmount,
              hasDescription: detectedColumns.description !== -1,
              isValid: errors.length === 0,
              errors,
              warnings
            };
            
            setDebugInfo({
              fileName: file.name,
              totalRows: jsonData.length,
              headers: headers,
              headersWithIndex: headers.map((h, i) => ({ index: i, header: h })),
              firstDataRow: jsonData[1] || [],
              sampleData: jsonData.slice(1, 4), // First 3 data rows
              detectedColumns,
              validationResults
            });
            
          } catch (error: any) {
            setDebugInfo({
              fileName: file.name,
              totalRows: 0,
              headers: [],
              headersWithIndex: [],
              firstDataRow: [],
              sampleData: [],
              detectedColumns: {
                date: null, description: null, credit: null, debit: null, amount: null, balance: null, type: null
              },
              validationResults: {
                hasDate: false,
                hasAmount: false,
                hasDescription: false,
                isValid: false,
                errors: [`Error reading Excel file: ${error.message}`],
                warnings: []
              }
            });
          }
          resolve();
        };
        
        reader.readAsArrayBuffer(file);
      });
    } catch (error: any) {
      setDebugInfo({
        fileName: file.name,
        totalRows: 0,
        headers: [],
        headersWithIndex: [],
        firstDataRow: [],
        sampleData: [],
        detectedColumns: {
          date: null, description: null, credit: null, debit: null, amount: null, balance: null, type: null
        },
        validationResults: {
          hasDate: false,
          hasAmount: false,
          hasDescription: false,
          isValid: false,
          errors: [`Failed to analyze Excel file: ${error.message}`],
          warnings: []
        }
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FileSpreadsheet className="w-8 h-8 text-blue-600" />
          <div>
            <h3 className="text-xl font-semibold">Excel File Analyzer</h3>
            <p className="text-sm text-muted-foreground">Analyze your Excel file format and structure</p>
          </div>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>Close</Button>
        )}
      </div>
      
      <Button 
        onClick={analyzeExcelFile} 
        disabled={isAnalyzing} 
        className="mb-6 w-full"
      >
        {isAnalyzing ? 'Analyzing Excel File...' : 'Analyze Excel File'}
      </Button>
      
      {debugInfo && (
        <div className="space-y-6">
          {/* File Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900">File Name</h4>
              <p className="text-blue-700 truncate">{debugInfo.fileName}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900">Total Rows</h4>
              <p className="text-green-700">{debugInfo.totalRows}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-900">Data Rows</h4>
              <p className="text-purple-700">{Math.max(0, debugInfo.totalRows - 1)}</p>
            </div>
          </div>

          {/* Validation Results */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center">
              {debugInfo.validationResults.isValid ? (
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              )}
              Validation Results
            </h4>
            
            {debugInfo.validationResults.errors.length > 0 && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Errors:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {debugInfo.validationResults.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {debugInfo.validationResults.warnings.length > 0 && (
              <Alert className="mb-4 border-yellow-200 bg-yellow-50">
                <Info className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Warnings:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {debugInfo.validationResults.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Column Detection */}
          <div>
            <h4 className="font-semibold mb-3">Column Detection</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(debugInfo.detectedColumns).map(([column, index]) => (
                <div key={column} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium capitalize">{column}</span>
                    {index !== -1 ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  {index !== -1 ? (
                    <Badge variant="secondary">Column {index}</Badge>
                  ) : (
                    <Badge variant="destructive">Not Found</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Headers */}
          <div>
            <h4 className="font-semibold mb-3">Excel Headers</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {debugInfo.headersWithIndex.map((item) => (
                <div key={item.index} className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{item.index}</span>
                    <span className="text-xs text-gray-500">Column</span>
                  </div>
                  <p className="text-sm font-medium truncate mt-1">
                    "{item.header || 'Empty'}"
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Data */}
          {debugInfo.sampleData.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Sample Data (First 3 rows)</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left">Row</th>
                      {debugInfo.headers.map((header, index) => (
                        <th key={index} className="border border-gray-300 px-3 py-2 text-left">
                          {header || `Column ${index}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {debugInfo.sampleData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className="border border-gray-300 px-3 py-2 font-mono text-sm bg-gray-50">
                          {rowIndex + 1}
                        </td>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="border border-gray-300 px-3 py-2 text-sm">
                            {cell ? cell.toString() : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div>
            <h4 className="font-semibold mb-3">Recommendations</h4>
            <div className="space-y-2">
              {!debugInfo.validationResults.hasDate && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Add a "Date" column with transaction dates in your Excel file.
                  </AlertDescription>
                </Alert>
              )}
              
              {!debugInfo.validationResults.hasAmount && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Add "Credit" and "Debit" columns, or a single "Amount" column to your Excel file.
                  </AlertDescription>
                </Alert>
              )}
              
              {debugInfo.validationResults.isValid && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Your Excel file format looks good! You can proceed with uploading.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
