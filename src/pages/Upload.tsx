import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  Upload as UploadIcon,
  FileText,
  Receipt,
  CreditCard,
  X,
  Check,
  AlertCircle,
  Calendar,
  DollarSign,
  Tag,
  FileImage
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const fileTypes = [
  { id: "bank_statement", name: "Bank Statement", icon: FileText, color: "text-blue-600" },
  { id: "receipt", name: "Receipt", icon: Receipt, color: "text-green-600" },
  { id: "upi_proof", name: "UPI Transaction", icon: CreditCard, color: "text-purple-600" },
];

const categories = [
  "Business Expense",
  "Personal Expense", 
  "Travel & Transport",
  "Meals & Entertainment",
  "Office Supplies",
  "Software & Subscriptions",
  "Utilities",
  "Other"
];

export default function Upload() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [formData, setFormData] = useState({
    fileType: "",
    date: "",
    amount: "",
    category: "",
    notes: "",
  });
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setUploadComplete(false);
    
    // Auto-detect file type based on name
    const fileName = acceptedFiles[0]?.name.toLowerCase() || "";
    if (fileName.includes("statement") || fileName.includes("bank")) {
      setFormData(prev => ({ ...prev, fileType: "bank_statement" }));
    } else if (fileName.includes("receipt")) {
      setFormData(prev => ({ ...prev, fileType: "receipt" }));
    } else if (fileName.includes("upi") || fileName.includes("payment")) {
      setFormData(prev => ({ ...prev, fileType: "upi_proof" }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.fileType || !formData.category) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setUploadComplete(true);
          
          toast({
            title: "Upload successful!",
            description: `${files.length} file(s) uploaded and processed successfully.`,
          });
          
          // Reset form after 3 seconds
          setTimeout(() => {
            setFiles([]);
            setUploadComplete(false);
            setFormData({
              fileType: "",
              date: "",
              amount: "",
              category: "",
              notes: "",
            });
          }, 3000);
          
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
  };

  const selectedFileType = fileTypes.find(type => type.id === formData.fileType);

  return (
    <div className="min-h-screen bg-gradient">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="heading-xl text-4xl mb-2">Upload Documents</h1>
          <p className="text-muted-foreground">
            Upload your bank statements, receipts, and transaction proofs for processing
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Drop Zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Card className="card-elevated">
                <div
                  {...getRootProps()}
                  className={`p-8 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer ${
                    isDragActive
                      ? "border-primary bg-primary-light"
                      : "border-border hover:border-primary hover:bg-primary-light/30"
                  }`}
                >
                  <input {...getInputProps()} />
                  
                  <div className="text-center">
                    <motion.div
                      animate={{
                        scale: isDragActive ? 1.1 : 1,
                        rotate: isDragActive ? 5 : 0,
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                      <UploadIcon className="w-8 h-8 text-primary" />
                    </motion.div>
                    
                    <h3 className="heading-md text-xl mb-2">
                      {isDragActive ? "Drop files here" : "Drag & drop your files"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      or <span className="text-primary font-medium">browse</span> to choose files
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports PDF, JPG, PNG, CSV, XLS (Max 10MB per file)
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* File Preview */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="card-elevated p-6">
                    <h3 className="heading-md text-lg mb-4">Selected Files</h3>
                    <div className="space-y-3">
                      {files.map((file, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-primary-light rounded-lg">
                              <FileImage className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload Progress */}
            <AnimatePresence>
              {isUploading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="card-elevated p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
                      />
                      <span className="font-medium">Uploading files...</span>
                    </div>
                    <Progress value={uploadProgress} className="h-3" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {Math.round(uploadProgress)}% complete
                    </p>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {uploadComplete && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Card className="card-elevated p-6 border-success bg-success-light">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-success-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-success">Upload Complete!</h3>
                        <p className="text-sm text-success/80">
                          Your files have been processed and added to your records.
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Metadata Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card className="card-elevated p-6 sticky top-24">
              <h3 className="heading-md text-lg mb-6">Document Details</h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* File Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Document Type *</Label>
                  <Select
                    value={formData.fileType}
                    onValueChange={(value) => handleInputChange("fileType", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {fileTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center space-x-2">
                              <Icon className={`w-4 h-4 ${type.color}`} />
                              <span>{type.name}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Transaction Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange("date", e.target.value)}
                      className="h-11 pl-10"
                    />
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => handleInputChange("amount", e.target.value)}
                      className="h-11 pl-10"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleInputChange("category", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Notes</Label>
                  <Textarea
                    placeholder="Add any additional notes..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isUploading || uploadComplete || files.length === 0}
                  className="w-full btn-gradient h-11"
                >
                  {isUploading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Uploading...
                    </>
                  ) : uploadComplete ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Complete
                    </>
                  ) : (
                    <>
                      <UploadIcon className="w-4 h-4 mr-2" />
                      Upload Documents
                    </>
                  )}
                </Button>
              </form>

              {/* File Type Info */}
              {selectedFileType && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-primary-light rounded-lg"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <selectedFileType.icon className={`w-4 h-4 ${selectedFileType.color}`} />
                    <span className="text-sm font-medium">{selectedFileType.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This document will be processed and added to your financial records.
                  </p>
                </motion.div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}