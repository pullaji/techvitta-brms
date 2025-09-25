import { useState, useRef } from "react";
import { Upload, Image, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface InlineProofUploadProps {
  transactionId: string;
  currentProof?: string;
  onUploadComplete: (proofUrl: string) => void;
  disabled?: boolean;
}

export function InlineProofUpload({ 
  transactionId, 
  currentProof, 
  onUploadComplete, 
  disabled = false 
}: InlineProofUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Only consider it a real proof if it's a valid URL or starts with '/'
  // File names like "Output.xlsx" should be treated as empty/null
  const isImageUrl = currentProof && 
    (currentProof.startsWith('http') || currentProof.startsWith('/')) &&
    !currentProof.includes('.xlsx') && 
    !currentProof.includes('.pdf') &&
    !currentProof.includes('Output');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, GIF, WebP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create a unique filename with better naming
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const fileName = `proof_${transactionId}_${timestamp}_${randomId}.${fileExt}`;
      const filePath = `proofs/${fileName}`;

      console.log('Uploading inline proof file:', { fileName, filePath, fileSize: file.size });

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      console.log('Inline proof uploaded successfully:', publicUrl);

      onUploadComplete(publicUrl);

      toast({
        title: "Success!",
        description: "Proof image uploaded successfully.",
      });
    } catch (error: any) {
      console.error('Inline proof upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveProof = () => {
    onUploadComplete('');
  };

  const handleViewProof = () => {
    if (currentProof && isImageUrl) {
      window.open(currentProof, '_blank');
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {currentProof && isImageUrl ? (
        // Show uploaded image with view/remove options
        <>
          <div className="flex items-center space-x-1">
            <Image className="w-4 h-4 text-blue-500" />
            <button
              onClick={handleViewProof}
              className="text-primary hover:underline text-xs cursor-pointer"
            >
              View
            </button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveProof}
            disabled={disabled}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            title="Remove proof"
          >
            <X className="w-3 h-3" />
          </Button>
        </>
      ) : currentProof && !isImageUrl && 
           !currentProof.includes('.xlsx') && 
           !currentProof.includes('.pdf') && 
           !currentProof.includes('Output') &&
           currentProof.length > 0 ? (
        // Show text proof (only for real text, not file names)
        <div className="flex items-center space-x-1">
          <span className="text-xs text-muted-foreground truncate max-w-20">
            {currentProof}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveProof}
            disabled={disabled}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            title="Remove proof"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        // Show upload button with text
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={disabled || isUploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="h-8 px-3 text-xs text-primary hover:text-primary border-primary/20 hover:border-primary/40"
            title="Upload proof image"
          >
            <Upload className="w-3 h-3 mr-1" />
            Upload the proof
          </Button>
        </>
      )}
    </div>
  );
}
