import { useQuery } from '@tanstack/react-query';
import { useCustomAuth } from './useCustomAuth';
import { StaticWebAppWooCommerceService } from '@/services/staticWebAppWooCommerceService';

// Types based on your data structure
export interface WooCommerceToy {
  productId: number;
  toyName: string;
  productTitle: string;
  productDescription: string;
  sku: string | null;
  price: number;
  quantity: number;
  orderId?: number;
}

export interface WooCommerceOrder {
  orderId: number;
  orderDate: string;
  orderStatus: string;
  subscriptionName?: string;
  subscriptionStatus?: string;
  totalAmount: number;
  currency: string;
  items: WooCommerceToy[];
}

export interface WooCommerceSubscriptionData {
  orderId: number;
  customerId: number;
  subscriptionName: string;
  subscriptionStatus: string;
  toys: WooCommerceToy[];
  orderDate: string;
  totalAmount: number;
  nextPaymentDate?: string;
  subscriptionMonths?: number;
}

export interface WooCommerceCustomerDetails {
  customerId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  billingAddress: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  totalOrders: number;
  totalSubscriptions: number;
  firstPurchaseDate: string;
  registrationDate: string;
}

export interface CompleteUserProfile {
  user: any;
  subscriptions: WooCommerceOrder[];
  currentToys: WooCommerceToy[];
  hasActiveSubscription: boolean;
  activeOrderId?: number;
}

