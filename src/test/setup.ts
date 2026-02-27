import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock environment variables for testing
vi.mock('../config/config', () => ({
  supabaseUrl: 'http://localhost:54321',
  supabaseAnonKey: 'test-anon-key',
  appUrl: 'http://localhost:3000',
}));

// Mock Supabase client
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(),
          range: vi.fn(),
          limit: vi.fn(),
        })),
        neq: vi.fn(),
        gt: vi.fn(),
        lt: vi.fn(),
        gte: vi.fn(),
        lte: vi.fn(),
        like: vi.fn(),
        ilike: vi.fn(),
        in: vi.fn(),
        is: vi.fn(),
        not: vi.fn(),
        or: vi.fn(),
        and: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
        range: vi.fn(),
        single: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(),
        single: vi.fn(),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(),
          single: vi.fn(),
        })),
        select: vi.fn(),
        single: vi.fn(),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
        match: vi.fn(),
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(),
        single: vi.fn(),
      })),
    })),
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: null },
        unsubscribe: vi.fn(),
      })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        list: vi.fn(),
        remove: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
    realtime: {
      channel: vi.fn(() => ({
        on: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      })),
    },
  },
}));

// Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useLocation: vi.fn(() => ({ pathname: '/', search: '', hash: '', state: null })),
  useParams: vi.fn(() => ({})),
  useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  Link: vi.fn(({ children, to, ...props }) => 
    React.createElement('a', { href: to, ...props }, children)
  ),
  NavLink: vi.fn(({ children, to, ...props }) => 
    React.createElement('a', { href: to, ...props }, children)
  ),
  BrowserRouter: vi.fn(({ children }) => React.createElement('div', {}, children)),
}));

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isLoading: false,
    error: null,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  })),
  QueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  })),
  QueryClientProvider: vi.fn(({ children }) => children),
}));

// Mock date functions for consistent testing
const mockDate = new Date('2024-12-03T10:00:00Z');
vi.setSystemTime(mockDate);

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  phone: '9876543210',
  first_name: 'Test',
  last_name: 'User',
  is_active: true,
  phone_verified: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockSubscription = (overrides = {}) => ({
  id: 'test-subscription-id',
  user_id: 'test-user-id',
  plan_id: 'Discovery Delight',
  status: 'active',
  subscription_start_date: '2024-01-01',
  start_date: '2024-01-01',
  end_date: '2025-01-01',
  current_period_start: '2024-12-01',
  current_period_end: '2024-12-31',
  cycle_number: 1,
  cycle_start_date: '2024-12-01',
  cycle_end_date: '2024-12-31',
  next_selection_window_start: '2024-12-23',
  next_selection_window_end: '2024-12-31',
  current_cycle_status: 'active',
  total_cycles_completed: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockCycleData = (overrides = {}) => ({
  subscription_id: 'test-subscription-id',
  user_id: 'test-user-id',
  current_cycle_number: 1,
  current_cycle_start: '2024-12-01',
  current_cycle_end: '2024-12-31',
  cycle_progress_percentage: 10.0,
  days_remaining: 28,
  selection_window_status: 'upcoming',
  subscription_start_date: '2024-01-01',
  plan_id: 'Discovery Delight',
  subscription_status: 'active',
  ...overrides,
});

export const createMockSelectionWindow = (overrides = {}) => ({
  subscription_id: 'test-subscription-id',
  user_id: 'test-user-id',
  cycle_number: 1,
  window_start: '2024-12-23',
  window_end: '2024-12-31',
  window_status: 'upcoming',
  days_until_window: 20,
  window_duration_days: 8,
  cycle_start_date: '2024-12-01',
  cycle_end_date: '2024-12-31',
  plan_id: 'Discovery Delight',
  ...overrides,
});

export const createMockCycleHistory = (overrides = {}) => ({
  id: 'test-cycle-id',
  subscription_id: 'test-subscription-id',
  cycle_number: 1,
  cycle_start_date: '2024-12-01',
  cycle_end_date: '2024-12-31',
  selection_window_start: '2024-12-23',
  selection_window_end: '2024-12-31',
  status: 'active',
  toys_selected: 0,
  toys_delivered: 0,
  toys_returned: 0,
  delivery_date: null,
  return_date: null,
  notes: null,
  created_at: '2024-12-01T00:00:00Z',
  updated_at: '2024-12-01T00:00:00Z',
  ...overrides,
});

// Global test utilities
export const waitFor = async (condition: () => boolean, timeout = 5000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Condition not met within ${timeout}ms`);
};

export const mockAsyncFunction = <T>(result: T, delay = 0) => {
  return vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve(result), delay))
  );
};

export const mockAsyncError = (error: Error, delay = 0) => {
  return vi.fn().mockImplementation(() => 
    new Promise((_, reject) => setTimeout(() => reject(error), delay))
  );
};

// Setup and teardown (Date is already mocked via vi.setSystemTime above)
beforeAll(() => {
  // vi.setSystemTime(mockDate) handles time mocking - do not stub Date constructor
});

afterEach(() => {
  // Clean up after each test
  cleanup();
  vi.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});

afterAll(() => {
  // Global teardown
  vi.unstubAllGlobals();
  vi.resetAllMocks();
}); 