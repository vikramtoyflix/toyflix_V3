
import React from 'react';
import { useToast } from "@/hooks/use-toast";
import { useDirectImportAuth } from './hooks/useDirectImportAuth';
import { useDirectImportState } from './hooks/useDirectImportState';
import { useDirectImportLogic } from './hooks/useDirectImportLogic';
import { AccessDeniedCard } from './components/AccessDeniedCard';
import { LoadingCard } from './components/LoadingCard';
import { MainImportCard } from './components/MainImportCard';
import { ImportPreview } from './ImportPreview';
import { ImportResults } from './ImportResults';

const DirectCSVImport = () => {
  const { toast } = useToast();
  const { user, userRole, roleLoading, canImport } = useDirectImportAuth();
  const {
    file,
    setFile,
    isProcessing,
    setIsProcessing,
    progress,
    setProgress,
    importOptions,
    setImportOptions,
    preview,
    setPreview,
    showPreview,
    setShowPreview,
    results,
    setResults,
    resetState
  } = useDirectImportState();
  
  const { generatePreview, processImport } = useDirectImportLogic();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      resetState();
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive"
      });
    }
  };

  const handleGeneratePreview = () => {
    generatePreview(file, setIsProcessing, setPreview, setShowPreview);
  };

  const handleProcessImport = () => {
    processImport(
      file,
      importOptions,
      user,
      canImport,
      setIsProcessing,
      setProgress,
      setResults
    );
  };

  if (roleLoading) {
    return <LoadingCard />;
  }

  if (!canImport) {
    return <AccessDeniedCard user={user} userRole={userRole} />;
  }

  return (
    <div className="space-y-6">
      <MainImportCard
        file={file}
        onFileChange={handleFileChange}
        importOptions={importOptions}
        onOptionsChange={setImportOptions}
        isProcessing={isProcessing}
        progress={progress}
        canImport={canImport}
        onPreview={handleGeneratePreview}
        onImport={handleProcessImport}
      />

      <ImportPreview preview={preview} show={showPreview} />

      {results && <ImportResults results={results} />}
    </div>
  );
};

export default DirectCSVImport;
