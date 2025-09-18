import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BankTransaction, ParsedBankStatement } from '@/services/pdfParser';

interface BankStatementViewerProps {
  parsedStatement: ParsedBankStatement;
}

export const BankStatementViewer: React.FC<BankStatementViewerProps> = ({ parsedStatement }) => {
  const formatAmount = (amount: number, isCredit: boolean) => {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
    
    return (
      <span className={isCredit ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
        {isCredit ? '+' : '-'}{formatted}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getCategoryBadgeVariant = (category: string) => {
    const categoryColors: Record<string, string> = {
      'income': 'default',
      'salary': 'default',
      'business_income': 'default',
      'investment': 'secondary',
      'refund': 'outline',
      'transfer_in': 'default',
      'business_expense': 'destructive',
      'personal_expense': 'destructive',
      'meals_entertainment': 'destructive',
      'travel_transport': 'destructive',
      'office_supplies': 'destructive',
      'software_subscriptions': 'destructive',
      'utilities': 'destructive',
      'fuel': 'destructive',
      'shopping': 'destructive',
      'entertainment': 'destructive',
      'medical': 'destructive',
      'education': 'destructive',
      'insurance': 'destructive',
      'loan_payment': 'destructive'
    };
    
    return categoryColors[category] || 'outline';
  };

  const getPaymentTypeBadge = (paymentType: string) => {
    const typeColors: Record<string, string> = {
      'single transfer': 'default',
      'upi receipt': 'secondary',
      'upi payment': 'destructive',
      'bank transfer': 'default',
      'cash deposit': 'default',
      'cash withdrawal': 'destructive',
      'cheque': 'outline',
      'neft': 'default',
      'rtgs': 'default',
      'imps': 'secondary'
    };
    
    const variant = typeColors[paymentType.toLowerCase()] || 'outline';
    
    return (
      <Badge variant={variant as any} className="text-xs">
        {paymentType}
      </Badge>
    );
  };

  // Calculate totals
  const totalCredits = parsedStatement.transactions
    .filter(tx => tx.isCredit)
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const totalDebits = parsedStatement.transactions
    .filter(tx => !tx.isCredit)
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6">
      {/* Statement Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bank Statement Summary</span>
            <Badge variant="outline">{parsedStatement.transactions.length} Transactions</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Bank</p>
              <p className="font-medium">{parsedStatement.bankName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Account Number</p>
              <p className="font-medium">{parsedStatement.accountNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Statement Period</p>
              <p className="font-medium">{parsedStatement.statementPeriod}</p>
            </div>
          </div>
          
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Credits</p>
              <p className="text-2xl font-bold text-green-600">
                +₹{totalCredits.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Debits</p>
              <p className="text-2xl font-bold text-red-600">
                -₹{totalDebits.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Transaction Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedStatement.transactions.map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell>
                      {getPaymentTypeBadge(transaction.paymentType)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={transaction.transactionName}>
                        {transaction.transactionName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getCategoryBadgeVariant(transaction.category) as any}>
                        {transaction.category.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAmount(transaction.amount, transaction.isCredit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(
              parsedStatement.transactions.reduce((acc, tx) => {
                acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
                return acc;
              }, {} as Record<string, number>)
            ).map(([category, amount]) => (
              <div key={category} className="text-center p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {category.replace('_', ' ').toUpperCase()}
                </p>
                <p className="font-medium">₹{amount.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
