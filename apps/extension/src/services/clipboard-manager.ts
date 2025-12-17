/**
 * Clipboard Manager Service
 * Handles clipboard operations.
 */
import { errorService } from './error-service';
import { ClipboardError } from './error-types';

/**
 * Copies text to clipboard
 * @param text - The text to copy
 * @returns Promise that resolves when the text is copied
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    errorService.debug("Text copied to clipboard");
    return Promise.resolve();
  } catch (error) {
    // Create a specific clipboard error
    const clipboardError = new ClipboardError("Failed to copy text to clipboard");
    // Log and handle the error
    errorService.handleClipboardError(clipboardError, {
      notify: false, // Don't show a notification to the user
      context: { originalError: error }
    });
    return Promise.reject(clipboardError);
  }
} 