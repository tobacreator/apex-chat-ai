"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { IntegrationCard } from "@/components/integration-card"
import { CSVUploader } from "@/components/csv-uploader"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from './ui/label';
import axios from 'axios';
import { useAuth } from '@/lib/auth-context';

export function IntegrationsManagement() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { token } = useAuth();
  const [googleSpreadsheets, setGoogleSpreadsheets] = useState<{ id: string; name: string }[]>([]);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string | null>(null);
  const [isSheetsLoading, setIsSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  
  // New state for enhanced features
  const [sheetPreview, setSheetPreview] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [customMapping, setCustomMapping] = useState<Record<string, number>>({});
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  
  // UX Improvement: Progressive disclosure states
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [currentStep, setCurrentStep] = useState<'connect' | 'select' | 'preview' | 'import'>('connect');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const [integrations, setIntegrations] = useState<{
    id: string;
    name: string;
    description: string;
    status: 'connected' | 'disconnected' | 'error';
    icon: string;
    lastSync: string;
    error?: string;
  }[]>([
    {
      id: "shopify",
      name: "Shopify",
      description: "Connect your Shopify store for product data and order information",
      status: "connected",
      icon: "🛍️",
      lastSync: "2 hours ago",
    },
    {
      id: "quickbooks",
      name: "QuickBooks",
      description: "Sync accounting data and customer information",
      status: "disconnected",
      icon: "📊",
      lastSync: "Never",
    },
    {
      id: "stripe",
      name: "Stripe",
      description: "Access payment and subscription data",
      status: "error",
      icon: "💳",
      lastSync: "1 day ago",
      error: "API key expired",
    },
    {
      id: "hubspot",
      name: "HubSpot CRM",
      description: "Integrate customer relationship management data",
      status: "disconnected",
      icon: "🎯",
      lastSync: "Never",
    },
    // --- NEW: Google Sheets Integration Card ---
    {
      id: "google-sheets",
      name: "Google Sheets",
      description: "Connect your Google Sheets for seamless data synchronization with AI.",
      status: "disconnected", // Initial status
      icon: "📄", // Google Sheets icon emoji
      lastSync: "Never",
    },
    // --- END NEW ---
  ]);

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) {
      if (status === 'google-sheets-success') {
        setAlertMessage('✅ Google Sheets integration successful!');
        setAlertType('success');
        setIntegrations(prev => prev.map(int => int.id === 'google-sheets' ? { ...int, status: 'connected', lastSync: 'Just now' } : int));
        setCurrentStep('connect'); // Start the step flow
      } else if (status === 'google-sheets-error') {
        setAlertMessage('❌ Google Sheets integration failed. Please try again.');
        setAlertType('error');
        setIntegrations(prev => prev.map(int => int.id === 'google-sheets' ? { ...int, status: 'error', error: 'Connection failed' } : int));
      }
      setShowAlert(true);

      // Clear the status from URL after showing
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('status');
      router.replace(`?${newSearchParams.toString()}`, { scroll: false });

      const timer = setTimeout(() => {
        setShowAlert(false);
        setAlertMessage('');
        setAlertType(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  // Debug: Monitor sheetPreview changes
  useEffect(() => {
    if (sheetPreview) {
      console.log('sheetPreview state updated:', {
        detectedHeaders: sheetPreview.detectedHeaders,
        sheetType: sheetPreview.sheetType,
        missingRequired: sheetPreview.missingRequired
      });
    }
  }, [sheetPreview]);

  // Check user's Google token status on load
  useEffect(() => {
    let isMounted = true;
    
    const checkUserStatus = async () => {
      if (!token) return;
      
      try {
        console.log('Integrations: Checking user status...');
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/integrations/google-sheets/check-user-status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log('Integrations: User status response:', response.data);
        
        if (!isMounted) return;
        
        if (response.data.status === 'user_found' && response.data.hasGoogleTokens) {
          // User has Google tokens, update integration status
          setIntegrations(prev => prev.map(int => int.id === 'google-sheets' ? { ...int, status: 'connected' } : int));
          
          // Only fetch spreadsheets if we don't have any yet
          if (googleSpreadsheets.length === 0) {
            await fetchSpreadsheets();
          }
        } else if (response.data.status === 'user_found' && !response.data.hasGoogleTokens) {
          console.log('Integrations: User found but no Google tokens. Need to reconnect.');
          setSheetsError('Google Sheets not connected. Please reconnect your Google account.');
          setIntegrations(prev => prev.map(int => int.id === 'google-sheets' ? { ...int, status: 'disconnected' } : int));
        } else {
          console.log('Integrations: User not found in database:', response.data);
          setSheetsError('User not found in database. Please contact support.');
          setIntegrations(prev => prev.map(int => int.id === 'google-sheets' ? { ...int, status: 'error', error: 'User not found' } : int));
        }
      } catch (error: any) {
        if (!isMounted) return;
        console.error('Error checking user status:', error);
        setSheetsError('Failed to check user status. Please try again.');
      }
    };
    
    checkUserStatus();
    
    return () => {
      isMounted = false;
    };
  }, [token]); // Removed isSheetsLoading from dependencies to prevent infinite loop

  // Separate function for fetching spreadsheets
  const fetchSpreadsheets = async () => {
    if (!token || isSheetsLoading) return; // Prevent multiple calls
    
    try {
      setIsSheetsLoading(true);
      setSheetsError(null);
      
      console.log('Integrations: Fetching spreadsheets. Token status:', token ? 'Present' : 'MISSING');
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/integrations/google-sheets/list-spreadsheets`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setGoogleSpreadsheets(response.data.spreadsheets);
    } catch (error: any) {
      console.error('Error listing Google Spreadsheets:', error);
      
      // Better error handling with specific messages
      let errorMessage = 'Failed to load spreadsheets.';
      
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please reconnect your Google account.';
        // Update integration status to disconnected
        setIntegrations(prev => prev.map(int => int.id === 'google-sheets' ? { ...int, status: 'disconnected' } : int));
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please check if Google Drive API is enabled.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setSheetsError(errorMessage);
    } finally {
      setIsSheetsLoading(false);
    }
  };



  const handleDownloadTemplate = async () => {
         try {
       const response = await axios.get(
         `${process.env.NEXT_PUBLIC_API_BASE_URL}/integrations/google-sheets/download-template`,
         { 
           headers: { Authorization: `Bearer ${token}` },
           responseType: 'blob'
         }
       );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'product-import-template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setShowAlert(true);
      setAlertMessage('✅ Template downloaded successfully!');
      setAlertType('success');
    } catch (error: any) {
      console.error('Error downloading template:', error);
      setShowAlert(true);
      setAlertMessage('❌ Failed to download template');
      setAlertType('error');
    }
  };

  const handlePreviewSheet = async () => {
    if (!selectedSpreadsheetId || !token) {
      setSheetsError('Please select a spreadsheet.');
      return;
    }
    
    setIsPreviewLoading(true);
    setSheetsError(null);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/integrations/google-sheets/preview-sheet`,
        { spreadsheetId: selectedSpreadsheetId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Sheet preview response:', response.data);
      console.log('Detected headers from response:', response.data.detectedHeaders);
      
      setSheetPreview(response.data);
      
      if (response.data.preview && response.data.preview.length > 0) {
        // Set available columns from the first row (headers)
        const headers = response.data.preview[0] || [];
        setAvailableColumns(headers);
      }
    } catch (error: any) {
      console.error('Error previewing sheet:', error);
      setSheetsError(error.response?.data?.error || 'Failed to preview sheet.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleImportGoogleSheetData = async () => {
    if (!selectedSpreadsheetId || !token) {
      setSheetsError('Please select a spreadsheet.');
      return;
    }
    setImportStatus('loading');
    setSheetsError(null);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/integrations/google-sheets/read-sheet-data`,
        { spreadsheetId: selectedSpreadsheetId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const { imported, errors, totalRows, detectedHeaders, missingRequired, sheetType } = response.data;
      let message = `✅ Imported ${imported} out of ${totalRows} rows from Google Sheet!`;
      
      if (sheetType) {
        message += `\n📋 Sheet type: ${sheetType === 'product_catalog' ? 'Product Catalog' : 
                                      sheetType === 'sales_data' ? 'Sales Data' : 'Unknown'}`;
      }
      
      if (detectedHeaders && detectedHeaders.length > 0) {
        message += `\n📋 Detected columns: ${detectedHeaders.join(', ')}`;
      }
      
      if (missingRequired && missingRequired.length > 0) {
        message += `\n⚠️ Missing required columns: ${missingRequired.join(', ')}`;
      }
      
      if (errors && errors.length > 0) {
        message += `\n⚠️ ${errors.length} rows had errors.`;
        console.log('Import errors:', errors);
      }
      
      setShowAlert(true);
      setAlertMessage(message);
      setAlertType('success');
      setImportStatus('success');
    } catch (error: any) {
      console.error('Error importing Google Sheet data:', error);
      let errorMessage = '❌ Google Sheets import failed';
      
      if (error.response?.data?.error) {
        errorMessage += `: ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      setShowAlert(true);
      setAlertMessage(errorMessage);
      setAlertType('error');
      setImportStatus('error');
    }
  };

  // --- NEW: Google Sheets Connect Handler ---
  const handleConnectGoogleSheets = () => {
    // Redirect to the backend's Google OAuth initiation endpoint, passing the JWT token for stateless OAuth
    if (!token) {
      setShowAlert(true);
      setAlertMessage('❌ You must be logged in to connect Google Sheets.');
      setAlertType('error');
      return;
    }
    window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL}/integrations/google-sheets/auth?token=${token}`;
  };

  // --- NEW: Clear Google Tokens Handler ---
  const handleClearGoogleTokens = async () => {
    if (!token) {
      setShowAlert(true);
      setAlertMessage('❌ You must be logged in to clear tokens.');
      setAlertType('error');
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/integrations/google-sheets/clear-tokens`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setShowAlert(true);
      setAlertMessage('✅ Google tokens cleared successfully. Please reconnect your Google account.');
      setAlertType('success');
      
      // Update integration status
      setIntegrations(prev => prev.map(int => int.id === 'google-sheets' ? { ...int, status: 'disconnected' } : int));
      setGoogleSpreadsheets([]);
      setSheetsError(null);
    } catch (error: any) {
      console.error('Error clearing tokens:', error);
      setShowAlert(true);
      setAlertMessage('❌ Failed to clear tokens. Please try again.');
      setAlertType('error');
    }
  };

  // --- NEW: Check Token Status Handler ---
  const handleCheckTokenStatus = async () => {
    if (!token) {
      setShowAlert(true);
      setAlertMessage('❌ You must be logged in to check token status.');
      setAlertType('error');
      return;
    }

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/integrations/google-sheets/token-status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      const status = response.data;
      const message = `Token Status:
• Access Token: ${status.hasAccessToken ? '✅ Present' : '❌ Missing'}
• Refresh Token: ${status.hasRefreshToken ? '✅ Present' : '❌ Missing'}
• User ID: ${status.userId}`;
      
      setShowAlert(true);
      setAlertMessage(message);
      setAlertType(status.hasAccessToken && status.hasRefreshToken ? 'success' : 'error');
    } catch (error: any) {
      console.error('Error checking token status:', error);
      setShowAlert(true);
      setAlertMessage('❌ Failed to check token status. Please try again.');
      setAlertType('error');
    }
  };
  
  // UX Improvement: Step management functions
  const handleStepComplete = (step: 'connect' | 'select' | 'preview' | 'import') => {
    const steps = ['connect', 'select', 'preview', 'import'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1] as any);
    }
  };

  const resetToStep = (step: 'connect' | 'select' | 'preview' | 'import') => {
    setCurrentStep(step);
    setImportStatus('idle');
    if (step === 'connect') {
      setSelectedSpreadsheetId(null);
      setSheetPreview(null);
    }
  };
  // --- END NEW ---

  return (
    <div className="space-y-6">
      {showAlert && alertType && (
        <div className={`p-4 rounded-lg ${alertType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {alertMessage}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600">Connect your data sources and business tools</p>
        </div>
      </div>

      {/* CSV Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Data Upload
          </CardTitle>
          <p className="text-sm text-gray-600">
            Upload CSV files containing product data, customer information, or other business data
          </p>
        </CardHeader>
        <CardContent>
          <CSVUploader />
        </CardContent>
      </Card>

      {/* Integration Status Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-gray-900">1</p>
                <p className="text-sm text-gray-600">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-2xl font-bold text-gray-900">2</p>
                <p className="text-sm text-gray-600">Disconnected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-gray-900">1</p>
                <p className="text-sm text-gray-600">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConnectClick={integration.id === 'google-sheets' ? handleConnectGoogleSheets : undefined}
          >
            {/* Google Sheets Connected UI - Improved UX */}
            {integration.id === 'google-sheets' && integration.status === 'connected' && (
              <div className="mt-4 space-y-4">
                {/* Step Progress Indicator */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
                      currentStep === 'connect' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>1</div>
                    <span className={`text-xs ${currentStep === 'connect' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                      Connected
                    </span>
                    <div className="w-4 h-px bg-gray-300"></div>
                    <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
                      currentStep === 'select' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>2</div>
                    <span className={`text-xs ${currentStep === 'select' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                      Select Sheet
                    </span>
                    <div className="w-4 h-px bg-gray-300"></div>
                    <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
                      currentStep === 'preview' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>3</div>
                    <span className={`text-xs ${currentStep === 'preview' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                      Preview
                    </span>
                    <div className="w-4 h-px bg-gray-300"></div>
                    <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
                      currentStep === 'import' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>4</div>
                    <span className={`text-xs ${currentStep === 'import' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                      Import
                    </span>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchSpreadsheets}
                      disabled={isSheetsLoading}
                      className="text-xs"
                    >
                      {isSheetsLoading ? '🔄 Loading...' : '🔄 Refresh'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleDownloadTemplate}
                      className="text-xs"
                    >
                      📥 Template
                    </Button>
                  </div>
                </div>

                {/* Step 1: Connection Status */}
                {currentStep === 'connect' && (
                  <div className="text-center py-4">
                    <div className="text-green-500 text-2xl mb-2">✅</div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Google Sheets Connected!</h4>
                    <p className="text-xs text-gray-600 mb-4">Your Google account is successfully connected.</p>
                    <Button 
                      onClick={() => handleStepComplete('connect')}
                      className="w-full"
                      size="sm"
                    >
                      Continue to Select Sheet →
                    </Button>
                  </div>
                )}

                {/* Step 2: Select Spreadsheet */}
                {currentStep === 'select' && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="spreadsheet-select" className="text-sm font-medium">Choose a Spreadsheet</Label>
                      <Select onValueChange={(value) => {
                        setSelectedSpreadsheetId(value);
                        if (value && value !== 'no-spreadsheets') {
                          handleStepComplete('select');
                        }
                      }} value={selectedSpreadsheetId || ''}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a spreadsheet to import from..." />
                        </SelectTrigger>
                        <SelectContent>
                          {googleSpreadsheets.length === 0 ? (
                            <SelectItem value="no-spreadsheets" disabled>No spreadsheets found</SelectItem>
                          ) : (
                            googleSpreadsheets.map(sheet => (
                              <SelectItem key={sheet.id} value={sheet.id}>{sheet.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedSpreadsheetId && (
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => resetToStep('connect')}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          ← Back
                        </Button>
                        <Button 
                          onClick={() => handleStepComplete('select')}
                          className="flex-1"
                          size="sm"
                        >
                          Preview Sheet →
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Preview Sheet */}
                {currentStep === 'preview' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-700">Preview Your Data</h4>
                      <Button 
                        onClick={handlePreviewSheet} 
                        variant="outline"
                        size="sm"
                        disabled={!selectedSpreadsheetId || isPreviewLoading}
                      >
                        {isPreviewLoading ? 'Loading...' : '👁️ Preview'}
                      </Button>
                    </div>
                    
                    {sheetPreview && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-2">
                          <strong>Found {sheetPreview.totalRows} rows</strong> • 
                          Sheet: {sheetPreview.currentSheet}
                        </div>
                        
                        {/* Quick Preview */}
                        {sheetPreview.preview && sheetPreview.preview.length > 0 && (
                          <div className="overflow-x-auto max-h-32">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b">
                                  {sheetPreview.preview[0].slice(0, 4).map((header: string, idx: number) => (
                                    <th key={idx} className="text-left p-1 font-medium">{header || `Col ${idx + 1}`}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sheetPreview.preview.slice(1, 3).map((row: any[], idx: number) => (
                                  <tr key={idx} className="border-b">
                                    {row.slice(0, 4).map((value: any, cellIdx: number) => (
                                      <td key={cellIdx} className="p-1 text-gray-700">
                                        {String(value).length > 15 ? String(value).substring(0, 15) + '...' : String(value)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        {/* Status Indicators */}
                        <div className="mt-2 space-y-1">
                          {sheetPreview.detectedHeaders && (
                            <div className="text-xs text-green-600">
                              ✅ Detected: {sheetPreview.detectedHeaders.join(', ')}
                            </div>
                          )}
                          {sheetPreview.missingRequired && sheetPreview.missingRequired.length > 0 && (
                            <div className="text-xs text-red-600">
                              ❌ Missing: {sheetPreview.missingRequired.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => resetToStep('select')}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        ← Back
                      </Button>
                      <Button 
                        onClick={() => handleStepComplete('preview')}
                        disabled={!sheetPreview || (sheetPreview?.missingRequired && sheetPreview.missingRequired.length > 0)}
                        className="flex-1"
                        size="sm"
                      >
                        Import Data →
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 4: Import Data */}
                {currentStep === 'import' && (
                  <div className="space-y-3">
                    <div className="text-center py-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Ready to Import</h4>
                      <p className="text-xs text-gray-600 mb-4">
                        Import {sheetPreview?.totalRows || 0} rows from your Google Sheet
                      </p>
                      
                      {importStatus === 'idle' && (
                        <div className="space-y-2">
                          <Button 
                            onClick={handleImportGoogleSheetData} 
                            className="w-full"
                            size="sm"
                          >
                            📥 Import Data
                          </Button>
                          <Button 
                            onClick={() => resetToStep('preview')}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            ← Back to Preview
                          </Button>
                        </div>
                      )}
                      
                      {importStatus === 'loading' && (
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                          <p className="text-xs text-gray-600">Importing data...</p>
                        </div>
                      )}
                      
                      {importStatus === 'success' && (
                        <div className="text-center">
                          <div className="text-green-500 text-2xl mb-2">✅</div>
                          <p className="text-sm text-green-600 mb-2">Import Successful!</p>
                          <Button 
                            onClick={() => resetToStep('connect')}
                            size="sm"
                          >
                            Import Another Sheet
                          </Button>
                        </div>
                      )}
                      
                      {importStatus === 'error' && (
                        <div className="text-center">
                          <div className="text-red-500 text-2xl mb-2">❌</div>
                          <p className="text-sm text-red-600 mb-2">Import Failed</p>
                          <Button 
                            onClick={() => setImportStatus('idle')}
                            variant="outline"
                            size="sm"
                          >
                            Try Again
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Advanced Options (Collapsible) */}
                <div className="border-t pt-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="w-full text-xs text-gray-600"
                  >
                    {showAdvancedOptions ? '▼' : '▶'} Advanced Options
                  </Button>
                  
                  {showAdvancedOptions && (
                    <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-medium text-gray-700">Debug & Utilities</h5>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleCheckTokenStatus}
                            className="text-xs"
                          >
                            🔍 Check Tokens
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleClearGoogleTokens}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            🗑️ Clear Tokens
                          </Button>
                        </div>
                      </div>
                      
                      {isSheetsLoading && <p className="text-gray-500 text-xs">Loading spreadsheets...</p>}
                      {sheetsError && <p className="text-red-500 text-xs">{sheetsError}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </IntegrationCard>
        ))}
      </div>
    </div>
  )
} 