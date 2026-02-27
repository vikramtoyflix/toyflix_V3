
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export const MobileToyCardSkeleton = () => (
  <Card className="mb-4 overflow-hidden">
    <CardContent className="p-0">
      <div className="flex">
        <div className="w-24 h-24 flex-shrink-0">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="flex-1 p-3 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex justify-between items-center mt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
        <div className="w-16 flex flex-col justify-center items-center space-y-2 p-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const MobileCarouselCardSkeleton = () => (
  <div className="pl-2 basis-4/5 md:basis-1/2 lg:basis-1/3 flex-shrink-0">
    <Card className="overflow-hidden h-full">
      <CardContent className="p-0 h-full flex flex-col">
        <div className="aspect-[4/3]">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export const MobileGridLoadingState = () => (
  <div className="px-4 space-y-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <MobileToyCardSkeleton key={i} />
    ))}
  </div>
);

export const MobileCarouselLoadingState = () => (
  <div className="flex -ml-2">
    {Array.from({ length: 3 }).map((_, i) => (
      <MobileCarouselCardSkeleton key={i} />
    ))}
  </div>
);

export const MobileEmptyState = ({ 
  title = "No items found", 
  description = "Try adjusting your search or check back later",
  icon = "📱"
}: {
  title?: string;
  description?: string;
  icon?: string;
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="text-6xl mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-600 max-w-sm">{description}</p>
  </div>
);
