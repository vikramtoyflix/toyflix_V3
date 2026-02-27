/**
 * Payment Bypass System - Logging Utilities
 * 
 * Enhanced logging utilities to track and verify payment bypass system behavior.
 * These utilities help debug issues and validate correct behavior during testing.
 * 
 * Usage:
 * 1. Open browser console
 * 2. Copy and paste this script
 * 3. Use logging utilities to track system behavior
 */

console.log('🔧 PAYMENT BYPASS LOGGING UTILITIES LOADED');
console.log('==========================================');

// Enhanced logging system for payment bypass testing
const PaymentBypassLogger = {
  logs: [],
  config: {
    enableConsoleOutput: true,
    enableStorage: true,
    maxLogs: 1000,
    categories: {
      SERVICE: '🔧',
      UI: '🎨',
      ERROR: '❌',
      SUCCESS: '✅',
      WARNING: '⚠️',
      INFO: 'ℹ️',
      PERFORMANCE: '⚡',
      DATABASE: '📊'
    }
  },

  // Enhanced logging method
  log(category, component, action, data = {}, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const icon = this.config.categories[level] || 'ℹ️';
    
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp,
      category,
      component,
      action,
      data,
      level,
      icon
    };

    // Store log entry
    if (this.config.enableStorage) {
      this.logs.push(logEntry);
      
      // Maintain max logs limit
      if (this.logs.length > this.config.maxLogs) {
        this.logs = this.logs.slice(-this.config.maxLogs);
      }
    }

    // Console output
    if (this.config.enableConsoleOutput) {
      const message = `${icon} [${category}] ${component}.${action}`;
      
      if (Object.keys(data).length > 0) {
        console.group(message);
        console.log('Timestamp:', timestamp);
        console.log('Data:', data);
        console.groupEnd();
      } else {
        console.log(message, `(${timestamp})`);
      }
    }

    return logEntry;
  },

  // Service layer logging methods
  logServiceCall(component, method, params, result) {
    return this.log('SERVICE', component, method, {
      params,
      result,
      duration: result?.duration || 'unknown'
    }, 'SERVICE');
  },

  logServiceError(component, method, error, params) {
    return this.log('SERVICE', component, method, {
      error: error.message,
      stack: error.stack,
      params
    }, 'ERROR');
  },

  // UI logging methods
  logUIAction(component, action, state = {}) {
    return this.log('UI', component, action, state, 'UI');
  },

  logUIError(component, error, context = {}) {
    return this.log('UI', component, 'error', {
      error: error.message,
      context
    }, 'ERROR');
  },

  // Performance logging
  logPerformance(component, operation, duration, details = {}) {
    return this.log('PERFORMANCE', component, operation, {
      duration: `${duration}ms`,
      ...details
    }, 'PERFORMANCE');
  },

  // Database logging
  logDatabaseQuery(table, operation, params, result) {
    return this.log('DATABASE', table, operation, {
      params,
      resultCount: Array.isArray(result) ? result.length : result ? 1 : 0,
      success: !!result
    }, 'DATABASE');
  },

  // Success logging
  logSuccess(component, action, details = {}) {
    return this.log('SUCCESS', component, action, details, 'SUCCESS');
  },

  // Warning logging
  logWarning(component, action, details = {}) {
    return this.log('WARNING', component, action, details, 'WARNING');
  },

  // Filter logs by criteria
  filterLogs(criteria = {}) {
    return this.logs.filter(log => {
      return Object.keys(criteria).every(key => {
        if (key === 'timeRange') {
          const start = new Date(criteria.timeRange.start);
          const end = new Date(criteria.timeRange.end);
          const logTime = new Date(log.timestamp);
          return logTime >= start && logTime <= end;
        }
        return log[key] === criteria[key];
      });
    });
  },

  // Get logs summary
  getSummary() {
    const summary = {
      total: this.logs.length,
      byCategory: {},
      byLevel: {},
      byComponent: {},
      timeRange: {
        start: this.logs[0]?.timestamp,
        end: this.logs[this.logs.length - 1]?.timestamp
      }
    };

    this.logs.forEach(log => {
      // By category
      summary.byCategory[log.category] = (summary.byCategory[log.category] || 0) + 1;
      
      // By level
      summary.byLevel[log.level] = (summary.byLevel[log.level] || 0) + 1;
      
      // By component
      summary.byComponent[log.component] = (summary.byComponent[log.component] || 0) + 1;
    });

    return summary;
  },

  // Export logs for analysis
  exportLogs(format = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else if (format === 'csv') {
      const headers = ['timestamp', 'category', 'component', 'action', 'level', 'data'];
      const rows = this.logs.map(log => [
        log.timestamp,
        log.category,
        log.component,
        log.action,
        log.level,
        JSON.stringify(log.data)
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  },

  // Clear logs
  clearLogs() {
    this.logs = [];
    console.log('🧹 Payment bypass logs cleared');
  }
};

// Enhanced service monitoring
const ServiceMonitor = {
  startTime: null,
  operations: new Map(),

  // Start monitoring an operation
  startOperation(operationId, component, method, params = {}) {
    const start = performance.now();
    this.operations.set(operationId, {
      component,
      method,
      params,
      startTime: start,
      timestamp: new Date().toISOString()
    });

    PaymentBypassLogger.log('PERFORMANCE', component, `${method}_start`, {
      operationId,
      params
    }, 'INFO');

    return operationId;
  },

  // End monitoring an operation
  endOperation(operationId, result = null, error = null) {
    const operation = this.operations.get(operationId);
    if (!operation) {
      console.warn('⚠️ Operation not found:', operationId);
      return;
    }

    const endTime = performance.now();
    const duration = endTime - operation.startTime;

    const logData = {
      operationId,
      duration: `${duration.toFixed(2)}ms`,
      success: !error,
      result: result ? 'success' : 'no_result',
      error: error?.message
    };

    if (error) {
      PaymentBypassLogger.logServiceError(
        operation.component,
        `${operation.method}_complete`,
        error,
        operation.params
      );
    } else {
      PaymentBypassLogger.logPerformance(
        operation.component,
        `${operation.method}_complete`,
        duration,
        logData
      );
    }

    this.operations.delete(operationId);
    return duration;
  },

  // Get operation statistics
  getStats() {
    const completedOps = Array.from(this.operations.values());
    return {
      activeOperations: completedOps.length,
      operations: completedOps
    };
  }
};

// Payment flow specific tracking
const PaymentFlowTracker = {
  currentFlow: null,
  flowSteps: [],

  // Start tracking a payment flow
  startFlow(userId, planType, flowType = 'regular') {
    this.currentFlow = {
      id: `flow_${Date.now()}`,
      userId,
      planType,
      flowType,
      startTime: new Date(),
      steps: [],
      outcome: null
    };

    PaymentBypassLogger.logSuccess('FLOW', 'PaymentFlowTracker', 'flow_started', {
      flowId: this.currentFlow.id,
      userId,
      planType,
      flowType
    });

    return this.currentFlow.id;
  },

  // Track a step in the flow
  trackStep(stepName, component, data = {}) {
    if (!this.currentFlow) {
      console.warn('⚠️ No active flow to track step');
      return;
    }

    const step = {
      stepName,
      component,
      timestamp: new Date(),
      data
    };

    this.currentFlow.steps.push(step);

    PaymentBypassLogger.logUIAction(component, stepName, {
      flowId: this.currentFlow.id,
      stepNumber: this.currentFlow.steps.length,
      ...data
    });
  },

  // Complete the flow
  completeFlow(outcome, finalData = {}) {
    if (!this.currentFlow) {
      console.warn('⚠️ No active flow to complete');
      return;
    }

    this.currentFlow.outcome = outcome;
    this.currentFlow.endTime = new Date();
    this.currentFlow.duration = this.currentFlow.endTime - this.currentFlow.startTime;

    PaymentBypassLogger.logSuccess('FLOW', 'PaymentFlowTracker', 'flow_completed', {
      flowId: this.currentFlow.id,
      outcome,
      duration: `${this.currentFlow.duration}ms`,
      stepCount: this.currentFlow.steps.length,
      ...finalData
    });

    const completedFlow = { ...this.currentFlow };
    this.currentFlow = null;
    return completedFlow;
  },

  // Get current flow status
  getFlowStatus() {
    return this.currentFlow ? {
      active: true,
      flowId: this.currentFlow.id,
      currentStep: this.currentFlow.steps.length,
      duration: new Date() - this.currentFlow.startTime
    } : { active: false };
  }
};

// Error analysis utilities
const ErrorAnalyzer = {
  // Analyze error patterns in logs
  analyzeErrors() {
    const errorLogs = PaymentBypassLogger.filterLogs({ level: 'ERROR' });
    
    const analysis = {
      totalErrors: errorLogs.length,
      errorsByComponent: {},
      errorsByType: {},
      commonPatterns: [],
      timeDistribution: {}
    };

    errorLogs.forEach(log => {
      // By component
      analysis.errorsByComponent[log.component] = 
        (analysis.errorsByComponent[log.component] || 0) + 1;

      // By error type
      const errorType = log.data.error?.split(':')[0] || 'Unknown';
      analysis.errorsByType[errorType] = 
        (analysis.errorsByType[errorType] || 0) + 1;

      // Time distribution (by hour)
      const hour = new Date(log.timestamp).getHours();
      analysis.timeDistribution[hour] = 
        (analysis.timeDistribution[hour] || 0) + 1;
    });

    return analysis;
  },

  // Find error clusters
  findErrorClusters(timeWindowMs = 30000) {
    const errorLogs = PaymentBypassLogger.filterLogs({ level: 'ERROR' });
    const clusters = [];
    let currentCluster = [];

    errorLogs.forEach((log, index) => {
      if (currentCluster.length === 0) {
        currentCluster.push(log);
      } else {
        const timeDiff = new Date(log.timestamp) - new Date(currentCluster[0].timestamp);
        
        if (timeDiff <= timeWindowMs) {
          currentCluster.push(log);
        } else {
          if (currentCluster.length > 1) {
            clusters.push([...currentCluster]);
          }
          currentCluster = [log];
        }
      }
    });

    if (currentCluster.length > 1) {
      clusters.push(currentCluster);
    }

    return clusters;
  }
};

// Performance analyzer
const PerformanceAnalyzer = {
  // Analyze performance patterns
  analyzePerformance() {
    const perfLogs = PaymentBypassLogger.filterLogs({ level: 'PERFORMANCE' });
    
    const analysis = {
      totalOperations: perfLogs.length,
      averageDuration: 0,
      slowestOperations: [],
      fastestOperations: [],
      operationTypes: {}
    };

    if (perfLogs.length === 0) return analysis;

    const durations = perfLogs.map(log => {
      const duration = parseFloat(log.data.duration?.replace('ms', '') || '0');
      return { log, duration };
    }).filter(item => item.duration > 0);

    if (durations.length === 0) return analysis;

    // Calculate average
    analysis.averageDuration = durations.reduce((sum, item) => sum + item.duration, 0) / durations.length;

    // Sort by duration
    durations.sort((a, b) => b.duration - a.duration);

    // Slowest and fastest
    analysis.slowestOperations = durations.slice(0, 5).map(item => ({
      component: item.log.component,
      action: item.log.action,
      duration: item.duration,
      timestamp: item.log.timestamp
    }));

    analysis.fastestOperations = durations.slice(-5).map(item => ({
      component: item.log.component,
      action: item.log.action,
      duration: item.duration,
      timestamp: item.log.timestamp
    }));

    // By operation type
    perfLogs.forEach(log => {
      const operation = `${log.component}.${log.action}`;
      if (!analysis.operationTypes[operation]) {
        analysis.operationTypes[operation] = {
          count: 0,
          totalDuration: 0,
          averageDuration: 0
        };
      }
      
      const duration = parseFloat(log.data.duration?.replace('ms', '') || '0');
      analysis.operationTypes[operation].count++;
      analysis.operationTypes[operation].totalDuration += duration;
      analysis.operationTypes[operation].averageDuration = 
        analysis.operationTypes[operation].totalDuration / analysis.operationTypes[operation].count;
    });

    return analysis;
  }
};

// Test utilities integration
const TestUtilities = {
  // Validate service layer behavior
  validateServiceBehavior(userId, expectedResults) {
    const operationId = ServiceMonitor.startOperation(
      `validation_${Date.now()}`,
      'TestUtilities',
      'validateServiceBehavior',
      { userId, expectedResults }
    );

    return new Promise(async (resolve) => {
      try {
        // Check payment eligibility
        const eligibilityResult = await SubscriptionService.checkPaymentEligibility(userId);
        
        // Check age group
        const ageGroupResult = await SubscriptionService.getExistingAgeGroup(userId);
        
        const validation = {
          eligibilityCorrect: eligibilityResult.requiresPayment === expectedResults.requiresPayment,
          planTypeCorrect: eligibilityResult.planType === expectedResults.planType,
          ageGroupCorrect: ageGroupResult === expectedResults.ageGroup,
          bypassReasonCorrect: eligibilityResult.bypassReason === expectedResults.bypassReason
        };

        validation.allCorrect = Object.values(validation).every(v => v);

        PaymentBypassLogger.logSuccess('VALIDATION', 'TestUtilities', 'service_validation', {
          userId,
          validation,
          results: { eligibilityResult, ageGroupResult }
        });

        ServiceMonitor.endOperation(operationId, validation);
        resolve(validation);

      } catch (error) {
        PaymentBypassLogger.logServiceError('TestUtilities', 'validateServiceBehavior', error, { userId });
        ServiceMonitor.endOperation(operationId, null, error);
        resolve({ allCorrect: false, error: error.message });
      }
    });
  },

  // Generate test report
  generateTestReport() {
    const summary = PaymentBypassLogger.getSummary();
    const errorAnalysis = ErrorAnalyzer.analyzeErrors();
    const performanceAnalysis = PerformanceAnalyzer.analyzePerformance();

    const report = {
      timestamp: new Date().toISOString(),
      summary,
      errorAnalysis,
      performanceAnalysis,
      recommendations: this.generateRecommendations(errorAnalysis, performanceAnalysis)
    };

    console.log('📊 TEST REPORT GENERATED');
    console.log('========================');
    console.table(summary.byLevel);
    console.log('Full report available:', report);

    return report;
  },

  // Generate recommendations based on analysis
  generateRecommendations(errorAnalysis, performanceAnalysis) {
    const recommendations = [];

    // Error-based recommendations
    if (errorAnalysis.totalErrors > 10) {
      recommendations.push({
        type: 'error',
        priority: 'high',
        message: `High error count detected (${errorAnalysis.totalErrors}). Review error handling.`
      });
    }

    // Performance-based recommendations
    if (performanceAnalysis.averageDuration > 2000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: `Average operation duration is high (${performanceAnalysis.averageDuration.toFixed(2)}ms). Consider optimization.`
      });
    }

    return recommendations;
  }
};

