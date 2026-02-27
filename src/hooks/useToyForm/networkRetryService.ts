
import { NetworkService } from '@/services/networkService';

export class NetworkRetryService {
  static async withRetryAndConnectivity<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check connectivity before attempting
        const isConnected = await NetworkService.checkConnectivity();
        if (!isConnected && attempt < maxRetries) {
          console.log(`Attempt ${attempt + 1}: No connection, retrying...`);
          await this.delay(backoffMs * Math.pow(2, attempt));
          continue;
        }

        console.log(`Attempt ${attempt + 1}: Executing operation...`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt + 1} failed:`, error);
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }

        // Don't wait after the last attempt
        if (attempt < maxRetries) {
          const delay = backoffMs * Math.pow(2, attempt);
          console.log(`Waiting ${delay}ms before retry...`);
          await this.delay(delay);
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  private static shouldNotRetry(error: any): boolean {
    const nonRetryableErrors = [
      'Invalid login credentials',
      'Email not confirmed',
      'Invalid email',
      'Password too weak',
      'Unauthorized'
    ];

    const errorMessage = error?.message?.toLowerCase() || error?.toString()?.toLowerCase() || '';
    return nonRetryableErrors.some(msg => errorMessage.includes(msg.toLowerCase()));
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async checkNetworkStatus(): Promise<{
    isOnline: boolean;
    hasConnectivity: boolean;
    timestamp: number;
  }> {
    const isOnline = navigator.onLine;
    const hasConnectivity = await NetworkService.checkConnectivity();
    
    return {
      isOnline,
      hasConnectivity,
      timestamp: Date.now()
    };
  }
}
