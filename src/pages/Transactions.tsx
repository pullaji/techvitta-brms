import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
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
  Edit3,
  Eye,
  ExternalLink,
  X,
  Save
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
import { transactionsAPI, savedReportsAPI } from "@/services/supabaseApi";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, exportToExcel } from "@/utils/exportUtils";
import { supabase } from "@/lib/supabase";
import { downloadTaxSummaryPDF } from "@/utils/pdfGenerator";
import { generateTransactionExcel, downloadExcel } from "@/utils/transactionExcelGenerator";
import * as XLSX from 'xlsx';

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

// Helper function to check if transaction has proof
const hasProof = (transaction: any) => {
  if (!transaction.proof || transaction.proof.trim().length === 0) {
    return false;
  }
  
  // Check if it's a proper proof URL (starts with http/https) or a meaningful text proof
  const proof = transaction.proof.trim();
  
  // If it's a URL (starts with http/https), it's a real proof
  if (proof.startsWith('http://') || proof.startsWith('https://')) {
    return true;
  }
  
  // If it's just a filename (like "statement.pdf"), it's not a real proof
  if (proof.includes('.pdf') || proof.includes('.xlsx') || proof.includes('.csv') || proof.includes('Output')) {
    return false;
  }
  
  // If it's meaningful text (more than 10 characters), it's a real proof
  if (proof.length > 10) {
    return true;
  }
  
  return false;
};

