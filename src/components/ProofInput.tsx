import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, X, Image, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface ProofInputProps {
  value: string;
  onChange: (value: string) => void;
  transactionId?: string;
  disabled?: boolean;
}

export function ProofInput({ value, onChange, transactionId, disabled = false }: ProofInputProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [inputType, setInputType] = useState<'text' | 'image'>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Check if the value is a URL (uploaded file) or text
  const isImageUrl = value && (value.startsWith('http') || value.startsWith('/'));

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
      const fileName = `proof_${timestamp}_${randomId}.${fileExt}`;
      const filePath = `proofs/${fileName}`;

      console.log('Uploading proof file:', { fileName, filePath, fileSize: file.size });

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

      console.log('Proof uploaded successfully:', publicUrl);

      onChange(publicUrl);
      setPreviewUrl(publicUrl);
      setInputType('image');

      toast({
        title: "Success!",
        description: "Proof image uploaded successfully.",
      });
    } catch (error: any) {
      console.error('Proof upload error:', error);
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

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
    setInputType('text');
  };

  const handleRemoveProof = () => {
    onChange('');
    setPreviewUrl(null);
    setInputType('text');
  };

  const handleViewProof = () => {
    if (value && isImageUrl) {
      window.open(value, '_blank');
    }
  };

  return (
    <div className="space-y-3">
      <Label>Proof</Label>
      
      {/* Proof Display */}
      {value && (
        <Card className="p-3 bg-secondary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isImageUrl ? (
                <>
                  <Image className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Image uploaded</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Text proof</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {isImageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleViewProof}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveProof}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {!isImageUrl && (
            <div className="mt-2 p-2 bg-background rounded border text-sm">
              {value}
            </div>
          )}
        </Card>
      )}

      {/* Input Options */}
      {!value && (
        <div className="space-y-4">
          {/* File Upload - Primary Option */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Image className="w-4 h-4 text-primary" />
              <Label htmlFor="proof-file" className="text-sm font-medium">Upload Image Proof</Label>
            </div>
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={disabled || isUploading}
                className="hidden"
                id="proof-file"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="w-full border-2 border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? "Uploading..." : "Choose Image File"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              📷 Upload JPG, PNG, or GIF files up to 5MB
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Text Input - Secondary Option */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="proof-text" className="text-sm">Enter text proof</Label>
            </div>
            <Input
              id="proof-text"
              type="text"
              placeholder="Enter proof description or reference..."
              onChange={handleTextChange}
              disabled={disabled}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              💬 Enter a text description or reference number
            </p>
          </div>
        </div>
      )}

      {/* Add New Proof Button */}
      {value && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setInputType('text');
            onChange('');
            setPreviewUrl(null);
          }}
          disabled={disabled}
          className="w-full"
        >
          <FileText className="w-4 h-4 mr-2" />
          Add Different Proof
        </Button>
      )}
    </div>
  );
}
