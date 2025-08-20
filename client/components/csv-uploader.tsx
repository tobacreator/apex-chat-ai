"use client"

import { useState, useEffect } from "react"
import { Upload, Download, Trash2, AlertCircle, CheckCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import axios from "axios"

interface UploadedFile {
  id: string
  name: string
  size?: string
  status: "uploading" | "completed" | "error"
  progress: number
  type: string
  error?: string
  uploaded_at?: string
  validationErrors?: Array<{row: number, field: string, error: string}>
}

interface UploadResponse {
  id: string
  filename: string
  status: string
  file_type: string
  uploaded_at: string
}

export function CSVUploader() {
  const { token } = useAuth()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [selectedDataType, setSelectedDataType] = useState('products')
  const [availableDataTypes, setAvailableDataTypes] = useState<string[]>([])
  const [isLoadingDataTypes, setIsLoadingDataTypes] = useState(true)
  const [fileInputKey, setFileInputKey] = useState(0) // For resetting file input

  // Load available data types on component mount
  useEffect(() => {
    const loadDataTypes = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/upload/data-types`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setAvailableDataTypes(response.data.dataTypes || []);
      } catch (error) {
        console.error('Failed to load data types:', error);
        // Fallback to default types
        setAvailableDataTypes(['products', 'orders']);
      } finally {
        setIsLoadingDataTypes(false);
      }
    };

    if (token) {
      loadDataTypes();
    }
  }, [token]);

  // Load upload history on component mount
  useEffect(() => {
    const loadUploadHistory = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/upload/history`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        const historyFiles = response.data.uploads.map((upload: UploadResponse) => ({
          id: upload.id,
          name: upload.filename,
          status: upload.status === 'partial' ? "completed" : upload.status as "completed",
          progress: 100,
          type: upload.file_type === 'csv' ? 'CSV Data' : upload.file_type,
          uploaded_at: upload.uploaded_at,
          error: upload.status === 'partial' ? 'Some rows failed to import' : undefined
        }));
        
        setUploadedFiles(historyFiles);
      } catch (error) {
        console.error('Failed to load upload history:', error);
      }
    };

    if (token) {
      loadUploadHistory();
    }
  }, [token]);

  const handleFileUpload = () => {
    const input = document.getElementById('file-upload') as HTMLInputElement
    input?.click()
  }

  const downloadTemplate = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/upload/template?dataType=${selectedDataType}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedDataType}-template.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
      alert('Failed to download template. Please try again.');
    }
  }

  // Simple function to detect file type based on headers
  const detectFileType = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const firstLine = content.split('\n')[0].toLowerCase();
        
        if (firstLine.includes('sku') || firstLine.includes('product')) {
          resolve('products');
        } else if (firstLine.includes('order') || firstLine.includes('customer')) {
          resolve('orders');
        } else {
          resolve('products'); // Default fallback
        }
      };
      reader.readAsText(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    console.log('CSV Upload: Starting upload for file:', selectedFile.name);

    const id = Date.now().toString()
    
    // Add file to state immediately
    setUploadedFiles((files) => [
      ...files,
      {
        id,
        name: selectedFile.name,
        size: `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`,
        status: "uploading",
        progress: 0,
        type: "CSV Data"
      }
    ])

    // Auto-detect file type
    const detectedType = await detectFileType(selectedFile);
    console.log('CSV Upload: Auto-detected file type:', detectedType);
    
    // Update selected data type if different
    if (detectedType !== selectedDataType) {
      setSelectedDataType(detectedType);
      console.log('CSV Upload: Updated data type to:', detectedType);
    }
    
    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("dataType", detectedType)
    
    try {
      console.log('CSV Upload: Sending request to:', `${process.env.NEXT_PUBLIC_API_BASE_URL}/upload/csv`);
      
      const uploadResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/upload/csv`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: (progressEvent) => {
            const percent = progressEvent.total ? Math.round((progressEvent.loaded * 100) / progressEvent.total) : 0
            console.log('CSV Upload: Progress:', percent + '%');
            setUploadedFiles((files) =>
              files.map((file) => (file.id === id ? { ...file, progress: percent } : file))
            )
          },
        }
      )
      
      console.log('CSV Upload: Upload response:', uploadResponse.data);
      
      // Update the current file to completed status
      setUploadedFiles((files) =>
        files.map((file) => (file.id === id ? { 
          ...file, 
          status: "completed", 
          progress: 100
        } : file))
      )
      
      // Reload upload history
      const historyResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/upload/history`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const updatedHistoryFiles = historyResponse.data.uploads.map((upload: UploadResponse) => ({
        id: upload.id,
        name: upload.filename,
        status: upload.status === 'partial' ? "completed" : upload.status as "completed",
        progress: 100,
        type: upload.file_type === 'csv' ? 'CSV Data' : upload.file_type,
        uploaded_at: upload.uploaded_at,
        error: upload.status === 'partial' ? 'Some rows failed to import' : undefined
      }));
      
      setUploadedFiles(updatedHistoryFiles);
      
      // Reset file input
      setFileInputKey(prev => prev + 1);
      
    } catch (err: unknown) {
      console.error('CSV Upload: Error occurred:', err);
      
      // Type guard for axios errors
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: { errors?: Array<{ row: number; field: string; error: string }>; message?: string } } };
        console.error('CSV Upload: Error response:', axiosError.response?.data);
        
        // Handle validation errors (400 status)
        if (axiosError.response?.status === 400) {
          const validationErrors = axiosError.response.data?.errors;
          if (validationErrors && Array.isArray(validationErrors)) {
            // Create a simple error message for users
            const errorCount = validationErrors.length;
            const sampleErrors = validationErrors.slice(0, 3);
            let errorMessage = `Found ${errorCount} errors in your CSV file.\n\n`;
            errorMessage += `First few errors:\n`;
            sampleErrors.forEach((error: { row: number; field: string; error: string }) => {
              errorMessage += `• Row ${error.row}: ${error.field} - ${error.error}\n`;
            });
            if (errorCount > 3) {
              errorMessage += `\n... and ${errorCount - 3} more errors.\n\n`;
            }
            errorMessage += `💡 Tip: Download the template for ${detectedType} to see the correct format.`;
            
            alert(errorMessage);
          } else {
            alert(axiosError.response.data?.message || 'Validation failed. Please check your CSV file.');
          }
        }
        // Handle duplicate file error
        else if (axiosError.response?.status === 409) {
          alert('This file has already been uploaded. Please use a different filename or delete the existing upload first.');
        }
        // Handle other errors
        else {
          alert('Upload failed. Please check your file format and try again.');
        }
      } else {
        alert('Upload failed. Please check your file format and try again.');
      }
      
      setUploadedFiles((files) =>
        files.map((file) =>
          file.id === id
            ? { ...file, status: "error", progress: 0 }
            : file
        )
      )
      
      // Reset file input
      setFileInputKey(prev => prev + 1);
    }
  }

  const removeFile = async (id: string) => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/upload/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      setUploadedFiles((files) => files.filter((file) => file.id !== id))
    } catch (error) {
      console.error('Failed to remove file:', error)
      alert('Failed to remove file. Please try again.')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "uploading":
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CSV Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload CSV Files</h3>
            <p className="text-gray-600 mb-4">Drag and drop your CSV files here, or click to browse</p>

            {/* Data Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Type (Auto-detected):
              </label>
              <Select value={selectedDataType} onValueChange={setSelectedDataType}>
                <SelectTrigger className="w-64 mx-auto">
                  <SelectValue placeholder={isLoadingDataTypes ? "Loading..." : "Select data type"} />
                </SelectTrigger>
                <SelectContent>
                  {availableDataTypes.map((dataType) => (
                    <SelectItem key={dataType} value={dataType}>
                      {dataType === 'products' ? 'Products' : dataType === 'orders' ? 'Orders' : dataType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                💡 The system will automatically detect your file type, but you can change it here
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleFileUpload} className="gap-2">
                <Upload className="h-4 w-4" />
                Choose Files
              </Button>
              <Button onClick={downloadTemplate} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">📋 How to use templates:</p>
              <ol className="text-xs text-blue-700 space-y-1">
                <li>1. Download the template for your data type</li>
                <li>2. Open it in Excel or any spreadsheet app</li>
                <li>3. Fill in your data below the example row</li>
                <li>4. Save as CSV and upload here</li>
                <li>5. The system will auto-detect your file type!</li>
              </ol>
            </div>
          </div>
          
          {/* Hidden file input */}
          <input
            id="file-upload"
            key={fileInputKey}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Upload History */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(file.status)}
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {file.size} • {file.type} • {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {file.status === "uploading" && (
                      <div className="w-32">
                        <Progress value={file.progress} className="h-2" />
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 