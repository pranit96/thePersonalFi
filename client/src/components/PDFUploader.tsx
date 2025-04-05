
import { useForm } from "react-hook-form";

import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/context/WebSocketContext';
import { Button } from '@/components/ui/button';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function PDFUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { notifications } = useWebSocket();
  
  // Get PDF processing notifications
  const pdfNotifications = notifications.filter(
    n => n.type === 'pdf_processing_complete' || n.type === 'pdf_processing_error'
  ).slice(0, 5); // Show only last 5 notifications

  // Mutation to upload PDFs
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/upload/pdf', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type when uploading files with FormData
        // browser will automatically set it with correct boundary
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload files');
      }
      
      return response.json();
    },
    onMutate: () => {
      setUploadStatus('uploading');
    },
    onSuccess: (data) => {
      toast({
        title: 'Upload successful',
        description: `${data.message} (${data.files} files)`,
      });
      setUploadStatus('processing');
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Clear the files state
      setFiles([]);
    },
    onError: (error) => {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      setUploadStatus('error');
    },
    onSettled: () => {
      // Invalidate transactions query after uploading PDFs
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      
      // Validate files
      const validFiles = fileList.filter(file => {
        const isPDF = file.type === 'application/pdf';
        if (!isPDF) {
          toast({
            title: 'Invalid file type',
            description: `${file.name} is not a PDF file.`,
            variant: 'destructive',
          });
        }
        
        const isUnderSizeLimit = file.size <= 10 * 1024 * 1024; // 10MB
        if (!isUnderSizeLimit) {
          toast({
            title: 'File too large',
            description: `${file.name} exceeds the 10MB size limit.`,
            variant: 'destructive',
          });
        }
        
        return isPDF && isUnderSizeLimit;
      });
      
      setFiles(validFiles);
    }
  };

  const handleUpload = () => {
    if (files.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one PDF file to upload.',
        variant: 'destructive',
      });
      return;
    }
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('pdf', file);
    });
    
    uploadMutation.mutate(formData);
  };

  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (e.dataTransfer.files) {
      const fileList = Array.from(e.dataTransfer.files);
      const pdfFiles = fileList.filter(file => file.type === 'application/pdf');
      
      if (pdfFiles.length === 0) {
        toast({
          title: 'Invalid files',
          description: 'Please drop only PDF files.',
          variant: 'destructive',
        });
        return;
      }
      
      setFiles(pdfFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Display notifications from WebSocket if processing is happening
  if (uploadStatus === 'processing' && pdfNotifications.length > 0) {
    const latestNotification = pdfNotifications[0];
    
    if (latestNotification.type === 'pdf_processing_complete') {
      setUploadStatus('success');
      
      // Refresh transaction data after successful processing
      queryClient.invalidateQueries(['transactions']);
      
      // Also invalidate insights and other data that depends on transactions
      queryClient.invalidateQueries(['insights']);
      queryClient.invalidateQueries(['categories']);
      
      // Show a toast notification
      toast({
        title: "Transactions imported",
        description: `${latestNotification.data?.transactionCount || 'New'} transactions have been imported and are now available.`,
        variant: "default",
      });
    } else if (latestNotification.type === 'pdf_processing_error') {
      setUploadStatus('error');
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload Bank Statements
        </CardTitle>
        <CardDescription>
          Upload PDF bank statements to automatically extract transactions
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Status alerts */}
        {uploadStatus === 'processing' && (
          <Alert className="mb-4 bg-amber-50 text-amber-800 border-amber-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Processing PDFs</AlertTitle>
            <AlertDescription>
              Your bank statements are being processed. This may take a few moments.
            </AlertDescription>
          </Alert>
        )}
        
        {uploadStatus === 'success' && (
          <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
            <AlertTitle>Processing Complete</AlertTitle>
            <AlertDescription>
              {pdfNotifications[0]?.message || 'Your bank statements have been successfully processed.'}
            </AlertDescription>
          </Alert>
        )}
        
        {uploadStatus === 'error' && (
          <Alert className="mb-4 bg-red-50 text-red-800 border-red-200">
            <AlertTitle>Processing Error</AlertTitle>
            <AlertDescription>
              {pdfNotifications[0]?.message || 'There was an error processing your bank statements.'}
            </AlertDescription>
          </Alert>
        )}
        
        {/* File drag and drop area */}
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
            accept=".pdf,application/pdf"
          />
          
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">Drop PDF bank statements here or click to browse</p>
          <p className="text-xs text-muted-foreground">
            Supports multiple PDF files up to 10MB each
          </p>
        </div>
        
        {/* File list */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Selected Files ({files.length})</p>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Recent notifications */}
        {pdfNotifications.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Recent Activities</p>
            <ul className="space-y-2">
              {pdfNotifications.map((notification) => (
                <li key={notification.id} className="text-xs p-2 border rounded-md bg-muted/20">
                  <div className="flex justify-between mb-1">
                    <Badge variant={notification.type.includes('error') ? 'destructive' : 'default'} className="text-[10px]">
                      {notification.type.replace('pdf_processing_', '').toUpperCase()}
                    </Badge>
                    <time className="text-[10px] text-muted-foreground">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </time>
                  </div>
                  <p className="text-xs">{notification.message}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setFiles([]);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
          disabled={files.length === 0 || uploadMutation.isPending}
        >
          Clear
        </Button>
        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload Files'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}