/**
 * URL Utilities Service
 * Handles URL-related functionality and checks.
 */

/**
 * Checks if a URL is restricted (cannot be accessed by content scripts)
 * @param url - The URL to check
 * @returns Whether the URL is restricted
 */
export function isRestrictedUrl(url: string): boolean {
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('devtools://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('view-source:') ||
    url.startsWith('file:') ||
    url.startsWith('data:') ||
    url.startsWith('javascript:')
  );
}

/**
 * Checks if a URL is a valid HTTP/HTTPS URL
 * @param url - The URL to check
 * @returns Whether the URL is valid
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

/**
 * Gets the domain from a URL
 * @param url - The URL to extract the domain from
 * @returns The domain of the URL
 */
export function getDomainFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (e) {
    return '';
  }
}

/**
 * Checks if a URL is from a specific domain
 * @param url - The URL to check
 * @param domain - The domain to check against
 * @returns Whether the URL is from the specified domain
 */
export function isUrlFromDomain(url: string, domain: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === domain || 
           parsedUrl.hostname.endsWith(`.${domain}`);
  } catch (e) {
    return false;
  }
}

/**
 * Sanitizes a URL by removing any potentially harmful components
 * @param url - The URL to sanitize
 * @returns The sanitized URL
 */
export function sanitizeUrl(url: string): string {
  // Remove any javascript: protocol
  if (url.toLowerCase().startsWith('javascript:')) {
    return '';
  }
  
  try {
    // Try to parse the URL to ensure it's valid
    const parsedUrl = new URL(url);
    
    // Only allow http and https protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return '';
    }
    
    return parsedUrl.toString();
  } catch (e) {
    // If it's not a valid URL, return empty string
    return '';
  }
} 