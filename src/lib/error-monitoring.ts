// Error monitoring and logging system for Korean Webnovel Generator

export interface ErrorLog {
  id: string;
  timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'debug';
  category: 'generation' | 'consistency' | 'parsing' | 'database' | 'api' | 'validation';
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
  userId?: string;
  novelId?: string;
  chapterId?: string;
  context?: Record<string, unknown>;
}

export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  operation: string;
  duration: number;
  success: boolean;
  details?: Record<string, unknown>;
}

class ErrorMonitoringService {
  private logs: ErrorLog[] = [];
  private metrics: PerformanceMetric[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory
  private maxMetrics = 500; // Keep last 500 metrics in memory

  // Log an error with context
  logError(
    category: ErrorLog['category'],
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date(),
      level: 'error',
      category,
      message,
      details: error ? {
        name: error.name,
        message: error.message,
        cause: error.cause
      } : undefined,
      stack: error?.stack,
      context
    };

    this.addLog(errorLog);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${category.toUpperCase()}] ${message}`, {
        error,
        context
      });
    }
  }

  // Log a warning
  logWarning(
    category: ErrorLog['category'],
    message: string,
    context?: Record<string, any>
  ): void {
    const warningLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date(),
      level: 'warn',
      category,
      message,
      context
    };

    this.addLog(warningLog);

    if (process.env.NODE_ENV === 'development') {
      console.warn(`[${category.toUpperCase()}] ${message}`, context);
    }
  }

  // Log general information
  logInfo(
    category: ErrorLog['category'],
    message: string,
    context?: Record<string, any>
  ): void {
    const infoLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date(),
      level: 'info',
      category,
      message,
      context
    };

    this.addLog(infoLog);

    if (process.env.NODE_ENV === 'development') {
      console.info(`[${category.toUpperCase()}] ${message}`, context);
    }
  }

  // Log debug information
  logDebug(
    category: ErrorLog['category'],
    message: string,
    context?: Record<string, any>
  ): void {
    // Only log debug in development
    if (process.env.NODE_ENV !== 'development') return;

    const debugLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date(),
      level: 'debug',
      category,
      message,
      context
    };

    this.addLog(debugLog);
    console.debug(`[${category.toUpperCase()}] ${message}`, context);
  }

  // Track performance metrics
  startPerformanceTracking(operation: string): string {
    const trackingId = this.generateId();
    performance.mark(`${operation}-start-${trackingId}`);
    return trackingId;
  }

  endPerformanceTracking(
    operation: string,
    trackingId: string,
    success: boolean = true,
    details?: Record<string, any>
  ): void {
    const endMark = `${operation}-end-${trackingId}`;
    const startMark = `${operation}-start-${trackingId}`;
    
    performance.mark(endMark);
    performance.measure(`${operation}-${trackingId}`, startMark, endMark);
    
    const measure = performance.getEntriesByName(`${operation}-${trackingId}`)[0];
    const duration = measure ? measure.duration : 0;

    const metric: PerformanceMetric = {
      id: trackingId,
      timestamp: new Date(),
      operation,
      duration,
      success,
      details
    };

    this.addMetric(metric);

    // Clean up performance marks
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(`${operation}-${trackingId}`);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERFORMANCE] ${operation} completed in ${duration.toFixed(2)}ms`, {
        success,
        details
      });
    }
  }

  // Get error statistics
  getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsByLevel: Record<string, number>;
    recentErrors: ErrorLog[];
    errorTrends: Array<{ hour: string; count: number }>;
  } {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentLogs = this.logs.filter(log => log.timestamp >= last24Hours);
    const recentErrors = recentLogs.filter(log => log.level === 'error');

    const errorsByCategory: Record<string, number> = {};
    const errorsByLevel: Record<string, number> = {};

    recentLogs.forEach(log => {
      errorsByCategory[log.category] = (errorsByCategory[log.category] || 0) + 1;
      errorsByLevel[log.level] = (errorsByLevel[log.level] || 0) + 1;
    });

    // Generate hourly error trends
    const errorTrends: Array<{ hour: string; count: number }> = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStart = new Date(hour.getFullYear(), hour.getMonth(), hour.getDate(), hour.getHours());
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      const hourlyErrors = recentErrors.filter(
        log => log.timestamp >= hourStart && log.timestamp < hourEnd
      );

      errorTrends.push({
        hour: hour.toISOString().substring(11, 16), // HH:MM format
        count: hourlyErrors.length
      });
    }

    return {
      totalErrors: recentErrors.length,
      errorsByCategory,
      errorsByLevel,
      recentErrors: recentErrors.slice(-10), // Last 10 errors
      errorTrends
    };
  }

  // Get performance statistics
  getPerformanceStatistics(): {
    averageResponseTime: number;
    slowestOperations: PerformanceMetric[];
    successRate: number;
    operationStats: Record<string, {
      count: number;
      averageDuration: number;
      successRate: number;
    }>;
  } {
    const recentMetrics = this.metrics.filter(
      metric => metric.timestamp >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    if (recentMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        slowestOperations: [],
        successRate: 100,
        operationStats: {}
      };
    }

    const averageResponseTime = recentMetrics.reduce((sum, metric) => sum + metric.duration, 0) / recentMetrics.length;
    const successRate = (recentMetrics.filter(metric => metric.success).length / recentMetrics.length) * 100;
    const slowestOperations = [...recentMetrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const operationStats: Record<string, {
      count: number;
      averageDuration: number;
      successRate: number;
    }> = {};

    recentMetrics.forEach(metric => {
      if (!operationStats[metric.operation]) {
        operationStats[metric.operation] = {
          count: 0,
          averageDuration: 0,
          successRate: 0
        };
      }

      operationStats[metric.operation].count++;
    });

    Object.keys(operationStats).forEach(operation => {
      const metrics = recentMetrics.filter(m => m.operation === operation);
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      const successCount = metrics.filter(m => m.success).length;
      const successRate = (successCount / metrics.length) * 100;

      operationStats[operation].averageDuration = avgDuration;
      operationStats[operation].successRate = successRate;
    });

    return {
      averageResponseTime,
      slowestOperations,
      successRate,
      operationStats
    };
  }

  // Search logs
  searchLogs(filters: {
    category?: ErrorLog['category'];
    level?: ErrorLog['level'];
    startDate?: Date;
    endDate?: Date;
    message?: string;
    novelId?: string;
    chapterId?: string;
  }): ErrorLog[] {
    return this.logs.filter(log => {
      if (filters.category && log.category !== filters.category) return false;
      if (filters.level && log.level !== filters.level) return false;
      if (filters.startDate && log.timestamp < filters.startDate) return false;
      if (filters.endDate && log.timestamp > filters.endDate) return false;
      if (filters.message && !log.message.toLowerCase().includes(filters.message.toLowerCase())) return false;
      if (filters.novelId && log.novelId !== filters.novelId) return false;
      if (filters.chapterId && log.chapterId !== filters.chapterId) return false;
      return true;
    });
  }

  // Clear old logs and metrics
  cleanup(): void {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    this.logs = this.logs.filter(log => log.timestamp >= cutoffDate);
    this.metrics = this.metrics.filter(metric => metric.timestamp >= cutoffDate);

    // Ensure we don't exceed max limits
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Export logs for external analysis
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify({
        logs: this.logs,
        metrics: this.metrics,
        exportedAt: new Date().toISOString()
      }, null, 2);
    } else {
      // CSV format
      const csvHeaders = 'timestamp,level,category,message,novelId,chapterId\n';
      const csvRows = this.logs.map(log => 
        `${log.timestamp.toISOString()},${log.level},${log.category},"${log.message.replace(/"/g, '""')}",${log.novelId || ''},${log.chapterId || ''}`
      ).join('\n');
      
      return csvHeaders + csvRows;
    }
  }

  private addLog(log: ErrorLog): void {
    this.logs.push(log);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Singleton instance
export const errorMonitor = new ErrorMonitoringService();

// Utility functions for common use cases
export const trackOperation = async <T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> => {
  const trackingId = errorMonitor.startPerformanceTracking(operation);
  
  try {
    const result = await fn();
    errorMonitor.endPerformanceTracking(operation, trackingId, true, context);
    return result;
  } catch (error) {
    errorMonitor.endPerformanceTracking(operation, trackingId, false, { error: error instanceof Error ? error.message : String(error) });
    errorMonitor.logError('api', `Operation ${operation} failed`, error instanceof Error ? error : new Error(String(error)), context);
    throw error;
  }
};

export const logGenerationError = (error: Error, context: { novelId?: string; chapterId?: string; prompt?: string }) => {
  errorMonitor.logError('generation', 'Chapter generation failed', error, {
    ...context,
    promptLength: context.prompt?.length,
    prompt: context.prompt?.substring(0, 200) // Log only first 200 chars of prompt
  });
};

export const logConsistencyError = (error: Error, context: { novelId?: string; chapterId?: string }) => {
  errorMonitor.logError('consistency', 'Consistency check failed', error, context);
};

export const logParsingError = (error: Error, context: { response?: string; expectedFormat?: string }) => {
  errorMonitor.logError('parsing', 'Response parsing failed', error, {
    ...context,
    responseLength: context.response?.length,
    responseSample: context.response?.substring(0, 300) // Log first 300 chars
  });
};

export const logValidationError = (message: string, context: { content?: string; validationErrors?: string[] }) => {
  errorMonitor.logWarning('validation', message, {
    ...context,
    contentLength: context.content?.length,
    contentSample: context.content?.substring(0, 200)
  });
};

// Cleanup function to be called periodically
export const cleanupErrorLogs = () => {
  errorMonitor.cleanup();
};

export default errorMonitor; 