/**
 * Toast Notification Configuration
 * Contains all configurable aspects of the toast notification system.
 */

// Toast message collection for different notification types
export const TOAST_MESSAGES = {
  // Success messages for clipboard operations
  clipboard: [
    "Prompt copied to clipboard. Ready to paste your genius!",
    "Prompt copied. Your clipboard is ready for action.",
    "Copied! Now go paste that brilliant prompt.",
    "Your prompt is safely copied. Use it wisely.",
    "Prompt is in clipboard. Time to paste and shine!",
    "Prompt copied: let your ideas flow into action.",
    "Success! Your prompt has been copied. Proceed to paste.",
    "Clipboard updated. Your prompt is ready to go.",
    "Copied prompt. Enjoy your extra productivity boost!",
    "Prompt secured in clipboard. Ready for your magic!",
    "Great! Prompt copied and set for action. Paste it now.",
    "Your prompt is now copied. Go ahead and paste it!",
    "Prompt copied successfully. Use it to innovate!",
    "Clipboard: prompt copied. Time to get creative.",
    "Action confirmed: your prompt is on the clipboard.",
    "Prompt copied. Clipboard ready for your next step.",
    "Mission accomplished: prompt is copied. Well done!",
    "Copy complete: your prompt awaits pasting.",
    "Prompt locked in clipboard. Paste to proceed.",
    "Clipboard updated. Prompt is copied and set.",
    "Copy done. Your prompt is ready to paste away!",
    "Prompt copied. Time to paste and impress the team.",
    "Clipboard alert: prompt is copied. Go paste it now!"
  ],
  
  // Info messages
  info: [
    "Just so you know...",
    "For your information...",
    "Here's a tip...",
    "Quick update...",
    "Just a heads up..."
  ],
  
  // Warning messages
  warning: [
    "Careful there...",
    "Just a warning...",
    "Heads up...",
    "You might want to know..."
  ],
  
  // Error messages
  error: [
    "Oops! Something went wrong.",
    "That didn't work as expected.",
    "We encountered an issue.",
    "Error occurred."
  ]
};

// Toast styling configuration
export const TOAST_STYLES = {
  // Base styles for all toasts
  base: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '10px 16px',
    borderRadius: '8px',
    zIndex: '2147483647',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
    fontWeight: '500',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  // Type-specific styles
  types: {
    success: {
      background: 'var(--rcp-toast-success-bg, #2D2D2D)',
      color: 'var(--rcp-toast-success-color, #FFFFFF)',
      borderLeft: 'var(--rcp-toast-success-border, 4px solid #4ADE80)'
    },
    info: {
      background: 'var(--rcp-toast-info-bg, #2D2D2D)',
      color: 'var(--rcp-toast-info-color, #FFFFFF)',
      borderLeft: 'var(--rcp-toast-info-border, 4px solid #60A5FA)'
    },
    warning: {
      background: 'var(--rcp-toast-warning-bg, #2D2D2D)',
      color: 'var(--rcp-toast-warning-color, #FFFFFF)',
      borderLeft: 'var(--rcp-toast-warning-border, 4px solid #FBBF24)'
    },
    error: {
      background: 'var(--rcp-toast-error-bg, #2D2D2D)',
      color: 'var(--rcp-toast-error-color, #FFFFFF)',
      borderLeft: 'var(--rcp-toast-error-border, 4px solid #EF4444)'
    },
    clipboard: {
      background: 'var(--rcp-toast-clipboard-bg, #2D2D2D)',
      color: 'var(--rcp-toast-clipboard-color, #FFFFFF)',
      borderLeft: 'var(--rcp-toast-clipboard-border, 4px solid #EF4444)'
    }
  },
  
  // Badge notification colors
  badge: {
    success: 'var(--rcp-badge-success-color, #4ADE80)',
    info: 'var(--rcp-badge-info-color, #60A5FA)',
    warning: 'var(--rcp-badge-warning-color, #FBBF24)',
    error: 'var(--rcp-badge-error-color, #EF4444)',
    clipboard: 'var(--rcp-badge-clipboard-color, #EF4444)'
  },
  
  // Animation settings
  animation: {
    duration: 'var(--rcp-toast-animation-duration, 200ms)',
    showDuration: 'var(--rcp-toast-show-duration, 2000ms)',
    easing: 'var(--rcp-toast-animation-easing, ease-out)'
  }
};

