"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { IntegrationCard } from "@/components/integration-card"
import { CSVUploader } from "@/components/csv-uploader"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

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
  const [sheetPreview, setSheetPreview] = useState<{
    detectedHeaders?: string[];
    sheetType?: string;
    missingRequired?: string[];
    totalRows?: number;
    currentSheet?: string;
    preview?: string[][];
  } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
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

  // Check for Google OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const scope = searchParams.get('scope');
    
    if (code && scope && scope.includes('https://www.googleapis.com/auth/spreadsheets')) {
      handleGoogleOAuthCallback(code);
    }
  }, [searchParams]);

  // Helper function to handle Google OAuth callback
  const handleGoogleOAuthCallback = useCallback(async (code: string) => {
    try {
      setSheetsError(null);
      setIsSheetsLoading(true);
      
      const response = await axios.post('/api/google-sheets/oauth-callback', { code });
      
      if (response.data.success) {
        // Update Google Sheets integration status
        setIntegrations(prev => prev.map(integration => 
          integration.id === 'google-sheets' 
            ? { ...integration, status: 'connected' as const, lastSync: 'Just now' }
            : integration
        ));
        
        // Fetch available spreadsheets
        await fetchGoogleSpreadsheets();
        
        // Show success message
        setAlertMessage('Google Sheets connected successfully!');
        setAlertType('success');
        setShowAlert(true);
        
        // Move to next step
        setCurrentStep('select');
        
        // Clear URL parameters
        router.replace('/integrations');
      } else {
        throw new Error(response.data.error || 'Failed to connect Google Sheets');
      }
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      setSheetsError(error instanceof Error ? error.message : 'Failed to connect Google Sheets');
      
      setAlertMessage('Failed to connect Google Sheets. Please try again.');
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setIsSheetsLoading(false);
    }
  }, [router]);

  // Fetch available Google Spreadsheets
  const fetchGoogleSpreadsheets = useCallback(async () => {
    try {
      setSheetsError(null);
      setIsSheetsLoading(true);
      
      const response = await axios.get('/api/google-sheets/spreadsheets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setGoogleSpreadsheets(response.data.spreadsheets);
      } else {
        throw new Error(response.data.error || 'Failed to fetch spreadsheets');
      }
    } catch (error) {
      console.error('Error fetching spreadsheets:', error);
      setSheetsError(error instanceof Error ? error.message : 'Failed to fetch spreadsheets');
    } finally {
      setIsSheetsLoading(false);
    }
  }, [token]);

  // Preview selected spreadsheet
  const previewSpreadsheet = useCallback(async (spreadsheetId: string) => {
    try {
      setSheetsError(null);
      setIsPreviewLoading(true);
      
      const response = await axios.post('/api/google-sheets/preview', {
        spreadsheetId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSheetPreview(response.data.preview);
        setCurrentStep('preview');
      } else {
        throw new Error(response.data.error || 'Failed to preview spreadsheet');
      }
    } catch (error) {
      console.error('Error previewing spreadsheet:', error);
      setSheetsError(error instanceof Error ? error.message : 'Failed to preview spreadsheet');
    } finally {
      setIsPreviewLoading(false);
    }
  }, [token]);

  // Import data from Google Sheets
  const importFromSheets = useCallback(async () => {
    if (!selectedSpreadsheetId || !sheetPreview) return;
    
    try {
      setSheetsError(null);
      setImportStatus('loading');
      
      const response = await axios.post('/api/google-sheets/import', {
        spreadsheetId: selectedSpreadsheetId,
        sheetType: sheetPreview.sheetType,
        currentSheet: sheetPreview.currentSheet
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setImportStatus('success');
        setAlertMessage('Data imported successfully from Google Sheets!');
        setAlertType('success');
        setShowAlert(true);
        
        // Update integration status
        setIntegrations(prev => prev.map(integration => 
          integration.id === 'google-sheets' 
            ? { ...integration, lastSync: 'Just now' }
            : integration
        ));
        
        setCurrentStep('import');
      } else {
        throw new Error(response.data.error || 'Failed to import data');
      }
    } catch (error) {
      console.error('Error importing from sheets:', error);
      setSheetsError(error instanceof Error ? error.message : 'Failed to import data');
      setImportStatus('error');
      
      setAlertMessage('Failed to import data. Please try again.');
      setAlertType('error');
      setShowAlert(true);
    }
  }, [selectedSpreadsheetId, sheetPreview, token]);

  // Handle Google Sheets connection
  const handleGoogleSheetsConnect = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/integrations`;
    const scope = 'https://www.googleapis.com/auth/spreadsheets.readonly';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    
    window.location.href = authUrl;
  }, []);

  // Handle Google Sheets disconnect
  const handleGoogleSheetsDisconnect = useCallback(async () => {
    try {
      const response = await axios.post('/api/google-sheets/disconnect', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        // Update integration status
        setIntegrations(prev => prev.map(integration => 
          integration.id === 'google-sheets' 
            ? { ...integration, status: 'disconnected' as const, lastSync: 'Never' }
            : integration
        ));
        
        // Reset state
        setGoogleSpreadsheets([]);
        setSelectedSpreadsheetId(null);
        setSheetPreview(null);
        setCurrentStep('connect');
        
        setAlertMessage('Google Sheets disconnected successfully');
        setAlertType('success');
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Error disconnecting Google Sheets:', error);
      setAlertMessage('Failed to disconnect Google Sheets');
      setAlertType('error');
      setShowAlert(true);
    }
  }, [token]);

  // Check connection status on mount
  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        const response = await axios.get('/api/google-sheets/status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.connected) {
          // Update integration status
          setIntegrations(prev => prev.map(integration => 
            integration.id === 'google-sheets' 
              ? { ...integration, status: 'connected' as const, lastSync: response.data.lastSync || 'Unknown' }
              : integration
          ));
          
          // Fetch available spreadsheets
          await fetchGoogleSpreadsheets();
          setCurrentStep('select');
        }
      } catch (error) {
        console.error('Error checking connection status:', error);
        // Keep as disconnected if check fails
      }
    };
    
    if (token) {
      checkConnectionStatus();
    }
  }, [token, fetchGoogleSpreadsheets]);

  // Auto-hide alerts
  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
        setAlertMessage('');
        setAlertType(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  // Render Google Sheets connection step
  const renderConnectStep = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">📄</span>
          Connect Google Sheets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Connect your Google Sheets account to import data directly into the system. 
          This will allow you to sync product catalogs, customer lists, and other business data.
        </p>
        
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleGoogleSheetsConnect}
            disabled={isSheetsLoading}
            className="w-full"
          >
            {isSheetsLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connecting...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Connect Google Sheets
              </>
            )}
          </Button>
          
          {sheetsError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">{sheetsError}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Render spreadsheet selection step
  const renderSelectStep = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          Select Spreadsheet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Choose which Google Sheets spreadsheet you&apos;d like to import data from.
        </p>
        
        {isSheetsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : googleSpreadsheets.length > 0 ? (
          <div className="space-y-3">
            <Label htmlFor="spreadsheet-select">Available Spreadsheets:</Label>
            <Select 
              value={selectedSpreadsheetId || ''} 
              onValueChange={setSelectedSpreadsheetId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a spreadsheet..." />
              </SelectTrigger>
              <SelectContent>
                {googleSpreadsheets.map((spreadsheet) => (
                  <SelectItem key={spreadsheet.id} value={spreadsheet.id}>
                    {spreadsheet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedSpreadsheetId && (
              <Button 
                onClick={() => previewSpreadsheet(selectedSpreadsheetId)}
                disabled={isPreviewLoading}
                className="w-full"
              >
                {isPreviewLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Loading Preview...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Preview & Import
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No spreadsheets found in your Google Drive.</p>
            <p className="text-sm">Make sure you have access to the spreadsheets you want to import.</p>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep('connect')}
            className="flex-1"
          >
            Back
          </Button>
          <Button 
            variant="outline" 
            onClick={handleGoogleSheetsDisconnect}
            className="flex-1"
          >
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Render spreadsheet preview step
  const renderPreviewStep = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">👁️</span>
          Preview Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sheetPreview && (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Sheet Type:</Label>
                <p className="font-medium">{sheetPreview.sheetType || 'Unknown'}</p>
              </div>
              <div>
                <Label>Total Rows:</Label>
                <p className="font-medium">{sheetPreview.totalRows || 'Unknown'}</p>
              </div>
              <div>
                <Label>Current Sheet:</Label>
                <p className="font-medium">{sheetPreview.currentSheet || 'Unknown'}</p>
              </div>
              <div>
                <Label>Headers Detected:</Label>
                <p className="font-medium">{sheetPreview.detectedHeaders?.length || 0}</p>
              </div>
            </div>
            
            {sheetPreview.missingRequired && sheetPreview.missingRequired.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="font-medium text-amber-800">Missing Required Fields:</span>
                </div>
                <ul className="text-sm text-amber-700 list-disc list-inside">
                  {sheetPreview.missingRequired.map((field, index) => (
                    <li key={index}>{field}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {sheetPreview.preview && sheetPreview.preview.length > 0 && (
              <div>
                <Label className="mb-2 block">Data Preview (First 5 rows):</Label>
                <div className="border rounded-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          {sheetPreview.detectedHeaders?.map((header, index) => (
                            <th key={index} className="px-3 py-2 text-left font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sheetPreview.preview.map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-t">
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="px-3 py-2">
                                {cell || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep('select')}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={importFromSheets}
                disabled={importStatus === 'loading'}
                className="flex-1"
              >
                {importStatus === 'loading' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Data
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  // Render import success step
  const renderImportStep = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">✅</span>
          Import Complete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Data Imported Successfully!</h3>
          <p className="text-muted-foreground">
            Your data has been imported from Google Sheets and is now available in the system.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep('select')}
            className="flex-1"
          >
            Import Another Sheet
          </Button>
          <Button 
            onClick={() => {
              setCurrentStep('connect');
              setSheetPreview(null);
              setSelectedSpreadsheetId(null);
            }}
            className="flex-1"
          >
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Main render function for Google Sheets integration
  const renderGoogleSheetsIntegration = () => {
    switch (currentStep) {
      case 'connect':
        return renderConnectStep();
      case 'select':
        return renderSelectStep();
      case 'preview':
        return renderPreviewStep();
      case 'import':
        return renderImportStep();
      default:
        return renderConnectStep();
    }
  };

  // Check if Google Sheets is connected
  const isGoogleSheetsConnected = integrations.find(i => i.id === 'google-sheets')?.status === 'connected';

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {showAlert && (
        <div className={`p-4 rounded-lg border ${
          alertType === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {alertType === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{alertMessage}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid gap-6">
        {/* Integration Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onConnectClick={() => {
                if (integration.id === 'google-sheets') {
                  if (integration.status === 'connected') {
                    setCurrentStep('select');
                  } else {
                    setCurrentStep('connect');
                  }
                }
                // Handle other integrations...
              }}
            />
          ))}
        </div>

        {/* Google Sheets Integration UI */}
        {isGoogleSheetsConnected && (
          <div className="border rounded-lg p-6 bg-muted/30">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">📄</span>
              Google Sheets Integration
            </h2>
            {renderGoogleSheetsIntegration()}
          </div>
        )}

        {/* CSV Upload Section */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">CSV Upload</h2>
          <CSVUploader />
        </div>
      </div>
    </div>
  );
}

