/**
 * Toast Notifications Service
 * Handles displaying toast notifications and badge updates to the user.
 * 
 * This file provides backward compatibility with the old notification API
 * while using the new unified notification service internally.
 */
import { notificationService, NotificationType } from './notification-service';

// Debug helper function for logging
export const debugLog = (prefix: string, msg: string): void => {
  console.log(`[RCP ${prefix}]: ${msg}`);
};

/**
 * Returns a random toast message for clipboard operations
 * @returns A random toast message string
 * @deprecated Use notificationService.clipboard() instead
 */
export function getRandomToastMessage(): string {
  // This will get a random clipboard message from the notification service
  return notificationService.getRandomMessage('clipboard');
}

/**
 * Shows a badge notification on the extension icon
 * @param text - Text to display on the badge
 * @param color - Background color for the badge
 * @param duration - How long to show the badge in milliseconds
 * @deprecated Use notificationService.notify() with appropriate options instead
 */
export function showBadgeNotification(text: string, color: string, duration: number = 2000): void {
  // Convert color to a notification type if possible
  let type: NotificationType = 'info';
  
  if (color === '#EF4444') {
    type = 'clipboard';
  } else if (color === '#4ADE80') {
    type = 'success';
  } else if (color === '#FBBF24') {
    type = 'warning';
  } else if (color === '#60A5FA') {
    type = 'info';
  }
  
  // Use the notification service
  notificationService.showBadgeNotification(text, type, duration);
}

/**
 * Shows a toast notification on the active tab
 * @param message - Message to display in the toast
 * @deprecated Use notificationService.notify() instead
 */
export async function showToastOnActiveTab(message: string): Promise<void> {
  // Use the notification service with clipboard type
  return notificationService.clipboard(message, { useRandomMessage: false });
} 