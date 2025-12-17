/**
 * Notification Service
 * A unified service for displaying notifications to users through various methods.
 */
import { isRestrictedUrl } from './url-utils';
import { 
  TOAST_MESSAGES, 
  TOAST_STYLES, 
  TOAST_ICONS 
} from '../config/toast-config';

// Debug helper function for logging
const debugLog = (prefix: string, msg: string): void => {
  console.log(`[RCP ${prefix}]: ${msg}`);
};

/**
 * Notification types supported by the service
 */
export type NotificationType = 'success' | 'info' | 'warning' | 'error' | 'clipboard';

/**
 * Options for displaying a notification
 */
export interface NotificationOptions {
  message?: string;
  type?: NotificationType;
  duration?: number;
  useRandomMessage?: boolean;
  badgeText?: string;
}

/**
 * Notification Service class
 * Provides methods for displaying different types of notifications
 */
class NotificationService {
  /**
   * Shows a notification to the user
   * @param options - Notification options
   */
  async notify(options: NotificationOptions = {}): Promise<void> {
    const {
      message,
      type = 'info',
      duration = 2000,
      useRandomMessage = false,
      badgeText = '✓'
    } = options;
    
    // Get the message to display
    let displayMessage = message;
    
    // If no message provided or random message requested, get a random one
    if (useRandomMessage || !displayMessage) {
      displayMessage = this.getRandomMessage(type);
    }
    
    try {
      // Try to show a toast notification first
      await this.showToastNotification(displayMessage, type, duration);
    } catch (error) {
      debugLog('Notification', `Toast failed, using badge fallback: ${error}`);
      // Fall back to badge notification
      this.showBadgeNotification(badgeText, type, duration);
    }
  }
  
  /**
   * Shows a success notification
   * @param message - Message to display
   * @param options - Additional options
   */
  async success(message?: string, options: Partial<NotificationOptions> = {}): Promise<void> {
    return this.notify({
      message,
      type: 'success',
      useRandomMessage: !message,
      ...options
    });
  }
  
  /**
   * Shows an info notification
   * @param message - Message to display
   * @param options - Additional options
   */
  async info(message?: string, options: Partial<NotificationOptions> = {}): Promise<void> {
    return this.notify({
      message,
      type: 'info',
      useRandomMessage: !message,
      ...options
    });
  }
  
  /**
   * Shows a warning notification
   * @param message - Message to display
   * @param options - Additional options
   */
  async warning(message?: string, options: Partial<NotificationOptions> = {}): Promise<void> {
    return this.notify({
      message,
      type: 'warning',
      useRandomMessage: !message,
      ...options
    });
  }
  
  /**
   * Shows an error notification
   * @param message - Message to display
   * @param options - Additional options
   */
  async error(message?: string, options: Partial<NotificationOptions> = {}): Promise<void> {
    return this.notify({
      message,
      type: 'error',
      useRandomMessage: !message,
      ...options
    });
  }
  
  /**
   * Shows a clipboard notification
   * @param message - Message to display
   * @param options - Additional options
   */
  async clipboard(message?: string, options: Partial<NotificationOptions> = {}): Promise<void> {
    return this.notify({
      message,
      type: 'clipboard',
      useRandomMessage: !message,
      ...options
    });
  }
  
