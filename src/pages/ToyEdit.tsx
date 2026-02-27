
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToyForm } from '@/hooks/useToyForm';
import { ToyFormData } from '@/types/toy';
import ToyFormFields from '@/components/toy/ToyFormFields';
import { ToyUpdateLoadingOverlay } from '@/components/admin/toys/ToyUpdateLoadingOverlay';
import { ArrowLeft, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useCustomAuthStatus } from '@/hooks/useCustomAuthStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ToyEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNewToy = !id || id === 'new';
  const { hasConnectivity } = useNetworkStatus();
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useCustomAuthStatus();
  
  const { 
    formData, 
    setFormData, 
    isLoading, 
    handleSubmit,
    primaryImageIndex,
    setPrimaryImageIndex
  } = useToyForm(id, isNewToy);

  const handleFormDataChange = (updates: Partial<ToyFormData>) => {
    console.log('Form data change:', updates);
    setFormData({ ...formData, ...updates });
  };

  const handleCancel = () => {
    navigate('/admin?tab=toys');
  };

  const handleBackToList = () => {
    navigate('/admin?tab=toys');
  };

  const handleRefreshSession = () => {
    window.location.reload();
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3">Checking permissions...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show authentication error if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Access Denied</strong>
                <p className="mt-1">
                  {!isAuthenticated 
                    ? "You need to be logged in to access this page." 
                    : "You need admin privileges to edit toys."
                  }
                </p>
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => navigate('/auth')} size="sm">
                    {!isAuthenticated ? "Log In" : "Check Permissions"}
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/admin')} size="sm">
                    Back to Admin
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading && !isNewToy && !formData.name) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3">Loading toy data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <ToyUpdateLoadingOverlay 
        isVisible={isLoading} 
        message="Saving changes..."
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Toys
          </Button>
        </div>

        {/* Network Status Alert */}
        {!hasConnectivity && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>No internet connection</strong>
              <p className="mt-1">Please check your connection before saving changes.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Session Status Alert */}
        {!isAuthenticated && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Session expired</strong>
              <p className="mt-1">Your session has expired. Please refresh to continue.</p>
              <Button 
                onClick={handleRefreshSession} 
                size="sm" 
                className="mt-2"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Session
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              {isNewToy ? 'Add New Toy' : 'Edit Toy'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <ToyFormFields
                formData={formData}
                onFormDataChange={handleFormDataChange}
                primaryImageIndex={primaryImageIndex}
                onPrimaryImageChange={setPrimaryImageIndex}
              />
              
              <div className="flex justify-between items-center pt-6 border-t">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="min-w-[120px]"
                >
                  Cancel
                </Button>
                
                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    disabled={isLoading || !hasConnectivity || !isAuthenticated}
                    className="min-w-[120px]"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        Saving...
                      </div>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {isNewToy ? 'Create Toy' : 'Update Toy'}
                      </>
                    )}
                  </Button>
                  
                  {!isNewToy && (
                    <Button 
                      type="button"
                      variant="secondary"
                      onClick={handleBackToList}
                      disabled={isLoading}
                      className="min-w-[120px]"
                    >
                      Back to List
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ToyEdit;
