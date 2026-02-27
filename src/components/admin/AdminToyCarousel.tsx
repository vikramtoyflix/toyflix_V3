import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, StarOff, Loader2, RefreshCw, Package, Image as ImageIcon } from 'lucide-react';
import { useToysWithAgeBands } from '@/hooks/useToysWithAgeBands';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';

const AdminToyCarousel = () => {
  const { data: toys, isLoading, refetch } = useToysWithAgeBands();
  const { toast } = useToast();
  const [updatingToyId, setUpdatingToyId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const featuredToys = toys?.filter(toy => toy.is_featured) || [];
  const nonFeaturedToys = toys?.filter(toy => !toy.is_featured) || [];

  // Debug logging
  React.useEffect(() => {
    if (toys) {
      console.log('🎮 Toys data loaded:', {
        totalToys: toys.length,
        featuredToys: featuredToys.length,
        nonFeaturedToys: nonFeaturedToys.length,
        featuredToyIds: featuredToys.map(t => ({ id: t.id, name: t.name, is_featured: t.is_featured })),
        nonFeaturedToyIds: nonFeaturedToys.map(t => ({ id: t.id, name: t.name, is_featured: t.is_featured }))
      });
    }
  }, [toys, featuredToys.length, nonFeaturedToys.length]);

  const handleToggleFeatured = async (toyId: string, currentStatus: boolean) => {
    console.log('🎯 handleToggleFeatured called:', { toyId, currentStatus, newStatus: !currentStatus });
    setUpdatingToyId(toyId);
    
    try {
      // Log the update attempt
      console.log('📝 Attempting to update toy:', toyId, 'is_featured from', currentStatus, 'to', !currentStatus);
      
      const { data, error } = await supabase
        .from('toys')
        .update({ is_featured: !currentStatus })
        .eq('id', toyId)
        .select(); // Add select to see the updated record

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('✅ Database update successful:', data);

      toast({
        title: "Success",
        description: `Toy ${!currentStatus ? 'added to' : 'removed from'} carousel`,
      });
      
      console.log('🔄 Force refreshing toys data...');
      await refetch();
      console.log('✅ Data refresh completed');
      
    } catch (error) {
      console.error('💥 Error updating toy featured status:', error);
      
      // More detailed error message
      let errorMessage = "Failed to update toy status";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: `${errorMessage}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      console.log('🏁 Clearing updating state for toy:', toyId);
      setUpdatingToyId(null);
    }
  };

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Refreshed",
      description: "Toy carousel data has been refreshed",
    });
  };

  // Mobile card layout for toys
  const MobileToyList = ({ toys, isFeatured }: { toys: any[], isFeatured: boolean }) => (
    <div className="space-y-3">
      {toys.map((toy) => (
        <Card key={toy.id} className="p-4">
          <div className="space-y-3">
            {/* Toy Preview */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <img 
                  src={toy.image_url?.includes('/storage/v1/s3/') 
                    ? toy.image_url.replace('/storage/v1/s3/', '/storage/v1/object/public/')
                    : toy.image_url || "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?q=80&w=400"
                  } 
                  alt={toy.name}
                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-cover rounded-lg transition-all hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{toy.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {toy.category}
                  </Badge>
                  {isFeatured && (
                    <Badge variant="default" className="text-xs">
                      Featured
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Age: {toy.age_range}
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end pt-2 border-t">
              <Button
                variant={isFeatured ? "outline" : "default"}
                size="sm"
                onClick={() => handleToggleFeatured(toy.id, isFeatured)}
                disabled={updatingToyId === toy.id}
                className="w-full"
              >
                {updatingToyId === toy.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : isFeatured ? (
                  <StarOff className="w-4 h-4 mr-2" />
                ) : (
                  <Star className="w-4 h-4 mr-2" />
                )}
                {isFeatured ? 'Remove from Carousel' : 'Add to Carousel'}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center ${isMobile ? 'h-32' : 'h-64'}`}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`space-y-${isMobile ? '4' : '6'}`}>
      {/* Header */}
      <Card>
        <CardHeader className={isMobile ? 'pb-3' : ''}>
          <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between items-center'}`}>
            <div>
              <CardTitle className={isMobile ? 'text-lg' : ''}>Toy Carousel Management</CardTitle>
              <CardDescription className={isMobile ? 'text-sm' : ''}>
                Manage which toys appear in the homepage toy carousel. Featured toys are displayed first.
              </CardDescription>
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className={isMobile ? 'w-full' : ''}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className={isMobile ? 'pt-0' : ''}>
          <Alert>
            <Star className="h-4 w-4" />
            <AlertDescription className={isMobile ? 'text-sm' : ''}>
              <strong>Featured toys</strong> appear in the homepage toy carousel and are prioritized in search results. 
              Currently <strong>{featuredToys.length}</strong> toys are featured in the carousel.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Featured Toys */}
      <Card>
        <CardHeader className={isMobile ? 'pb-3' : ''}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" />
            Featured in Carousel ({featuredToys.length})
          </CardTitle>
          <CardDescription className={isMobile ? 'text-sm' : ''}>
            These toys currently appear in the homepage toy carousel
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'pt-0' : ''}>
          {featuredToys.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
                No toys are currently featured in the carousel
              </p>
            </div>
          ) : isMobile ? (
            <MobileToyList toys={featuredToys} isFeatured={true} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Age Range</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featuredToys.map(toy => (
                  <TableRow key={toy.id}>
                    <TableCell>
                      <img 
                        src={toy.image_url?.includes('/storage/v1/s3/') 
                          ? toy.image_url.replace('/storage/v1/s3/', '/storage/v1/object/public/')
                          : toy.image_url || "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?q=80&w=400"
                        } 
                        alt={toy.name}
                        className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-cover rounded-lg transition-all hover:scale-105"
                        loading="lazy"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{toy.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {toy.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{toy.age_range}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleFeatured(toy.id, true)}
                        disabled={updatingToyId === toy.id}
                      >
                        {updatingToyId === toy.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <StarOff className="w-4 h-4" />
                        )}
                        Remove from Carousel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Non-Featured Toys */}
      <Card>
        <CardHeader className={isMobile ? 'pb-3' : ''}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
            <StarOff className="w-5 h-5 text-gray-400" />
            Available Toys ({nonFeaturedToys.length})
          </CardTitle>
          <CardDescription className={isMobile ? 'text-sm' : ''}>
            Click "Add to Carousel" to feature these toys in the homepage carousel
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'pt-0' : ''}>
          {nonFeaturedToys.length === 0 ? (
            <div className="text-center py-8">
              <Star className="w-12 h-12 mx-auto text-yellow-500 fill-yellow-400 mb-4" />
              <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
                All toys are currently featured in the carousel
              </p>
            </div>
          ) : isMobile ? (
            <MobileToyList toys={nonFeaturedToys} isFeatured={false} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Age Range</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nonFeaturedToys.map(toy => (
                  <TableRow key={toy.id}>
                    <TableCell>
                      <img 
                        src={toy.image_url?.includes('/storage/v1/s3/') 
                          ? toy.image_url.replace('/storage/v1/s3/', '/storage/v1/object/public/')
                          : toy.image_url || "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?q=80&w=400"
                        } 
                        alt={toy.name}
                        className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-cover rounded-lg transition-all hover:scale-105"
                        loading="lazy"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{toy.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {toy.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{toy.age_range}</TableCell>
                    <TableCell>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleToggleFeatured(toy.id, false)}
                        disabled={updatingToyId === toy.id}
                      >
                        {updatingToyId === toy.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Star className="w-4 h-4" />
                        )}
                        Add to Carousel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminToyCarousel; 