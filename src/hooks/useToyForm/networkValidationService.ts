
import { NetworkRetryService } from './networkRetryService';

export class NetworkValidationService {
  static async checkNetworkBeforeSubmission(): Promise<{
    hasConnectivity: boolean;
    networkStatus: any;
  }> {
    const networkStatus = await NetworkRetryService.checkNetworkStatus();
    console.log('Network status:', networkStatus);

    return {
      hasConnectivity: networkStatus.hasConnectivity,
      networkStatus
    };
  }
}