// Export utilities to global scope
window.PaymentBypassLogging = {
  logger: PaymentBypassLogger,
  monitor: ServiceMonitor,
  tracker: PaymentFlowTracker,
  errorAnalyzer: ErrorAnalyzer,
  performanceAnalyzer: PerformanceAnalyzer,
  testUtils: TestUtilities
};

console.log('✅ Payment bypass logging utilities ready!');
console.log('📋 Available utilities:');
console.log('   - window.PaymentBypassLogging.logger');
console.log('   - window.PaymentBypassLogging.monitor');
console.log('   - window.PaymentBypassLogging.tracker');
console.log('   - window.PaymentBypassLogging.errorAnalyzer');
console.log('   - window.PaymentBypassLogging.performanceAnalyzer');
console.log('   - window.PaymentBypassLogging.testUtils');

// Example usage
console.log('\n📝 Example Usage:');
console.log('// Start tracking a payment flow');
console.log('PaymentBypassLogging.tracker.startFlow("user123", "silver-pack");');
console.log('');
console.log('// Log a service call');
console.log('PaymentBypassLogging.logger.logServiceCall("SubscriptionService", "checkPaymentEligibility", {userId: "123"}, result);');
console.log('');
console.log('// Generate test report');
console.log('PaymentBypassLogging.testUtils.generateTestReport();'); 