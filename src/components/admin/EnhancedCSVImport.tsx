import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateImportPreview, parseEnhancedCSVRow, validateEnhancedToyData, processImagesForToy, EnhancedMappedToyData, ImportOptions, ImportPreview } from "@/utils/csvImport";
import { cleanImageUrls } from "@/utils/csvImport";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Upload, CheckCircle, XCircle, AlertTriangle, Download, Shield, Image, Eye, Trash2, RefreshCw } from "lucide-react";

const EnhancedCSVImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    downloadImages: false,
    clearExistingData: false,
    skipDuplicates: true,
    categoryMappingMode: 'fuzzy'
  });
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [results, setResults] = useState<{
    successful: number;
    failed: number;
    errors: string[];
    imported: EnhancedMappedToyData[];
    imageErrors: string[];
    duplicatesSkipped: number;
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
      setPreview(null);
      setShowPreview(false);
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

  const generatePreview = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const text = await file.text();
      const csvRows = parseCSV(text);
      const importPreview = generateImportPreview(csvRows, importOptions);
      setPreview(importPreview);
      setShowPreview(true);
    } catch (error) {
      toast({
        title: "Preview failed",
        description: "Failed to generate import preview",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearExistingData = async () => {
    try {
      console.log('Starting to clear existing toy data...');
      
      // Delete toy_images first (to avoid foreign key constraints)
      console.log('Deleting toy images...');
      const { error: deleteImagesError } = await supabase
        .from('toy_images')
        .delete()
        .neq('toy_id', '00000000-0000-0000-0000-000000000000'); // Delete all toy images

      if (deleteImagesError) {
        console.error('Failed to clear toy images:', deleteImagesError);
        throw new Error(`Failed to clear toy images: ${deleteImagesError.message}`);
      }
      console.log('Successfully deleted toy images');

      // Delete toys
      console.log('Deleting toys...');
      const { error: deleteToysError } = await supabase
        .from('toys')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all toys

      if (deleteToysError) {
        console.error('Failed to clear toys:', deleteToysError);
        throw new Error(`Failed to clear toys: ${deleteToysError.message}`);
      }
      console.log('Successfully deleted toys');

      toast({
        title: "Data cleared",
        description: "All existing toy data and images have been removed",
      });
    } catch (error) {
      console.error('Clear data error:', error);
      throw error;
    }
  };

  const processImport = async () => {
    if (!file || !canImport) return;

    setIsProcessing(true);
    setProgress(0);
    
    try {
      const text = await file.text();
      const csvRows = parseCSV(text);
      console.log('Parsed CSV rows:', csvRows.length);
      
      // Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication session invalid. Please sign in again.');
      }

      // Clear existing data if requested
      if (importOptions.clearExistingData) {
        console.log('Clearing existing data...');
        await clearExistingData();
        setProgress(10);
      }

      console.log('Using enhanced Edge Function for admin import...');
      
      // Use enhanced Edge Function with categoryMappingMode
      const { data: importResults, error: functionError } = await supabase.functions.invoke('admin-csv-import', {
        body: {
          csvData: csvRows,
          downloadImages: importOptions.downloadImages,
          skipDuplicates: importOptions.skipDuplicates,
          clearExistingData: false, // Already handled above
          enhanced: true,
          categoryMappingMode: importOptions.categoryMappingMode
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
    a.download = 'enhanced_toys_import_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
              <p className="mt-2">Only administrators can import toy data.</p>
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
            Enhanced CSV Import
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
              <strong>Enhanced Import Features:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Improved category mapping with confidence scoring</li>
                <li>Better image URL cleaning and validation</li>
                <li>Option to clear existing data before import</li>
                <li>Preview mode to review mappings before import</li>
                <li>Enhanced duplicate detection</li>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="download-images"
                checked={importOptions.downloadImages}
                onCheckedChange={(checked) => setImportOptions(prev => ({ ...prev, downloadImages: checked as boolean }))}
                disabled={isProcessing}
              />
              <Label htmlFor="download-images" className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Download and store images
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="clear-existing"
                checked={importOptions.clearExistingData}
                onCheckedChange={(checked) => setImportOptions(prev => ({ ...prev, clearExistingData: checked as boolean }))}
                disabled={isProcessing}
              />
              <Label htmlFor="clear-existing" className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Clear existing data first
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="skip-duplicates"
                checked={importOptions.skipDuplicates}
                onCheckedChange={(checked) => setImportOptions(prev => ({ ...prev, skipDuplicates: checked as boolean }))}
                disabled={isProcessing}
              />
              <Label htmlFor="skip-duplicates">Skip duplicates</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mapping-mode">Category Mapping</Label>
              <Select
                value={importOptions.categoryMappingMode}
                onValueChange={(value: 'strict' | 'fuzzy' | 'manual') => 
                  setImportOptions(prev => ({ ...prev, categoryMappingMode: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">Strict (High confidence only)</SelectItem>
                  <SelectItem value="fuzzy">Fuzzy (Best guess)</SelectItem>
                  <SelectItem value="manual">Manual review required</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {file && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>File:</strong> {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
              <div className="flex gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={generatePreview}
                  disabled={isProcessing}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Import
                </Button>
              </div>
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
            disabled={!file || isProcessing || !canImport || (!showPreview && importOptions.categoryMappingMode === 'manual')}
            className="w-full"
          >
            {isProcessing ? 'Processing...' : 'Import CSV'}
          </Button>
        </CardContent>
      </Card>

      {showPreview && preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Import Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{preview.totalRows}</div>
                <div className="text-sm text-blue-600">Total rows</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{preview.validRows}</div>
                <div className="text-sm text-green-600">Valid rows</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">{preview.invalidRows}</div>
                <div className="text-sm text-red-600">Invalid rows</div>
              </div>
            </div>

            {Object.keys(preview.categoryMappings).length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Category Mappings:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {Object.entries(preview.categoryMappings).map(([original, mapping]) => (
                    <div key={original} className="text-sm p-2 rounded flex justify-between items-center bg-muted">
                      <span>"{original}" → <strong>{mapping.mapped}</strong></span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        mapping.confidence === 'high' ? 'bg-green-100 text-green-700' :
                        mapping.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {mapping.confidence} ({mapping.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.warnings.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Warnings:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {preview.warnings.slice(0, 10).map((warning, index) => (
                    <div key={index} className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                      {warning}
                    </div>
                  ))}
                  {preview.warnings.length > 10 && (
                    <div className="text-sm text-muted-foreground">
                      ...and {preview.warnings.length - 10} more warnings
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.failed === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              Enhanced Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{results.successful}</div>
                <div className="text-sm text-green-600">Successfully imported</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">{results.failed}</div>
                <div className="text-sm text-red-600">Failed to import</div>
              </div>
              {results.duplicatesSkipped > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-700">{results.duplicatesSkipped}</div>
                  <div className="text-sm text-yellow-600">Duplicates skipped</div>
                </div>
              )}
              {results.imageErrors?.length > 0 && (
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-700">{results.imageErrors.length}</div>
                  <div className="text-sm text-orange-600">Image issues</div>
                </div>
              )}
            </div>

            {results.imageErrors?.length > 0 && (
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

export default EnhancedCSVImport;
