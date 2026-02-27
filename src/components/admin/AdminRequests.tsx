
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AdminRequest {
  id: string;
  user_id: string;
  request_type: string;
  status: string;
  details: any;
  created_at: string;
  updated_at: string;
}

const AdminRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['adminRequests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AdminRequest[];
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, notes }: { requestId: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from('admin_requests')
        .update({
          status,
          details: {
            ...requests?.find(r => r.id === requestId)?.details,
            admin_notes: notes,
            processed_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRequests'] });
      setProcessingRequestId(null);
      toast({
        title: "Request Updated",
        description: "The request has been processed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update request: " + error.message,
        variant: "destructive",
      });
      setProcessingRequestId(null);
    },
  });

  const handleApprove = (requestId: string) => {
    setProcessingRequestId(requestId);
    updateRequestMutation.mutate({
      requestId,
      status: 'approved',
      notes: 'Request approved by admin'
    });
  };

  const handleReject = (requestId: string) => {
    setProcessingRequestId(requestId);
    updateRequestMutation.mutate({
      requestId,
      status: 'rejected',
      notes: 'Request rejected by admin'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Admin Requests</h2>
        <div className="text-center py-8">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Admin Requests</h2>
        <Badge variant="outline">
          {requests?.filter(r => r.status === 'pending').length || 0} pending
        </Badge>
      </div>

      {!requests || requests.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No admin requests found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {request.request_type.replace('_', ' ').toUpperCase()}
                  </CardTitle>
                  <Badge className={getStatusColor(request.status)}>
                    {request.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>User ID:</strong> {request.user_id}
                    </div>
                    <div>
                      <strong>Created:</strong> {format(new Date(request.created_at), 'PPP')}
                    </div>
                  </div>

                  {request.details && (
                    <div>
                      <strong>Details:</strong>
                      <div className="mt-2 p-3 bg-muted rounded">
                        {request.details.reason && (
                          <p><strong>Reason:</strong> {request.details.reason}</p>
                        )}
                        {request.details.admin_notes && (
                          <p className="mt-2"><strong>Admin Notes:</strong> {request.details.admin_notes}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(request.id)}
                        disabled={processingRequestId === request.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingRequestId === request.id ? 'Processing...' : 'Approve'}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleReject(request.id)}
                        disabled={processingRequestId === request.id}
                      >
                        {processingRequestId === request.id ? 'Processing...' : 'Reject'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminRequests;
