import { Suspense, lazy, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { HOMEPAGE_TOYS_QUERY_KEY, fetchHomepageToys } from "@/hooks/useToysWithAgeBands";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { CustomAuthProvider } from "@/hooks/auth/CustomAuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import FloatingContactButtons from "./components/WhatsAppFloatingButton";
import { initializeGA, trackPageView } from '@/utils/analytics';
import { initializeGTM } from '@/utils/gtm';
import { initializeMetaPixel } from '@/utils/metaPixel';
import { FEATURE_FLAGS } from '@/config/features';
import { preloadCriticalResources, monitorCoreWebVitals } from '@/utils/seo/performance';
import { BusinessSchema } from "@/components/seo/BusinessSchema";
import { FAQSchema } from "@/components/seo/FAQSchema";
import { ServiceSchema } from "@/components/seo/ServiceSchema";

// Route-level lazy loading for faster initial load
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const ToyEdit = lazy(() => import("./pages/ToyEdit"));
const NewToyEdit = lazy(() => import("./pages/NewToyEdit"));
const EditToy = lazy(() => import("./pages/EditToy"));
const Toys = lazy(() => import("./pages/Toys"));
const ToySelection = lazy(() => import("./pages/ToySelection"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const SubscriptionFlow = lazy(() => import("./pages/SubscriptionFlow"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const ConfirmationSuccess = lazy(() => import("./pages/ConfirmationSuccess"));
const OrderSummary = lazy(() => import("./pages/OrderSummary"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const Pricing = lazy(() => import("./pages/Pricing"));
const About = lazy(() => import("./pages/About"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminImport = lazy(() => import("./pages/AdminImport"));
const SignupCapture = lazy(() => import("./pages/SignupCapture"));
const SignupLanding = lazy(() => import("./pages/SignupLanding"));
const SignupSuccess = lazy(() => import("./pages/SignupSuccess"));
const CampaignLanding = lazy(() => import("./pages/CampaignLanding"));
const LocationPickerDemo = lazy(() => import("./pages/LocationPickerDemo"));
const Bangalore = lazy(() => import("./pages/Bangalore"));

// Fallback for lazy-loaded routes
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
  </div>
);

// Global error fallback for uncaught errors
const AppErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="max-w-md w-full text-center">
      <div className="text-red-500 text-4xl mb-4">⚠️</div>
      <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-muted-foreground text-sm mb-4">We're sorry, but something unexpected happened. Please try refreshing the page.</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
      >
        Try Again
      </button>
    </div>
  </div>
);


// Prefetch homepage toys as soon as app loads so "Rent premium toys" carousel has data on first load/refresh
function PrefetchHomeToys() {
  const queryClient = useQueryClient();
  useEffect(() => {
    queryClient
      .prefetchQuery({
        queryKey: HOMEPAGE_TOYS_QUERY_KEY,
        queryFn: fetchHomepageToys,
        staleTime: 5 * 60 * 1000,
      })
      .catch((err) => {
        // Prefetch failure is non-fatal; query will retry when component mounts
        console.warn('[PrefetchHomeToys] Prefetch failed:', err?.message || err);
      });
  }, [queryClient]);
  return null;
}

// Optimized QueryClient configuration for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep inactive queries in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 2 times
      retry: 2,
      // Don't refetch on window focus for better UX
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect unless data is stale
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

// Component to handle Google Analytics page tracking
const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (FEATURE_FLAGS.GOOGLE_ANALYTICS) {
      trackPageView(location.pathname, document.title);
    }
  }, [location]);

  return null;
};

function App() {
  // Initialize all tracking and performance monitoring
  useEffect(() => {
    // Preload critical resources immediately (fonts, images)
    preloadCriticalResources();

    // Monitor Core Web Vitals immediately (lightweight)
    monitorCoreWebVitals();

    // Defer all analytics until browser is idle to avoid blocking JS execution
    const initAnalytics = () => {
      if (FEATURE_FLAGS.GOOGLE_ANALYTICS) {
        initializeGA();
        initializeGTM();
      }
      initializeMetaPixel();
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(initAnalytics, { timeout: 4000 });
    } else {
      setTimeout(initAnalytics, 2000);
    }

    // Initialize Push Notifications — dynamically imported so Capacitor SDK is
    // never bundled into the web build (only loaded on native platforms)
    const initPush = async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      try {
        const [{ StatusBar, Style }, { PushNotifications }] = await Promise.all([
          import('@capacitor/status-bar'),
          import('@capacitor/push-notifications'),
        ]);

        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#FFFFFF' });

        const permission = await PushNotifications.requestPermissions();
        if (permission.receive === 'granted') {
          await PushNotifications.register();
        }

        PushNotifications.addListener('registration', (token) => {
          console.log('Push registration success, token: ' + token.value);
        });
        PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration: ' + JSON.stringify(error));
        });
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received: ' + JSON.stringify(notification));
        });
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push action performed: ' + JSON.stringify(notification));
        });
      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };

    initPush();
  }, []);

  return (
    <HelmetProvider>
      {/* Global SEO Schema - Business Information */}
      <BusinessSchema />
      <FAQSchema />
      <ServiceSchema />

      <QueryClientProvider client={queryClient}>
        <PrefetchHomeToys />
        <CustomAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ErrorBoundary FallbackComponent={AppErrorFallback} onReset={() => window.location.reload()}>
            <BrowserRouter>

              <AnalyticsTracker />
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/campaign" element={<CampaignLanding />} />
                <Route path="/landing" element={<CampaignLanding />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/signup-capture" element={<SignupCapture />} />
                <Route path="/signup-landing" element={<SignupLanding />} />
                <Route
                  path="/signup-success"
                  element={
                    <ProtectedRoute>
                      <SignupSuccess />
                    </ProtectedRoute>
                  }
                />
                <Route path="/toys" element={<Toys />} />
                <Route path="/toys/:id" element={<ProductDetail />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/about" element={<About />} />
                <Route path="/bangalore" element={<Bangalore />} />
                <Route path="/location-demo" element={<LocationPickerDemo />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/subscription-flow"
                  element={
                    <ProtectedRoute>
                      <SubscriptionFlow />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/select-toys"
                  element={
                    <ProtectedRoute>
                      <ToySelection />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payment-success"
                  element={
                    <ProtectedRoute>
                      <PaymentSuccess />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/confirmation-success"
                  element={
                    <ProtectedRoute>
                      <ConfirmationSuccess />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/order-summary"
                  element={
                    <ProtectedRoute>
                      <OrderSummary />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/order-tracking"
                  element={
                    <ProtectedRoute>
                      <OrderTracking />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <Admin />
                    </AdminRoute>
                  }
                />
                {/* New dedicated edit toy page */}
                <Route
                  path="/admin/inventory/edit/:toyId"
                  element={
                    <AdminRoute>
                      <EditToy />
                    </AdminRoute>
                  }
                />
                {/* New clean toy edit routes */}
                <Route
                  path="/admin/new-toy-edit/new"
                  element={
                    <AdminRoute>
                      <NewToyEdit />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/new-toy-edit/:id"
                  element={
                    <AdminRoute>
                      <NewToyEdit />
                    </AdminRoute>
                  }
                />
                {/* Legacy toy edit routes (for backward compatibility) */}
                <Route
                  path="/admin/toys/new"
                  element={
                    <AdminRoute>
                      <ToyEdit />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/toys/:id"
                  element={
                    <AdminRoute>
                      <ToyEdit />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/import"
                  element={
                    <AdminRoute>
                      <AdminImport />
                    </AdminRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>

              {/* WhatsApp Floating Button - appears on all pages */}
              <FloatingContactButtons />

            </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
        </CustomAuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
