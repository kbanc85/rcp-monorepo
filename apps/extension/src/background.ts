import type { Folder, SubscribedFolder } from "./types/types"
import type { Prompt } from "./types/types"
import { CONTEXT_MENU_IDS } from "./types/types"
import { storageManager } from "./services/storage"

// Safe async wrapper to prevent unhandled errors from crashing background script
const safeAsync = <T extends (...args: any[]) => Promise<any>>(fn: T): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      console.error('[Background] Unhandled error:', error)
    }
  }) as T
}

// Type augmentation for global interfaces
declare global {
  interface Window {
    CodeMirror?: any;
    monaco?: {
      editor: {
        getEditors(): any[];
      }
    };
    ace?: any;
    tinymce?: {
      activeEditor?: {
        insertContent(content: string): void;
      }
    };
    CKEDITOR?: {
      instances: {
        [key: string]: {
          insertText(text: string): void;
        }
      }
    };
  }

  interface Element {
    isContentEditable?: boolean;
    CodeMirror?: any;
  }
}

const toastMessages = [
  "Prompt copied to clipboard. Ready to paste!",
  "Prompt copied. Your clipboard is ready for use.",
  "Copied! Use this prompt where you need it.",
  "Your prompt is copied to clipboard.",
  "Prompt copied to clipboard.",
  "Prompt copied: Ready to use.",
  "Success! Prompt copied to clipboard.",
  "Clipboard updated with your prompt.",
  "Prompt copied and ready to use.",
  "Prompt copied to clipboard.",
  "Prompt copied successfully.",
  "Your prompt is now on your clipboard.",
  "Prompt copied to clipboard.",
  "Prompt copied. Ready to use.",
  "Prompt now in your clipboard.",
  "Prompt copied to clipboard.",
  "Prompt copied successfully.",
  "Prompt ready to paste.",
  "Prompt copied to clipboard.",
  "Clipboard updated with prompt.",
  "Prompt copied to clipboard.",
  "Prompt copied and ready to use.",
  "Prompt copied to clipboard."
];

function getRandomToastMessage() {
  // Always return regular message
  return toastMessages[Math.floor(Math.random() * toastMessages.length)];
}