// Default CSS variables to inject
export const DEFAULT_CSS_VARIABLES = `
  :root {
    --rcp-toast-success-bg: #2D2D2D;
    --rcp-toast-success-color: #FFFFFF;
    --rcp-toast-success-border: 4px solid #4ADE80;
    
    --rcp-toast-info-bg: #2D2D2D;
    --rcp-toast-info-color: #FFFFFF;
    --rcp-toast-info-border: 4px solid #60A5FA;
    
    --rcp-toast-warning-bg: #2D2D2D;
    --rcp-toast-warning-color: #FFFFFF;
    --rcp-toast-warning-border: 4px solid #FBBF24;
    
    --rcp-toast-error-bg: #2D2D2D;
    --rcp-toast-error-color: #FFFFFF;
    --rcp-toast-error-border: 4px solid #EF4444;
    
    --rcp-toast-clipboard-bg: #2D2D2D;
    --rcp-toast-clipboard-color: #FFFFFF;
    --rcp-toast-clipboard-border: 4px solid #EF4444;
    
    --rcp-badge-success-color: #4ADE80;
    --rcp-badge-info-color: #60A5FA;
    --rcp-badge-warning-color: #FBBF24;
    --rcp-badge-error-color: #EF4444;
    --rcp-badge-clipboard-color: #EF4444;
    
    --rcp-toast-animation-duration: 200ms;
    --rcp-toast-show-duration: 2000ms;
    --rcp-toast-animation-easing: ease-out;
  }
`;

// Toast icons as SVG strings
export const TOAST_ICONS = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 6L8 14L4 10"></path>
  </svg>`,
  
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10" cy="10" r="8"></circle>
    <line x1="10" y1="14" x2="10" y2="10"></line>
    <line x1="10" y1="6" x2="10.01" y2="6"></line>
  </svg>`,
  
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 2L18 16H2L10 2Z"></path>
    <line x1="10" y1="8" x2="10" y2="12"></line>
    <line x1="10" y1="16" x2="10.01" y2="16"></line>
  </svg>`,
  
  error: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10" cy="10" r="8"></circle>
    <line x1="14" y1="6" x2="6" y2="14"></line>
    <line x1="6" y1="6" x2="14" y2="14"></line>
  </svg>`,
  
  clipboard: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="20" height="20">
    <!-- White outline around the whole logo (slightly larger) -->
    <polygon points="100,36 155,68 155,132 100,164 45,132 45,68" fill="none" stroke="white" stroke-width="4" />
    
    <!-- White background inside hexagon -->
    <polygon points="100,40 152,70 152,130 100,160 48,130 48,70" fill="white" />
    
    <!-- Outer node white outlines -->
    <circle cx="100" cy="40" r="13.5" fill="white" stroke="white" stroke-width="3" />
    <circle cx="152" cy="70" r="13.5" fill="white" stroke="white" stroke-width="3" />
    <circle cx="152" cy="130" r="13.5" fill="white" stroke="white" stroke-width="3" />
    <circle cx="100" cy="160" r="13.5" fill="white" stroke="white" stroke-width="3" />
    <circle cx="48" cy="130" r="13.5" fill="white" stroke="white" stroke-width="3" />
    <circle cx="48" cy="70" r="13.5" fill="white" stroke="white" stroke-width="3" />
    
    <!-- Lines connecting nodes -->
    <line x1="100" y1="100" x2="100" y2="40" stroke="black" stroke-width="5" />
    <line x1="100" y1="100" x2="100" y2="160" stroke="black" stroke-width="5" />
    <line x1="100" y1="100" x2="152" y2="70" stroke="black" stroke-width="5" />
    <line x1="100" y1="100" x2="152" y2="130" stroke="black" stroke-width="5" />
    <line x1="100" y1="100" x2="48" y2="70" stroke="black" stroke-width="5" />
    <line x1="100" y1="100" x2="48" y2="130" stroke="black" stroke-width="5" />
    
    <!-- Outer hexagon connections -->
    <line x1="100" y1="40" x2="152" y2="70" stroke="black" stroke-width="5" />
    <line x1="152" y1="70" x2="152" y2="130" stroke="black" stroke-width="5" />
    <line x1="152" y1="130" x2="100" y2="160" stroke="black" stroke-width="5" />
    <line x1="100" y1="160" x2="48" y2="130" stroke="black" stroke-width="5" />
    <line x1="48" y1="130" x2="48" y2="70" stroke="black" stroke-width="5" />
    <line x1="48" y1="70" x2="100" y2="40" stroke="black" stroke-width="5" />
    
    <!-- Outer nodes (black) -->
    <circle cx="100" cy="40" r="12" fill="black" />
    <circle cx="152" cy="70" r="12" fill="black" />
    <circle cx="152" cy="130" r="12" fill="black" />
    <circle cx="100" cy="160" r="12" fill="black" />
    <circle cx="48" cy="130" r="12" fill="black" />
    <circle cx="48" cy="70" r="12" fill="black" />
    
    <!-- Center node (red) -->
    <circle cx="100" cy="100" r="14" fill="#FF3333" stroke="black" stroke-width="5" />
  </svg>`
}; 