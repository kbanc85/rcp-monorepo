/**
 * Error Service
 * Provides standardized error handling and logging functionality for the extension.
 */
import { notificationService } from './notification-service';
import {
  RCPError,
  NetworkError,
  StorageError,
  PermissionError,
  UIError,
  ContentScriptError,
  BackgroundError,
  ClipboardError,
  ContextMenuError,
  ValidationError,
  NotFoundError,
  NotSupportedError,
  // isErrorType - Commented out to fix TS6133 error
} from './error-types';

/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

/**
 * Error categories to classify different types of errors
 */
export enum ErrorCategory {
  // Network related errors
  NETWORK = 'network',
  // Storage related errors
  STORAGE = 'storage',
  // Permission related errors
  PERMISSION = 'permission',
  // User interface related errors
  UI = 'ui',
  // Content script related errors
  CONTENT_SCRIPT = 'content_script',
  // Background script related errors
  BACKGROUND = 'background',
  // Clipboard related errors
  CLIPBOARD = 'clipboard',
  // Context menu related errors
  CONTEXT_MENU = 'context_menu',
  // Validation related errors
  VALIDATION = 'validation',
  // Not found errors
  NOT_FOUND = 'not_found',
  // Not supported errors
  NOT_SUPPORTED = 'not_supported',
  // Unknown or uncategorized errors
  UNKNOWN = 'unknown'
}

/**
 * Interface for structured error objects
 */
export interface StructuredError {
  message: string;
  category: ErrorCategory;
  originalError?: Error | unknown;
  context?: Record<string, any>;
  timestamp: Date;
}

/**
 * Options for error handling
 */
export interface ErrorHandlingOptions {
  // Whether to show a notification to the user
  notify?: boolean;
  // Whether to log the error to the console
  log?: boolean;
  // Whether to include the stack trace in the log
  includeStack?: boolean;
  // Additional context to include with the error
  context?: Record<string, any>;
  // Custom notification message (if not provided, the error message will be used)
  notificationMessage?: string;
}

/**
 * Default options for error handling
 */
const DEFAULT_ERROR_OPTIONS: ErrorHandlingOptions = {
  notify: true,
  log: true,
  includeStack: true,
  context: {}
};

/**
 * Maps error types to error categories
 */
const ERROR_TYPE_TO_CATEGORY = new Map<new (...args: any[]) => Error, ErrorCategory>([
  [NetworkError, ErrorCategory.NETWORK],
  [StorageError, ErrorCategory.STORAGE],
  [PermissionError, ErrorCategory.PERMISSION],
  [UIError, ErrorCategory.UI],
  [ContentScriptError, ErrorCategory.CONTENT_SCRIPT],
  [BackgroundError, ErrorCategory.BACKGROUND],
  [ClipboardError, ErrorCategory.CLIPBOARD],
  [ContextMenuError, ErrorCategory.CONTEXT_MENU],
  [ValidationError, ErrorCategory.VALIDATION],
  [NotFoundError, ErrorCategory.NOT_FOUND],
  [NotSupportedError, ErrorCategory.NOT_SUPPORTED],
  [RCPError, ErrorCategory.UNKNOWN]
]);

/**
 * Error Service class
 * Provides methods for handling errors and logging
 */
class ErrorService {
  // Whether debug logging is enabled
  private debugMode: boolean = false;
  
  /**
   * Enables or disables debug mode
   * @param enabled - Whether debug mode should be enabled
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.debug('Debug mode ' + (enabled ? 'enabled' : 'disabled'));
  }
  
  /**
   * Logs a message at the specified level
   * @param level - The log level
   * @param message - The message to log
   * @param context - Additional context to include
   */
  public log(level: LogLevel, message: string, context?: Record<string, any>): void {
    // Skip debug logs if debug mode is disabled
    if (level === LogLevel.DEBUG && !this.debugMode) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const prefix = `[RCP ${level.toUpperCase()}]`;
    
    // Format the log message
    let logMessage = `${prefix} ${timestamp}: ${message}`;
    
    // Add context if provided
    if (context && Object.keys(context).length > 0) {
      try {
        const contextStr = JSON.stringify(context, null, 2);
        logMessage += `\nContext: ${contextStr}`;
      } catch (e) {
        logMessage += '\nContext: [Could not stringify context]';
      }
    }
    
    // Log to the appropriate console method based on level
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARNING:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }
  
