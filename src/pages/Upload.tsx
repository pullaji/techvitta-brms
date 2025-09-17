import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload as UploadIcon,
  FileText,
  Receipt,
  CreditCard,
  X,
  Check,
  AlertCircle,
  FileImage
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { uploadAPI, transactionsAPI } from "@/services/supabaseApi";


export default function Upload() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, metadata }: { file: File; metadata: any }) => {
      return await uploadAPI.uploadFile(file, metadata);
    },
    onSuccess: (data, variables) => {
      setUploadedFiles(prev => [...prev, { ...data, originalFile: variables.file }]);
      
      // Invalidate transactions query to refresh the transactions list
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      toast({
        title: "File uploaded successfully!",
        description: `${variables.file.name} has been uploaded and processed.`,
      });
    },
    onError: (error: any, variables) => {
      toast({
        title: "Upload failed",
        description: `Failed to upload ${variables.file.name}: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Transaction creation mutation
  const createTransactionMutation = useMutation({
    mutationFn: transactionsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Transaction creation failed",
        description: error.message || "Failed to create transaction from receipt.",
        variant: "destructive",
      });
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validate files
    const validFiles = acceptedFiles.filter(file => {
      const fileSizeMB = file.size / (1024 * 1024);
      const isValidSize = fileSizeMB <= 10;
      const isValidType = file.type.startsWith('image/') || 
                         file.type === 'application/pdf' || 
                         file.type === 'text/csv' ||
                         file.type === 'application/vnd.ms-excel' ||
                         file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB. Please choose a smaller file.`,
          variant: "destructive",
        });
      }
      
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type.`,
          variant: "destructive",
        });
      }
      
      return isValidSize && isValidType;
    });

    if (validFiles.length === 0) {
      return;
    }

    setFiles(validFiles);
    setUploadComplete(false);
  }, [toast]);

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


  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadedFiles([]);

    try {
      // Upload files one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update progress
        setUploadProgress((i / files.length) * 100);

        // Prepare metadata (minimal metadata for simple upload)
        const metadata = {
          fileType: "document",
          category: "General",
        };

        // Upload file
        await uploadMutation.mutateAsync({ file, metadata });
      }

      // Complete upload
      setUploadProgress(100);
      setIsUploading(false);
      setUploadComplete(true);
      
      toast({
        title: "Upload successful!",
        description: `${files.length} file(s) uploaded and processed successfully.`,
      });
      
      // Reset after 3 seconds
      setTimeout(() => {
        setFiles([]);
        setUploadComplete(false);
        setUploadedFiles([]);
      }, 3000);
          
    } catch (error: any) {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred during upload.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="min-h-screen bg-gradient">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center lg:text-left"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="heading-xl text-3xl sm:text-4xl lg:text-5xl mb-2 bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
                Upload Documents
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
            Upload your bank statements, receipts, and transaction proofs for processing
          </p>
            </div>
            <div className="mt-4 lg:mt-0">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>System Ready</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-6">
            {/* File Drop Zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Card className="card-elevated overflow-hidden">
                <div
                  {...getRootProps()}
                  className={`relative p-6 sm:p-8 lg:p-12 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer group ${
                    isDragActive
                      ? "border-primary bg-gradient-to-br from-primary-light to-primary-light/50 scale-[1.02]"
                      : "border-border hover:border-primary hover:bg-gradient-to-br hover:from-primary-light/20 hover:to-primary-light/10 hover:scale-[1.01]"
                  }`}
                >
                  <input {...getInputProps()} />
                  
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(59,130,246)_1px,transparent_0)] bg-[length:20px_20px]"></div>
                  </div>
                  
                  <div className="relative text-center">
                    <motion.div
                      animate={{
                        scale: isDragActive ? 1.15 : 1,
                        rotate: isDragActive ? 10 : 0,
                        y: isDragActive ? -5 : 0,
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-primary-hover rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg"
                    >
                      <UploadIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </motion.div>
                    
                    <h3 className="heading-md text-lg sm:text-xl lg:text-2xl mb-2 sm:mb-3">
                      {isDragActive ? "Drop files here" : "Drag & drop your files"}
                    </h3>
                    <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
                      or <span className="text-primary font-semibold underline decoration-2 underline-offset-2">browse</span> to choose files
                    </p>
                    
                    {/* File Type Icons */}
                    <div className="flex justify-center space-x-4 mb-4">
                      {['PDF', 'JPG', 'PNG', 'CSV', 'XLS'].map((type, index) => (
                        <motion.div
                          key={type}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + index * 0.1 }}
                          className="px-2 py-1 bg-secondary rounded-md text-xs font-medium text-muted-foreground"
                        >
                          {type}
                        </motion.div>
                      ))}
                    </div>
                    
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Max 10MB per file • Up to 5 files
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
                  <Card className="card-elevated p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="heading-md text-lg">Selected Files</h3>
                      <Badge variant="secondary" className="text-xs">
                        {files.length} file{files.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {files.map((file, index) => {
                        const fileExtension = file.name.split('.').pop()?.toLowerCase();
                        const getFileIcon = () => {
                          switch (fileExtension) {
                            case 'pdf': return '📄';
                            case 'jpg':
                            case 'jpeg':
                            case 'png': return '🖼️';
                            case 'csv': return '📊';
                            case 'xls':
                            case 'xlsx': return '📈';
                            default: return '📁';
                          }
                        };
                        
                        return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                            className="group relative p-3 sm:p-4 bg-gradient-to-br from-secondary to-secondary/50 rounded-xl border border-border hover:border-primary/30 transition-all duration-200"
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-light to-primary-light/50 rounded-lg flex items-center justify-center text-lg">
                                  {getFileIcon()}
                                </div>
                            </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                  {file.name}
                                </p>
                              <p className="text-xs text-muted-foreground">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                                <div className="mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {fileExtension?.toUpperCase()}
                                  </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                                className="flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                            </div>
                        </motion.div>
                        );
                      })}
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
                  <Card className="card-elevated p-4 sm:p-6 border-primary/20 bg-gradient-to-r from-primary-light/10 to-primary-light/5">
                    <div className="flex items-center space-x-3 mb-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full"
                      />
                      <div>
                        <span className="font-semibold text-primary">Uploading files...</span>
                        <p className="text-xs text-muted-foreground">Processing your documents</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-primary">{Math.round(uploadProgress)}%</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {uploadComplete && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Card className="card-elevated p-4 sm:p-6 border-success/30 bg-gradient-to-r from-success-light to-success-light/50">
                    <div className="flex items-start space-x-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 30 }}
                        className="w-10 h-10 bg-success rounded-full flex items-center justify-center flex-shrink-0"
                      >
                        <Check className="w-6 h-6 text-success-foreground" />
                      </motion.div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-success text-lg mb-1">Upload Complete!</h3>
                        <p className="text-sm text-success/80 mb-3">
                          Your {files.length} file{files.length > 1 ? 's have' : ' has'} been processed and added to your records.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="text-xs">Processed</Badge>
                          <Badge variant="secondary" className="text-xs">Ready for Review</Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload Button */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="card-elevated p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="heading-md text-lg mb-2">Ready to Upload</h3>
                        <p className="text-sm text-muted-foreground">
                          {files.length} file{files.length > 1 ? 's' : ''} selected and ready for upload
                        </p>
                      </div>
                      <Button
                        onClick={handleUpload}
                        disabled={isUploading || uploadComplete}
                        className="btn-gradient h-12 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        {isUploading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                            />
                            Uploading...
                          </>
                        ) : uploadComplete ? (
                          <>
                            <Check className="w-5 h-5 mr-2" />
                            Complete
                          </>
                        ) : (
                          <>
                            <UploadIcon className="w-5 h-5 mr-2" />
                            Upload Files
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Uploaded Files Status */}
            <AnimatePresence>
              {uploadedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="card-elevated p-4 sm:p-6">
                    <h3 className="heading-md text-lg mb-4">Uploaded Files</h3>
                    <div className="space-y-3">
                      {uploadedFiles.map((uploadedFile, index) => (
                        <motion.div
                          key={uploadedFile.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-success-light rounded-lg">
                              <Check className="w-4 h-4 text-success" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{uploadedFile.originalFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {uploadedFile.file_size_mb.toFixed(2)} MB • {uploadedFile.file_type.toUpperCase()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-xs">
                              {uploadedFile.status}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </div>
    </div>
  );
}