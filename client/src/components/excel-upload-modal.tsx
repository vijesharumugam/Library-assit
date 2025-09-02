import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Download, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface ExcelUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UploadResult {
  message: string;
  imported: number;
  errors: string[];
  books: any[];
}

export function ExcelUploadModal({ open, onOpenChange }: ExcelUploadModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const baseUrl = import.meta.env.PROD ? window.location.origin : '';
      const response = await fetch(`${baseUrl}/api/books/bulk-upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }
      
      return await response.json();
    },
    onSuccess: (result: UploadResult) => {
      setUploadResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/available"] });
      toast({
        title: "Upload completed",
        description: result.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select an Excel file (.xlsx, .xls) or CSV file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        Title: "Example Book Title",
        Author: "Author Name",
        ISBN: "978-0123456789",
        Category: "Fiction",
        Description: "Book description here",
        Publisher: "Publisher Name",
        "Total Copies": 5
      }
    ];

    const worksheet = "Title,Author,ISBN,Category,Description,Publisher,Total Copies\n" +
      "Example Book Title,Author Name,978-0123456789,Fiction,Book description here,Publisher Name,5\n" +
      "The Great Gatsby,F. Scott Fitzgerald,978-0-7432-7356-5,Classic,A classic American novel,Scribner,3";

    const blob = new Blob([worksheet], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'book_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="modal-excel-upload">
        <DialogHeader>
          <DialogTitle data-testid="title-excel-upload-modal" className="flex items-center">
            <FileSpreadsheet className="h-5 w-5 mr-2" />
            Bulk Upload Books from Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Instructions</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Upload an Excel (.xlsx, .xls) or CSV file containing book information. Your file should include the following columns:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><strong>Title</strong> (required)</div>
                <div><strong>Author</strong> (required)</div>
                <div><strong>ISBN</strong> (optional)</div>
                <div><strong>Category</strong> (required)</div>
                <div><strong>Description</strong> (optional)</div>
                <div><strong>Publisher</strong> (optional)</div>
                <div><strong>Total Copies</strong> (default: 1)</div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              data-testid="button-download-template"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          <Separator />

          {/* File Upload Area */}
          <div className="space-y-4">
            <Label htmlFor="file-upload">Upload File</Label>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              data-testid="drop-zone"
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                Drag and drop your Excel file here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse files
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInputChange}
                className="hidden"
                id="file-upload"
                data-testid="input-file-upload"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-browse-files"
              >
                Browse Files
              </Button>
            </div>

            {selectedFile && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium" data-testid="selected-file-name">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid="selected-file-size">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetForm}
                      data-testid="button-remove-file"
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Upload Progress */}
          {uploadMutation.isPending && (
            <div className="space-y-2">
              <Label>Uploading...</Label>
              <Progress value={50} className="w-full" data-testid="upload-progress" />
              <p className="text-sm text-muted-foreground">Processing Excel file...</p>
            </div>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription data-testid="upload-result-message">
                  {uploadResult.message}
                </AlertDescription>
              </Alert>

              {uploadResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">Errors encountered:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm max-h-32 overflow-y-auto">
                      {uploadResult.errors.slice(0, 10).map((error, index) => (
                        <li key={index} data-testid={`upload-error-${index}`}>
                          {error}
                        </li>
                      ))}
                      {uploadResult.errors.length > 10 && (
                        <li className="text-muted-foreground">
                          ... and {uploadResult.errors.length - 10} more errors
                        </li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="text-sm text-muted-foreground" data-testid="upload-summary">
                Successfully imported {uploadResult.imported} books.
                {uploadResult.errors.length > 0 && ` ${uploadResult.errors.length} errors occurred.`}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              data-testid="button-cancel-upload"
            >
              {uploadResult ? 'Close' : 'Cancel'}
            </Button>
            {selectedFile && !uploadResult && (
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                data-testid="button-upload-file"
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload Books"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}