import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  Search, 
  Filter, 
  Calendar,
  User,
  Edit,
  Database,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  user_id?: string;
  admin_user_id: string;
  action_details: any;
  metadata: any;
  created_at: string;
  admin_user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  affected_user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface AuditTrailViewerProps {
  resourceId?: string;
  resourceType?: string;
  userId?: string;
  maxEntries?: number;
}

export const AuditTrailViewer: React.FC<AuditTrailViewerProps> = ({
  resourceId,
  resourceType,
  userId,
  maxEntries = 50
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({
    start: '',
    end: ''
  });

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('admin_audit_logs')
        .select(`
          *,
          admin_user:admin_user_id (
            first_name,
            last_name,
            email
          ),
          affected_user:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(maxEntries);

      // Apply filters
      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }
      if (resourceType) {
        query = query.eq('resource_type', resourceType);
      }
      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (selectedAction) {
        query = query.eq('action', selectedAction);
      }
      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start);
      }
      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setAuditLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast.error('Failed to load audit trail');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [resourceId, resourceType, userId, selectedAction, dateRange]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'subscription_modification':
        return <Edit className="w-4 h-4 text-blue-600" />;
      case 'user_modification':
        return <User className="w-4 h-4 text-green-600" />;
      case 'subscription_deletion':
        return <Database className="w-4 h-4 text-red-600" />;
      case 'bulk_operation':
        return <RefreshCw className="w-4 h-4 text-purple-600" />;
      default:
        return <History className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'subscription_modification':
        return 'bg-blue-100 text-blue-800';
      case 'user_modification':
        return 'bg-green-100 text-green-800';
      case 'subscription_deletion':
        return 'bg-red-100 text-red-800';
      case 'bulk_operation':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatActionDetails = (details: any) => {
    if (!details) return 'No details available';
    
    if (typeof details === 'string') return details;
    
    if (details.field_name && details.new_value) {
      return `Updated ${details.field_name} to "${details.new_value}"`;
    }
    
    return JSON.stringify(details, null, 2);
  };

  const exportAuditLog = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Resource Type', 'Resource ID', 'Admin User', 'Affected User', 'Details'],
      ...auditLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.action,
        log.resource_type,
        log.resource_id,
        log.admin_user ? `${log.admin_user.first_name} ${log.admin_user.last_name}` : 'Unknown',
        log.affected_user ? `${log.affected_user.first_name} ${log.affected_user.last_name}` : 'N/A',
        formatActionDetails(log.action_details)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = auditLogs.filter(log => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.resource_type.toLowerCase().includes(searchLower) ||
      log.resource_id.toLowerCase().includes(searchLower) ||
      (log.admin_user && `${log.admin_user.first_name} ${log.admin_user.last_name}`.toLowerCase().includes(searchLower)) ||
      formatActionDetails(log.action_details).toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Audit Trail
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportAuditLog}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search audit logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="action">Action Type</Label>
            <select
              id="action"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">All Actions</option>
              <option value="subscription_modification">Subscription Modifications</option>
              <option value="user_modification">User Modifications</option>
              <option value="subscription_deletion">Subscription Deletions</option>
              <option value="bulk_operation">Bulk Operations</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
          </div>
          
          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
        </div>

        {/* Audit Log Entries */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">Loading audit logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No audit logs found</div>
          ) : (
            filteredLogs.map((log) => (
              <Card key={log.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getActionIcon(log.action)}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getActionColor(log.action)}>
                          {log.action.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                        </span>
                      </div>
                      
                      <div className="text-sm">
                        <strong>Resource:</strong> {log.resource_type} ({log.resource_id})
                      </div>
                      
                      <div className="text-sm">
                        <strong>Admin:</strong> {log.admin_user ? 
                          `${log.admin_user.first_name} ${log.admin_user.last_name} (${log.admin_user.email})` : 
                          'Unknown'
                        }
                      </div>
                      
                      {log.affected_user && (
                        <div className="text-sm">
                          <strong>Affected User:</strong> {log.affected_user.first_name} {log.affected_user.last_name} ({log.affected_user.email})
                        </div>
                      )}
                      
                      <div className="text-sm">
                        <strong>Details:</strong> {formatActionDetails(log.action_details)}
                      </div>
                      
                      {log.metadata && log.metadata.context && (
                        <div className="text-xs text-gray-500">
                          Context: {log.metadata.context}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
        
        {filteredLogs.length > 0 && (
          <div className="text-sm text-gray-500 text-center pt-4">
            Showing {filteredLogs.length} of {auditLogs.length} entries
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 