  /**
   * Gets a random message for the specified notification type
   * @param type - Notification type
   * @returns A random message
   */
  public getRandomMessage(type: NotificationType): string {
    // Use type assertion to handle the index access
    const messages = (TOAST_MESSAGES as Record<NotificationType, string[]>)[type] || [];
    if (messages.length === 0) {
      return `${type.charAt(0).toUpperCase() + type.slice(1)} notification`;
    }
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  /**
   * Shows a badge notification on the extension icon
   * @param text - Text to display on the badge
   * @param type - Notification type
   * @param duration - How long to show the badge in milliseconds
   */
  showBadgeNotification(text: string, type: NotificationType = 'info', duration: number = 2000): void {
    const color = TOAST_STYLES.badge[type] || TOAST_STYLES.badge.info;
    
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
    
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" });
    }, duration);
  }
  
  /**
   * Shows a toast notification on the active tab
   * @param message - Message to display
   * @param type - Notification type
   * @param duration - How long to show the toast in milliseconds
   */
  private async showToastNotification(
    message: string, 
    type: NotificationType = 'info',
    duration: number = 2000
  ): Promise<void> {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        throw new Error("No active tab found for toast notification");
      }

      // Check if the URL is restricted
      if (tab.url && isRestrictedUrl(tab.url)) {
        throw new Error(`Restricted URL: ${tab.url}`);
      }

      // Check if we have scripting permission
      const hasScripting = await chrome.permissions.contains({
        permissions: ['scripting']
      });

      if (!hasScripting) {
        throw new Error("No scripting permission");
      }

      // Show toast using scripting
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: this.createToastInPage,
        args: [message, type, duration, TOAST_STYLES, TOAST_ICONS]
      });
    } catch (error) {
      debugLog('Toast', `Failed to show toast: ${error}`);
      throw error;
    }
  }
  
  /**
   * Creates and displays a toast notification in the page
   * This function runs in the context of the page via executeScript
   */
  private createToastInPage(
    message: string, 
    type: string,
    duration: number,
    styles: any,
    icons: any
  ): HTMLDivElement {
    // Define a unique ID for toast tracking
    const TOAST_ID = 'rcp-toast-notification';
    
    // Debug logging utility for content script
    const debug = (...args: any[]): void => {
      console.log('[RCP Toast]', ...args);
    };
    
    // Clean up any existing toasts first
    const cleanup = () => {
      const existingToasts = document.querySelectorAll('.rcp-toast');
      existingToasts.forEach(toast => {
        if (toast.parentNode) {
          try {
            document.body.removeChild(toast);
          } catch (e) {
            debug('Error removing toast:', e);
          }
        }
      });
      
      // Also try removing by ID
      const existingToastById = document.getElementById(TOAST_ID);
      if (existingToastById && existingToastById.parentNode) {
        try {
          existingToastById.parentNode.removeChild(existingToastById);
        } catch (e) {
          debug('Error removing toast by ID:', e);
        }
      }
    };
    
    // Clean up first
    cleanup();
    
    // Create new toast
    const toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.className = 'rcp-toast';
    
    // Create icon element with SVG
    const iconSpan = document.createElement('span');
    iconSpan.className = 'rcp-toast-icon';
    iconSpan.innerHTML = icons[type] || icons.info;
    
    // Create text span for message
    const textSpan = document.createElement('span');
    textSpan.className = 'rcp-toast-text';
    textSpan.innerText = message;
    
    // Append icon and text to toast
    toast.appendChild(iconSpan);
    toast.appendChild(textSpan);
    
    // Apply base styles
    Object.entries(styles.base).forEach(([key, value]) => {
      (toast.style as any)[key] = value as string;
    });
    
    // Apply type-specific styles
    const typeStyles = styles.types[type] || styles.types.info;
    Object.entries(typeStyles).forEach(([key, value]) => {
      (toast.style as any)[key] = value as string;
    });
    
    // Style the icon
    Object.assign(iconSpan.style, {
      fontSize: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '20px',
      height: '20px',
      marginRight: '4px'
    });
    
    // Add !important to critical styles
    toast.setAttribute('style', toast.getAttribute('style') + 
      'position: fixed !important; top: 20px !important; bottom: auto !important;' +
      'left: 50% !important; transform: translateX(-50%) !important;' + 
      'z-index: 2147483647 !important;' +
      'display: flex !important; align-items: center !important;');
    
    document.body.appendChild(toast);
    
    // Force layout reflow for animation
    void toast.offsetWidth;
    
    // Set opacity instantly
    toast.style.transition = `opacity ${styles.animation.duration} ${styles.animation.easing}, transform ${styles.animation.duration} ${styles.animation.easing}`;
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 0)';
    
    // Schedule removal - more reliable fade-out and removal
    const removeToast = () => {
      // Start fade out
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, -10px) !important'; // Move UP for top-positioned toast
      toast.setAttribute('style', toast.getAttribute('style') + 
        'opacity: 0 !important; transform: translate(-50%, -10px) !important;'); // Double ensure with !important
      
      // Remove element after transition
      setTimeout(() => {
        if (toast.parentNode) {
          try {
            document.body.removeChild(toast);
          } catch (e) {
            debug('Error removing toast after timeout:', e);
          }
        }
      }, 250); // Slightly faster removal after fade starts
    };
    
    // Set timeout for toast visibility
    const toastTimer = setTimeout(removeToast, duration);
    
    // Force cleanup after duration + 500ms as a fallback
    const backupTimer = setTimeout(() => {
      clearTimeout(toastTimer); // Clear the main timer if it hasn't fired yet
      if (toast.parentNode) {
        try {
          document.body.removeChild(toast);
        } catch (e) {
          debug('Error in backup toast removal:', e);
        }
      }
    }, duration + 500);
    
    // Ensure timers are cleared if the page changes
    window.addEventListener('beforeunload', () => {
      clearTimeout(toastTimer);
      clearTimeout(backupTimer);
      cleanup();
    }, { once: true });
    
    // Return the toast element
    return toast;
  }
}

// Export a singleton instance
export const notificationService = new NotificationService(); 