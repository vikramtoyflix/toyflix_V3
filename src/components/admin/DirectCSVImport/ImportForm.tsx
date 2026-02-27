
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Eye, Download } from "lucide-react";
import { ImportOptions } from './ImportOptions';
import { DirectImportOptions } from './types';
import { downloadSampleCSV } from './utils';
import { sampleCSVData } from './constants';

interface ImportFormProps {
  file: File | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  importOptions: DirectImportOptions;
  onOptionsChange: (options: DirectImportOptions) => void;
  isProcessing: boolean;
  progress: number;
  canImport: boolean;
  onPreview: () => void;
  onImport: () => void;
}

export const ImportForm: React.FC<ImportFormProps> = ({
  file,
  onFileChange,
  importOptions,
  onOptionsChange,
  isProcessing,
  progress,
  canImport,
  onPreview,
  onImport
}) => {
  const handleDownloadSample = () => {
    downloadSampleCSV(sampleCSVData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleDownloadSample}>
          <Download className="w-4 h-4 mr-2" />
          Download Sample CSV
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="csv-file">Select CSV File</Label>
        <Input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={onFileChange}
          disabled={isProcessing}
        />
      </div>

      <ImportOptions
        options={importOptions}
        onChange={onOptionsChange}
        disabled={isProcessing}
      />

      {file && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm">
            <strong>File:</strong> {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
          <div className="flex gap-2 mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onPreview}
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
        onClick={onImport} 
        disabled={!file || isProcessing || !canImport}
        className="w-full"
      >
        {isProcessing ? 'Processing...' : 'Import CSV'}
      </Button>
    </div>
  );
};
