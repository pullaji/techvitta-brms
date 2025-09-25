import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  Download,
  Receipt,
  CreditCard,
  Calendar,
  Tag,
  Image,
  FileText,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProofInput } from "@/components/ProofInput";
import { InlineProofUpload } from "@/components/InlineProofUpload";
import { SpendingChart } from "@/components/SpendingChart";
import { transactionsAPI } from "@/services/supabaseApi";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV } from "@/utils/exportUtils";

const getTypeIcon = (type: string) => {
  switch (type) {
    case "receipt":
      return Receipt;
    case "bank_transfer":
      return CreditCard;
    case "upi":
      return CreditCard;
    default:
      return Receipt;
  }
};


export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: "", end: "" });
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    notes: "",
    date: "",
    category: "",
    type: "",
    description: "",
    transaction_name: "",
    credit_amount: "",
    debit_amount: "",
    proof: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Refresh transactions function
  const refreshTransactions = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    toast({
      title: "Refreshing...",
      description: "Transactions are being refreshed.",
    });
  };

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: transactionsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: "Success!",
        description: "Transaction created successfully.",
      });
      setIsAddModalOpen(false);
      setFormData({
        notes: "",
        date: "",
        category: "",
        type: "",
        description: "",
        transaction_name: "",
        credit_amount: "",
        debit_amount: "",
        proof: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create transaction.",
        variant: "destructive",
      });
    },
  });


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInlineProofUpload = async (transactionId: string, proofUrl: string) => {
    try {
      await transactionsAPI.update(transactionId, { proof: proofUrl });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: "Success!",
        description: "Proof updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update transaction proof.",
        variant: "destructive",
      });
    }
  };

  // Export functions
  const handleExportCSV = () => {
    if (!transactions || transactions.length === 0) {
      toast({
        title: "No data to export",
        description: "Please ensure there are transactions to export.",
        variant: "destructive",
      });
      return;
    }

    const filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(transactions, filename);
    
    toast({
      title: "Export successful!",
      description: `Transactions exported to ${filename}`,
    });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.notes || !formData.date || !formData.category || !formData.type) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const creditAmount = parseFloat(formData.credit_amount) || 0;
    const debitAmount = parseFloat(formData.debit_amount) || 0;

    if (creditAmount === 0 && debitAmount === 0) {
      toast({
        title: "Error",
        description: "Please enter either a credit amount or debit amount.",
        variant: "destructive",
      });
      return;
    }

    const transactionData = {
      payment_type: formData.type as 'receipt' | 'bank_transfer' | 'upi' | 'cash' | 'other',
      transaction_name: formData.transaction_name || formData.notes || 'Manual transaction',
      description: formData.description || formData.notes || 'Manual transaction',
      category: formData.category,
      credit_amount: creditAmount,
      debit_amount: debitAmount,
      proof: formData.proof || null,
      notes: formData.notes,
      date: formData.date,
      updated_at: new Date().toISOString(),
    };

    // Create new transaction
    createTransactionMutation.mutate(transactionData);
  };

  // Fetch transactions from Supabase
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionsAPI.getAll({}),
  });

  const filteredTransactions = transactions?.filter((transaction) => {
    // Search filter
    const matchesSearch = !searchTerm || 
      transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.transaction_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;

    // Category filter
    const matchesCategory = !categoryFilter || categoryFilter === "all" || 
      transaction.category === categoryFilter;

    // Type filter
    const matchesType = !typeFilter || typeFilter === "all" || 
      transaction.payment_type === typeFilter;

    // Date range filter
    const transactionDate = new Date(transaction.date);
    const matchesDateRange = (!dateRangeFilter.start || transactionDate >= new Date(dateRangeFilter.start)) &&
      (!dateRangeFilter.end || transactionDate <= new Date(dateRangeFilter.end));

    // Amount filter - removed net amount calculation
    const matchesAmountRange = true;

    return matchesSearch && matchesCategory && matchesType && matchesDateRange && matchesAmountRange;
  }).sort((a, b) => {
    // Sorting logic
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'date':
        aValue = new Date(a.date);
        bValue = new Date(b.date);
        break;
      case 'category':
        aValue = a.category || '';
        bValue = b.category || '';
        break;
      case 'description':
        aValue = a.transaction_name || '';
        bValue = b.transaction_name || '';
        break;
      default:
        aValue = new Date(a.date);
        bValue = new Date(b.date);
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  }) || [];

  const categories = [...new Set(transactions?.map(t => t.category) || [])];
  const types = [...new Set(transactions?.map(t => t.payment_type) || [])];


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Error loading transactions</p>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="heading-xl text-2xl sm:text-3xl lg:text-4xl mb-2">Transactions</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Manage and track all your financial transactions
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-4 sm:mt-0"
            >
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto text-sm"
                  onClick={refreshTransactions}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Refresh</span>
                  <span className="sm:hidden">Refresh</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto text-sm"
                  onClick={handleExportCSV}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">CSV</span>
                </Button>
              </div>
              <Button className="btn-gradient w-full sm:w-auto text-sm" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Transaction</span>
                <span className="sm:hidden">Add Transaction</span>
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-6"
        >
          <Card className="card-elevated p-4 sm:p-6">
            <div className="space-y-4">
              {/* First row - Basic filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>

                {/* Category Filter */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category?.replace('_', ' ') || category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Type Filter */}
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type?.replace('_', ' ') || type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort By */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="description">Description</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Second row - Advanced filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Date Range Start */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    placeholder="Start Date"
                    value={dateRangeFilter.start}
                    onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                    className="pl-10 text-sm"
                  />
                </div>

                {/* Date Range End */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    placeholder="End Date"
                    value={dateRangeFilter.end}
                    onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                    className="pl-10 text-sm"
                  />
                </div>

              </div>

              {/* Clear Filters */}
              <div className="flex justify-end items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("");
                    setTypeFilter("");
                    setDateRangeFilter({ start: "", end: "" });
                    setSortBy("date");
                    setSortOrder("desc");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Summary Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-6"
        >
          <Card className="card-elevated p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold text-primary">{filteredTransactions.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Credits</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{filteredTransactions.reduce((sum, t) => sum + (t.credit_amount || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Debits</p>
                <p className="text-2xl font-bold text-red-600">
                  ₹{filteredTransactions.reduce((sum, t) => sum + (t.debit_amount || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredTransactions.length > 0 && filteredTransactions[filteredTransactions.length - 1]?.balance ? 
                    `₹${filteredTransactions[filteredTransactions.length - 1].balance.toLocaleString('en-IN')}` : 
                    '₹0'
                  }
                </p>
              </div>
            </div>
            
          </Card>
        </motion.div>


        {/* Charts Section - Only show if there are transactions with debit amounts */}
        {filteredTransactions.length > 0 && filteredTransactions.some(t => (t.debit_amount || 0) > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SpendingChart 
                transactions={filteredTransactions}
                title="Spending by Category"
                className="h-96"
              />
              <SpendingChart 
                transactions={filteredTransactions}
                title="Monthly Spending Trend"
                className="h-96"
              />
            </div>
          </motion.div>
        )}

        {/* Transactions Table - Desktop */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="hidden md:block"
        >
          <Card className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left p-4 font-medium text-sm">Date</th>
                    <th className="text-left p-4 font-medium text-sm">Payment Type</th>
                    <th className="text-left p-4 font-medium text-sm">Transaction Name</th>
                    <th className="text-left p-4 font-medium text-sm">Description</th>
                    <th className="text-left p-4 font-medium text-sm">Category</th>
                    <th className="text-right p-4 font-medium text-sm">Credit (+₹)</th>
                    <th className="text-right p-4 font-medium text-sm">Debit (-₹)</th>
                    <th className="text-right p-4 font-medium text-sm">Balance (₹)</th>
                    <th className="text-left p-4 font-medium text-sm">Source</th>
                    <th className="text-left p-4 font-medium text-sm">Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction: any, index: number) => {
                    const TypeIcon = getTypeIcon(transaction.payment_type);
                    return (
                      <motion.tr
                        key={transaction.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        className="border-b border-border hover:bg-secondary/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="text-sm text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <div className="p-1 bg-primary-light rounded">
                              <TypeIcon className="w-3 h-3 text-primary" />
                            </div>
                            <span className="text-sm font-medium">
                              {transaction.payment_type}
                            </span>
                              </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-medium">
                            {transaction.transaction_name}
                            </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            {transaction.description || transaction.notes || 'No description'}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="text-xs">
                            {transaction.category}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-right text-green-600">
                            {(transaction.credit_amount && transaction.credit_amount > 0) ? 
                              `+₹${transaction.credit_amount.toLocaleString()}` : 
                              '-'
                            }
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-right text-red-600">
                            {(transaction.debit_amount && transaction.debit_amount > 0) ? 
                              `-₹${transaction.debit_amount.toLocaleString()}` : 
                              '-'
                            }
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-right text-blue-600">
                            {transaction.balance ? 
                              `₹${transaction.balance.toLocaleString()}` : 
                              '-'
                            }
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-xs text-muted-foreground">
                            {transaction.source_file ? (
                              <div className="flex items-center space-x-1">
                                <FileSpreadsheet className="w-3 h-3" />
                                <span className="truncate max-w-20" title={transaction.source_file}>
                                  {transaction.source_file}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Manual</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-xs">
                            <InlineProofUpload
                              transactionId={transaction.id}
                              currentProof={transaction.proof}
                              onUploadComplete={(proofUrl) => handleInlineProofUpload(transaction.id, proofUrl)}
                            />
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Transactions Cards - Mobile */}
        <div className="md:hidden space-y-3">
          {filteredTransactions.map((transaction: any, index: number) => {
            const TypeIcon = getTypeIcon(transaction.payment_type);
            return (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Card className="card-interactive p-4 border border-border/50">
                  {/* Header with transaction info */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="p-2.5 bg-primary/10 rounded-lg flex-shrink-0">
                        <TypeIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground leading-tight">
                          {transaction.transaction_name || transaction.notes || 'Transaction'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(transaction.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-lg">
                        {(transaction.credit_amount && transaction.credit_amount > 0) ? 
                          <span className="text-green-600">+₹{transaction.credit_amount.toLocaleString()}</span> : 
                          (transaction.debit_amount && transaction.debit_amount > 0) ? 
                            <span className="text-red-600">-₹{transaction.debit_amount.toLocaleString()}</span> : 
                            <span className="text-muted-foreground">₹0</span>
                        }
                      </div>
                      {transaction.balance && (
                        <div className="text-sm text-blue-600 font-medium mt-1">
                          Balance: ₹{transaction.balance.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Description */}
                  {transaction.description && transaction.description !== transaction.notes && (
                    <div className="mb-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {transaction.description}
                      </p>
                    </div>
                  )}
                  
                  {/* Category and Payment Type */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs px-2 py-1">
                        {transaction.category?.replace('_', ' ') || 'Uncategorized'}
                      </Badge>
                      <Badge variant="outline" className="text-xs px-2 py-1">
                        {transaction.payment_type?.replace('_', ' ') || 'receipt'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Source File */}
                  {transaction.source_file && (
                    <div className="mb-3">
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <FileSpreadsheet className="w-3 h-3" />
                        <span>Source: {transaction.source_file}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Proof section */}
                  <div className="pt-3 border-t border-border/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Proof:</span>
                      <InlineProofUpload
                        transactionId={transaction.id}
                        currentProof={transaction.proof}
                        onUploadComplete={(proofUrl) => handleInlineProofUpload(transaction.id, proofUrl)}
                      />
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredTransactions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="card-elevated p-12 text-center">
              <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="heading-md text-xl mb-2">No transactions found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search criteria or add a new transaction.
              </p>
              <Button className="btn-gradient" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Transaction
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Add Transaction Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Enter transaction notes"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction_name">Transaction Name</Label>
                  <Input
                    id="transaction_name"
                    name="transaction_name"
                    value={formData.transaction_name}
                    onChange={handleInputChange}
                    placeholder="Enter transaction name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credit_amount">Credit Amount (₹)</Label>
                  <Input
                    id="credit_amount"
                    name="credit_amount"
                    type="number"
                    step="0.01"
                    value={formData.credit_amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debit_amount">Debit Amount (₹)</Label>
                  <Input
                    id="debit_amount"
                    name="debit_amount"
                    type="number"
                    step="0.01"
                    value={formData.debit_amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Business Expense">Business Expense</SelectItem>
                      <SelectItem value="Personal Expense">Personal Expense</SelectItem>
                      <SelectItem value="Travel & Transport">Travel & Transport</SelectItem>
                      <SelectItem value="Meals & Entertainment">Meals & Entertainment</SelectItem>
                      <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                      <SelectItem value="Software & Subscriptions">Software & Subscriptions</SelectItem>
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receipt">Receipt</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes (optional)"
                  rows={3}
                />
              </div>

              <ProofInput
                value={formData.proof}
                onChange={(value) => setFormData(prev => ({ ...prev, proof: value }))}
                disabled={createTransactionMutation.isPending}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="btn-gradient"
                  disabled={createTransactionMutation.isPending}
                >
                  {createTransactionMutation.isPending ? "Creating..." : "Create Transaction"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}