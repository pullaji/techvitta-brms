import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SpendingData {
  category: string;
  amount: number;
  count: number;
  color: string;
}

interface SpendingChartProps {
  transactions: any[];
  title?: string;
  className?: string;
}

// Color palette for categories
const CATEGORY_COLORS = {
  'food': '#FF6B6B',
  'travel': '#4ECDC4',
  'shopping': '#45B7D1',
  'bills': '#96CEB4',
  'salary': '#FFEAA7',
  'others': '#DDA0DD',
  'business_expense': '#FF7675',
  'personal_expense': '#74B9FF',
  'travel_transport': '#00B894',
  'meals_entertainment': '#FDCB6E',
  'office_supplies': '#6C5CE7',
  'software_subscriptions': '#A29BFE',
  'utilities': '#FD79A8',
  'income': '#00CEC9',
  'investment': '#55A3FF',
  'refund': '#81ECEC',
  'transfer_in': '#74B9FF',
  'transfer_out': '#FF7675',
  'withdrawal': '#FDCB6E',
  'deposit': '#00B894',
  'loan_payment': '#E17055',
  'insurance': '#FDCB6E',
  'medical': '#FF7675',
  'education': '#74B9FF',
  'entertainment': '#A29BFE',
  'fuel': '#FDCB6E',
  'maintenance': '#6C5CE7'
};

export function SpendingChart({ transactions, title = "Spending by Category", className = "" }: SpendingChartProps) {
  // Process transactions to get spending data
  const spendingData = React.useMemo(() => {
    const categoryMap = new Map<string, { amount: number; count: number }>();
    
    transactions.forEach(transaction => {
      const category = transaction.category || 'others';
      const debitAmount = transaction.debit_amount || 0;
      
      if (debitAmount > 0) { // Only include expenses (debit amounts)
        const existing = categoryMap.get(category) || { amount: 0, count: 0 };
        categoryMap.set(category, {
          amount: existing.amount + debitAmount,
          count: existing.count + 1
        });
      }
    });
    
    // Convert to array and sort by amount
    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category: category.replace('_', ' ').toUpperCase(),
        amount: data.amount,
        count: data.count,
        color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#DDA0DD'
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8); // Show top 8 categories
  }, [transactions]);

  const totalSpending = spendingData.reduce((sum, item) => sum + item.amount, 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.amount / totalSpending) * 100).toFixed(1);
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data.category}</p>
          <p className="text-sm text-gray-600">
            Amount: ₹{data.amount.toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-gray-600">
            Percentage: {percentage}%
          </p>
          <p className="text-sm text-gray-600">
            Transactions: {data.count}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label function
  const renderLabel = (entry: any) => {
    const percentage = ((entry.amount / totalSpending) * 100).toFixed(1);
    return parseFloat(percentage) > 5 ? `${percentage}%` : ''; // Only show labels for slices > 5%
  };

  if (spendingData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">No spending data available</p>
              <p className="text-sm">Upload some transactions to see spending breakdown</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm font-normal text-muted-foreground">
            Total: ₹{totalSpending.toLocaleString('en-IN')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={spendingData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {spendingData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry) => (
                  <span style={{ color: entry.color }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Category breakdown list */}
        <div className="mt-4 space-y-2">
          {spendingData.slice(0, 5).map((item, index) => {
            const percentage = ((item.amount / totalSpending) * 100).toFixed(1);
            return (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium">{item.category}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">₹{item.amount.toLocaleString('en-IN')}</div>
                  <div className="text-muted-foreground">{percentage}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Bar chart component for monthly spending
interface MonthlySpendingChartProps {
  transactions: any[];
  title?: string;
  className?: string;
}

export function MonthlySpendingChart({ transactions, title = "Monthly Spending", className = "" }: MonthlySpendingChartProps) {
  const monthlyData = React.useMemo(() => {
    const monthMap = new Map<string, { amount: number; count: number }>();
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const debitAmount = transaction.debit_amount || 0;
      
      if (debitAmount > 0) { // Only include expenses
        const existing = monthMap.get(monthKey) || { amount: 0, count: 0 };
        monthMap.set(monthKey, {
          amount: existing.amount + debitAmount,
          count: existing.count + 1
        });
      }
    });
    
    // Convert to array and sort by month
    return Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6); // Show last 6 months
  }, [transactions]);

  if (monthlyData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">No spending data available</p>
              <p className="text-sm">Upload some transactions to see monthly trends</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={monthlyData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
                label={(entry: any) => `${entry.month}: ₹${entry.amount.toLocaleString('en-IN')}`}
              >
                {monthlyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
