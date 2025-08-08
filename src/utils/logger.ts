// Centralized logging utility

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  context?: string;
}

class Logger {
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  constructor() {
    this.logLevel = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private createLogEntry(level: LogLevel, message: string, data?: unknown, context?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      context
    };
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private formatMessage(entry: LogEntry): string {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const levelName = levelNames[entry.level];
    const context = entry.context ? `[${entry.context}] ` : '';
    return `${entry.timestamp} ${levelName}: ${context}${entry.message}`;
  }

  debug(message: string, data?: unknown, context?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, data, context);
    this.addLog(entry);
    
    console.debug(this.formatMessage(entry), data || '');
  }

  info(message: string, data?: unknown, context?: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, message, data, context);
    this.addLog(entry);
    
    console.info(this.formatMessage(entry), data || '');
  }

  warn(message: string, data?: unknown, context?: string): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, message, data, context);
    this.addLog(entry);
    
    console.warn(this.formatMessage(entry), data || '');
  }

  error(message: string, error?: Error | unknown, context?: string): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry = this.createLogEntry(LogLevel.ERROR, message, error, context);
    this.addLog(entry);
    
    console.error(this.formatMessage(entry), error || '');
    
    // In production, send critical errors to external service
    if (!import.meta.env.DEV) {
      this.sendToExternalService(entry);
    }
  }

  private async sendToExternalService(entry: LogEntry): Promise<void> {
    try {
      // Example: Send to your logging service
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     ...entry,
      //     userAgent: navigator.userAgent,
      //     url: window.location.href,
      //     userId: getUserId(), // if available
      //     sessionId: getSessionId(), // if available
      //   })
      // });
      
      console.log('Would send to external service:', entry);
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  // API-specific logging methods
  apiRequest(method: string, url: string, data?: unknown): void {
    this.info(`API Request: ${method} ${url}`, data, 'API');
  }

  apiResponse(method: string, url: string, status: number, data?: unknown): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const message = `API Response: ${method} ${url} - ${status}`;
    
    if (level === LogLevel.ERROR) {
      this.error(message, data, 'API');
    } else {
      this.info(message, data, 'API');
    }
  }

  apiError(method: string, url: string, error: Error | unknown): void {
    this.error(`API Error: ${method} ${url}`, error, 'API');
  }

  // User interaction logging
  userAction(action: string, data?: unknown): void {
    this.info(`User Action: ${action}`, data, 'USER');
  }

  // Performance logging
  performance(operation: string, duration: number, data?: unknown): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO;
    const message = `Performance: ${operation} took ${duration}ms`;
    
    if (level === LogLevel.WARN) {
      this.warn(message, data, 'PERF');
    } else {
      this.info(message, data, 'PERF');
    }
  }

  // Storage operations
  storageOperation(operation: string, key: string, success: boolean, error?: Error): void {
    if (success) {
      this.debug(`Storage: ${operation} ${key}`, undefined, 'STORAGE');
    } else {
      this.error(`Storage: Failed to ${operation} ${key}`, error, 'STORAGE');
    }
  }

  // Get logs for debugging
  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  // Export logs for support
  exportLogs(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      logs: this.logs
    }, null, 2);
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
    this.info('Logs cleared', undefined, 'LOGGER');
  }

  // Set log level dynamically
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Log level set to ${LogLevel[level]}`, undefined, 'LOGGER');
  }
}

// Performance measurement utility
export class PerformanceLogger {
  private startTimes: Map<string, number> = new Map();

  start(operation: string): void {
    this.startTimes.set(operation, performance.now());
    logger.debug(`Started: ${operation}`, undefined, 'PERF');
  }

  end(operation: string, data?: unknown): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      logger.warn(`No start time found for operation: ${operation}`, undefined, 'PERF');
      return 0;
    }

    const duration = performance.now() - startTime;
    this.startTimes.delete(operation);
    
    logger.performance(operation, duration, data);
    return duration;
  }

  measure<T>(operation: string, fn: () => T | Promise<T>, data?: unknown): T | Promise<T> {
    this.start(operation);
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          this.end(operation, data);
        });
      } else {
        this.end(operation, data);
        return result;
      }
    } catch (error) {
      this.end(operation, { ...data, error });
      throw error;
    }
  }
}

// Create singleton instances
export const logger = new Logger();
export const perfLogger = new PerformanceLogger();

// Global error handler
window.addEventListener('error', (event) => {
  logger.error('Global Error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  }, 'GLOBAL');
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled Promise Rejection', {
    reason: event.reason,
    promise: event.promise
  }, 'GLOBAL');
});

export default logger;