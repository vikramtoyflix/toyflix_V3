
import { useState, useEffect } from 'react';
import { NetworkService } from '@/services/networkService';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    // Initial connectivity check
    NetworkService.checkConnectivity().then(setIsConnected);

    // Listen for online/offline events
    const cleanup = NetworkService.onConnectivityChange((online) => {
      setIsOnline(online);
      if (online) {
        // Verify actual connectivity when coming back online
        NetworkService.checkConnectivity().then(setIsConnected);
      } else {
        setIsConnected(false);
      }
    });

    // Periodic connectivity check (every 30 seconds when online)
    const interval = setInterval(async () => {
      if (navigator.onLine) {
        const connected = await NetworkService.checkConnectivity();
        setIsConnected(connected);
      }
    }, 30000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    isConnected: isConnected ?? isOnline,
    hasConnectivity: isOnline && (isConnected ?? true)
  };
};
