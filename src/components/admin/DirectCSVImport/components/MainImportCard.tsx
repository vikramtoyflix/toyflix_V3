
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Shield } from "lucide-react";
import { ImportForm } from '../ImportForm';
import { validCategories, validSubscriptionCategories } from '../constants';
import { DirectImportOptions } from '../types';

interface MainImportCardProps {
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

export const MainImportCard: React.FC<MainImportCardProps> = ({
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Direct CSV Import - Exact Column Matching
          <div className="ml-auto flex items-center gap-2 text-sm text-green-600">
            <Shield className="w-4 h-4" />
            Admin Access Verified
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <Database className="w-4 h-4" />
          <AlertDescription>
            <strong>Direct Import Requirements:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>CSV must have exact column names matching database fields</li>
              <li>Required columns: name, category, subscription_category, age_range</li>
              <li>Valid categories: {validCategories.join(', ')}</li>
              <li>Valid subscription categories: {validSubscriptionCategories.join(', ')}</li>
              <li>Category and subscription_category now use the same values</li>
              <li>Supports both comma-separated and tab-separated files</li>
            </ul>
          </AlertDescription>
        </Alert>

        <ImportForm
          file={file}
          onFileChange={onFileChange}
          importOptions={importOptions}
          onOptionsChange={onOptionsChange}
          isProcessing={isProcessing}
          progress={progress}
          canImport={canImport}
          onPreview={onPreview}
          onImport={onImport}
        />
      </CardContent>
    </Card>
  );
};
