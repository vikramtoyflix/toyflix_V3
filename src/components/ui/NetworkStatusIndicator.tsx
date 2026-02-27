
import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff, Wifi } from "lucide-react";
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const NetworkStatusIndicator = () => {
  const { hasConnectivity } = useNetworkStatus();

  if (hasConnectivity) {
    return null; // Don't show anything when connected
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        <strong>No internet connection</strong>
        <p className="mt-1 text-sm">
          Please check your connection and try again. Some features may not work properly.
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default NetworkStatusIndicator;
