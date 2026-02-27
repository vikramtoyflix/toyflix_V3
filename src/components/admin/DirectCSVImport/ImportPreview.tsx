
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { DirectImportPreview } from './types';

interface ImportPreviewProps {
  preview: DirectImportPreview;
  show: boolean;
}

export const ImportPreview: React.FC<ImportPreviewProps> = ({ preview, show }) => {
  if (!show) return null;

  return (
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

        {preview.validationSummary && (
          <div>
            <h4 className="font-semibold mb-2">Validation Summary:</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-sm p-2 rounded bg-orange-50">
                <strong>{preview.validationSummary.requiredFields}</strong> Required field errors
              </div>
              <div className="text-sm p-2 rounded bg-yellow-50">
                <strong>{preview.validationSummary.enumValidation}</strong> Enum validation errors
              </div>
              <div className="text-sm p-2 rounded bg-purple-50">
                <strong>{preview.validationSummary.dataTypes}</strong> Data type errors
              </div>
            </div>
          </div>
        )}

        {preview.sampleToys.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Sample Valid Toys:</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {preview.sampleToys.map((toy, index) => (
                <div key={index} className="text-sm bg-green-50 p-2 rounded">
                  <strong>{toy.name}</strong> - {toy.category} / {toy.subscription_category} ({toy.age_range})
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
  );
};
