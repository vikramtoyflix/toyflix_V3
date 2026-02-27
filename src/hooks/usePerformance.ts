import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  renderTime?: number;
  mountTime?: number;
  updateCount?: number;
}

/**
 * Custom hook to monitor component performance
 * @param componentName - Name of the component for logging
 * @param enabled - Whether performance monitoring is enabled (default: false for production)
 * @returns Performance metrics
 */
export function usePerformance(componentName: string, enabled: boolean = import.meta.env.MODE === 'development') {
  const renderStartTimeRef = useRef<number>(0);
  const mountTimeRef = useRef<number>(0);
  const updateCountRef = useRef<number>(0);
  const performanceMetricsRef = useRef<PerformanceMetrics>({});

  // Track render start time
  if (enabled) {
    renderStartTimeRef.current = performance.now();
  }

  useEffect(() => {
    if (!enabled) return;

    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTimeRef.current;

    // Track mount time on first render
    if (updateCountRef.current === 0) {
      mountTimeRef.current = renderTime;
      performanceMetricsRef.current.mountTime = renderTime;
      console.log(`🚀 ${componentName} mounted in ${renderTime.toFixed(2)}ms`);
    } else {
      // Track update times
      performanceMetricsRef.current.renderTime = renderTime;
      if (renderTime > 16) { // Flag slow renders (> 1 frame at 60fps)
        console.warn(`⚠️ ${componentName} slow render: ${renderTime.toFixed(2)}ms (update #${updateCountRef.current})`);
      }
    }

    updateCountRef.current += 1;
    performanceMetricsRef.current.updateCount = updateCountRef.current;

    // Cleanup function to log component unmount
    return () => {
      if (updateCountRef.current > 0) {
        console.log(`👋 ${componentName} unmounted after ${updateCountRef.current} renders`);
      }
    };
  });

  return performanceMetricsRef.current;
}

/**
 * Custom hook to measure async operation performance
 * @param operationName - Name of the operation for logging
 * @param enabled - Whether performance monitoring is enabled
 * @returns Function to start and end timing
 */
export function useAsyncPerformance(operationName: string, enabled: boolean = import.meta.env.MODE === 'development') {
  const startTimeRef = useRef<number>(0);

  const startTiming = () => {
    if (enabled) {
      startTimeRef.current = performance.now();
    }
  };

  const endTiming = (success: boolean = true) => {
    if (!enabled) return;

    const endTime = performance.now();
    const duration = endTime - startTimeRef.current;
    
    const status = success ? '✅' : '❌';
    const level = duration > 1000 ? 'warn' : 'log'; // Warn for operations > 1s
    
    console[level](`${status} ${operationName} completed in ${duration.toFixed(2)}ms`);
    
    return duration;
  };

  return { startTiming, endTiming };
}

/**
 * Custom hook to track memory usage (browser only)
 * @param componentName - Name of the component
 * @param enabled - Whether memory monitoring is enabled
 */
export function useMemoryMonitor(componentName: string, enabled: boolean = import.meta.env.MODE === 'development') {
  const initialMemoryRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Check if memory API is available (Chrome/Edge)
    const memoryInfo = (performance as any).memory;
    if (!memoryInfo) return;

    // Track initial memory usage
    if (initialMemoryRef.current === null) {
      initialMemoryRef.current = memoryInfo.usedJSHeapSize;
      console.log(`💾 ${componentName} initial memory: ${(initialMemoryRef.current / 1024 / 1024).toFixed(2)}MB`);
    }

    return () => {
      // Track memory usage on unmount
      const currentMemory = memoryInfo.usedJSHeapSize;
      const memoryDiff = currentMemory - (initialMemoryRef.current || 0);
      const memoryDiffMB = memoryDiff / 1024 / 1024;
      
      if (Math.abs(memoryDiffMB) > 1) { // Only log significant memory changes (>1MB)
        const arrow = memoryDiff > 0 ? '↗️' : '↘️';
        console.log(`${arrow} ${componentName} memory change: ${memoryDiffMB > 0 ? '+' : ''}${memoryDiffMB.toFixed(2)}MB`);
      }
    };
  }, [componentName, enabled]);
} 