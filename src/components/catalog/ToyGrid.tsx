import React, { useMemo, useState } from 'react';
import ToyCard from './ToyCard';
import MobileToyCard from '../mobile/MobileToyCard';
import { MobileGridLoadingState, MobileEmptyState } from '../mobile/MobileLoadingStates';
import { Toy } from '@/hooks/useToys';
import { useBulkToyImages } from '@/hooks/useToyImages';
import CatalogLoadingState from './CatalogLoadingState';
import ToyDetailModal from '../subscription/ToyDetailModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ToyGridProps {
  toys: Toy[];
  isLoading?: boolean;
  onToyAction?: (toy: Toy, e: React.MouseEvent) => void;
  onAddToWishlist?: (toyId: string, e: React.MouseEvent) => void;
  onViewProduct?: (toyId: string) => void;
  isSubscriptionView?: boolean;
  selectedToyIds?: string[];
  showOutOfStock?: boolean;
  className?: string;
}

const ToyGrid = React.memo(({
  toys,
  isLoading = false,
  onToyAction,
  onAddToWishlist,
  onViewProduct,
  isSubscriptionView = false,
  selectedToyIds = [],
  showOutOfStock = false,
  className
}: ToyGridProps) => {
  const isMobile = useIsMobile();
  
  // Modal state
  const [selectedToyForModal, setSelectedToyForModal] = useState<Toy | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Memoize the filtered toys to prevent unnecessary recalculations
  const displayToys = useMemo(() => {
    // Show ALL toys (including out-of-stock) in both main page and subscription flow
    // Out-of-stock toys will be shown but disabled in subscription flow
    
    // Sort toys with out-of-stock toys displayed last
    const sortedToys = [...toys].sort((a, b) => {
      const aInStock = (a.available_quantity || 0) > 0 ? 1 : 0;
      const bInStock = (b.available_quantity || 0) > 0 ? 1 : 0;
      
      // In-stock toys first (1), out-of-stock toys last (0)
      if (aInStock !== bInStock) {
        return bInStock - aInStock;
      }
      
      // Within same stock status, maintain original order
      return 0;
    });
    
    return sortedToys;
  }, [toys]);

  // Memoize the selected toy IDs set for O(1) lookup
  const selectedToyIdsSet = useMemo(() => {
    return new Set(selectedToyIds);
  }, [selectedToyIds]);

  // On Toys page we have many toys; bulk fetch with 200+ IDs can fail or return bad URLs.
  // Use main image only when many toys so cards use toy.image_url (same as homepage when it works).
  const BULK_IMAGE_MAX = 80;
  const toyIds = useMemo(() =>
    displayToys.length <= BULK_IMAGE_MAX ? displayToys.map(t => t.id) : [],
    [displayToys]
  );
  const { data: bulkImages = {} } = useBulkToyImages(toyIds);
  const imageMap = displayToys.length <= BULK_IMAGE_MAX ? bulkImages : {};

  // Memoize loading state for mobile
  const mobileLoadingState = useMemo(() => (
    <MobileGridLoadingState />
  ), []);

  // Memoize empty state for mobile
  const mobileEmptyState = useMemo(() => (
    <MobileEmptyState 
      title="No toys found"
      description="Try adjusting your search criteria or check back later"
      icon="🧸"
    />
  ), []);

  // Memoize loading state for desktop
  const desktopLoadingState = useMemo(() => (
    <CatalogLoadingState />
  ), []);

  // Modal handlers
  const handleOpenModal = (toyId: string) => {
    const toy = displayToys.find(t => t.id === toyId);
    if (toy) {
      setSelectedToyForModal(toy);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedToyForModal(null);
  };

  const handleModalSelect = (toy: Toy) => {
    // Call the original onToyAction for subscription views
    if (onToyAction) {
      // Create a mock event for the toy action
      const mockEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
      } as React.MouseEvent;
      onToyAction(toy, mockEvent);
    }
    // Keep modal open to show the updated selection state
  };

  const handleModalWishlist = (toyId: string) => {
    if (onAddToWishlist) {
      // Create a mock event for the wishlist action
      const mockEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
      } as React.MouseEvent;
      onAddToWishlist(toyId, mockEvent);
    }
  };

  const handleModalSubscribe = (toy: Toy) => {
    if (onToyAction) {
      // Create a mock event for the subscription action
      const mockEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
      } as React.MouseEvent;
      onToyAction(toy, mockEvent);
    }
  };

  if (isLoading) {
    return isMobile ? mobileLoadingState : desktopLoadingState;
  }

  if (displayToys.length === 0) {
    if (isMobile) {
      return mobileEmptyState;
    }

    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No toys found matching your criteria.</p>
        <p className="text-muted-foreground text-sm mt-2">Try adjusting your filters or search terms.</p>
      </div>
    );
  }

  // Mobile view: Use 2-column grid layout instead of vertical scrolling
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Toy Cards in 2-column grid */}
        <div className="grid grid-cols-2 gap-3">
          {displayToys.map((toy, index) => (
            <div
              key={toy.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <MobileToyCard
                toy={toy}
                preloadedImages={imageMap[toy.id]}
                onToyAction={onToyAction}
                onAddToWishlist={onAddToWishlist}
                onViewProduct={handleOpenModal}
                isSubscriptionView={isSubscriptionView}
                isSelected={selectedToyIdsSet.has(toy.id)}
                showOutOfStock={showOutOfStock}
              />
            </div>
          ))}
        </div>
        
        {/* Toy Detail Modal */}
        <ToyDetailModal
          toy={selectedToyForModal}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSelect={handleModalSelect}
          isSubscriptionView={isSubscriptionView}
          isSelected={selectedToyForModal ? selectedToyIdsSet.has(selectedToyForModal.id) : false}
          onAddToWishlist={handleModalWishlist}
          onSubscribe={handleModalSubscribe}
        />
      </div>
    );
  }

  // Desktop view: Use consistent 4-column grid layout
  return (
    <div className={cn(
      "grid gap-6 auto-rows-fr",
      // Consistent 4-column layout for better visual consistency
      "grid-cols-1",                    // Mobile: 1 column
      "sm:grid-cols-2",                 // Small: 2 columns
      "md:grid-cols-4",                 // Medium and up: 4 columns consistently
      "lg:grid-cols-4",                 // Large: 4 columns
      "xl:grid-cols-4",                 // XL: 4 columns
      "2xl:grid-cols-4",                // 2XL: 4 columns
      className
    )}>
      {displayToys.map((toy, index) => (
        <div
          key={toy.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <ToyCard
            toy={toy}
            preloadedImages={imageMap[toy.id]}
            onToyAction={onToyAction}
            onAddToWishlist={onAddToWishlist}
            onViewProduct={handleOpenModal}
            isSubscriptionView={isSubscriptionView}
            isSelected={selectedToyIdsSet.has(toy.id)}
            showOutOfStock={showOutOfStock}
          />
        </div>
      ))}

      {/* Toy Detail Modal */}
      <ToyDetailModal
        toy={selectedToyForModal}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSelect={handleModalSelect}
        isSubscriptionView={isSubscriptionView}
        isSelected={selectedToyForModal ? selectedToyIdsSet.has(selectedToyForModal.id) : false}
        onAddToWishlist={handleModalWishlist}
        onSubscribe={handleModalSubscribe}
      />
    </div>
  );
});

ToyGrid.displayName = 'ToyGrid';

export default ToyGrid;
