import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Minus, Package, CheckCircle, XCircle } from 'lucide-react';
import { useRecordInventoryMovement } from '@/hooks/useInventoryManagement';
import { toast } from 'sonner';

const InventoryQuickTest: React.FC = () => {
  const [selectedToyId, setSelectedToyId] = useState('');
  const [adjustment, setAdjustment] = useState(1);
  const [testResults, setTestResults] = useState<Array<{
    action: string;
    success: boolean;
    message: string;
    timestamp: string;
  }>>([]);

  const recordMovement = useRecordInventoryMovement();

  const sampleToyIds = [
    '550e8400-e29b-41d4-a716-446655440000', // Sample UUID format
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
  ];

  const handleQuickTest = async (action: 'increase' | 'decrease') => {
    if (!selectedToyId) {
      toast.error('Please enter a toy ID');
      return;
    }

    const change = action === 'increase' ? adjustment : -adjustment;
    
    try {
      const result = await recordMovement.mutateAsync({
        toyId: selectedToyId,
        movementType: 'ADJUSTMENT',
        quantityChange: change,
        movementReason: `Quick test ${action}`,
        notes: `Test adjustment: ${change} units`
      });

      const testResult = {
        action: `${action} ${adjustment} units`,
        success: true,
        message: `Successfully adjusted inventory. ${result.toyName}: ${result.previousAvailable} → ${result.newAvailable}`,
        timestamp: new Date().toLocaleTimeString()
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]); // Keep last 10 results
      toast.success(testResult.message);

    } catch (error) {
      const testResult = {
        action: `${action} ${adjustment} units`,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toLocaleTimeString()
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);
      toast.error(testResult.message);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Inventory Quick Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="toyId">Toy ID</Label>
              <Input
                id="toyId"
                placeholder="Enter toy UUID or use dropdown"
                value={selectedToyId}
                onChange={(e) => setSelectedToyId(e.target.value)}
              />
              <Select value={selectedToyId} onValueChange={setSelectedToyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Or select a sample toy ID" />
                </SelectTrigger>
                <SelectContent>
                  {sampleToyIds.map(id => (
                    <SelectItem key={id} value={id}>Sample Toy {id.slice(-4)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustment">Adjustment Amount</Label>
              <Input
                id="adjustment"
                type="number"
                min="1"
                max="100"
                value={adjustment}
                onChange={(e) => setAdjustment(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={() => handleQuickTest('increase')} 
              disabled={recordMovement.isPending || !selectedToyId}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add {adjustment} Units
            </Button>
            <Button 
              onClick={() => handleQuickTest('decrease')} 
              disabled={recordMovement.isPending || !selectedToyId}
              variant="outline"
              className="flex-1"
            >
              <Minus className="h-4 w-4 mr-2" />
              Remove {adjustment} Units
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Test Results</CardTitle>
          <Button onClick={clearResults} variant="outline" size="sm">
            Clear Results
          </Button>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No test results yet</p>
              <p className="text-sm">Run some tests to see results here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <Alert key={index} className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <div className="flex items-start space-x-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <AlertDescription>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{result.action}</div>
                            <div className="text-sm">{result.message}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {result.timestamp}
                          </div>
                        </div>
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryQuickTest; 