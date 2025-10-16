import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  FileBarChart,
  Download,
  Calendar,
  TrendingUp,
  FileText,
  PieChart as PieChartIcon,
  BarChart3,
  Eye,
  X,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { reportsAPI, transactionsAPI, dashboardAPI, savedReportsAPI } from "@/services/supabaseApi";
import { supabase } from "@/lib/supabase";
import { downloadTaxSummaryPDF, downloadTaxSummaryHTML, type TaxSummaryData } from "@/utils/pdfGenerator";

const reportTypes = [
  {
    id: "tax_summary",
    name: "Tax Summary Report",
    description: "Quarterly tax report with all deductible expenses",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "monthly_expense",
    name: "Monthly Expense Report", 
    description: "Detailed breakdown of monthly expenses by category",
    icon: PieChartIcon,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    id: "yearly_summary",
    name: "Yearly Financial Summary",
    description: "Complete yearly overview of all transactions",
    icon: BarChart3,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
];

// Remove dummy data - will use real data from API

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState("quarterly");
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: "",
    endDate: ""
  });
  const [showAllReports, setShowAllReports] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Handle viewing saved report - Redirects to Transactions page with report data
  const handleViewSavedReport = async (report: any) => {
    try {
      const transactions = await savedReportsAPI.getTransactionsByReportId(report.id);
      
      if (!transactions || transactions.length === 0) {
        toast({
          title: "No Data",
          description: "No transactions found for this report.",
          variant: "destructive",
        });
        return;
      }

      // Store report data in sessionStorage to pass to Transactions page
      sessionStorage.setItem('viewReportData', JSON.stringify({
        reportName: report.report_name,
        reportId: report.id,
        transactions: transactions,
        totalTransactions: transactions.length,
        totalCredits: transactions.reduce((sum, t) => sum + (t.credit_amount || 0), 0),
        totalDebits: transactions.reduce((sum, t) => sum + (t.debit_amount || 0), 0),
        currentBalance: transactions.length > 0 && transactions[transactions.length - 1]?.balance ? transactions[transactions.length - 1].balance : 0,
      }));
      
      // Navigate to Transactions page
      navigate('/transactions', { state: { fromReport: true, reportId: report.id } });
      
      toast({
        title: "Redirecting",
        description: `Opening ${transactions.length} transactions in Transactions page...`,
      });
    } catch (error: any) {
      console.error('Error viewing saved report:', error);
      toast({
        title: "Error",
        description: "Failed to load report transactions.",
        variant: "destructive",
      });
    }
  };

  // Handle downloading saved report Excel
  const handleDownloadSavedReportExcel = async (report: any) => {
    try {
      if (report.pdf_url) {
        // If Excel URL exists, download from storage
        const link = document.createElement('a');
        link.href = report.pdf_url;
        link.download = report.pdf_filename || `${report.report_name}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Download Started",
          description: `Downloading ${report.report_name} Excel file...`,
        });
      } else {
        // If no Excel URL, generate Excel from transaction data
        const transactions = await savedReportsAPI.getTransactionsByReportId(report.id);
        
        if (!transactions || transactions.length === 0) {
          toast({
            title: "No Data",
            description: "No transactions found for this report.",
            variant: "destructive",
          });
          return;
        }

        // Generate Excel using the same logic as Transactions page
        const { generateTransactionExcel, downloadExcel } = await import('@/utils/transactionExcelGenerator');
        
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

        const totalTransactions = transactions.length;
        const totalCredits = transactions.reduce((sum, t) => sum + (t.credit_amount || 0), 0);
        const totalDebits = transactions.reduce((sum, t) => sum + (t.debit_amount || 0), 0);
        const currentBalance = transactions.length > 0 && transactions[transactions.length - 1]?.balance ? transactions[transactions.length - 1].balance : 0;
        
        const dates = transactions.map(t => new Date(t.date)).filter(d => !isNaN(d.getTime()));
        const startingDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0] : '';
        const endingDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0] : '';

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
          reportName: report.report_name
        });

        const filename = report.pdf_filename || `${report.report_name}_${new Date().toISOString().split('T')[0]}.xlsx`;
        downloadExcel(excelWorkbook, filename);
        
        toast({
          title: "Excel Generated",
          description: `${report.report_name} Excel file is being downloaded.`,
        });
      }
    } catch (error: any) {
      console.error('Error downloading saved report Excel:', error);
      toast({
        title: "Error",
        description: "Failed to download Excel file. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle deleting saved report
  const handleDeleteSavedReport = async (reportId: string) => {
    try {
      await savedReportsAPI.delete(reportId);
      queryClient.invalidateQueries({ queryKey: ['saved-reports'] });
      toast({
        title: "Success",
        description: "Saved report deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete saved report.",
        variant: "destructive",
      });
    }
  };

  // Fetch real data for stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardAPI.getStats,
  });


  const { data: savedReports } = useQuery({
    queryKey: ['saved-reports'],
    queryFn: savedReportsAPI.getAll,
  });


  // Fetch recent reports
  const { data: recentReportsData, refetch: refetchReports } = useQuery({
    queryKey: ['recent-reports'],
    queryFn: reportsAPI.getAll,
  });

  // Fetch all transactions for preview and export
  const { data: allTransactions } = useQuery({
    queryKey: ['all-transactions'],
    queryFn: () => transactionsAPI.getAll({ showAll: true }),
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: ({ type, params }: { type: string; params: any }) => 
      reportsAPI.generate(type, params),
    onSuccess: (data) => {
      toast({
        title: "Report Generated Successfully!",
        description: `Your ${reportTypes.find(r => r.id === data.type)?.name} has been generated and is ready for download.`,
      });
      refetchReports();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate report.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGenerating(null);
    }
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);
      
      if (error) throw error;
      return reportId;
    },
    onSuccess: (reportId) => {
      toast({
        title: "Report Deleted",
        description: "Report has been deleted successfully.",
      });
      refetchReports();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete report. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleGenerateReport = async (reportType: string) => {
    setIsGenerating(reportType);
    
    const params = {
      period: selectedPeriod,
      format: selectedFormat,
      ...(selectedPeriod === 'custom' && customDateRange)
    };

    console.log('🔍 Generating report with params:', params);
    console.log('🔍 Report type:', reportType);
    console.log('🔍 Available transactions:', (allTransactions as any[])?.length || 0);

    generateReportMutation.mutate({ type: reportType, params });
  };

  const handleDeleteReport = async (reportId: string) => {
    if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      deleteReportMutation.mutate(reportId);
    }
  };

  // Overview Card Component
  const OverviewCard = ({ 
    title, 
    value, 
    color, 
    bgColor, 
    borderColor, 
    icon: Icon 
  }: {
    title: string;
    value: string | number;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ComponentType<any>;
  }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`text-center p-4 ${bgColor} rounded-xl border ${borderColor} shadow-sm hover:shadow-md transition-shadow duration-200`}
    >
      <div className="flex items-center justify-center mb-2">
        <Icon className={`w-5 h-5 ${color} mr-2`} />
        <div className={`text-sm sm:text-lg md:text-xl font-bold ${color} break-words leading-tight`}>
          {value}
        </div>
      </div>
      <div className={`text-xs font-medium ${color}/90 uppercase tracking-wide`}>
        {title}
      </div>
    </motion.div>
  );


  const handleGenerateTaxSummaryPDF = async () => {
    toast({
      title: "Feature Disabled",
      description: "Tax summary generation is temporarily disabled.",
      variant: "destructive",
    });
  };

  const handleDownloadReport = async (report: any) => {
    try {
      // Get the actual report data from database
      const { data: reportData, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', report.id)
        .single();

      if (error || !reportData) {
        toast({
          title: "Error",
          description: "Report not found or could not be downloaded.",
          variant: "destructive",
        });
        return;
      }

      // Handle different report formats
      if (report.format === 'PDF' && report.type === 'tax_summary') {
        // Parse the stored data and generate proper PDF
        const base64Data = reportData.file_url.split(',')[1];
        const reportContent = JSON.parse(atob(base64Data));
        
        // Debug: Log the report content to see what's stored
        console.log('📊 Stored Report Content:', reportContent);
        
        // Extract data from the stored report structure
        const storedData = reportContent.data || reportContent;
        const transactions = storedData.transactions || [];
        const summary = storedData.summary || {};
        
        // Calculate tax summary data properly
        const deductibleCategories = [
          'business_expense', 
          'travel_transport', 
          'meals_entertainment', 
          'office_supplies', 
          'software_subscriptions', 
          'utilities',
          'medical',
          'education',
          'insurance',
          'fuel',
          'maintenance'
        ];
        
        const deductibleTransactions = transactions.filter((t: any) => 
          deductibleCategories.includes(t.category)
        );
        
        const deductibleAmount = deductibleTransactions.reduce((sum: number, t: any) => sum + (t.debit_amount || 0), 0);
        const taxSavings = deductibleAmount * 0.3;
        
        const categoryBreakdown = transactions.reduce((acc: any, t: any) => {
          acc[t.category] = (acc[t.category] || 0) + (t.debit_amount || 0);
          return acc;
        }, {});
        
        // Convert to TaxSummaryData format
        const taxSummaryData: TaxSummaryData = {
          title: reportContent.title || "Tax Summary Report",
          generatedAt: reportContent.generatedAt || new Date().toLocaleDateString(),
          period: summary.period || reportContent.period || "N/A",
          summary: {
            totalTransactions: summary.totalTransactions || transactions.length,
            totalAmount: summary.totalAmount || transactions.reduce((sum: number, t: any) => sum + (t.debit_amount || 0), 0),
            deductibleAmount: deductibleAmount,
            taxSavings: taxSavings
          },
          categoryBreakdown: categoryBreakdown,
          deductibleTransactions: deductibleTransactions.map((t: any) => ({
            transaction_date: t.date || t.transaction_date,
            notes: t.notes,
            category: t.category,
            amount: t.debit_amount || 0
          }))
        };
        
        // Debug: Log the processed tax summary data
        console.log('📊 Processed Tax Summary Data:', taxSummaryData);
        
        // Generate and download PDF
        downloadTaxSummaryPDF(taxSummaryData, `${report.name}.pdf`);
        
      } else {
        // Handle other formats (CSV, JSON)
        const base64Data = reportData.file_url.split(',')[1];
        const content = atob(base64Data);
        
        // Determine mime type and extension from the stored format
        let mimeType, extension;
        if (reportData.file_url.includes('text/csv')) {
          mimeType = 'text/csv';
          extension = 'csv';
        } else {
          mimeType = 'application/json';
          extension = 'json';
        }

        // Create and download file
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.name}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      toast({
        title: "Download Started",
        description: `${report.name} is being downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download report.",
        variant: "destructive",
      });
    }
  };

  const handlePreviewData = async () => {
    if (!allTransactions) return;
    
    const transactions = allTransactions as any[];
    setPreviewData({
      totalTransactions: transactions.length,
      totalAmount: transactions.reduce((sum: number, t: any) => sum + (t.credit_amount || 0) + (t.debit_amount || 0), 0),
      categories: [...new Set(transactions.map((t: any) => t.category))],
      recentTransactions: transactions.slice(0, 10)
    });
    setIsPreviewOpen(true);
  };

  const handleExportAllData = async () => {
    if (!allTransactions) return;
    
    const transactions = allTransactions as any[];
    // Create CSV content with correct field names
    const headers = ['Date', 'Notes', 'Category', 'Amount', 'Type', 'Status'];
    const csvContent = [
      headers.join(','),
      ...transactions.map((t: any) => [
        t.date,
        `"${t.notes || 'No notes'}"`,
        t.category,
        (t.credit_amount || 0) + (t.debit_amount || 0),
        t.payment_type,
        'completed'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: "All transaction data has been exported successfully.",
    });
  };

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
          <h1 className="heading-xl text-2xl sm:text-3xl lg:text-4xl mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Generate comprehensive financial reports and export your data
          </p>
        </motion.div>

        {/* Saved Reports Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-6"
        >
          <Card className="card-elevated p-4 sm:p-6">
            <h3 className="heading-md text-lg sm:text-xl mb-4 sm:mb-6">Saved Reports</h3>
            
            {savedReports && savedReports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedReports.map((report: any, index: number) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                    className="border border-border/50 rounded-lg p-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold text-sm truncate">{report.report_name}</h4>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {report.report_type}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Transactions:</span>
                        <span className="font-medium">{report.total_transactions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Credits:</span>
                        <span className="font-medium text-green-600">₹{(report.total_credits || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Debits:</span>
                        <span className="font-medium text-red-600">₹{(report.total_debits || 0).toLocaleString()}</span>
                      </div>
                      {report.date_range?.start && report.date_range?.end ? (
                        <div className="flex justify-between">
                          <span>Period:</span>
                          <span className="font-medium">
                            {new Date(report.date_range.start).toLocaleDateString()} - {new Date(report.date_range.end).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <span>Type:</span>
                          <span className="font-medium">All Transactions</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span className="font-medium">
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {report.pdf_filename && (
                        <div className="flex justify-between">
                          <span>PDF File:</span>
                          <span className="font-medium text-blue-600 text-xs truncate ml-2">
                            {report.pdf_filename}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleViewSavedReport(report)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleDownloadSavedReportExcel(report)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleDeleteSavedReport(report.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold mb-2">No Saved Reports</h4>
                <p className="text-muted-foreground text-sm">
                  Save filtered transactions from the Transactions page to see them here.
                </p>
              </div>
            )}
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Report Generation */}
          <div className="lg:col-span-2 space-y-6">
            {/* Report Configuration */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Card className="card-elevated p-4 sm:p-6">
                <h3 className="heading-md text-lg sm:text-xl mb-4 sm:mb-6">Generate New Report</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Report Period</label>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Export Format</label>
                    <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel (XLSX)</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custom Date Range */}
                {selectedPeriod === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-secondary/30 rounded-lg"
                  >
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={customDateRange.startDate}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={customDateRange.endDate}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Report Types */}
                <div className="space-y-4">
                  {reportTypes.map((report, index) => {
                    const Icon = report.icon;
                    const isGeneratingThis = isGenerating === report.id;
                    
                    return (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        className="border border-border rounded-lg p-4 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`p-3 rounded-xl ${report.bgColor}`}>
                              <Icon className={`w-6 h-6 ${report.color}`} />
                            </div>
                            <div>
                              <h4 className="font-semibold">{report.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {report.description}
                              </p>
                            </div>
                          </div>
                          
                          {report.id === 'tax_summary' ? (
                            <div className="space-y-2">
                              <Button
                                onClick={() => handleGenerateReport(report.id)}
                                disabled={isGenerating !== null}
                                className="btn-gradient w-full"
                              >
                                {isGeneratingThis ? (
                                  <>
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                                    />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Generate {selectedFormat}
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={handleGenerateTaxSummaryPDF}
                                variant="outline"
                                className="w-full"
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Quick Tax PDF
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleGenerateReport(report.id)}
                              disabled={isGenerating !== null}
                              className="btn-gradient"
                            >
                              {isGeneratingThis ? (
                                <>
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                                  />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4 mr-2" />
                                  Generate
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>

          </div>

          {/* Recent Reports */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card className="card-elevated p-6 sticky top-24">
              <h3 className="heading-md text-xl mb-6">Recent Reports</h3>
              
              <div className="space-y-4">
                {(recentReportsData || []).length > 0 ? (
                  (recentReportsData || []).slice(0, showAllReports ? undefined : 3).map((report: any, index: number) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="border border-border rounded-lg p-4 hover:bg-secondary/30 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-sm group-hover:text-primary transition-colors">
                            {report.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Generated on {new Date(report.generatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {report.format}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{report.size}</span>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDownloadReport(report)}
                            title="Download Report"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteReport(report.id)}
                            title="Delete Report"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileBarChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No reports generated yet</p>
                    <p className="text-xs">Generate your first report using the options on the left</p>
                  </div>
                )}
              </div>

              <Button 
                variant="ghost" 
                className="w-full mt-4 text-primary"
                onClick={() => setShowAllReports(!showAllReports)}
              >
                {showAllReports ? 'Show Less' : 'View All Reports'}
              </Button>
            </Card>
          </motion.div>
        </div>

        {/* Export All Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8"
        >
          <Card className="card-elevated p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="heading-md text-xl mb-2">Complete Data Export</h3>
                <p className="text-muted-foreground">
                  Download all your financial data in a comprehensive package for backup or migration.
                </p>
              </div>
              <div className="flex space-x-3 mt-4 md:mt-0">
                <Button variant="outline" onClick={handlePreviewData}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Data
                </Button>
                <Button className="btn-gradient" onClick={handleExportAllData}>
                  <Download className="w-4 h-4 mr-2" />
                  Export All Data
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}