
import { useState } from 'react';
import { DirectImportOptions, DirectImportResults, DirectImportPreview } from '../types';

export const useDirectImportState = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importOptions, setImportOptions] = useState<DirectImportOptions>({
    downloadImages: false,
    clearExistingData: false,
    skipDuplicates: true
  });
  const [preview, setPreview] = useState<DirectImportPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [results, setResults] = useState<DirectImportResults | null>(null);

  const resetState = () => {
    setResults(null);
    setPreview(null);
    setShowPreview(false);
  };

  return {
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
  };
};
