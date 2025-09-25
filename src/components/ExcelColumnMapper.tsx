import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface ExcelColumnMapperProps {
  headers: string[];
  columnMapping: { [key: string]: string };
  processingResult?: {
    totalRows: number;
    processedRows: number;
    skippedRows: number;
  };
  onMappingChange?: (header: string, newMapping: string) => void;
}

export const ExcelColumnMapper: React.FC<ExcelColumnMapperProps> = ({ 
  headers, 
  columnMapping, 
  processingResult,
  onMappingChange 
}) => {
  const mappedCount = Object.keys(columnMapping).length;
  const unmappedCount = headers.length - mappedCount;
  const mappingPercentage = headers.length > 0 ? Math.round((mappedCount / headers.length) * 100) : 0;

  const getMappingStatus = (header: string) => {
    const mappedField = columnMapping[header];
    if (mappedField) {
      return { status: 'mapped', icon: CheckCircle, color: 'text-green-600' };
    }
    return { status: 'unmapped', icon: AlertCircle, color: 'text-red-600' };
  };

  const getFieldColor = (field: string) => {
    const colors = {
      date: 'bg-blue-100 text-blue-800',
      description: 'bg-green-100 text-green-800',
      debit: 'bg-red-100 text-red-800',
      credit: 'bg-emerald-100 text-emerald-800',
      amount: 'bg-purple-100 text-purple-800',
      balance: 'bg-yellow-100 text-yellow-800',
      account_no: 'bg-indigo-100 text-indigo-800',
      reference_id: 'bg-gray-100 text-gray-800'
    };
    return colors[field as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Excel Column Mapping</h3>
        <div className="flex items-center space-x-2">
          <Badge variant={mappingPercentage === 100 ? "default" : "secondary"}>
            {mappingPercentage}% Mapped
          </Badge>
        </div>
      </div>
      
      {/* Summary Stats */}
      {processingResult && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{processingResult.totalRows}</div>
            <div className="text-sm text-blue-600">Total Rows</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{processingResult.processedRows}</div>
            <div className="text-sm text-green-600">Processed</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{processingResult.skippedRows}</div>
            <div className="text-sm text-red-600">Skipped</div>
          </div>
        </div>
      )}
      
      {/* Column Mapping Details */}
      <div className="space-y-3 mb-6">
        <h4 className="font-medium text-gray-700">Column Details</h4>
        {headers.map((header, index) => {
          const mappedField = columnMapping[header];
          const { status, icon: Icon, color } = getMappingStatus(header);
          
          return (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="font-medium">{header}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  Column {index + 1}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-3">
                {mappedField ? (
                  <Badge className={`${getFieldColor(mappedField)} border-0`}>
                    {mappedField}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    Unmapped
                  </Badge>
                )}
                
                {status === 'unmapped' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // You can implement manual mapping here
                      console.log(`Manual mapping needed for: ${header}`);
                    }}
                  >
                    Map
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Mapping Status */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-green-900">Mapped Columns</h4>
          </div>
          <div className="text-2xl font-bold text-green-600">{mappedCount}</div>
          <div className="text-sm text-green-600">
            {mappedCount === 0 ? 'No columns mapped' : 
             mappedCount === 1 ? '1 column mapped' : 
             `${mappedCount} columns mapped`}
          </div>
        </div>
        
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h4 className="font-semibold text-red-900">Unmapped Columns</h4>
          </div>
          <div className="text-2xl font-bold text-red-600">{unmappedCount}</div>
          <div className="text-sm text-red-600">
            {unmappedCount === 0 ? 'All columns mapped!' : 
             unmappedCount === 1 ? '1 column needs mapping' : 
             `${unmappedCount} columns need mapping`}
          </div>
        </div>
      </div>
      
      {/* Field Legend */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-3 flex items-center space-x-2">
          <Info className="w-4 h-4" />
          <span>Field Types</span>
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center space-x-2">
            <Badge className="bg-blue-100 text-blue-800 border-0">date</Badge>
            <span>Transaction date</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-100 text-green-800 border-0">description</Badge>
            <span>Transaction description</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-red-100 text-red-800 border-0">debit</Badge>
            <span>Money going out</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-emerald-100 text-emerald-800 border-0">credit</Badge>
            <span>Money coming in</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-purple-100 text-purple-800 border-0">amount</Badge>
            <span>Single amount column</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-yellow-100 text-yellow-800 border-0">balance</Badge>
            <span>Account balance</span>
          </div>
        </div>
      </div>
      
      {/* Tips */}
      {unmappedCount > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start space-x-2">
            <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">Mapping Tips</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Unmapped columns will be ignored during processing</li>
                <li>• At minimum, you need a date column and either debit/credit or amount columns</li>
                <li>• Description columns help categorize transactions automatically</li>
                <li>• Balance columns provide additional context for validation</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
