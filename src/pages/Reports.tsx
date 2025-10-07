import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileBarChart,
  Download,
  Calendar,
  TrendingUp,
  FileText,
  PieChart as PieChartIcon,
  BarChart3,
  Eye,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { reportsAPI, transactionsAPI, dashboardAPI } from "@/services/supabaseApi";
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: "",
    endDate: ""
  });
  const [showAllReports, setShowAllReports] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch real data for stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardAPI.getStats,
  });

  const { data: allTransactions } = useQuery({
    queryKey: ['all-transactions'],
    queryFn: () => transactionsAPI.getAll({ showAll: true }),
  });

  // Debug: Log transaction data to console
  React.useEffect(() => {
    if (allTransactions && allTransactions.length > 0) {
      console.log('📊 Transaction Data Debug:', {
        totalTransactions: allTransactions.length,
        sampleTransaction: allTransactions[0],
        categories: [...new Set(allTransactions.map(t => t.category))],
        statuses: [...new Set(allTransactions.map(t => t.status))],
        totalDebitAmount: allTransactions.reduce((sum, t) => sum + (t.debit_amount || 0), 0)
      });
    }
  }, [allTransactions]);

  // Fetch recent reports
  const { data: recentReportsData, refetch: refetchReports } = useQuery({
    queryKey: ['recent-reports'],
    queryFn: reportsAPI.getAll,
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

  const handleGenerateReport = async (reportType: string) => {
    setIsGenerating(reportType);
    
    const params = {
      period: selectedPeriod,
      format: selectedFormat,
      ...(selectedPeriod === 'custom' && customDateRange)
    };

    generateReportMutation.mutate({ type: reportType, params });
  };

  const handleGenerateTaxSummaryPDF = async () => {
    if (!allTransactions || allTransactions.length === 0) {
      toast({
        title: "No Data",
        description: "No transactions found to generate tax summary.",
        variant: "destructive",
      });
      return;
    }

    // Calculate tax summary data
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
    const deductibleTransactions = allTransactions.filter((t: any) => 
      deductibleCategories.includes(t.category)
    );
    
    const deductibleAmount = deductibleTransactions.reduce((sum: number, t: any) => sum + (t.debit_amount || 0), 0);
    const taxSavings = deductibleAmount * 0.3;
    
    const categoryBreakdown = allTransactions.reduce((acc: any, t: any) => {
      acc[t.category] = (acc[t.category] || 0) + (t.debit_amount || 0);
      return acc;
    }, {});

    const taxSummaryData: TaxSummaryData = {
      title: "Tax Summary Report",
      generatedAt: new Date().toLocaleDateString(),
      period: `${selectedPeriod} (${new Date().getFullYear()})`,
      summary: {
        totalTransactions: allTransactions.length,
        totalAmount: allTransactions.reduce((sum: number, t: any) => sum + (t.debit_amount || 0), 0),
        deductibleAmount: deductibleAmount,
        taxSavings: taxSavings
      },
      categoryBreakdown: categoryBreakdown,
      deductibleTransactions: deductibleTransactions.map((t: any) => ({
        transaction_date: t.date,
        notes: t.notes,
        category: t.category,
        amount: t.debit_amount || 0
      }))
    };

    // Generate and download PDF
    downloadTaxSummaryPDF(taxSummaryData, `tax-summary-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: "Tax Summary Generated",
      description: "Your tax summary PDF is being generated and downloaded.",
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
        
        // Convert to TaxSummaryData format
        const taxSummaryData: TaxSummaryData = {
          title: reportContent.title || "Tax Summary Report",
          generatedAt: reportContent.generatedAt || new Date().toLocaleDateString(),
          period: reportContent.period || "N/A",
          summary: reportContent.summary,
          categoryBreakdown: reportContent.categoryBreakdown,
          deductibleTransactions: reportContent.deductibleTransactions
        };
        
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
    
    setPreviewData({
      totalTransactions: allTransactions.length,
      totalAmount: allTransactions.reduce((sum: number, t: any) => sum + t.amount, 0),
      categories: [...new Set(allTransactions.map((t: any) => t.category))],
      recentTransactions: allTransactions.slice(0, 10)
    });
    setIsPreviewOpen(true);
  };

  const handleExportAllData = async () => {
    if (!allTransactions) return;
    
    // Create CSV content with correct field names
    const headers = ['Date', 'Notes', 'Category', 'Amount', 'Type', 'Status'];
    const csvContent = [
      headers.join(','),
      ...allTransactions.map((t: any) => [
        t.transaction_date,
        `"${t.notes || 'No notes'}"`,
        t.category,
        t.amount,
        t.transaction_type,
        t.status
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

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Card className="card-elevated p-6">
                <h3 className="heading-md text-xl mb-6">Current Period Overview</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
                    <div className="text-sm sm:text-lg md:text-xl font-bold text-blue-700 mb-2 break-words leading-tight">
                      ₹{allTransactions?.reduce((sum: number, t: any) => sum + (t.debit_amount || 0), 0)?.toLocaleString('en-IN') || '0'}
                    </div>
                    <div className="text-xs font-medium text-blue-600/90 uppercase tracking-wide">Total Expenses</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100 shadow-sm">
                    <div className="text-2xl font-bold text-green-700 mb-2">
                      {allTransactions?.length || 0}
                    </div>
                    <div className="text-xs font-medium text-green-600/90 uppercase tracking-wide">Receipts</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-100 shadow-sm">
                    <div className="text-sm sm:text-lg md:text-xl font-bold text-purple-700 mb-2 break-words leading-tight">
                      ₹{(() => {
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
                        const deductibleAmount = allTransactions?.filter((t: any) => 
                          deductibleCategories.includes(t.category)
                        ).reduce((sum: number, t: any) => sum + (t.debit_amount || 0), 0) || 0;
                        return deductibleAmount.toLocaleString('en-IN');
                      })()}
                    </div>
                    <div className="text-xs font-medium text-purple-600/90 uppercase tracking-wide">Tax Deductible</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-100 shadow-sm">
                    <div className="text-2xl font-bold text-orange-700 mb-2">
                      {allTransactions ? (() => {
                        const processedCount = allTransactions.filter((t: any) => 
                          t.status === 'processed' || 
                          t.status === 'completed' || 
                          t.status === 'verified' ||
                          (t.category && t.category !== 'uncategorized')
                        ).length;
                        
                        // If no status field exists, assume all transactions with categories are processed
                        if (processedCount === 0 && allTransactions.some(t => t.category)) {
                          return Math.round((allTransactions.filter(t => t.category).length / allTransactions.length) * 100);
                        }
                        
                        return Math.round((processedCount / allTransactions.length) * 100);
                      })() : 0}%
                    </div>
                    <div className="text-xs font-medium text-orange-600/90 uppercase tracking-wide">Processed</div>
                  </div>
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
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDownloadReport(report)}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
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

        {/* Preview Data Modal */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Data Preview</DialogTitle>
            </DialogHeader>
            {previewData && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{previewData.totalTransactions}</div>
                    <div className="text-sm text-blue-600/80">Total Transactions</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">₹{previewData.totalAmount.toLocaleString()}</div>
                    <div className="text-sm text-green-600/80">Total Amount</div>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h4 className="font-semibold mb-3">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewData.categories.map((category: string, index: number) => (
                      <Badge key={index} variant="secondary">{category}</Badge>
                    ))}
                  </div>
                </div>

                {/* Recent Transactions */}
                <div>
                  <h4 className="font-semibold mb-3">Recent Transactions</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {previewData.recentTransactions.map((transaction: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                        <div>
                          <div className="font-medium text-sm">{transaction.notes || 'No notes'}</div>
                          <div className="text-xs text-muted-foreground">{transaction.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">₹{transaction.amount.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{new Date(transaction.transaction_date).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}