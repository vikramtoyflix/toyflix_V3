
export class NetworkService {
  static isOnline(): boolean {
    return navigator.onLine;
  }

  static async checkConnectivity(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Try to fetch a small resource to verify actual connectivity
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  static onConnectivityChange(callback: (isOnline: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check connectivity before attempting
        const isConnected = await this.checkConnectivity();
        if (!isConnected && attempt < maxRetries) {
          throw new Error('No internet connection');
        }

        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }

        // Don't wait after the last attempt
        if (attempt < maxRetries) {
          await this.delay(backoffMs * Math.pow(2, attempt));
        }
      }
    }

    throw lastError;
  }

  private static shouldNotRetry(error: any): boolean {
    const nonRetryableErrors = [
      'Invalid login credentials',
      'Email not confirmed',
      'Invalid email',
      'Password too weak'
    ];

    return nonRetryableErrors.some(msg => 
      error?.message?.includes(msg) || error?.toString()?.includes(msg)
    );
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
