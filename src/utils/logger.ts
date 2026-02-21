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

// Logger state (closure-based)
let logLevel: LogLevel = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO;
let logs: LogEntry[] = [];
const maxLogs = 1000; // Keep last 1000 logs in memory

function shouldLog(level: LogLevel): boolean {
  return level >= logLevel;
}

function createLogEntry(level: LogLevel, message: string, data?: unknown, context?: string): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    context
  };
}

function addLog(entry: LogEntry): void {
  logs.push(entry);

  // Keep only the most recent logs
  if (logs.length > maxLogs) {
    logs = logs.slice(-maxLogs);
  }
}

function formatMessage(entry: LogEntry): string {
  const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
  const levelName = levelNames[entry.level];
  const context = entry.context ? `[${entry.context}] ` : '';
  return `${entry.timestamp} ${levelName}: ${context}${entry.message}`;
}

export function debug(message: string, data?: unknown, context?: string): void {
  if (!shouldLog(LogLevel.DEBUG)) return;

  const entry = createLogEntry(LogLevel.DEBUG, message, data, context);
  addLog(entry);

  console.debug(formatMessage(entry), data || '');
}

export function info(message: string, data?: unknown, context?: string): void {
  if (!shouldLog(LogLevel.INFO)) return;

  const entry = createLogEntry(LogLevel.INFO, message, data, context);
  addLog(entry);

  console.info(formatMessage(entry), data || '');
}

export function warn(message: string, data?: unknown, context?: string): void {
  if (!shouldLog(LogLevel.WARN)) return;

  const entry = createLogEntry(LogLevel.WARN, message, data, context);
  addLog(entry);

  console.warn(formatMessage(entry), data || '');
}

export function error(message: string, errorData?: Error | unknown, context?: string): void {
  if (!shouldLog(LogLevel.ERROR)) return;

  const entry = createLogEntry(LogLevel.ERROR, message, errorData, context);
  addLog(entry);

  console.error(formatMessage(entry), errorData || '');

  // In production, send critical errors to external service
  if (!import.meta.env.DEV) {
    sendToExternalService(entry);
  }
}

async function sendToExternalService(entry: LogEntry): Promise<void> {
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
export function apiRequest(method: string, url: string, data?: unknown): void {
  info(`API Request: ${method} ${url}`, data, 'API');
}

export function apiResponse(method: string, url: string, status: number, data?: unknown): void {
  const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
  const message = `API Response: ${method} ${url} - ${status}`;

  if (level === LogLevel.ERROR) {
    error(message, data, 'API');
  } else {
    info(message, data, 'API');
  }
}

export function apiError(method: string, url: string, errorData: Error | unknown): void {
  error(`API Error: ${method} ${url}`, errorData, 'API');
}

// User interaction logging
export function userAction(action: string, data?: unknown): void {
  info(`User Action: ${action}`, data, 'USER');
}

// Performance logging
export function performance(operation: string, duration: number, data?: unknown): void {
  const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO;
  const message = `Performance: ${operation} took ${duration}ms`;

  if (level === LogLevel.WARN) {
    warn(message, data, 'PERF');
  } else {
    info(message, data, 'PERF');
  }
}

// Storage operations
export function storageOperation(operation: string, key: string, success: boolean, errorData?: Error): void {
  if (success) {
    debug(`Storage: ${operation} ${key}`, undefined, 'STORAGE');
  } else {
    error(`Storage: Failed to ${operation} ${key}`, errorData, 'STORAGE');
  }
}

// Get logs for debugging
export function getLogs(level?: LogLevel): LogEntry[] {
  if (level !== undefined) {
    return logs.filter(log => log.level >= level);
  }
  return [...logs];
}

// Export logs for support
export function exportLogs(): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    logs: logs
  }, null, 2);
}

// Clear logs
export function clearLogs(): void {
  logs = [];
  info('Logs cleared', undefined, 'LOGGER');
}

// Set log level dynamically
export function setLogLevel(level: LogLevel): void {
  logLevel = level;
  info(`Log level set to ${LogLevel[level]}`, undefined, 'LOGGER');
}

// Performance measurement utility (closure-based)
const startTimes = new Map<string, number>();

export function perfStart(operation: string): void {
  startTimes.set(operation, performance.now());
  debug(`Started: ${operation}`, undefined, 'PERF');
}

export function perfEnd(operation: string, data?: unknown): number {
  const startTime = startTimes.get(operation);
  if (!startTime) {
    warn(`No start time found for operation: ${operation}`, undefined, 'PERF');
    return 0;
  }

  const duration = performance.now() - startTime;
  startTimes.delete(operation);

  performance(operation, duration, data);
  return duration;
}

export function perfMeasure<T>(operation: string, fn: () => T | Promise<T>, data?: unknown): T | Promise<T> {
  perfStart(operation);

  try {
    const result = fn();

    if (result instanceof Promise) {
      return result.finally(() => {
        perfEnd(operation, data);
      });
    } else {
      perfEnd(operation, data);
      return result;
    }
  } catch (error) {
    perfEnd(operation, data ? { ...data as Record<string, unknown>, error } : { error });
    throw error;
  }
}

// Default export object for backward compatibility
const logger = {
  debug,
  info,
  warn,
  error,
  apiRequest,
  apiResponse,
  apiError,
  userAction,
  performance,
  storageOperation,
  getLogs,
  exportLogs,
  clearLogs,
  setLogLevel,
};

export const perfLogger = {
  start: perfStart,
  end: perfEnd,
  measure: perfMeasure,
};

// Global error handler
window.addEventListener('error', (event) => {
  error('Global Error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  }, 'GLOBAL');
});

window.addEventListener('unhandledrejection', (event) => {
  error('Unhandled Promise Rejection', {
    reason: event.reason,
    promise: event.promise
  }, 'GLOBAL');
});

export default logger;
