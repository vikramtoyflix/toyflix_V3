// Global analytics tracking declarations
declare global {
  interface Window {
    cbq?: (action: string, eventName: string, eventData?: Record<string, any>) => void;
  }
}

export {};