// Hook for complete WooCommerce user profile (primary hook)
export const useCompleteWooCommerceProfile = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['complete-woocommerce-profile', user?.id],
    queryFn: async (): Promise<CompleteUserProfile | null> => {
      if (!user) {
        throw new Error('No user logged in');
      }

      try {
        console.log('🔄 Fetching complete WooCommerce profile for phone:', user.phone);
        
        const profileData = await StaticWebAppWooCommerceService.getCompleteUserProfile(user.phone);
        
        if (!profileData.success) {
          console.log('❌ No WooCommerce data found for user');
          return null;
        }

        // Transform subscriptions/orders data
        const transformedOrders: WooCommerceOrder[] = profileData.subscriptions.map((order: any) => ({
          orderId: order.order_id,
          orderDate: order.created_at,
          orderStatus: StaticWebAppWooCommerceService.mapOrderStatus(order.order_status || order.post_status),
          subscriptionName: order.subscription_name,
          subscriptionStatus: StaticWebAppWooCommerceService.mapSubscriptionStatus(order.subscription_status),
          totalAmount: parseFloat(order.total_amount || '0'),
          currency: order.currency || 'INR',
          items: (order.items || []).map((item: any) => ({
            productId: parseInt(item.product_id || '0'),
            toyName: item.product_name || 'Unknown Toy',
            productTitle: item.product_name || 'Unknown Toy',
            productDescription: `Toy from order #${order.order_id}`,
            sku: item.sku || null,
            price: parseFloat(item.total || '0'),
            quantity: parseInt(item.quantity || '1'),
            orderId: order.order_id
          }))
        }));

        // Transform current toys
        const transformedCurrentToys: WooCommerceToy[] = profileData.currentToys.map((toy: any) => ({
          productId: parseInt(toy.product_id || '0'),
          toyName: toy.product_name || 'Unknown Toy',
          productTitle: toy.product_name || 'Unknown Toy',
          productDescription: 'Current toy from active subscription',
          sku: toy.sku || null,
          price: parseFloat(toy.total || '0'),
          quantity: parseInt(toy.quantity || '1')
        }));

        // Check for active subscription
        const hasActiveSubscription = transformedOrders.some(order => 
          order.orderStatus === 'processing' || 
          order.subscriptionStatus === 'active'
        );

        const activeOrder = transformedOrders.find(order => 
          order.orderStatus === 'processing' || 
          order.subscriptionStatus === 'active'
        );

        const completeProfile: CompleteUserProfile = {
          user: profileData.user,
          subscriptions: transformedOrders,
          currentToys: transformedCurrentToys,
          hasActiveSubscription,
          activeOrderId: activeOrder?.orderId
        };

        console.log('✅ Complete WooCommerce profile assembled:', completeProfile);
        return completeProfile;

      } catch (error: any) {
        console.error('❌ Error fetching complete WooCommerce profile:', error);
        return null;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Hook for WooCommerce subscription details with current toys (backward compatibility)
export const useWooCommerceSubscription = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['woocommerce-subscription', user?.id],
    queryFn: async (): Promise<WooCommerceSubscriptionData | null> => {
      if (!user) {
        throw new Error('No user logged in');
      }

      try {
        console.log('🔄 Fetching WooCommerce subscription data for phone:', user.phone);
        
        const profileData = await StaticWebAppWooCommerceService.getCompleteUserProfile(user.phone);
        
        if (!profileData.success || !profileData.subscriptions.length) {
          return null;
        }

        // Find the most recent active order
        const activeOrder = profileData.subscriptions.find((order: any) => 
          order.order_status === 'wc-processing' || 
          order.subscription_status === 'Active'
        ) || profileData.subscriptions[0]; // fallback to most recent

        // Transform items to toy format
        const toys: WooCommerceToy[] = (activeOrder.items || []).map((item: any) => ({
          productId: parseInt(item.product_id || '0'),
          toyName: item.product_name || 'Unknown Toy',
          productTitle: item.product_name || 'Unknown Toy',
          productDescription: `Toy from your WooCommerce order #${activeOrder.order_id}`,
          sku: null,
          price: parseFloat(item.total || '0'),
          quantity: parseInt(item.quantity || '1')
        }));

        const subscriptionData: WooCommerceSubscriptionData = {
          orderId: activeOrder.order_id,
          customerId: profileData.user.ID,
          subscriptionName: activeOrder.subscription_name || 'Subscription Plan',
          subscriptionStatus: StaticWebAppWooCommerceService.mapSubscriptionStatus(activeOrder.subscription_status || activeOrder.post_status),
          toys: toys,
          orderDate: activeOrder.created_at,
          totalAmount: parseFloat(activeOrder.total_amount || '0'),
          nextPaymentDate: undefined,
          subscriptionMonths: parseInt(activeOrder.subscription_months || '1')
        };

        console.log('✅ WooCommerce subscription data assembled:', subscriptionData);
        return subscriptionData;

      } catch (error: any) {
        console.error('❌ Error fetching WooCommerce subscription data:', error);
        return null;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Hook for WooCommerce customer details
export const useWooCommerceCustomer = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['woocommerce-customer', user?.id],
    queryFn: async (): Promise<WooCommerceCustomerDetails | null> => {
      if (!user) {
        throw new Error('No user logged in');
      }

      try {
        console.log('👤 Fetching WooCommerce customer details for phone:', user.phone);
        
        const profileData = await StaticWebAppWooCommerceService.getCompleteUserProfile(user.phone);
        
        if (!profileData.success) {
          return null;
        }

        const wcUser = profileData.user;
        const orders = profileData.subscriptions;

        // Find first purchase date
        const firstPurchaseDate = orders.length > 0 
          ? orders.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0].created_at
          : wcUser.user_registered;

        const customerDetails: WooCommerceCustomerDetails = {
          customerId: wcUser.ID,
          firstName: wcUser.first_name || '',
          lastName: wcUser.last_name || '',
          email: wcUser.user_email || '',
          phone: wcUser.phone || user.phone,
          billingAddress: {
            address1: wcUser.address_1 || '',
            address2: wcUser.address_2 || '',
            city: wcUser.city || '',
            state: wcUser.state || '',
            postcode: wcUser.postcode || '',
            country: wcUser.country || 'IN'
          },
          totalOrders: orders.length,
          totalSubscriptions: orders.filter((order: any) => order.subscription_name).length,
          firstPurchaseDate: firstPurchaseDate,
          registrationDate: wcUser.user_registered
        };

        console.log('✅ Customer details assembled:', customerDetails);
        return customerDetails;

      } catch (error: any) {
        console.error('❌ Error fetching WooCommerce customer details:', error);
        return null;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};

// Hook for checking if user has WooCommerce data (robust implementation)
export const useHasWooCommerceData = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['has-woocommerce-data', user?.phone],
    queryFn: async (): Promise<boolean> => {
      if (!user?.phone) return false;

      try {
        // Check WooCommerce system directly for any phone format
        const userResponse = await StaticWebAppWooCommerceService.getUserByPhone(user.phone);
        // CRITICAL FIX: Check both success AND data (API returns {success: true, data: null} for non-existent users)
        const hasData = !!(userResponse?.success && userResponse?.data);
        
        console.log(`🔍 WooCommerce check for ${user.phone}: ${hasData ? 'FOUND' : 'NOT FOUND'} (success: ${userResponse?.success}, hasData: ${!!userResponse?.data})`);
        return hasData;

      } catch (error: any) {
        console.error('Error checking WooCommerce data:', error);
        return false;
      }
    },
    enabled: !!user?.phone,
    staleTime: 1000 * 60 * 5, // 5 minutes  
    gcTime: 1000 * 60 * 15, // 15 minutes
    retry: 1, // Retry once on failure
  });
};

// Hook for WooCommerce order history (simplified)
export const useWooCommerceOrderHistory = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['woocommerce-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];

      try {
        console.log('📦 Fetching WooCommerce order history for phone:', user.phone);
        
        const profileData = await StaticWebAppWooCommerceService.getCompleteUserProfile(user.phone);
        
        if (!profileData.success) return [];

        // Transform to simple order format
        const orderHistory = profileData.subscriptions.map((order: any) => ({
          orderId: order.order_id,
          orderDate: order.created_at,
          status: StaticWebAppWooCommerceService.mapOrderStatus(order.order_status || order.post_status),
          totalAmount: parseFloat(order.total_amount || '0'),
          currency: order.currency || 'INR',
          subscriptionName: order.subscription_name,
          subscriptionStatus: StaticWebAppWooCommerceService.mapSubscriptionStatus(order.subscription_status),
          itemCount: (order.items || []).length
        }));

        console.log('✅ Order history fetched:', orderHistory);
        return orderHistory;

      } catch (error: any) {
        console.error('❌ Error fetching order history:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Hook for current toys only (optimized)
export const useCurrentWooCommerceToys = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['current-woocommerce-toys', user?.id],
    queryFn: async (): Promise<WooCommerceToy[]> => {
      if (!user) return [];

      try {
        console.log('🧸 Fetching current WooCommerce toys for phone:', user.phone);
        
        const profileData = await StaticWebAppWooCommerceService.getCompleteUserProfile(user.phone);
        
        if (!profileData.success) return [];

        const currentToys: WooCommerceToy[] = profileData.currentToys.map((toy: any) => ({
          productId: parseInt(toy.product_id || '0'),
          toyName: toy.product_name || 'Unknown Toy',
          productTitle: toy.product_name || 'Unknown Toy',
          productDescription: 'Current toy from active subscription',
          sku: toy.sku || null,
          price: parseFloat(toy.total || '0'),
          quantity: parseInt(toy.quantity || '1')
        }));

        console.log('✅ Current toys fetched:', currentToys);
        return currentToys;

      } catch (error: any) {
        console.error('❌ Error fetching current toys:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}; 