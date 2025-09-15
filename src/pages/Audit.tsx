import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Upload,
  Download,
  Trash2,
  Edit,
  FileText,
  Clock,
  User,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  AlertCircle,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Sample audit log data
const auditLogs = [
  {
    id: 1,
    action: "upload",
    description: "Uploaded bank statement - HDFC_March_2024.pdf",
    user: "Administrator",
    timestamp: "2024-01-15T10:30:00Z",
    status: "success",
    details: "File processed successfully, 23 transactions extracted",
    ipAddress: "192.168.1.100",
  },
  {
    id: 2,
    action: "export",
    description: "Generated quarterly tax report Q1-2024",
    user: "Administrator", 
    timestamp: "2024-01-15T09:15:00Z",
    status: "success",
    details: "PDF report generated with 156 transactions",
    ipAddress: "192.168.1.100",
  },
  {
    id: 3,
    action: "delete",
    description: "Deleted duplicate receipt - Amazon_order_12345.jpg",
    user: "Administrator",
    timestamp: "2024-01-14T16:45:00Z", 
    status: "success",
    details: "Duplicate receipt removed from system",
    ipAddress: "192.168.1.100",
  },
  {
    id: 4,
    action: "edit",
    description: "Updated transaction category - Office supplies to Business expense",
    user: "Administrator",
    timestamp: "2024-01-14T14:20:00Z",
    status: "success",
    details: "Transaction ID: TXN_001234",
    ipAddress: "192.168.1.100",
  },
  {
    id: 5,
    action: "upload",
    description: "Failed to upload corrupted file - receipt_scan.pdf",
    user: "Administrator",
    timestamp: "2024-01-14T11:30:00Z",
    status: "failed",
    details: "File validation failed - corrupted PDF structure",
    ipAddress: "192.168.1.100",
  },
];

const actionIcons = {
  upload: Upload,
  download: Download,
  export: Download,
  delete: Trash2,
  edit: Edit,
  view: FileText,
};

const actionColors = {
  upload: "text-blue-600 bg-blue-50",
  download: "text-green-600 bg-green-50",
  export: "text-green-600 bg-green-50",
  delete: "text-red-600 bg-red-50",
  edit: "text-yellow-600 bg-yellow-50", 
  view: "text-gray-600 bg-gray-50",
};

const statusColors = {
  success: "bg-success-light text-success border-success/20",
  failed: "bg-destructive-light text-destructive border-destructive/20",
  pending: "bg-warning-light text-warning border-warning/20",
};

const statusIcons = {
  success: CheckCircle2,
  failed: XCircle,
  pending: AlertCircle,
};

export default function Audit() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState("");

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch = log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = !actionFilter || actionFilter === "all" || log.action === actionFilter;
    const matchesStatus = !statusFilter || statusFilter === "all" || log.status === statusFilter;
    
    return matchesSearch && matchesAction && matchesStatus;
  });

  const actions = [...new Set(auditLogs.map(log => log.action))];
  const statuses = [...new Set(auditLogs.map(log => log.status))];

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="heading-xl text-4xl mb-2">Audit Log</h1>
              <p className="text-muted-foreground">
                Track all system activities and user actions
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex space-x-3 mt-4 sm:mt-0"
            >
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Log
              </Button>
              <Button className="btn-gradient">
                <Activity className="w-4 h-4 mr-2" />
                View Real-time
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
          <Card className="card-elevated p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Action Filter */}
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Range */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Audit Log Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card className="card-elevated p-6">
            <h3 className="heading-md text-xl mb-6 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-primary" />
              Activity Timeline
            </h3>

            <div className="space-y-6">
              {filteredLogs.map((log, index) => {
                const ActionIcon = actionIcons[log.action as keyof typeof actionIcons] || Activity;
                const StatusIcon = statusIcons[log.status as keyof typeof statusIcons] || CheckCircle2;
                const dateTime = formatDateTime(log.timestamp);
                
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="relative"
                  >
                    {/* Timeline line */}
                    {index < filteredLogs.length - 1 && (
                      <div className="absolute left-8 top-12 w-px h-16 bg-border" />
                    )}
                    
                    <div className="flex items-start space-x-4">
                      {/* Action Icon */}
                      <div className={`p-3 rounded-full ${actionColors[log.action as keyof typeof actionColors] || 'text-gray-600 bg-gray-50'}`}>
                        <ActionIcon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-1">
                              <h4 className="font-medium text-foreground">
                                {log.description}
                              </h4>
                              <Badge className={`text-xs ${statusColors[log.status as keyof typeof statusColors]}`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {log.status}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {log.details}
                            </p>
                            
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3" />
                                <span>{log.user}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{dateTime.date} at {dateTime.time}</span>
                              </div>
                              <span className="hidden sm:inline">IP: {log.ipAddress}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredLogs.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <Activity className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="heading-md text-xl mb-2">No activity found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search criteria to view more results.
                </p>
              </motion.div>
            )}
          </Card>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <Card className="card-interactive p-6 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-foreground">156</div>
            <div className="text-sm text-muted-foreground">Total Uploads</div>
          </Card>

          <Card className="card-interactive p-6 text-center">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-foreground">98.2%</div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </Card>

          <Card className="card-interactive p-6 text-center">
            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-foreground">2,847</div>
            <div className="text-sm text-muted-foreground">Total Actions</div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}