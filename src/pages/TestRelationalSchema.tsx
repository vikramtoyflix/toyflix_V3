import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
}

export default function TestRelationalSchema() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (name: string, status: TestResult['status'], message: string, data?: any) => {
    setTests(prev => {
      const existing = prev.findIndex(t => t.name === name);
      const newTest = { name, status, message, data };
      
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newTest;
        return updated;
      } else {
        return [...prev, newTest];
      }
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    setTests([]);

    try {
      // Test 1: Check age_bands table
      updateTest('Age Bands Table', 'pending', 'Testing...');
      try {
        const { data, error } = await supabase
          .from('age_bands' as any)
          .select('*')
          .order('display_order');
        
        if (error) {
          updateTest('Age Bands Table', 'error', `Error: ${error.message}`);
        } else {
          updateTest('Age Bands Table', 'success', `Found ${data?.length || 0} age bands`, data);
        }
      } catch (err) {
        updateTest('Age Bands Table', 'error', `Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      // Test 2: Check toy_categories table
      updateTest('Toy Categories Table', 'pending', 'Testing...');
      try {
        const { data, error } = await supabase
          .from('toy_categories' as any)
          .select('*')
          .order('display_order');
        
        if (error) {
          updateTest('Toy Categories Table', 'error', `Error: ${error.message}`);
        } else {
          updateTest('Toy Categories Table', 'success', `Found ${data?.length || 0} categories`, data);
        }
      } catch (err) {
        updateTest('Toy Categories Table', 'error', `Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      // Test 3: Check bridge tables
      updateTest('Bridge Tables', 'pending', 'Testing...');
      try {
        const { data: ageBridge, error: ageError } = await supabase
          .from('toy_age_band' as any)
          .select('*')
          .limit(1);
        
        const { data: categoryBridge, error: categoryError } = await supabase
          .from('toy_category_bridge' as any)
          .select('*')
          .limit(1);
        
        if (ageError || categoryError) {
          updateTest('Bridge Tables', 'error', `Errors: ${ageError?.message || ''} ${categoryError?.message || ''}`);
        } else {
          updateTest('Bridge Tables', 'success', 'Bridge tables accessible');
        }
      } catch (err) {
        updateTest('Bridge Tables', 'error', `Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      // Test 4: Test PostgreSQL function with ToyFlix age ranges
      updateTest('PostgreSQL Function', 'pending', 'Testing...');
      try {
        // Test with realistic ToyFlix ages: 18 months (1.5y), 30 months (2.5y), 54 months (4.5y)
        const testAges = [18, 30, 54];
        const results = [];
        
        for (const ageMonths of testAges) {
          const { data, error } = await supabase
            .rpc('get_age_bands_for_months' as any, { target_age_months: ageMonths });
          
          if (error) throw error;
          
          const ageYears = (ageMonths / 12).toFixed(1);
          results.push({
            age: `${ageYears} years (${ageMonths} months)`,
            matches: data?.map((d: any) => d.band_label).join(', ') || 'none'
          });
        }
        
        updateTest('PostgreSQL Function', 'success', `Tested ${testAges.length} age ranges`, results);
      } catch (err) {
        updateTest('PostgreSQL Function', 'error', `Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      // Test 5: Performance test with ToyFlix realistic query
      updateTest('Performance Test', 'pending', 'Testing...');
      try {
        const start = performance.now();
        // Test with 30 months (2.5 years) - typical ToyFlix query
        const { data, error } = await supabase
          .from('age_bands' as any)
          .select('*')
          .filter('age_range', 'cs', '[30,31)');
        const time = performance.now() - start;
        
        if (error) {
          updateTest('Performance Test', 'error', `Error: ${error.message}`);
        } else {
          updateTest('Performance Test', 'success', `PostgreSQL range query: ${time.toFixed(2)}ms`, { 
            queryTime: `${time.toFixed(2)}ms`,
            resultCount: data?.length,
            queryType: 'PostgreSQL int4range with GiST index'
          });
        }
      } catch (err) {
        updateTest('Performance Test', 'error', `Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⚪';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Relational Schema Test</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Suite</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runTests} 
              disabled={isRunning}
              className="mb-4"
            >
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            
            <div className="space-y-4">
              {tests.map((test, index) => (
                <div key={index} className="border rounded p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getStatusIcon(test.status)}</span>
                    <h3 className="font-semibold">{test.name}</h3>
                    <span className={`text-sm ${getStatusColor(test.status)}`}>
                      {test.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-2">{test.message}</p>
                  
                  {test.data && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        View Data
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(test.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About This Test</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              This test validates the relational schema implementation including:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
              <li>Age bands table with PostgreSQL int4range</li>
              <li>Toy categories table</li>
              <li>Bridge tables for many-to-many relationships</li>
              <li>PostgreSQL range query functions</li>
              <li>Query performance with GiST indexes</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 