// Helper function to check if proof is an image URL
const isImageUrl = (url: string) => {
  return url && (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp'));
};



export default function Transactions() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: "", end: "" });
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showAll, setShowAll] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isViewProofModalOpen, setIsViewProofModalOpen] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState<any>(null);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [viewReportMode, setViewReportMode] = useState(false);
  const [reportTransactions, setReportTransactions] = useState<any[]>([]);
  const [reportName, setReportName] = useState("");
  const [proofData, setProofData] = useState({
    proof: "",
    proofFile: null as File | null
  });
  const [formData, setFormData] = useState({
    notes: "",
    date: "",
    type: "",
    description: "",
    transaction_name: "",
    credit_amount: "",
    debit_amount: "",
    proof: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check for report data from Reports page
  useEffect(() => {
    const viewReportDataStr = sessionStorage.getItem('viewReportData');
    if (viewReportDataStr && location.state?.fromReport) {
      try {
        const viewReportData = JSON.parse(viewReportDataStr);
        setViewReportMode(true);
        setReportTransactions(viewReportData.transactions || []);
        setReportName(viewReportData.reportName || 'Saved Report');
        
        // Clear sessionStorage after loading
        sessionStorage.removeItem('viewReportData');
        
        toast({
          title: "Report Loaded",
          description: `Viewing ${viewReportData.transactions?.length || 0} transactions from ${viewReportData.reportName}`,
        });
      } catch (error) {
        console.error('Error loading report data:', error);
      }
    }
  }, [location, toast]);


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

  // Handle opening proof edit modal
  const handleEditProof = (transaction: any) => {
    setEditingTransaction(transaction);
    setProofData({
      proof: transaction.proof || "",
      proofFile: null
    });
    setIsProofModalOpen(true);
  };

  // Handle proof file upload
  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofData(prev => ({ ...prev, proofFile: file, proof: "" }));
    }
  };

  // Handle proof text change
  const handleProofTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setProofData(prev => ({ ...prev, proof: e.target.value, proofFile: null }));
  };

  // Handle saving proof
  const handleSaveProof = async () => {
    if (!editingTransaction) return;

    if (!proofData.proof && !proofData.proofFile) {
      toast({
        title: "Proof Required",
        description: "Please provide either a proof file or enter text in the notice field.",
        variant: "destructive",
      });
      return;
    }

    try {
      let proofValue = proofData.proof;

      // If a file is uploaded, upload it to Supabase Storage first
      if (proofData.proofFile) {
        const file = proofData.proofFile;
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const fileName = `proof_${timestamp}_${randomId}.${fileExt}`;
        const filePath = `proofs/${fileName}`;

        // Upload file to Supabase Storage
        const { data, error } = await supabase.storage
          .from('uploads')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);

        proofValue = publicUrl;
      }

      // Update the transaction with the proof
      await transactionsAPI.update(editingTransaction.id, { proof: proofValue });

      toast({
        title: "Success!",
        description: "Proof updated successfully.",
      });
      setIsProofModalOpen(false);
      setEditingTransaction(null);
      setProofData({ proof: "", proofFile: null });
      
      // Refresh transactions to show updated proof
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update proof.",
        variant: "destructive",
      });
    }
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

  // Handle viewing proof
  const handleViewProof = (transaction: any) => {
    if (transaction.proof) {
      if (isImageUrl(transaction.proof)) {
        // Open image in new tab
        window.open(transaction.proof, '_blank');
      } else {
        // For text proof, show in modal
        setViewingTransaction(transaction);
        setIsViewProofModalOpen(true);
      }
    }
  };

  // Handle removing proof
  const handleRemoveProof = async (transaction: any) => {
    try {
      await transactionsAPI.update(transaction.id, { proof: "" });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: "Success!",
        description: "Proof removed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove proof.",
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

    // Convert transaction data to the format expected by export function
    const exportData = transactions.map(t => ({
      date: t.date,
      payment_type: t.payment_type,
      transaction_name: t.transaction_name,
      description: t.description,
      category: t.category,
      credit_amount: t.credit_amount || 0,
      debit_amount: t.debit_amount || 0,
      balance: t.balance,
      source_file: t.source_file,
      source_type: t.source_type,
      notes: t.notes,
      proof: t.proof,
      created_at: t.created_at
    }));

    // Debug: Log export data
    console.log('📊 Export Data Debug:', {
      totalTransactions: transactions.length,
      exportDataLength: exportData.length,
      sampleTransaction: transactions[0],
      sampleExportData: exportData[0]
    });

    const filename = `transactions_${new Date().toISOString().split('T')[0]}.xlsx`;
    exportToExcel(exportData, filename);
    
    toast({
      title: "Export successful!",
      description: `Transactions exported to ${filename} with clickable proof links`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.notes || !formData.date || !formData.type) {
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
      category: 'Other', // Default category
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
  const { data: fetchedTransactions, isLoading, error } = useQuery({
    queryKey: ['transactions', showAll],
    queryFn: () => transactionsAPI.getAll({ showAll }),
    enabled: !viewReportMode, // Don't fetch if viewing report
  });

  // Use reportTransactions if in viewReportMode, otherwise use fetched transactions
  const transactions = viewReportMode ? reportTransactions : fetchedTransactions;

  // Get the source file name for display
  const latestSourceFile = transactions && transactions.length > 0 ? transactions[0]?.source_file : null;

  const filteredTransactions = transactions?.filter((transaction) => {
    // Search filter
    const matchesSearch = !searchTerm || 
      transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.transaction_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;

    // Category filter - removed

    // Type filter
    const matchesType = !typeFilter || typeFilter === "all" || 
      transaction.payment_type === typeFilter;

    // Date range filter
    const transactionDate = new Date(transaction.date);
    const matchesDateRange = (!dateRangeFilter.start || transactionDate >= new Date(dateRangeFilter.start)) &&
      (!dateRangeFilter.end || transactionDate <= new Date(dateRangeFilter.end));

    // Amount filter - removed net amount calculation
    const matchesAmountRange = true;

    return matchesSearch && matchesType && matchesDateRange && matchesAmountRange;
  }).sort((a, b) => {
    // Sorting logic
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'date':
        aValue = new Date(a.date);
        bValue = new Date(b.date);
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

  const types = [...new Set(transactions?.map(t => t.payment_type) || [])];

  // Save all function - generates Excel and saves to reports
  const handleSaveAll = async () => {
    if (!transactions || transactions.length === 0) {
      toast({
        title: "No data to save",
        description: "Please ensure there are transactions to save.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate report name
      const reportName = `All Transactions - ${new Date().toLocaleDateString()}`;
      const filename = `all_transactions_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Create Excel content using the same data structure
      const exportData = transactions.map(t => ({
        date: t.date,
        payment_type: t.payment_type,
        transaction_name: t.transaction_name,
        description: t.description,
        category: t.category,
        credit_amount: t.credit_amount || 0,
        debit_amount: t.debit_amount || 0,
        balance: t.balance,
        source_file: t.source_file,
        source_type: t.source_type,
        notes: t.notes,
        proof: t.proof,
        created_at: t.created_at
      }));

      // Calculate summary data for Excel - ensure proper number conversion
      const totalTransactions = transactions.length;
      const totalCredits = transactions.reduce((sum, t) => {
        const amount = t.credit_amount ? parseFloat(t.credit_amount) : 0;
        return sum + amount;
      }, 0);
      const totalDebits = transactions.reduce((sum, t) => {
        const amount = t.debit_amount ? parseFloat(t.debit_amount) : 0;
        return sum + amount;
      }, 0);
      const currentBalance = transactions.length > 0 && transactions[transactions.length - 1]?.balance ? 
        parseFloat(transactions[transactions.length - 1].balance) : 0;
      
      // Calculate date range
      const dates = transactions.map(t => new Date(t.date)).filter(d => !isNaN(d.getTime()));
      const startingDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0] : '';
      const endingDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0] : '';

      // Debug: Log the data being passed to Excel generator
      console.log('Excel Generation Data:', {
        totalTransactions,
        totalCredits,
        totalDebits,
        currentBalance,
        startingDate,
        endingDate,
        sampleTransaction: exportData[0],
        allTransactions: exportData.length
      });

      // Generate Excel document
      const excelWorkbook = generateTransactionExcel({
        transactions: exportData,
        summary: {
          totalTransactions,
          totalCredits,
          totalDebits,
          currentBalance,
          startingDate,
          endingDate
        },
        reportName
      });

      // Generate Excel blob for upload
      const excelBlob = new Blob([XLSX.write(excelWorkbook, { bookType: 'xlsx', type: 'array' })], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const excelFile = new File([excelBlob], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Upload Excel to Supabase storage (optional - continue even if this fails)
      let excelUrl = null;
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('reports')
          .upload(`excel-reports/${filename}`, excelFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.warn('Excel upload failed (storage bucket may not exist):', uploadError.message);
          // Continue without Excel URL - the local download will still work
        } else {
          // Get the public URL for the uploaded Excel
          const { data: urlData } = supabase.storage
            .from('reports')
            .getPublicUrl(`excel-reports/${filename}`);
          excelUrl = urlData?.publicUrl || null;
        }
      } catch (storageError) {
        console.warn('Storage bucket not available, continuing without cloud storage:', storageError);
        // Continue without Excel URL
      }

      // Save to database for Reports page (required for Reports page functionality)
      try {
        const savedReport = await savedReportsAPI.saveFilteredTransactions(
          transactions,
          {
            searchTerm: '',
            typeFilter: 'all',
            dateRangeFilter: { start: '', end: '' },
            sortBy: 'date',
            sortOrder: 'desc',
            showAll: true,
            note: 'All transactions saved as Excel from Transactions page',
            pdfUrl: excelUrl, // Using pdfUrl field for Excel URL
            pdfFilename: filename
          },
          reportName
        );
        
        // Refresh data to show updated state
        queryClient.invalidateQueries({ queryKey: ['saved-reports'] });
        
        toast({
          title: "Save successful!",
          description: `Report saved successfully! ${transactions.length} transactions saved to Reports page. You can view and download the Excel file from the Reports section.`,
        });
        
      } catch (dbError) {
        console.error('Database save failed:', dbError);
        
        // If database save fails, fallback to direct download
        downloadExcel(excelWorkbook, filename);
        
        // Check if it's a table not found error
        if (dbError.message?.includes('Database table not found') || 
            dbError.message?.includes('Could not find the table')) {
          toast({
            title: "Database Setup Required",
            description: "Please run the database setup script (database/FIX_ALL_ERRORS.sql) in your Supabase SQL Editor to enable Reports page functionality.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Partial Success",
            description: `Excel downloaded locally. Database save failed - please check your database connection.`,
            variant: "destructive",
          });
        }
      }

    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save transactions. Please try again.",
        variant: "destructive",
      });
    }
  };

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
              {viewReportMode ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setViewReportMode(false);
                        setReportTransactions([]);
                        setReportName("");
                        navigate('/transactions', { replace: true });
                      }}
                    >
                      ← Back to All Transactions
                    </Button>
                  </div>
                  <h1 className="heading-xl text-2xl sm:text-3xl lg:text-4xl mb-2">
                    {reportName}
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Viewing saved report with {reportTransactions.length} transactions
                  </p>
                </>
              ) : (
                <>
                  <h1 className="heading-xl text-2xl sm:text-3xl lg:text-4xl mb-2">Transactions</h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Manage and track all your financial transactions
                  </p>
                </>
              )}
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
                  onClick={handleExportCSV}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Export Excel</span>
                  <span className="sm:hidden">Excel</span>
                </Button>
              </div>
              <Button className="btn-gradient w-full sm:w-auto text-sm" onClick={handleSaveAll}>
                <Save className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Save Excel</span>
                <span className="sm:hidden">Save Excel</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Search */}
                <div className="space-y-1">
                  <Label htmlFor="search" className="text-xs font-medium text-muted-foreground">
                    Search
                  </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                      id="search"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-9 text-sm border-border/50 focus:border-primary/50"
                  />
                  </div>
                </div>


                {/* Type Filter */}
                <div className="space-y-1">
                  <Label htmlFor="type" className="text-xs font-medium text-muted-foreground">
                    Payment Type
                  </Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-9 text-sm border-border/50 focus:border-primary/50">
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
                </div>

                {/* Sort By */}
                <div className="space-y-1">
                  <Label htmlFor="sort" className="text-xs font-medium text-muted-foreground">
                    Sort By
                  </Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-9 text-sm border-border/50 focus:border-primary/50">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="description">Description</SelectItem>
                  </SelectContent>
                </Select>
                </div>
              </div>

              {/* Second row - Advanced filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Date Range Start */}
                 <div className="space-y-1">
                   <Label htmlFor="start-date" className="text-xs font-medium text-muted-foreground">
                     From Date
                   </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                       id="start-date"
                    type="date"
                    value={dateRangeFilter.start}
                    onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                       className="pl-10 h-9 text-sm border-border/50 focus:border-primary/50"
                  />
                   </div>
                </div>

                {/* Date Range End */}
                 <div className="space-y-1">
                   <Label htmlFor="end-date" className="text-xs font-medium text-muted-foreground">
                     To Date
                   </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                       id="end-date"
                    type="date"
                    value={dateRangeFilter.end}
                    onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                       className="pl-10 h-9 text-sm border-border/50 focus:border-primary/50"
                  />
                   </div>
                </div>

              </div>

              {/* Show All Toggle */}
              <div className="flex justify-start items-center">
                <Button
                  variant={showAll ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className={showAll ? "bg-primary text-primary-foreground" : ""}
                >
                  {showAll ? "Show Latest Only" : "Show All Transactions"}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* View Mode Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.5 }}
          className="mb-4"
        >
          <Card className="card-elevated p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${showAll ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                <span className="text-sm font-medium">
                  {showAll 
                    ? 'Showing all transactions from all uploads' 
                    : `Showing only transactions from latest upload${latestSourceFile ? ` (${latestSourceFile})` : ''}`
                  }
                </span>
              </div>
              <Badge variant={showAll ? "secondary" : "default"} className="text-xs">
                {showAll ? 'All Uploads' : 'Latest Upload'}
              </Badge>
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
                    <th className="text-left p-4 font-medium text-sm">Description</th>
                    <th className="text-right p-4 font-medium text-sm">Credit (+₹)</th>
                    <th className="text-right p-4 font-medium text-sm">Debit (-₹)</th>
                    <th className="text-right p-4 font-medium text-sm">Balance (₹)</th>
                    <th className="text-center p-4 font-medium text-sm">Action</th>
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
                          <div className="text-sm">
                            {transaction.description || transaction.notes || 'No description'}
                          </div>
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
                          <div className="flex justify-center">
                            {hasProof(transaction) ? (
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewProof(transaction)}
                                  className="h-8 w-8 p-0 hover:bg-primary/10"
                                  title="View Proof"
                                >
                                  <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveProof(transaction)}
                                  className="h-8 w-8 p-0 hover:bg-destructive/10"
                                  title="Remove Proof"
                                >
                                  <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditProof(transaction)}
                                className="h-8 w-8 p-0 hover:bg-primary/10"
                                title="Add Proof"
                              >
                                <Edit3 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              </Button>
                            )}
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
                          {transaction.description || transaction.notes || 'Transaction'}
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
                      <div className="space-y-1">
                        {(transaction.credit_amount && transaction.credit_amount > 0) && (
                          <div className="font-bold text-lg text-green-600">
                            +₹{transaction.credit_amount.toLocaleString()}
                          </div>
                        )}
                        {(transaction.debit_amount && transaction.debit_amount > 0) && (
                          <div className="font-bold text-lg text-red-600">
                            -₹{transaction.debit_amount.toLocaleString()}
                          </div>
                        )}
                        {(!transaction.credit_amount || transaction.credit_amount === 0) && 
                         (!transaction.debit_amount || transaction.debit_amount === 0) && (
                          <div className="font-bold text-lg text-muted-foreground">
                            ₹0
                          </div>
                        )}
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
                  
                  {/* Payment Type */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs px-2 py-1">
                        {transaction.payment_type?.replace('_', ' ') || 'receipt'}
                      </Badge>
                    </div>
                  </div>
                  
                  
                  {/* Action section */}
                  <div className="pt-3 border-t border-border/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Action:</span>
                      {hasProof(transaction) ? (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewProof(transaction)}
                            className="h-8 px-2 text-xs hover:bg-primary/10"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProof(transaction)}
                            className="h-8 px-2 text-xs hover:bg-destructive/10"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProof(transaction)}
                          className="h-8 px-2 text-xs hover:bg-primary/10"
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Add Proof
                        </Button>
                      )}
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
                {showAll 
                  ? "Try adjusting your search criteria or add a new transaction."
                  : "No transactions found in the latest upload. Try clicking 'Show All Transactions' to see all records, or upload a new file."
                }
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

        {/* Proof Edit Modal */}
        <Dialog open={isProofModalOpen} onOpenChange={setIsProofModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Proof</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {editingTransaction && (
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-sm font-medium">Transaction Details:</p>
                  <p className="text-sm text-muted-foreground">
                    {editingTransaction.description || editingTransaction.notes || 'No description'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(editingTransaction.date).toLocaleDateString()} • 
                    {editingTransaction.credit_amount > 0 ? 
                      `+₹${editingTransaction.credit_amount.toLocaleString()}` : 
                      `-₹${editingTransaction.debit_amount.toLocaleString()}`
                    }
                  </p>
                  {editingTransaction.proof && isImageUrl(editingTransaction.proof) && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Current proof image:</p>
                      <img 
                        src={editingTransaction.proof} 
                        alt="Current proof" 
                        className="w-20 h-20 object-cover rounded border"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {/* File Upload Option */}
                <div className="space-y-2">
                  <Label htmlFor="proof-file" className="text-sm font-medium">
                    Upload Proof File
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="proof-file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleProofFileChange}
                      className="text-sm"
                    />
                    {proofData.proofFile && (
                      <span className="text-xs text-green-600">
                        ✓ {proofData.proofFile.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: PDF, JPG, PNG, DOC, DOCX
                  </p>
                </div>

                {/* OR Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">OR</span>
                  </div>
                </div>

                {/* Text Notice Option */}
                <div className="space-y-2">
                  <Label htmlFor="proof-text" className="text-sm font-medium">
                    Enter Notice/Explanation
                  </Label>
                  <Textarea
                    id="proof-text"
                    placeholder="Enter a notice or explanation for this transaction..."
                    value={proofData.proof}
                    onChange={handleProofTextChange}
                    className="min-h-[100px] text-sm"
                  />
                  {editingTransaction?.proof && !isImageUrl(editingTransaction.proof) && (
                    <div className="mt-2 p-2 bg-secondary/30 rounded border text-sm">
                      <p className="text-xs text-muted-foreground mb-1">Current proof:</p>
                      <p className="text-sm">{editingTransaction.proof}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Provide a text explanation or notice for this transaction
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsProofModalOpen(false);
                    setEditingTransaction(null);
                    setProofData({ proof: "", proofFile: null });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProof}
                  className="btn-gradient"
                >
                  Save Proof
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Proof View Modal */}
        <Dialog open={isViewProofModalOpen} onOpenChange={setIsViewProofModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>View Proof</DialogTitle>
            </DialogHeader>
            
            {viewingTransaction && (
              <div className="space-y-4">
                {/* Transaction Details */}
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-sm font-medium">Transaction Details:</p>
                  <p className="text-sm text-muted-foreground">
                    {viewingTransaction.description || viewingTransaction.notes || 'No description'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(viewingTransaction.date).toLocaleDateString()} • 
                    {viewingTransaction.credit_amount > 0 ? 
                      `+₹${viewingTransaction.credit_amount.toLocaleString()}` : 
                      `-₹${viewingTransaction.debit_amount.toLocaleString()}`
                    }
                  </p>
                </div>

                {/* Proof Content */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Proof Note:</Label>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Text Proof</span>
                    </div>
                    <div className="border rounded-lg p-4 bg-secondary/20">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {viewingTransaction.proof}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsViewProofModalOpen(false);
                      setViewingTransaction(null);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}