import Header from "@/components/Header";
import CatalogHeader from "@/components/catalog/CatalogHeader";
import PromotionalCatalogView from "@/components/catalog/PromotionalCatalogView";
import CatalogLoadingState from "@/components/catalog/CatalogLoadingState";
import CatalogErrorState from "@/components/catalog/CatalogErrorState";
import MobileLayout from "@/components/mobile/MobileLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToysForAgeGroup } from "@/hooks/useToysWithAgeBands";
import { useRideOnToys } from "@/hooks/useToys/rideOnToys";
import { Toy } from "@/hooks/useToys";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { logToyDistribution } from "@/utils/toyOrdering";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { FEATURE_FLAGS } from "@/config/features";

const ToysPage = () => {
  const { user } = useCustomAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // UPDATED: Use age-based approach with default to show all toys with category ordering
  const { data: allToys, isLoading, error, refetch } = useToysForAgeGroup(); // No age specified = all toys
  
  // Filter out ride-on toys for regular tab (client-side filtering from age-based results)
  const toys = allToys?.filter(toy => toy.category !== 'ride_on_toys') || [];
  
  // Use dedicated ride-on toys hook
  const { data: rideOnToys, isLoading: isLoadingRideOn, error: rideOnError } = useRideOnToys();
  
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Tab state - get from URL params or default to "regular"
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || 'regular';
  });

  // Search state - filter toys by name
  const [searchQuery, setSearchQuery] = useState("");

  // Debug logging with category distribution
  console.log('🎯 Toys Page Debug (Age-Based):', {
    allToysCount: allToys?.length || 0,
    regularToysCount: toys.length,
    rideOnToysCount: rideOnToys?.length || 0,
    isLoading,
    error: error?.message
  });

  // DIAGNOSTIC: Add detailed breakdown of what's being filtered
  console.log('🔍 DIAGNOSTIC - Toy Count Breakdown:', {
    totalFromQuery: allToys?.length || 0,
    afterRideOnFilter: toys.length,
    rideOnToys: rideOnToys?.length || 0,
    totalDisplayed: toys.length + (rideOnToys?.length || 0),
    potentialDiscrepancy: 284 - (toys.length + (rideOnToys?.length || 0))
  });

  // Log what categories we have in allToys
  if (allToys && allToys.length > 0) {
    const categoryBreakdown = allToys.reduce((acc: Record<string, number>, toy) => {
      const category = toy.category || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 Category breakdown from query:', categoryBreakdown);
  }

  // Log category distribution
  if (toys.length > 0) {
    logToyDistribution(toys, 'Toys Page - Regular');
  }
  if (rideOnToys && rideOnToys.length > 0) {
    logToyDistribution(rideOnToys as Toy[], 'Toys Page - Ride-On');
  }



  // Update URL when tab changes
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (activeTab === 'regular') {
      newSearchParams.delete('tab');
    } else {
      newSearchParams.set('tab', activeTab);
    }
    
    // Use replace to avoid cluttering history
    const newUrl = `${window.location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [activeTab, searchParams]);

  const handleToyActionClick = (toy: Toy, e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to toy details page where subscription logic will be handled
    navigate(`/toys/${toy.id}`);
  };

  const handleRideOnToyAction = (toy: Toy, e: React.MouseEvent) => {
    e.stopPropagation();
    // For ride-on toys, navigate to product page where they can rent
    navigate(`/toys/${toy.id}?type=ride_on`);
  };

  const handleAddToWishlist = (toyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate("/auth?mode=signin");
      return;
    }
    // TODO: Implement wishlist functionality
    console.log("Add to wishlist:", toyId);
    const toy = allToys?.find((t) => t.id === toyId);
    toast({
      title: "Added to Wishlist!",
      description: `${
        toy ? toy.name : "Toy"
      } has been added to your wishlist. This feature is coming soon!`,
    });
  };

  const handleViewProduct = (toyId: string) => {
    const isRideOnTab = activeTab === 'ride_on';
    navigate(`/toys/${toyId}${isRideOnTab ? '?type=ride_on' : ''}`);
  };

  // Removed duplicate handleRefresh - using handleRefreshData instead



  // Render tabs content function moved here for proper scope
  const renderTabsContent = () => {
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="regular" className="flex items-center gap-2">
            <span>Premium Toys</span>
            <Badge variant="outline" className="text-xs">{toys.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="ride_on" className="flex items-center gap-2 group relative overflow-hidden">
            <span className="relative z-10 font-bold bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent animate-pulse group-hover:from-orange-400 group-hover:via-red-400 group-hover:to-pink-400 transition-all duration-300">
              🚗 Ride-On Toys
            </span>
            <Badge variant="outline" className="text-xs bg-gradient-to-r from-orange-100 to-pink-100 border-orange-300 text-orange-700 animate-bounce">{rideOnToys?.length || 0}</Badge>
            {/* Animated background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-200/20 via-red-200/20 to-pink-200/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-shimmer"></div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="regular" className="space-y-4">
          {/* Regular toys content with age-based filtering and category ordering */}
          <PromotionalCatalogView
            toys={toys}
            isLoading={isLoading}
            onToyAction={handleToyActionClick}
            onAddToWishlist={handleAddToWishlist}
            onViewProduct={handleViewProduct}
            isRideOnView={false}
            searchQuery={searchQuery}
          />
        </TabsContent>

        <TabsContent value="ride_on" className="space-y-4">
          {/* Ride-on toys content */}
          <PromotionalCatalogView
            toys={(rideOnToys || []) as Toy[]}
            isLoading={isLoadingRideOn}
            onToyAction={handleRideOnToyAction}
            onAddToWishlist={handleAddToWishlist}
            onViewProduct={handleViewProduct}
            isRideOnView={true}
            searchQuery={searchQuery}
          />
        </TabsContent>
      </Tabs>
    );
  };

  if (isLoading) {
    return <CatalogLoadingState />;
  }

  if (error) {
    return <CatalogErrorState />;
  }

  // Mobile layout
  if (isMobile) {
    return (
      <>
        {/* SEO Components for Mobile */}
        {FEATURE_FLAGS.SEO_META_TAGS && <SEOHead page="toys" />}
        {FEATURE_FLAGS.SEO_STRUCTURED_DATA && <StructuredData type="organization" />}
        
        <MobileLayout title="Browse Toys" showHeader={true} showBottomNav={true}>
        <div className="p-4">
          <CatalogHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          {renderTabsContent()}
        </div>
      </MobileLayout>
      </>
    );
  }

  // Desktop layout
  return (
    <>
      {/* SEO Components for Desktop */}
      {FEATURE_FLAGS.SEO_META_TAGS && <SEOHead page="toys" />}
      {FEATURE_FLAGS.SEO_STRUCTURED_DATA && <StructuredData type="organization" />}
      
      <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <CatalogHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        {renderTabsContent()}
      </main>
    </div>
    </>
  );


};

export default ToysPage;
