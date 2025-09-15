import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileBarChart,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  PieChart as PieChartIcon,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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

const recentReports = [
  {
    id: 1,
    name: "Q1 2024 Tax Summary",
    type: "tax_summary",
    generatedAt: "2024-04-01",
    size: "2.4 MB",
    format: "PDF",
  },
  {
    id: 2,
    name: "March 2024 Expenses",
    type: "monthly_expense", 
    generatedAt: "2024-03-31",
    size: "1.8 MB",
    format: "Excel",
  },
  {
    id: 3,
    name: "2023 Financial Summary",
    type: "yearly_summary",
    generatedAt: "2024-01-15",
    size: "5.2 MB",
    format: "PDF",
  },
];

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState("quarterly");
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateReport = async (reportType: string) => {
    setIsGenerating(reportType);
    
    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setIsGenerating(null);
    toast({
      title: "Report Generated Successfully!",
      description: `Your ${reportTypes.find(r => r.id === reportType)?.name} has been generated and is ready for download.`,
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
          className="mb-8"
        >
          <h1 className="heading-xl text-4xl mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate comprehensive financial reports and export your data
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Report Generation */}
          <div className="lg:col-span-2 space-y-6">
            {/* Report Configuration */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Card className="card-elevated p-6">
                <h3 className="heading-md text-xl mb-6">Generate New Report</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">₹1,24,500</div>
                    <div className="text-sm text-blue-600/80">Total Expenses</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">247</div>
                    <div className="text-sm text-green-600/80">Receipts</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">₹45,200</div>
                    <div className="text-sm text-purple-600/80">Tax Deductible</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">89%</div>
                    <div className="text-sm text-orange-600/80">Processed</div>
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
                {recentReports.map((report, index) => (
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
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <Button variant="ghost" className="w-full mt-4 text-primary">
                View All Reports
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
                <Button variant="outline">
                  <FileBarChart className="w-4 h-4 mr-2" />
                  Preview Data
                </Button>
                <Button className="btn-gradient">
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