  /**
   * Logs a debug message
   * @param message - The message to log
   * @param context - Additional context to include
   */
  public debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  /**
   * Logs an info message
   * @param message - The message to log
   * @param context - Additional context to include
   */
  public info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  /**
   * Logs a warning message
   * @param message - The message to log
   * @param context - Additional context to include
   */
  public warning(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARNING, message, context);
  }
  
  /**
   * Creates a structured error object
   * @param message - The error message
   * @param category - The error category
   * @param originalError - The original error object
   * @param context - Additional context to include
   * @returns A structured error object
   */
  public createError(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    originalError?: Error | unknown,
    context?: Record<string, any>
  ): StructuredError {
    return {
      message,
      category,
      originalError,
      context,
      timestamp: new Date()
    };
  }
  
  /**
   * Determines the error category based on the error type
   * @param error - The error to categorize
   * @returns The error category
   */
  private categorizeError(error: unknown): ErrorCategory {
    if (error instanceof Error) {
      // Check if it's one of our custom error types
      for (const [errorType, category] of ERROR_TYPE_TO_CATEGORY.entries()) {
        if (error instanceof errorType) {
          return category;
        }
      }
      
      // Check for specific error names
      switch (error.name) {
        case 'NetworkError':
        case 'FetchError':
        case 'AbortError':
          return ErrorCategory.NETWORK;
        case 'QuotaExceededError':
        case 'DataError':
          return ErrorCategory.STORAGE;
        case 'NotAllowedError':
        case 'SecurityError':
          return ErrorCategory.PERMISSION;
        default:
          return ErrorCategory.UNKNOWN;
      }
    }
    
    return ErrorCategory.UNKNOWN;
  }
  
  /**
   * Handles an error with standardized logging and notification
   * @param error - The error to handle
   * @param category - The error category (auto-detected if not provided)
   * @param options - Options for error handling
   */
  public handleError(
    error: Error | string | unknown,
    category?: ErrorCategory,
    options: Partial<ErrorHandlingOptions> = {}
  ): void {
    // Merge options with defaults
    const mergedOptions: ErrorHandlingOptions = {
      ...DEFAULT_ERROR_OPTIONS,
      ...options
    };
    
    // Extract error message
    let errorMessage: string;
    let originalError: Error | unknown = error;
    
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      try {
        errorMessage = JSON.stringify(error);
      } catch (e) {
        errorMessage = 'Unknown error';
      }
    }
    
    // Auto-detect category if not provided
    const errorCategory = category || this.categorizeError(error);
    
    // Create structured error
    const structuredError = this.createError(
      errorMessage,
      errorCategory,
      originalError,
      mergedOptions.context
    );
    
    // Log the error
    if (mergedOptions.log) {
      let logMessage = `${structuredError.message} [${structuredError.category}]`;
      
      // Include stack trace if available and requested
      if (mergedOptions.includeStack && error instanceof Error && error.stack) {
        logMessage += `\nStack trace: ${error.stack}`;
      }
      
      this.log(LogLevel.ERROR, logMessage, structuredError.context);
    }
    
    // Show notification if requested
    if (mergedOptions.notify) {
      const notificationMessage = mergedOptions.notificationMessage || errorMessage;
      notificationService.error(notificationMessage);
    }
  }
  
  /**
   * Creates a network error
   * @param message - The error message
   * @param url - The URL that caused the error
   * @returns A network error
   */
  public createNetworkError(message: string, url?: string): NetworkError {
    return new NetworkError(message, url);
  }
  
  /**
   * Creates a storage error
   * @param message - The error message
   * @param key - The storage key that caused the error
   * @returns A storage error
   */
  public createStorageError(message: string, key?: string): StorageError {
    return new StorageError(message, key);
  }
  
  /**
   * Creates a permission error
   * @param message - The error message
   * @param permission - The permission that was denied
   * @returns A permission error
   */
  public createPermissionError(message: string, permission?: string): PermissionError {
    return new PermissionError(message, permission);
  }
  
  /**
   * Creates a UI error
   * @param message - The error message
   * @param component - The UI component that caused the error
   * @returns A UI error
   */
  public createUIError(message: string, component?: string): UIError {
    return new UIError(message, component);
  }
  
  /**
   * Creates a content script error
   * @param message - The error message
   * @param tabId - The tab ID that caused the error
   * @returns A content script error
   */
  public createContentScriptError(message: string, tabId?: number): ContentScriptError {
    return new ContentScriptError(message, tabId);
  }
  
  /**
   * Creates a background error
   * @param message - The error message
   * @returns A background error
   */
  public createBackgroundError(message: string): BackgroundError {
    return new BackgroundError(message);
  }
  
  /**
   * Creates a clipboard error
   * @param message - The error message
   * @returns A clipboard error
   */
  public createClipboardError(message: string): ClipboardError {
    return new ClipboardError(message);
  }
  
  /**
   * Creates a context menu error
   * @param message - The error message
   * @param menuId - The menu ID that caused the error
   * @returns A context menu error
   */
  public createContextMenuError(message: string, menuId?: string): ContextMenuError {
    return new ContextMenuError(message, menuId);
  }
  
  /**
   * Creates a validation error
   * @param message - The error message
   * @param field - The field that failed validation
   * @returns A validation error
   */
  public createValidationError(message: string, field?: string): ValidationError {
    return new ValidationError(message, field);
  }
  
  /**
   * Creates a not found error
   * @param message - The error message
   * @param resource - The resource that was not found
   * @returns A not found error
   */
  public createNotFoundError(message: string, resource?: string): NotFoundError {
    return new NotFoundError(message, resource);
  }
  
  /**
   * Creates a not supported error
   * @param message - The error message
   * @param feature - The feature that is not supported
   * @returns A not supported error
   */
  public createNotSupportedError(message: string, feature?: string): NotSupportedError {
    return new NotSupportedError(message, feature);
  }
  
  /**
   * Handles a network error
   * @param error - The error to handle
   * @param options - Options for error handling
   */
  public handleNetworkError(error: Error | string | unknown, options: Partial<ErrorHandlingOptions> = {}): void {
    this.handleError(error, ErrorCategory.NETWORK, options);
  }
  
  /**
   * Handles a storage error
   * @param error - The error to handle
   * @param options - Options for error handling
   */
  public handleStorageError(error: Error | string | unknown, options: Partial<ErrorHandlingOptions> = {}): void {
    this.handleError(error, ErrorCategory.STORAGE, options);
  }
  
  /**
   * Handles a permission error
   * @param error - The error to handle
   * @param options - Options for error handling
   */
  public handlePermissionError(error: Error | string | unknown, options: Partial<ErrorHandlingOptions> = {}): void {
    this.handleError(error, ErrorCategory.PERMISSION, options);
  }
  
  /**
   * Handles a UI error
   * @param error - The error to handle
   * @param options - Options for error handling
   */
  public handleUIError(error: Error | string | unknown, options: Partial<ErrorHandlingOptions> = {}): void {
    this.handleError(error, ErrorCategory.UI, options);
  }
  
  /**
   * Handles a content script error
   * @param error - The error to handle
   * @param options - Options for error handling
   */
  public handleContentScriptError(error: Error | string | unknown, options: Partial<ErrorHandlingOptions> = {}): void {
    this.handleError(error, ErrorCategory.CONTENT_SCRIPT, options);
  }
  
  /**
   * Handles a background script error
   * @param error - The error to handle
   * @param options - Options for error handling
   */
  public handleBackgroundError(error: Error | string | unknown, options: Partial<ErrorHandlingOptions> = {}): void {
    this.handleError(error, ErrorCategory.BACKGROUND, options);
  }
  
  /**
   * Handles a clipboard error
   * @param error - The error to handle
   * @param options - Options for error handling
   */
  public handleClipboardError(error: Error | string | unknown, options: Partial<ErrorHandlingOptions> = {}): void {
    this.handleError(error, ErrorCategory.CLIPBOARD, options);
  }
  
  /**
   * Handles a context menu error
   * @param error - The error to handle
   * @param options - Options for error handling
   */
  public handleContextMenuError(error: Error | string | unknown, options: Partial<ErrorHandlingOptions> = {}): void {
    this.handleError(error, ErrorCategory.CONTEXT_MENU, options);
  }
  
  /**
   * Handles a validation error
   * @param error - The error to handle
   * @param options - Options for error handling
   */
  public handleValidationError(error: Error | string | unknown, options: Partial<ErrorHandlingOptions> = {}): void {
    this.handleError(error, ErrorCategory.VALIDATION, options);
  }
  
  /**
   * Handles a not found error
   * @param error - The error to handle
   * @param options - Options for error handling
   */
  public handleNotFoundError(error: Error | string | unknown, options: Partial<ErrorHandlingOptions> = {}): void {
    this.handleError(error, ErrorCategory.NOT_FOUND, options);
  }
  
  /**
   * Handles a not supported error
   * @param error - The error to handle
   * @param options - Options for error handling
   */
  public handleNotSupportedError(error: Error | string | unknown, options: Partial<ErrorHandlingOptions> = {}): void {
    this.handleError(error, ErrorCategory.NOT_SUPPORTED, options);
  }
  
  /**
   * Wraps a function with error handling
   * @param fn - The function to wrap
   * @param category - The error category
   * @param options - Options for error handling
   * @returns A wrapped function with error handling
   */
  public wrapWithErrorHandling<T extends (...args: any[]) => any>(
    fn: T,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    options: Partial<ErrorHandlingOptions> = {}
  ): (...args: Parameters<T>) => ReturnType<T> | undefined {
    return (...args: Parameters<T>): ReturnType<T> | undefined => {
      try {
        return fn(...args);
      } catch (error) {
        this.handleError(error, category, options);
        return undefined;
      }
    };
  }
  
  /**
   * Wraps an async function with error handling
   * @param fn - The async function to wrap
   * @param category - The error category
   * @param options - Options for error handling
   * @returns A wrapped async function with error handling
   */
  public wrapAsyncWithErrorHandling<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    options: Partial<ErrorHandlingOptions> = {}
  ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | undefined> {
    return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(error, category, options);
        return undefined;
      }
    };
  }
}

// Export a singleton instance
export const errorService = new ErrorService();

// Try to detect if we're in development mode
// This is a simple heuristic and may need to be adjusted based on your build setup
try {
  // Check if we're in a development environment by looking for common dev indicators
  const isDev = 
    chrome.runtime.getManifest().version.includes('dev') || 
    chrome.runtime.getManifest().name.includes('Dev') ||
    location.hostname === 'localhost' ||
    location.protocol === 'chrome-extension:';
  
  if (isDev) {
    errorService.setDebugMode(true);
  }
} catch (e) {
  // If we can't detect, default to not enabling debug mode
  console.log('Could not determine environment, debug mode disabled');
} 