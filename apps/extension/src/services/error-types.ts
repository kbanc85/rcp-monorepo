/**
 * Error Types
 * Custom error classes for different error scenarios in the application.
 */

/**
 * Base error class for all application errors
 */
export class RCPError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RCPError';
    
    // This is needed to make instanceof work correctly with custom errors
    Object.setPrototypeOf(this, RCPError.prototype);
  }
}

/**
 * Error thrown when a network operation fails
 */
export class NetworkError extends RCPError {
  constructor(message: string, public readonly url?: string) {
    super(message);
    this.name = 'NetworkError';
    
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Error thrown when a storage operation fails
 */
export class StorageError extends RCPError {
  constructor(message: string, public readonly key?: string) {
    super(message);
    this.name = 'StorageError';
    
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

/**
 * Error thrown when a permission is denied
 */
export class PermissionError extends RCPError {
  constructor(message: string, public readonly permission?: string) {
    super(message);
    this.name = 'PermissionError';
    
    Object.setPrototypeOf(this, PermissionError.prototype);
  }
}

/**
 * Error thrown when a UI operation fails
 */
export class UIError extends RCPError {
  constructor(message: string, public readonly component?: string) {
    super(message);
    this.name = 'UIError';
    
    Object.setPrototypeOf(this, UIError.prototype);
  }
}

/**
 * Error thrown when a content script operation fails
 */
export class ContentScriptError extends RCPError {
  constructor(message: string, public readonly tabId?: number) {
    super(message);
    this.name = 'ContentScriptError';
    
    Object.setPrototypeOf(this, ContentScriptError.prototype);
  }
}

/**
 * Error thrown when a background script operation fails
 */
export class BackgroundError extends RCPError {
  constructor(message: string) {
    super(message);
    this.name = 'BackgroundError';
    
    Object.setPrototypeOf(this, BackgroundError.prototype);
  }
}

/**
 * Error thrown when a clipboard operation fails
 */
export class ClipboardError extends RCPError {
  constructor(message: string) {
    super(message);
    this.name = 'ClipboardError';
    
    Object.setPrototypeOf(this, ClipboardError.prototype);
  }
}

/**
 * Error thrown when a context menu operation fails
 */
export class ContextMenuError extends RCPError {
  constructor(message: string, public readonly menuId?: string) {
    super(message);
    this.name = 'ContextMenuError';
    
    Object.setPrototypeOf(this, ContextMenuError.prototype);
  }
}

/**
 * Error thrown when a validation fails
 */
export class ValidationError extends RCPError {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ValidationError';
    
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when an operation times out
 */
export class TimeoutError extends RCPError {
  constructor(message: string, public readonly timeoutMs?: number) {
    super(message);
    this.name = 'TimeoutError';
    
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends RCPError {
  constructor(message: string, public readonly resource?: string) {
    super(message);
    this.name = 'NotFoundError';
    
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Error thrown when an operation is not supported
 */
export class NotSupportedError extends RCPError {
  constructor(message: string, public readonly feature?: string) {
    super(message);
    this.name = 'NotSupportedError';
    
    Object.setPrototypeOf(this, NotSupportedError.prototype);
  }
}

/**
 * Helper function to determine if an error is a specific type
 * @param error - The error to check
 * @param errorType - The error type to check against
 * @returns Whether the error is of the specified type
 */
export function isErrorType<T extends Error>(
  error: unknown,
  errorType: new (...args: any[]) => T
): error is T {
  return error instanceof errorType;
}

/**
 * Helper function to create a timeout promise that rejects after a specified time
 * @param ms - The timeout in milliseconds
 * @param message - The error message
 * @returns A promise that rejects after the specified time
 */
export function createTimeout(ms: number, message: string = `Operation timed out after ${ms}ms`): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new TimeoutError(message, ms)), ms);
  });
}

/**
 * Helper function to race a promise against a timeout
 * @param promise - The promise to race
 * @param ms - The timeout in milliseconds
 * @param message - The error message
 * @returns A promise that resolves with the result of the original promise or rejects with a timeout error
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string = `Operation timed out after ${ms}ms`
): Promise<T> {
  return Promise.race([promise, createTimeout(ms, message)]);
} 