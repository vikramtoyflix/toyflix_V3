
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CSVImport from './CSVImport';
import EnhancedCSVImport from './EnhancedCSVImport';
import DirectCSVImport from './DirectCSVImport';
import { Database, FileSpreadsheet, Zap, Target } from 'lucide-react';

const AdminImport = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Data Import</h2>
        <p className="text-muted-foreground">
          Import toy data from various sources into your Supabase database.
        </p>
      </div>

      <Tabs defaultValue="direct-csv" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="direct-csv" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Direct CSV Import
          </TabsTrigger>
          <TabsTrigger value="enhanced-csv" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Enhanced CSV Import
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Basic CSV Import
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Database Migration
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="direct-csv" className="space-y-4">
          <DirectCSVImport />
        </TabsContent>
        
        <TabsContent value="enhanced-csv" className="space-y-4">
          <EnhancedCSVImport />
        </TabsContent>
        
        <TabsContent value="csv" className="space-y-4">
          <CSVImport />
        </TabsContent>
        
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Migration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Direct database migration tools will be available here. 
                For now, please use the Direct CSV import feature above for the most accurate data import.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminImport;
