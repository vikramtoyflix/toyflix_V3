import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Search, CheckCircle, XCircle, AlertCircle, Eye, Edit, Save, X } from 'lucide-react';

interface StagingUser {
  id: string;
  wp_user_id: number;
  phone: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  migration_status: string;
  integration_notes?: string;
  created_at: string;
}

interface StagingOrder {
  id: string;
  wp_order_id: number;
  total_amount: number;
  status: string;
  wp_status: string;
  migration_status: string;
  created_at: string;
  staged_user?: {
    first_name?: string;
    last_name?: string;
    phone: string;
  };
}

interface ProductMapping {
  id: string;
  wp_product_id: number;
  wp_product_name: string;
  suggested_toy_id?: string;
  suggested_toy_name?: string;
  mapping_confidence?: string;
  mapping_status: string;
  reviewer_notes?: string;
  final_toy_id?: string;
}

interface Toy {
  id: string;
  name: string;
  category: string;
  age_range: string;
}

interface MigrationBatch {
  batch_name: string;
  migration_type: string;
  status: string;
  total_records: number;
  successful_records: number;
  failed_records: number;
  start_time: string;
  end_time?: string;
}

export const MigrationReview: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stagingUsers, setStagingUsers] = useState<StagingUser[]>([]);
  const [stagingOrders, setStagingOrders] = useState<StagingOrder[]>([]);
  const [productMappings, setProductMappings] = useState<ProductMapping[]>([]);
  const [toys, setToys] = useState<Toy[]>([]);
  const [migrationBatches, setMigrationBatches] = useState<MigrationBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [selectedToyId, setSelectedToyId] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMigrationBatches(),
        loadStagingUsers(),
        loadStagingOrders(),
        loadProductMappings(),
        loadToys()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMigrationBatches = async () => {
    const { data, error } = await supabase
      .from('migration_staging.migration_batches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading migration batches:', error);
      return;
    }

    setMigrationBatches(data || []);
  };

  const loadStagingUsers = async () => {
    const { data, error } = await supabase
      .from('migration_staging.users_staging')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading staging users:', error);
      return;
    }

    setStagingUsers(data || []);
  };

  const loadStagingOrders = async () => {
    const { data, error } = await supabase
      .from('migration_staging.orders_staging')
      .select(`
        *,
        staged_user:staged_user_id (
          first_name,
          last_name,
          phone
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading staging orders:', error);
      return;
    }

    setStagingOrders(data || []);
  };

  const loadProductMappings = async () => {
    const { data, error } = await supabase
      .from('migration_staging.product_toy_mapping')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading product mappings:', error);
      return;
    }

    setProductMappings(data || []);
  };

  const loadToys = async () => {
    const { data, error } = await supabase
      .from('toys')
      .select('id, name, category, age_range')
      .order('name');

    if (error) {
      console.error('Error loading toys:', error);
      return;
    }

    setToys(data || []);
  };

  const handleSaveMapping = async (mappingId: string) => {
    if (!selectedToyId) {
      alert('Please select a toy for mapping');
      return;
    }

    const selectedToy = toys.find(t => t.id === selectedToyId);
    
    const { error } = await supabase
      .from('migration_staging.product_toy_mapping')
      .update({
        final_toy_id: selectedToyId,
        reviewer_notes: reviewNotes,
        mapping_status: 'mapped',
        is_reviewed: true,
        suggested_toy_id: selectedToyId,
        suggested_toy_name: selectedToy?.name
      })
      .eq('id', mappingId);

    if (error) {
      console.error('Error saving mapping:', error);
      alert('Error saving mapping');
      return;
    }

    // Refresh data
    await loadProductMappings();
    
    // Reset editing state
    setEditingMapping(null);
    setSelectedToyId('');
    setReviewNotes('');
  };

  const handleRejectMapping = async (mappingId: string) => {
    const { error } = await supabase
      .from('migration_staging.product_toy_mapping')
      .update({
        mapping_status: 'unmappable',
        is_reviewed: true,
        reviewer_notes: reviewNotes || 'No suitable toy match found'
      })
      .eq('id', mappingId);

    if (error) {
      console.error('Error rejecting mapping:', error);
      alert('Error rejecting mapping');
      return;
    }

    await loadProductMappings();
    setEditingMapping(null);
    setReviewNotes('');
  };

  const generateMappingSuggestions = async () => {
    try {
      const { data, error } = await supabase.rpc('migration_staging.suggest_toy_mappings');
      
      if (error) {
        console.error('Error generating suggestions:', error);
        alert('Error generating suggestions');
        return;
      }

      alert(`Generated ${data || 0} new mapping suggestions`);
      await loadProductMappings();
    } catch (error) {
      console.error('Error generating suggestions:', error);
      alert('Error generating suggestions');
    }
  };

  const filteredMappings = productMappings.filter(mapping =>
    mapping.wp_product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mapping.suggested_toy_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      needs_review: { color: 'bg-blue-100 text-blue-800', icon: Eye },
      mapped: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      unmappable: { color: 'bg-red-100 text-red-800', icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading migration data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Migration Review Dashboard</h2>
        <Button onClick={loadData} variant="outline">
          Refresh Data
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users ({stagingUsers.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({stagingOrders.length})</TabsTrigger>
          <TabsTrigger value="mappings">Product Mappings ({productMappings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {migrationBatches.map((batch) => (
              <Card key={batch.batch_name}>
                <CardHeader>
                  <CardTitle className="text-lg">{batch.batch_name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(batch.status)}
                    <Badge variant="outline">{batch.migration_type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>Total Records: {batch.total_records}</div>
                    <div>Successful: {batch.successful_records}</div>
                    <div>Failed: {batch.failed_records}</div>
                    <div>Started: {new Date(batch.start_time).toLocaleString()}</div>
                    {batch.end_time && (
                      <div>Completed: {new Date(batch.end_time).toLocaleString()}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Review the staged data before integrating into your live system. 
              Pay special attention to product mappings to ensure correct toy associations.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staged Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stagingUsers.slice(0, 20).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded">
                    <div>
                      <div className="font-medium">
                        {user.first_name} {user.last_name} ({user.phone})
                      </div>
                      <div className="text-sm text-gray-500">
                        WP ID: {user.wp_user_id} | Email: {user.email || 'N/A'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(user.migration_status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staged Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stagingOrders.slice(0, 20).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded">
                    <div>
                      <div className="font-medium">
                        Order #{order.wp_order_id} - ₹{order.total_amount}
                      </div>
                      <div className="text-sm text-gray-500">
                        Customer: {order.staged_user?.first_name} {order.staged_user?.last_name} 
                        ({order.staged_user?.phone})
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.migration_status)}
                      <Badge variant="outline">{order.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mappings" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search products or toys..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Button onClick={generateMappingSuggestions} variant="outline">
              Generate Suggestions
            </Button>
          </div>

          <div className="grid gap-4">
            {filteredMappings.map((mapping) => (
              <Card key={mapping.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium mb-2">
                        WooCommerce Product: {mapping.wp_product_name}
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        Product ID: {mapping.wp_product_id}
                      </div>
                      
                      {mapping.suggested_toy_name && (
                        <div className="text-sm mb-2">
                          <span className="font-medium">Suggested Toy:</span> {mapping.suggested_toy_name}
                          {mapping.mapping_confidence && (
                            <Badge variant="outline" className="ml-2">
                              {mapping.mapping_confidence} confidence
                            </Badge>
                          )}
                        </div>
                      )}

                      {editingMapping === mapping.id ? (
                        <div className="space-y-3 mt-4">
                          <Select value={selectedToyId} onValueChange={setSelectedToyId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a toy to map" />
                            </SelectTrigger>
                            <SelectContent>
                              {toys.map((toy) => (
                                <SelectItem key={toy.id} value={toy.id}>
                                  {toy.name} ({toy.category}, {toy.age_range})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Textarea
                            placeholder="Add review notes (optional)..."
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            rows={2}
                          />
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleSaveMapping(mapping.id)}
                              disabled={!selectedToyId}
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Save Mapping
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => handleRejectMapping(mapping.id)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Mark Unmappable
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setEditingMapping(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        mapping.reviewer_notes && (
                          <div className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Notes:</span> {mapping.reviewer_notes}
                          </div>
                        )
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getStatusBadge(mapping.mapping_status)}
                      {mapping.mapping_status === 'needs_review' && editingMapping !== mapping.id && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setEditingMapping(mapping.id);
                            setSelectedToyId(mapping.suggested_toy_id || '');
                            setReviewNotes(mapping.reviewer_notes || '');
                          }}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMappings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No product mappings found. Run a staging migration first.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}; 