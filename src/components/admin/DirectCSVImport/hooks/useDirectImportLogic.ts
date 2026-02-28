
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getStoredSession } from "@/hooks/auth/storage";
import { parseCSV, validateRow } from '../utils';
import { DirectImportPreview, DirectImportResults } from '../types';

export const useDirectImportLogic = () => {
  const { toast } = useToast();

  const generatePreview = async (
    file: File,
    setIsProcessing: (processing: boolean) => void,
    setPreview: (preview: DirectImportPreview) => void,
    setShowPreview: (show: boolean) => void
  ) => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const text = await file.text();
      const csvRows = parseCSV(text);
      
      const preview: DirectImportPreview = {
        totalRows: csvRows.length,
        validRows: 0,
        invalidRows: 0,
        sampleToys: [],
        warnings: [],
        validationSummary: {
          requiredFields: 0,
          enumValidation: 0,
          dataTypes: 0
        }
      };

      const processedToys: any[] = [];
      
      for (let i = 0; i < csvRows.length && processedToys.length < 5; i++) {
        const row = csvRows[i];
        const rowErrors = validateRow(row, i);
        
        if (rowErrors.length === 0) {
          preview.validRows++;
          processedToys.push({
            name: row.name || 'Unnamed Toy',
            category: row.category || '',
            subscription_category: row.subscription_category || '',
            age_range: row.age_range || '',
            brand: row.brand || null,
            pack: row.pack || 'standard',
            retail_price: row.retail_price ? parseFloat(row.retail_price) : null,
            rental_price: row.rental_price ? parseFloat(row.rental_price) : null,
            sku: row.sku || null
          });
        } else {
          preview.invalidRows++;
          preview.warnings.push(...rowErrors);
          
          rowErrors.forEach(error => {
            if (error.includes('is required')) {
              preview.validationSummary.requiredFields++;
            } else if (error.includes('Invalid category') || error.includes('Invalid subscription category')) {
              preview.validationSummary.enumValidation++;
            } else if (error.includes('must be a number')) {
              preview.validationSummary.dataTypes++;
            }
          });
        }
      }
      
      // Count remaining valid/invalid rows without processing them all
      for (let i = 5; i < csvRows.length; i++) {
        const row = csvRows[i];
        const rowErrors = validateRow(row, i);
        if (rowErrors.length === 0) {
          preview.validRows++;
        } else {
          preview.invalidRows++;
        }
      }
      
      preview.sampleToys = processedToys;
      
      if (preview.invalidRows > 0) {
        preview.warnings.unshift(`${preview.invalidRows} rows have validation errors that will prevent import.`);
      }
      
      setPreview(preview);
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

  const processImport = async (
    file: File,
    importOptions: any,
    user: any,
    canImport: boolean,
    setIsProcessing: (processing: boolean) => void,
    setProgress: (progress: number) => void,
    setResults: (results: DirectImportResults) => void
  ) => {
    if (!file || !canImport) return;

    setIsProcessing(true);
    setProgress(0);
    
    try {
      const text = await file.text();
      const csvRows = parseCSV(text);
      console.log('📊 Starting direct import with rows:', csvRows.length);

      if (!user) {
        throw new Error('No authenticated user found. Please sign in again.');
      }

      // Clear existing data if requested
      if (importOptions.clearExistingData) {
        console.log('🧹 Clearing existing data...');
        await clearExistingData();
        setProgress(10);
      }

      // Get stored custom session token
      console.log('🔍 Getting stored custom session...');
      const storedSession = getStoredSession();
      
      if (!storedSession || !storedSession.session_token) {
        console.error('❌ No valid custom session found');
        throw new Error('No valid session found. Please sign in again.');
      }

      const sessionToken = storedSession.session_token;
      console.log('🔑 Using custom session token');
      console.log('🔑 Token type:', typeof sessionToken);
      console.log('🔑 Token length:', sessionToken.length);

      console.log('🚀 Calling Edge Function for direct admin import...');
      
      const requestPayload = {
        csvData: csvRows,
        downloadImages: importOptions.downloadImages,
        skipDuplicates: importOptions.skipDuplicates,
        enhanced: false,
        importMode: 'direct',
        clearExistingData: false // Already handled above
      };

      console.log('📦 Request payload prepared:', {
        rowCount: csvRows.length,
        downloadImages: importOptions.downloadImages,
        skipDuplicates: importOptions.skipDuplicates
      });

      // Try Supabase client first with custom session token
      let response;
      let functionError = null;
      let importResults = null;

      try {
        console.log('📤 Attempting Supabase client invoke...');
        response = await supabase.functions.invoke('admin-csv-import', {
          body: requestPayload,
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            'Content-Type': 'application/json'
          },
        });

        console.log('📥 Supabase client response:', {
          error: response.error,
          hasData: !!response.data,
          status: response.status
        });

        functionError = response.error;
        importResults = response.data;

      } catch (clientError) {
        console.error('🚨 Supabase client failed:', clientError);
        
        // Fallback to direct HTTP request
        console.log('🔄 Falling back to direct HTTP request...');
        try {
          const directResponse = await fetch(
            `https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/admin-csv-import`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${sessionToken}`,
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_FSkXrLtW_fYLLGipAoq1Hw_ltq5Ij-J'
              },
              body: JSON.stringify(requestPayload)
            }
          );

          console.log('📥 Direct HTTP response status:', directResponse.status);

          if (!directResponse.ok) {
            const errorText = await directResponse.text();
            console.error('❌ Direct HTTP error:', errorText);
            throw new Error(`HTTP ${directResponse.status}: ${errorText}`);
          }

          importResults = await directResponse.json();
          console.log('✅ Direct HTTP success:', importResults);

        } catch (httpError) {
          console.error('🚨 Direct HTTP also failed:', httpError);
          throw new Error(`Both Supabase client and direct HTTP failed: ${httpError.message}`);
        }
      }

      // Handle function errors
      if (functionError) {
        console.error('❌ Edge Function error:', functionError);
        
        if (functionError.message?.includes('Invalid session token')) {
          throw new Error('Session token invalid. Please sign out and sign in again.');
        } else if (functionError.message?.includes('Admin privileges required')) {
          throw new Error('Admin privileges required. Contact support if you believe this is an error.');
        } else if (functionError.message?.includes('User not found')) {
          throw new Error('User account not found. Please contact support.');
        }
        
        throw new Error(`Import failed: ${functionError.message}`);
      }

      if (!importResults) {
        throw new Error('No response from import service');
      }

      console.log('✅ Import completed successfully:', {
        successful: importResults.successful,
        failed: importResults.failed
      });

      setResults(importResults);
      setProgress(100);

      toast({
        title: "Import completed",
        description: `Successfully imported ${importResults.successful} toys. ${importResults.failed} failed.`,
        variant: importResults.failed === 0 ? "default" : "destructive"
      });

    } catch (error) {
      console.error('💥 Import error:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      if (errorMessage.includes('session') || 
          errorMessage.includes('sign in') ||
          errorMessage.includes('token')) {
        toast({
          title: "Authentication Error",
          description: errorMessage,
          variant: "destructive"
        });
      } else if (errorMessage.includes('Admin privileges')) {
        toast({
          title: "Access Denied",
          description: errorMessage,
          variant: "destructive"
        });
      } else if (errorMessage.includes('Network error') || errorMessage.includes('HTTP')) {
        toast({
          title: "Network Error",
          description: "Failed to connect to import service. Please check your connection and try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Import failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    generatePreview,
    processImport
  };
};
