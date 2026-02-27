
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Image } from "lucide-react";
import { DirectImportResults } from './types';

interface ImportResultsProps {
  results: DirectImportResults;
}

export const ImportResults: React.FC<ImportResultsProps> = ({ results }) => {
  return (
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
                  <strong>{toy.name}</strong> - {toy.category} / {toy.subscription_category} ({toy.age_range})
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
  );
};
