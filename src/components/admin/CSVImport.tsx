import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseEnhancedCSVRow, validateEnhancedToyData, processImagesForToy, EnhancedMappedToyData, ImportOptions } from "@/utils/csvImport";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Upload, CheckCircle, XCircle, AlertTriangle, Download, Shield, Image } from "lucide-react";

const CSVImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadImages, setDownloadImages] = useState(false);
  const [results, setResults] = useState<{
    successful: number;
    failed: number;
    errors: string[];
    imported: EnhancedMappedToyData[];
    imageErrors: string[];
  } | null>(null);
  
  const { toast } = useToast();
  const { user } = useCustomAuth();
  const { data: userRole, isLoading: roleLoading } = useUserRole();

  // Admin verification
  const isAdmin = userRole === 'admin';
  const canImport = user && isAdmin && !roleLoading;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResults(null);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive"
      });
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n');
    const headers = lines[0].split('\t');
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split('\t');
        const row: any = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim() || '';
        });
        rows.push(row);
      }
    }
    return rows;
  };

  const processImport = async () => {
    if (!file || !canImport) return;

    setIsProcessing(true);
    setProgress(0);
    
    try {
      const text = await file.text();
      const csvRows = parseCSV(text);
      console.log('Parsed CSV rows:', csvRows.length);
      
      // Check if user session is valid before import
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication session invalid. Please sign in again.');
      }

      console.log('Using secure Edge Function for admin import...');
      
      // Use Edge Function for secure admin import
      const { data: importResults, error: functionError } = await supabase.functions.invoke('admin-csv-import', {
        body: {
          csvData: csvRows,
          downloadImages: downloadImages
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (functionError) {
        console.error('Edge Function error:', functionError);
        throw new Error(`Import failed: ${functionError.message}`);
      }

      if (!importResults) {
        throw new Error('No response from import service');
      }

      setResults(importResults);
      setProgress(100);

      toast({
        title: "Import completed",
        description: `Successfully imported ${importResults.successful} toys. ${importResults.failed} failed.`,
        variant: importResults.failed === 0 ? "default" : "destructive"
      });

    } catch (error) {
      console.error('Import error:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Check for specific authentication errors
      if (errorMessage.includes('authentication') || errorMessage.includes('Invalid authentication token')) {
        errorMessage = 'Authentication failed. Please sign out and sign in again, then try importing.';
      } else if (errorMessage.includes('Admin privileges required')) {
        errorMessage = 'Admin privileges required for CSV import.';
      }
      
      toast({
        title: "Import failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = `ID\tType\tSKU\tName\tDescription\tMRP\tRental price\tCategories\tTags\tImages\tIn stock?\tStock\tBrands
1\tsimple\tTOY001\tBuilding Blocks Set\tColorful wooden building blocks\t2999\t299\tbig_toys\tfun,educational\timage1.jpg\t1\t50\tWooden Wonders
2\tsimple\tTOY002\tPuzzle Game\tEducational puzzle for kids\t1499\t199\teducational_toys\tpuzzle,brain\timage2.jpg\t1\t30\tBrain Games
3\tsimple\tTOY003\tAction Figure\tSuper hero action figure\t1999\t249\tbig_toys\taction,hero\timage3.jpg\t1\t25\tHero Toys`;
    
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_toys_import.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Show loading state while checking role
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verifying admin permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!canImport) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Shield className="w-5 h-5" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <strong>Admin privileges required</strong>
              <p className="mt-2">
                Only administrators can import toy data. Please ensure you're logged in with an admin account.
              </p>
              {user && (
                <p className="mt-2 text-sm">
                  Current user: {user.email} (Role: {userRole || 'loading...'})
                </p>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            CSV Import - WordPress Products
            <div className="ml-auto flex items-center gap-2 text-sm text-green-600">
              <Shield className="w-4 h-4" />
              Admin Access Verified
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={downloadSampleCSV}>
              <Download className="w-4 h-4 mr-2" />
              Download Sample CSV
            </Button>
          </div>

          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <strong>CSV Format Requirements:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Tab-separated values (TSV format from WordPress export)</li>
                <li>Required columns: ID, Name, Categories, Regular price, Stock</li>
                <li>Categories should include age ranges (e.g., "Age Wise Toys {'>'}  2-3 years")</li>
                <li>Images column should contain comma-separated URLs</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Select CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="download-images"
              checked={downloadImages}
              onCheckedChange={(checked) => setDownloadImages(checked as boolean)}
              disabled={isProcessing}
            />
            <Label htmlFor="download-images" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Download and store images locally
            </Label>
          </div>

          <Alert>
            <Image className="w-4 h-4" />
            <AlertDescription>
              <strong>Image Processing:</strong>
              <p className="mt-1">
                {downloadImages 
                  ? "Images will be downloaded from URLs and stored in Supabase storage. This may take longer but ensures images are always available."
                  : "Only image URLs will be stored. Images remain on external servers and may become unavailable over time."
                }
              </p>
            </AlertDescription>
          </Alert>

          {file && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>File:</strong> {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
              {downloadImages && (
                <p className="text-sm text-orange-600 mt-1">
                  <strong>Note:</strong> Image downloading enabled - import will take longer
                </p>
              )}
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Processing...</span>
                <span className="text-sm">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <Button 
            onClick={processImport} 
            disabled={!file || isProcessing || !canImport}
            className="w-full"
          >
            {isProcessing ? 'Processing...' : 'Import CSV'}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.failed === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{results.successful}</div>
                <div className="text-sm text-green-600">Successfully imported</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">{results.failed}</div>
                <div className="text-sm text-red-600">Failed to import</div>
              </div>
            </div>

            {results.imageErrors.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Image Processing Issues ({results.imageErrors.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {results.imageErrors.map((error, index) => (
                    <div key={index} className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.errors.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Import Errors:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {results.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.imported.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Successfully Imported Toys:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {results.imported.slice(0, 10).map((toy, index) => (
                    <div key={index} className="text-sm bg-green-50 p-2 rounded">
                      <strong>{toy.name}</strong> - {toy.category} ({toy.age_range})
                      {toy.image_url && toy.image_url.includes('supabase') && (
                        <span className="ml-2 text-xs text-blue-600">[Image stored locally]</span>
                      )}
                    </div>
                  ))}
                  {results.imported.length > 10 && (
                    <div className="text-sm text-muted-foreground">
                      ...and {results.imported.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CSVImport;