async function showToastOnActiveTab(message: string) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      console.log("No active tab found for toast notification");
      return;
    }

    // Check if the URL is restricted
    if (tab.url && (
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('devtools://') ||
      tab.url.startsWith('edge://') ||
      tab.url.startsWith('about:')
    )) {
      // Use badge notification for restricted URLs instead
      console.log("Using badge notification for restricted URL:", tab.url);
      chrome.action.setBadgeText({ text: "✓" });
      chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" });
      }, 2000);
      return;
    }

    // Check if we have scripting permission
    const hasScripting = await chrome.permissions.contains({
      permissions: ['scripting']
    });

    if (hasScripting) {
      // Show toast using scripting
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id ?? -1 },
          func: (msg: string) => {
            // Define a unique ID for toast tracking
            const TOAST_ID = 'rcp-toast-notification';

            // Clean up any existing toasts first
            const cleanup = () => {
              const existingToasts = document.querySelectorAll('.rcp-toast');
              existingToasts.forEach(toast => {
                if (toast.parentNode) {
                  try {
                    document.body.removeChild(toast);
                  } catch (e: unknown) {
                    console.error('Error removing toast:', e);
                  }
                }
              });

              // Also try removing by ID
              const existingToastById = document.getElementById(TOAST_ID);
              if (existingToastById && existingToastById.parentNode) {
                try {
                  existingToastById.parentNode.removeChild(existingToastById);
                } catch (e: unknown) {
                  console.error('Error removing toast by ID:', e);
                }
              }
            };

            // Clean up first
            cleanup();

            // Create new toast
            const toast = document.createElement('div');
            toast.id = TOAST_ID;
            toast.className = 'rcp-toast';

            // Create icon element with SVG instead of emoji
            const iconSpan = document.createElement('span');
            iconSpan.className = 'rcp-toast-icon';

            // Use the RCP icon SVG
            iconSpan.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="20" height="20">
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
                <line x1="48" cy="130" x2="48" y2="70" stroke="black" stroke-width="5" />
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
              </svg>
            `;

            // Create text span for message
            const textSpan = document.createElement('span');
            textSpan.className = 'rcp-toast-text';
            textSpan.innerText = msg;

            // Append icon and text to toast
            toast.appendChild(iconSpan);
            toast.appendChild(textSpan);

            // Apply position styles with !important to override any site CSS
            Object.assign(toast.style, {
              position: 'fixed',
              top: '20px',
              bottom: 'auto !important',
              left: '50%',
              right: 'auto',
              transform: 'translateX(-50%)',
              background: '#2D2D2D', // Dark gray background
              color: '#FFFFFF', // White text
              padding: '10px 16px',
              borderRadius: '8px',
              zIndex: '2147483647',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
              fontWeight: '500',
              fontSize: '14px',
              borderLeft: '4px solid #EF4444', // Red accent
              opacity: '0',
              margin: '0',
              display: 'flex', // Use flexbox for layout
              alignItems: 'center', // Center items vertically
              gap: '8px', // Space between icon and text
              transition: 'opacity 200ms ease-out, transform 200ms ease-out',
              textAlign: 'center',
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
              'z-index: 2147483647 !important; background: #2D2D2D !important; color: #FFFFFF !important;' +
              'display: flex !important; align-items: center !important; text-align: center !important;');

            document.body.appendChild(toast);

            // Force layout reflow for animation
            void toast.offsetWidth;

            // Set opacity instantly - already added transition in initial styles
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%)';

            // Schedule removal - more reliable fade-out and removal
            const removeToast = () => {
              // Start fade out
              toast.style.opacity = '0';
              toast.style.transform = 'translateX(-50%) translateY(-10px)'; // Use translateX to maintain centering
              toast.setAttribute('style', toast.getAttribute('style') +
                'opacity: 0 !important; transform: translateX(-50%) translateY(-10px) !important;'); // Ensure centering maintained

              // Remove element after transition
              setTimeout(() => {
                if (toast.parentNode) {
                  try {
                    document.body.removeChild(toast);
                  } catch (e: unknown) {
                    console.error('Error removing toast after timeout:', e);
                  }
                }
              }, 250); // Slightly faster removal after fade starts
            };

            // Set exact 2 second timeout for toast visibility
            const toastTimer = setTimeout(removeToast, 2000);

            // Force cleanup after 2.5 seconds as a fallback
            const backupTimer = setTimeout(() => {
              clearTimeout(toastTimer); // Clear the main timer if it hasn't fired yet
              if (toast.parentNode) {
                try {
                  document.body.removeChild(toast);
                } catch (e: unknown) {
                  console.error('Error in backup toast removal:', e);
                }
              }
            }, 2500);

            // Ensure timers are cleared if the page changes
            window.addEventListener('beforeunload', () => {
              clearTimeout(toastTimer);
              clearTimeout(backupTimer);
              cleanup();
            }, { once: true });

            // Return the toast element
            return toast;
          },
          args: [message]
        });
      } catch (e) {
        console.log("Toast script execution failed, using badge fallback:", e);
        // Fallback to badge notification
        chrome.action.setBadgeText({ text: "✓" });
        chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });
        setTimeout(() => {
          chrome.action.setBadgeText({ text: "" });
        }, 2000);
      }
    } else {
      // Fallback: show badge notification
      chrome.action.setBadgeText({ text: "✓" });
      chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" });
      }, 2000);
    }
  } catch (error: unknown) {
    console.error('Error showing toast:', error);
    // Final fallback: ensure badge notification
    try {
      chrome.action.setBadgeText({ text: "✓" });
      chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" });
      }, 2000);
    } catch (e) {
      console.error('Even badge fallback failed:', e);
    }
  }
}

// Function to copy text to clipboard using different methods
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Try using the Clipboard API directly
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        console.log("Direct clipboard API failed, trying fallback methods", e);
        // Continue to fallback methods
      }
    }

    // Check if we're in a background script context where navigator.clipboard might not be available,
    // or if the active tab is a restricted URL
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Skip restricted URLs
    if (activeTab?.url && (
      activeTab.url.startsWith('chrome://') ||
      activeTab.url.startsWith('chrome-extension://') ||
      activeTab.url.startsWith('devtools://') ||
      activeTab.url.startsWith('edge://') ||
      activeTab.url.startsWith('about:')
    )) {
      // Use background script clipboard API as fallback for restricted URLs
      // Note: This may still fail depending on browser permissions
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch (e) {
        console.error("Unable to copy in restricted URL context:", e);
        return false;
      }
    }

    // For regular URLs, try using executeScript
    if (activeTab?.id) {
      // Check if we have scripting permission
      const hasPermission = await chrome.permissions.contains({
        permissions: ['scripting', 'activeTab']
      });

      if (hasPermission) {
        try {
          const result = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id ?? -1 },
            func: (textToCopy: string) => {
              // This runs in the context of the page
              try {
                // Try using Clipboard API first
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(textToCopy);
                  return true;
                }

                // Fallback to execCommand
                const textarea = document.createElement('textarea');
                textarea.value = textToCopy;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textarea);
                return success;
              } catch (e) {
                console.error("In-page clipboard operation failed:", e);
                return false;
              }
            },
            args: [text]
          });

          return result && result[0] && result[0].result === true;
        } catch (e) {
          console.error("Script execution for clipboard failed:", e);
          // Continue to try other methods
        }
      }
    }

    // If all else fails, return false
    return false;
  } catch (error: unknown) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

// Function to rebuild context menu
async function rebuildContextMenu() {
  // Remove existing menu items
  await chrome.contextMenus.removeAll();

  // Create parent menu
  chrome.contextMenus.create({
    id: CONTEXT_MENU_IDS.parent,
    title: "Right Click Prompt",
    contexts: ["all"]
  });

  // Check for Quick Access folders first (preferred when synced)
  const quickAccessFolders = await storageManager.getQuickAccessFolders();

  if (quickAccessFolders.length > 0) {
    // Quick Access Mode - Show only Quick Access folders
    // Chrome has a ~1000 item limit for context menus, so we limit folders and items
    // 30 folders * 10 items = 300 menu items, well within Chrome's limit
    const MAX_MENU_FOLDERS = 30
    const MAX_ITEMS_PER_FOLDER = 10

    // Separate owned and subscribed folders (My Prompts first)
    const ownedFolders = quickAccessFolders.filter(f =>
      f.items.length === 0 || f.items.some(item => item.sourceType === 'owned')
    );
    const subscribedFolders = quickAccessFolders.filter(f =>
      f.items.length > 0 && f.items.every(item => item.sourceType === 'subscribed')
    );

    // Helper to create folder menu items
    const createFolderMenu = (folder: typeof quickAccessFolders[0]) => {
      const subscribedItem = folder.items.find(item => item.sourceType === 'subscribed' && item.sourceLabel);
      const folderTitle = subscribedItem
        ? `${folder.name} (${subscribedItem.sourceLabel})`
        : folder.name;

      chrome.contextMenus.create({
        id: `qa_folder_${folder.id}`,
        parentId: CONTEXT_MENU_IDS.parent,
        title: folderTitle,
        contexts: ["all"]
      });

      const limitedItems = folder.items.slice(0, MAX_ITEMS_PER_FOLDER);
      limitedItems.forEach(item => {
        chrome.contextMenus.create({
          id: `qa_item_${item.id}`,
          parentId: `qa_folder_${folder.id}`,
          title: item.title,
          contexts: ["all"]
        });
      });

      if (folder.items.length > MAX_ITEMS_PER_FOLDER) {
        chrome.contextMenus.create({
          id: `qa_more_${folder.id}`,
          parentId: `qa_folder_${folder.id}`,
          title: `... and ${folder.items.length - MAX_ITEMS_PER_FOLDER} more`,
          contexts: ["all"],
          enabled: false
        });
      }
    };

    // My Prompts section
    if (ownedFolders.length > 0) {
      chrome.contextMenus.create({
        id: 'qa_my_prompts_header',
        parentId: CONTEXT_MENU_IDS.parent,
        title: 'My Prompts',
        type: 'normal',
        enabled: false,
        contexts: ["all"]
      });

      ownedFolders.slice(0, MAX_MENU_FOLDERS).forEach(createFolderMenu);
    }

    // Subscribed section
    if (subscribedFolders.length > 0) {
      // Add separator between sections
      if (ownedFolders.length > 0) {
        chrome.contextMenus.create({
          id: 'qa_subscribed_separator',
          type: 'separator',
          parentId: CONTEXT_MENU_IDS.parent,
          contexts: ["all"]
        });
      }

      chrome.contextMenus.create({
        id: 'qa_subscribed_header',
        parentId: CONTEXT_MENU_IDS.parent,
        title: '🔒 Subscribed',
        type: 'normal',
        enabled: false,
        contexts: ["all"]
      });

      const remainingSlots = MAX_MENU_FOLDERS - ownedFolders.length;
      subscribedFolders.slice(0, remainingSlots).forEach(createFolderMenu);
    }

    return; // Quick Access mode - done
  }

  // Fallback: Legacy mode when not synced (show local folders)
  const folders = await storageManager.getFolders();

  // Separate regular and imported folders
  const regularFolders = folders.filter(f => !f.isImported);
  const importedFolders = folders.filter(f => f.isImported);

  // Create menu items for regular folders
  if (regularFolders.length > 0) {
    chrome.contextMenus.create({
      id: 'regular_prompts_header',
      parentId: CONTEXT_MENU_IDS.parent,
      title: 'My Prompts',
      type: 'normal',
      enabled: false,
      contexts: ["all"]
    });

    regularFolders.forEach(folder => {
      // Create folder submenu
      chrome.contextMenus.create({
        id: CONTEXT_MENU_IDS.folder(folder.id),
        parentId: CONTEXT_MENU_IDS.parent,
        title: folder.name,
        contexts: ["all"]
      });

      // Create menu items for each prompt in the folder
      folder.prompts.forEach(prompt => {
        chrome.contextMenus.create({
          id: CONTEXT_MENU_IDS.prompt(prompt.id),
          parentId: CONTEXT_MENU_IDS.folder(folder.id),
          title: prompt.title,
          contexts: ["all"]
        });
      });
    });
  }

  // Create menu items for imported folders
  if (importedFolders.length > 0) {
    // Add separator
    chrome.contextMenus.create({
      id: 'separator',
      type: 'separator',
      parentId: CONTEXT_MENU_IDS.parent,
      contexts: ["all"]
    });

    // Add imported prompts header
    chrome.contextMenus.create({
      id: 'imported_prompts_header',
      parentId: CONTEXT_MENU_IDS.parent,
      title: 'Imported Prompts',
      type: 'normal',
      enabled: false,
      contexts: ["all"]
    });

    importedFolders.forEach(folder => {
      // Create folder submenu
      chrome.contextMenus.create({
        id: CONTEXT_MENU_IDS.folder(folder.id),
        parentId: CONTEXT_MENU_IDS.parent,
        title: folder.name,
        contexts: ["all"]
      });

      // Create menu items for each prompt in the folder
      folder.prompts.forEach(prompt => {
        chrome.contextMenus.create({
          id: CONTEXT_MENU_IDS.prompt(prompt.id),
          parentId: CONTEXT_MENU_IDS.folder(folder.id),
          title: prompt.title,
          contexts: ["all"]
        });
      });
    });
  }

  // Get subscribed folders
  const subscribedFolders = await storageManager.getSubscribedFolders();

  // Create menu items for subscribed folders
  if (subscribedFolders.length > 0) {
    // Add separator
    chrome.contextMenus.create({
      id: 'subscribed_separator',
      type: 'separator',
      parentId: CONTEXT_MENU_IDS.parent,
      contexts: ["all"]
    });

    // Add subscribed prompts header
    chrome.contextMenus.create({
      id: 'subscribed_prompts_header',
      parentId: CONTEXT_MENU_IDS.parent,
      title: 'Subscribed',
      type: 'normal',
      enabled: false,
      contexts: ["all"]
    });

    subscribedFolders.forEach(folder => {
      // Create folder submenu with owner info
      const folderTitle = `${folder.folder_name} (${folder.owner_email.split('@')[0]})`;
      chrome.contextMenus.create({
        id: `subscribed_folder_${folder.folder_id}`,
        parentId: CONTEXT_MENU_IDS.parent,
        title: folderTitle,
        contexts: ["all"]
      });

      // Create menu items for each prompt in the folder
      folder.prompts.forEach(prompt => {
        chrome.contextMenus.create({
          id: `subscribed_prompt_${prompt.id}`,
          parentId: `subscribed_folder_${folder.folder_id}`,
          title: prompt.title,
          contexts: ["all"]
        });
      });
    });
  }

  // Save Selection as Prompt feature temporarily removed
}

// Initialize extension on install or update
chrome.runtime.onInstalled.addListener(async (details) => {
  // Set panel behavior to open on click
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

  // Now rebuild context menu after setting auto-paste
  await rebuildContextMenu();

  // Show a usage tip notification for new installs
  if (details.reason === 'install') {
    // Check if we've shown the tip before
    const result = await chrome.storage.local.get(['hasSeenRightClickTip']);
    if (!result.hasSeenRightClickTip) {
      // Create a notification
      chrome.action.setBadgeText({ text: "TIP" });
      chrome.action.setBadgeBackgroundColor({ color: "#4f46e5" });

      // Show a toast on the first active tab if we have permission
      try {
        // First check if we have scripting permission
        const hasPermission = await chrome.permissions.contains({
          permissions: ['scripting', 'activeTab']
        });

        if (hasPermission) {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs && tabs.length > 0 && tabs[0]?.id) {
            // Make sure the tab id is valid and the URL is not a restricted one
            const tabId = tabs[0].id;
            const url = tabs[0].url || '';

            // Skip restricted URLs
            if (!url.startsWith('chrome://') &&
              !url.startsWith('chrome-extension://') &&
              !url.startsWith('devtools://') &&
              !url.startsWith('edge://') &&
              !url.startsWith('about:')) {

              try {
                await chrome.scripting.executeScript({
                  target: { tabId },
                  func: () => {
                    // Create toast element
                    const toast = document.createElement('div');
                    toast.style.position = 'fixed';
                    toast.style.bottom = '20px';
                    toast.style.right = '20px';
                    toast.style.backgroundColor = '#4f46e5';
                    toast.style.color = 'white';
                    toast.style.padding = '12px 16px';
                    toast.style.borderRadius = '6px';
                    toast.style.zIndex = '9999';
                    toast.style.fontSize = '14px';
                    toast.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    toast.style.maxWidth = '300px';
                    toast.innerHTML = '<b>RCP Tip:</b> Right-click anywhere to access your saved prompts!';

                    // Add to page
                    document.body.appendChild(toast);

                    // Remove after 8 seconds
                    setTimeout(() => {
                      if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                      }
                    }, 8000);
                  }
                });
              } catch (scriptError) {
                console.error('Error executing script in tab:', scriptError);
              }
            }
          }
        }
      } catch (e) {
        console.error('Error showing tip:', e);
      }

      // Mark as seen
      await chrome.storage.local.set({ hasSeenRightClickTip: true });

      // Clear badge after 5 seconds
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" });
      }, 5000);
    }
  }
});

// Listen for storage changes to update context menu
chrome.storage.onChanged.addListener((changes) => {
  if (changes.folders || changes.subscribedFolders || changes.quickAccessFolders) {
    rebuildContextMenu()
  }
})

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(safeAsync(async (info) => {
  console.log('Context menu clicked:', info.menuItemId);

  // Handle "Open Dashboard" link
  if (info.menuItemId === "open_dashboard") {
    chrome.tabs.create({ url: "https://rcp-dashboard.vercel.app" });
    return;
  }

  // Handle Quick Access item clicks
  const qaMatch = typeof info.menuItemId === 'string' && info.menuItemId.match(/^qa_item_(.+)$/);
  if (qaMatch) {
    const itemId = qaMatch[1];
    const quickAccessFolders = await storageManager.getQuickAccessFolders();

    // Find the item in Quick Access folders
    let foundItem: { id: string; title: string; text: string } | null = null;
    for (const folder of quickAccessFolders) {
      const item = folder.items.find(i => i.id === itemId);
      if (item) {
        foundItem = item;
        break;
      }
    }

    if (foundItem) {
      try {
        const copied = await copyToClipboard(foundItem.text);
        if (copied) {
          showToastOnActiveTab(getRandomToastMessage());
        } else {
          showToastOnActiveTab("Failed to copy to clipboard. Check permissions.");
        }
      } catch (error) {
        console.error("Error handling Quick Access item:", error);
        showToastOnActiveTab("Something went wrong. Please try again.");
      }
    }
    return;
  }

  // Handle "Save Selection as Prompt"
  if (info.menuItemId === "savePrompt" && info.selectionText) {
    const title = prompt("Enter a title for this prompt:")
    if (!title?.trim()) return

    const result = await chrome.storage.local.get('folders')
    const folders: Folder[] = result.folders || []

    // If there are no folders, create a default one
    if (folders.length === 0) {
      folders.push({
        id: crypto.randomUUID(),
        name: "Default",
        prompts: []
      })
    }

    // Add prompt to the first folder
    folders[0].prompts.push({
      id: crypto.randomUUID(),
      title: title.trim(),
      text: info.selectionText,
      timestamp: new Date().toISOString()
    })

    await storageManager.saveFolders(folders)

    // Show a notification
    chrome.action.setBadgeText({ text: "!" })
    chrome.action.setBadgeBackgroundColor({ color: "#10B981" })

    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" })
    }, 2000)
  }
  // Handle prompt selection
  else if (typeof info.menuItemId === 'string') {
    // Check if the menuItemId matches the subscribed prompt pattern
    const subscribedMatch = info.menuItemId.match(/^subscribed_prompt_(.+)$/);
    if (subscribedMatch) {
      const promptId = subscribedMatch[1];
      const subscribedFolders = await storageManager.getSubscribedFolders();

      // Find the prompt in subscribed folders
      let foundPrompt: { id: string; title: string; text: string } | null = null;
      for (const folder of subscribedFolders) {
        const prompt = folder.prompts.find(p => p.id === promptId);
        if (prompt) {
          foundPrompt = prompt;
          break;
        }
      }

      if (foundPrompt) {
        try {
          // Copy to clipboard
          const copied = await copyToClipboard(foundPrompt.text);
          if (copied) {
            showToastOnActiveTab(getRandomToastMessage());
          } else {
            showToastOnActiveTab("Failed to copy to clipboard. Check permissions.");
          }
        } catch (error) {
          console.error("Error handling subscribed prompt selection:", error);
          showToastOnActiveTab("Something went wrong. Please try again.");
        }
      }
      return;
    }

    // Check if the menuItemId matches the prompt pattern
    const match = info.menuItemId.match(/^prompt_(.+)$/);
    if (match) {
      const promptId = match[1];
      const folders = await storageManager.getFolders();

      // Find the prompt in all folders
      let foundPrompt = null;
      for (const folder of folders) {
        const prompt = folder.prompts.find(p => p.id === promptId);
        if (prompt) {
          foundPrompt = prompt;
          break;
        }
      }

      if (foundPrompt) {
        try {
          // Get autoPaste setting
          const result = await chrome.storage.local.get(['autoPaste']);
          const isAutoPasteEnabled = result.autoPaste ?? false;

          // Copy to clipboard (always do this as a fallback)
          const copied = await copyToClipboard(foundPrompt.text);

          // If autoPaste is enabled, try to paste the text directly
          if (isAutoPasteEnabled) {
            try {
              // Check if we have scripting permission
              const hasScripting = await chrome.permissions.contains({
                permissions: ['scripting', 'activeTab']
              });

              if (hasScripting) {
                // Get active tab
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

                if (tab?.id) {
                  // Skip restricted URLs
                  if (tab.url && (
                    tab.url.startsWith('chrome://') ||
                    tab.url.startsWith('chrome-extension://') ||
                    tab.url.startsWith('devtools://') ||
                    tab.url.startsWith('edge://') ||
                    tab.url.startsWith('about:')
                  )) {
                    // Use clipboard notification for restricted URLs
                    showToastOnActiveTab(getRandomToastMessage());
                    return;
                  }

                  // Execute script to paste text with preserved formatting
                  const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (text: string): boolean => {
                      // Improved function to insert text with better formatting preservation
                      const insertTextWithFormatting = (text: string): boolean => {
                        // Get active element
                        const activeElement = document.activeElement;

                        if (activeElement &&
                          (activeElement.isContentEditable ||
                            activeElement.tagName === 'TEXTAREA' ||
                            (activeElement.tagName === 'INPUT' &&
                              ['text', 'search', 'url', 'tel', 'password'].includes((activeElement as HTMLInputElement).getAttribute('type') || '')))) {

                          if (activeElement.isContentEditable) {
                            // Check the white-space property to decide how to handle line breaks
                            const computedStyle = window.getComputedStyle(activeElement);
                            const whiteSpace = computedStyle.whiteSpace;

                            if (whiteSpace === 'pre' || whiteSpace === 'pre-wrap' || whiteSpace === 'pre-line') {
                              // For pre-formatted elements, preserve line breaks as-is
                              const success = document.execCommand('insertText', false, text);
                              if (!success) {
                                // Fallback: Use Selection API if execCommand fails
                                const selection = window.getSelection();
                                if (selection && selection.rangeCount > 0) {
                                  const range = selection.getRangeAt(0);
                                  range.deleteContents();
                                  const textNode = document.createTextNode(text);
                                  range.insertNode(textNode);
                                  range.setStartAfter(textNode);
                                  range.setEndAfter(textNode);
                                  return true;
                                }
                                return false;
                              }
                              return true;
                            } else {
                              // For elements that don't preserve whitespace, convert newlines to <br>
                              const formattedText = text
                                .replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;')
                                .replace(/\n/g, '<br>')
                                .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
                                .replace(/ {2}/g, '&nbsp;&nbsp;');

                              const success = document.execCommand('insertHTML', false, formattedText);
                              return success;
                            }
                          }
                          else if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
                            // For textarea/input, we can use selection API
                            const inputElement = activeElement as HTMLInputElement | HTMLTextAreaElement;
                            const start = inputElement.selectionStart || 0;
                            const end = inputElement.selectionEnd || 0;
                            const value = inputElement.value;

                            // Insert text at cursor position, preserving line breaks
                            inputElement.value = value.substring(0, start) + text + value.substring(end);

                            // Move cursor to end of inserted text
                            inputElement.selectionStart = inputElement.selectionEnd = start + text.length;

                            // Trigger input event to notify the application of changes
                            const inputEvent = new Event('input', { bubbles: true });
                            const changeEvent = new Event('change', { bubbles: true });
                            inputElement.dispatchEvent(inputEvent);
                            inputElement.dispatchEvent(changeEvent);

                            return true;
                          }
                        }

                        // Try handling common rich text editors
                        // 1. Check for Monaco Editor (VS Code, many web IDEs)
                        if (window.monaco && window.monaco.editor) {
                          const editors = window.monaco.editor.getEditors();
                          if (editors && editors.length > 0) {
                            const editor = editors[0]; // Use first editor
                            editor.trigger('keyboard', 'type', { text });
                            return true;
                          }
                        }

                        // 2. Check for CodeMirror (many code editors)
                        if (window.CodeMirror) {
                          // Find the CodeMirror instance
                          let cmInstance = null;

                          // Try to get from active element first
                          if (activeElement && activeElement.CodeMirror) {
                            cmInstance = activeElement.CodeMirror;
                          } else {
                            // Try to find CodeMirror in the document
                            const cmElements = document.querySelectorAll('.CodeMirror');
                            if (cmElements.length > 0) {
                              cmInstance = cmElements[0].CodeMirror;
                            }
                          }

                          if (cmInstance) {
                            const doc = cmInstance.getDoc();
                            const cursor = doc.getCursor();
                            doc.replaceRange(text, cursor);
                            return true;
                          }
                        }

                        // 3. Check for Ace Editor (used in many web IDEs)
                        if (window.ace && window.ace.edit) {
                          const aceEditor = window.ace.edit(document.querySelector('.ace_editor'));
                          if (aceEditor) {
                            aceEditor.insert(text);
                            return true;
                          }
                        }

                        // 4. Check for TinyMCE (used in many WYSIWYG editors)
                        if (window.tinymce && window.tinymce.activeEditor) {
                          window.tinymce.activeEditor.insertContent(text);
                          return true;
                        }

                        // 5. Check for CKEditor
                        if (window.CKEDITOR) {
                          for (const instanceName in window.CKEDITOR.instances) {
                            const instance = window.CKEDITOR.instances[instanceName];
                            instance.insertText(text);
                            return true;
                          }
                        }

                        // Fallback: try to use document.execCommand for active element
                        try {
                          const success = document.execCommand('insertText', false, text);
                          if (success) return true;
                        } catch (e) {
                          console.error('execCommand insert failed:', e);
                        }

                        return false;
                      };

                      // Try to insert text with formatting
                      return insertTextWithFormatting(text);
                    },
                    args: [foundPrompt.text]
                  });

                  const pasteSuccess = results && results[0] && results[0].result === true;

                  // Only show toast notification if paste fails
                  if (!pasteSuccess) {
                    showToastOnActiveTab(getRandomToastMessage());
                  }
                } else {
                  // No active tab, fallback to clipboard notification
                  showToastOnActiveTab(getRandomToastMessage());
                }
              } else {
                // No scripting permission, fallback to clipboard notification
                showToastOnActiveTab(getRandomToastMessage());
              }
            } catch (error) {
              console.error("Error in auto-paste:", error);
              showToastOnActiveTab(getRandomToastMessage());
            }
          } else {
            // AutoPaste is disabled, show clipboard notification
            if (copied) {
              showToastOnActiveTab(getRandomToastMessage());
            } else {
              showToastOnActiveTab("Failed to copy to clipboard. Check permissions.");
            }
          }
        } catch (error) {
          console.error("Error handling prompt selection:", error);
          showToastOnActiveTab("Something went wrong. Please try again.");
        }
      }
    }
  }
}));

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Background script received message:', message);

  if (message.action === 'enableAutoPaste') {
    // Just ensure the setting is saved in storage
    chrome.storage.local.set({ autoPaste: true });
    console.log('Auto-paste enabled');
    sendResponse({ success: true });
  }
  else if (message.action === 'disableAutoPaste') {
    // Just ensure the setting is saved in storage
    chrome.storage.local.set({ autoPaste: false });
    console.log('Auto-paste disabled');
    sendResponse({ success: true });
  }
  else if (message.action === 'getTextToPromptEnabled') {
    // Get the current text-to-prompt setting
    chrome.storage.local.get(['textToPromptEnabled'], (result) => {
      // Default to enabled if not set
      const isEnabled = result.textToPromptEnabled !== undefined ? result.textToPromptEnabled : true;
      sendResponse({ enabled: isEnabled });
    });
    return true; // Required for async response
  }

  // This is required to use sendResponse asynchronously
  return true;
});

// Add message listeners for the floating icon content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Get folders for the floating icon
  if (message.action === 'getFolders') {
    storageManager.getFolders().then(folders => {
      // Transform folders to simple format with just id and name
      const simpleFolders = folders.map(folder => ({
        id: folder.id,
        name: folder.name
      }));
      sendResponse({ folders: simpleFolders });
    });
    return true; // Indicates async response
  }

  // Get current theme setting
  if (message.action === 'getTheme') {
    // Get current theme from storage
    chrome.storage.local.get(['theme'], (result) => {
      const theme = result.theme || { isDark: true };
      sendResponse({ isDarkMode: theme.isDark });
    });
    return true; // Indicates async response
  }

  // Create a new folder
  if (message.action === 'createFolder') {
    const folderName = message.name;

    if (!folderName) {
      sendResponse({ success: false, error: 'Folder name is required' });
      return true;
    }

    storageManager.getFolders().then(folders => {
      // Create a new folder
      const newFolder: Folder = {
        id: crypto.randomUUID(),
        name: folderName,
        prompts: []
      };

      // Add the new folder to the list
      folders.push(newFolder);

      // Save the updated folders
      storageManager.saveFolders(folders).then(() => {
        // Rebuild the context menu
        rebuildContextMenu();

        // Notify all tabs about the folder update
        chrome.tabs.query({}, tabs => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, { action: 'foldersUpdated' });
            }
          });
        });

        sendResponse({ success: true, folderId: newFolder.id });
      });
    });

    return true; // Indicates async response
  }

  // Save a prompt from the floating icon
  if (message.action === 'savePrompt') {
    // Use an async IIFE to handle async operations
    (async () => {
      const { title, text, folderId } = message;

      if (!text || !folderId) {
        sendResponse({ success: false, error: 'Text and folder ID are required' });
        return;
      }

      try {
        const folders = await storageManager.getFolders();

        // Find the folder
        const folderIndex = folders.findIndex(folder => folder.id === folderId);

        if (folderIndex === -1) {
          sendResponse({ success: false, error: 'Folder not found' });
          return;
        }

        // Create a new prompt
        const newPrompt: Prompt = {
          id: crypto.randomUUID(),
          title: title || 'Untitled Prompt',
          text,
          timestamp: new Date().toISOString()
        };

        // Add the prompt to the folder
        folders[folderIndex].prompts.push(newPrompt);

        // Save the updated folders
        await storageManager.saveFolders(folders);

        // Try to rebuild the context menu, but don't block the response
        try {
          await rebuildContextMenu();
        } catch (error) {
          console.error('Error rebuilding context menu:', error);
          // Continue anyway - this is non-critical
        }

        // Show a success notification
        const activeTab = _sender.tab;
        if (activeTab?.id) {
          showToastOnActiveTab('Prompt saved successfully!');
        }

        sendResponse({ success: true });
      } catch (error) {
        console.error('Error saving prompt:', error);
        sendResponse({ success: false, error: 'Failed to save prompt' });
      }
    })();

    return true; // Indicates async response
  }
});

// Listen for theme changes from the popup
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.theme) {
    const newTheme = changes.theme.newValue;

    // Broadcast the theme change to all content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'themeChanged',
            isDarkMode: newTheme.isDark
          }).catch(() => {
            // Ignore errors for inactive tabs or restricted pages
          });
        }
      });
    });
  }
});
