/**
 * floatingIcon.ts
 * 
 * This content script adds a Grammarly-like floating icon that appears when text is selected.
 * When clicked, it opens a modal to save the selected text as a prompt.
 */

// Interfaces for message passing
interface SavePromptRequest {
  action: 'savePrompt';
  title: string;
  text: string;
  folderId: string;
}

interface CreateFolderRequest {
  action: 'createFolder';
  name: string;
}

interface GetFoldersRequest {
  action: 'getFolders';
}

let floatingIcon: HTMLElement | null = null;
let modal: HTMLElement | null = null;
let currentSelection = '';
let folders: Array<{id: string, name: string}> = [];
let mousePosition = { x: 0, y: 0 };
let selectionDebounceTimer: number | null = null;
let isDarkMode: boolean = false;
let isFeatureEnabled: boolean = true; // Default to enabled, will check on init

// Initialize the content script
function init() {
  // Check if the text-to-prompt feature is enabled
  chrome.runtime.sendMessage({ action: 'getTextToPromptEnabled' }, (response) => {
    if (response && response.hasOwnProperty('enabled')) {
      isFeatureEnabled = response.enabled;
      console.log('Text-to-prompt feature is', isFeatureEnabled ? 'enabled' : 'disabled');
      if (isFeatureEnabled) {
        attachSelectionListeners();
      }
    }
  });

  // Check for dark mode preference
  checkColorScheme();
  
  // Track mouse position
  document.addEventListener('mousemove', (e) => {
    mousePosition = { x: e.clientX, y: e.clientY };
  });
  
  // Fetch folders immediately on initialization
  chrome.runtime.sendMessage({ action: 'getFolders' }, (response) => {
    if (response && response.folders) {
      folders = response.folders;
    }
  });

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'foldersUpdated') {
      // Update our local folders list when folders change
      chrome.runtime.sendMessage({ action: 'getFolders' }, (response) => {
        if (response && response.folders) {
          folders = response.folders;
        }
      });
    } else if (message.action === 'themeChanged') {
      // Sync with extension's theme setting
      isDarkMode = message.isDarkMode;
      // Update modal if it's open
      if (modal && modal.style.display === 'flex') {
        updateModalTheme();
      }
    } else if (message.action === 'textToPromptToggled') {
      // Update feature enabled state
      const wasEnabled = isFeatureEnabled;
      isFeatureEnabled = message.enabled;
      console.log('Text-to-prompt feature toggled to', isFeatureEnabled ? 'enabled' : 'disabled');
      
      // If feature is disabled and floating icon is showing, hide it
      if (!isFeatureEnabled && floatingIcon && floatingIcon.style.display !== 'none') {
        hideFloatingIcon();
        detachSelectionListeners();
      }
      
      // If feature was disabled and is now enabled, ensure listeners are attached
      if (!wasEnabled && isFeatureEnabled) {
        attachSelectionListeners();
        // Check for any current selection
        processTextSelection();
      }
    }
  });

  // Listen for color scheme changes
  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  darkModeMediaQuery.addEventListener('change', () => {
    checkColorScheme();
    // Update modal if it's open
    if (modal && modal.style.display === 'flex') {
      updateModalTheme();
    }
  });

  // Request the current theme from the extension
  chrome.runtime.sendMessage({ action: 'getTheme' }, (response) => {
    if (response && response.hasOwnProperty('isDarkMode')) {
      isDarkMode = response.isDarkMode;
    }
  });

  // Add CSS animations and styles
  addGlobalStyles();
}

// Attach selection event listeners
function attachSelectionListeners() {
  console.log('Attaching selection event listeners');
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);
}

// Detach selection event listeners
function detachSelectionListeners() {
  console.log('Detaching selection event listeners');
  document.removeEventListener('mouseup', handleTextSelection);
  document.removeEventListener('keyup', handleTextSelection);
}

// Check if the user prefers dark mode
function checkColorScheme() {
  isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Add global styles for animations and components
function addGlobalStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes rcp-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes rcp-fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes rcp-spring-in {
      0% { transform: scale(0.5) translateY(-20px); opacity: 0; }
      60% { transform: scale(1.1); opacity: 1; }
      80% { transform: scale(0.95); }
      100% { transform: scale(1); }
    }
    
    @keyframes rcp-spin {
      0% { transform: rotate(0deg) scale(0.5); opacity: 0; }
      70% { transform: rotate(555deg) scale(1.1); opacity: 1; }
      85% { transform: rotate(540deg) scale(0.95); }
      100% { transform: rotate(540deg) scale(1.0); }
    }

    .rcp-error-field {
      border-color: #EF4444 !important;
    }

    .rcp-error-message {
      color: #EF4444;
      font-size: 12px;
      margin-top: 4px;
      display: block;
    }

    .rcp-btn-primary {
      background-color: #EF4444;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .rcp-btn-primary:hover {
      background-color: #DC2626;
    }

    .rcp-btn-secondary {
      background-color: #E5E7EB;
      color: #1F2937;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .rcp-btn-secondary:hover {
      background-color: #D1D5DB;
    }

    .rcp-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      font-size: 14px;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
      background-color: white;
      color: #1F2937;
    }

    .rcp-input:focus {
      outline: none;
      border-color: #EF4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
    
    .rcp-dark-mode .rcp-btn-primary {
      background-color: #EF4444;
      color: white;
    }
    
    .rcp-dark-mode .rcp-btn-primary:hover {
      background-color: #DC2626;
    }
    
    .rcp-dark-mode .rcp-btn-secondary {
      background-color: #333333;
      border-color: #4B5563;
      color: #D1D5DB;
    }
    
    .rcp-dark-mode .rcp-btn-secondary:hover {
      background-color: #4B5563;
    }
    
    .rcp-dark-mode .rcp-input {
      background-color: #202124;
      border-color: #333333;
      color: #E5E7EB;
    }
    
    .rcp-dark-mode .rcp-input::placeholder {
      color: #9CA3AF;
    }
    
    .rcp-floating-svg {
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
      animation: rcp-spin 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      transform-origin: center;
      width: 48px;
      height: 48px;
    }
  `;
  document.head.appendChild(style);
}

// Handle text selection event with debouncing
function handleTextSelection(_event: MouseEvent | KeyboardEvent) {
  // If feature is disabled, don't do anything
  if (!isFeatureEnabled) {
    return;
  }

  // Clear any existing timer
  if (selectionDebounceTimer !== null) {
    window.clearTimeout(selectionDebounceTimer);
  }
  
  // Set a new timer to prevent multiple rapid updates
  selectionDebounceTimer = window.setTimeout(() => {
    processTextSelection();
  }, 200);
}

// Process the actual text selection
function processTextSelection() {
  // If feature is disabled, don't do anything
  if (!isFeatureEnabled) {
    hideFloatingIcon();
    return;
  }

  const selection = window.getSelection();
  
  // If nothing is selected or selection is empty, hide the floating icon
  if (!selection || selection.toString().trim() === '') {
    hideFloatingIcon();
    return;
  }
  
  // Get selected text
  const selectedText = selection.toString().trim();
  
  // Only show the icon if we have a valid selection
  if (selectedText.length > 0) {
    currentSelection = selectedText;
    // Show the floating icon near the mouse cursor
    showFloatingIcon();
  } else {
    hideFloatingIcon();
  }
}

// Show the floating icon near the mouse cursor
function showFloatingIcon() {
  // Hide any existing floating icon
  hideFloatingIcon();
  
  // Create the floating icon if it doesn't exist
  if (!floatingIcon) {
    floatingIcon = document.createElement('div');
    floatingIcon.id = 'rcp-floating-icon';
    
    // Use the RCP icon from rcpicon.svg - just the SVG, no background
    floatingIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" class="rcp-floating-svg">
        <!-- White outline around the whole logo (slightly larger) -->
        <polygon points="100,36 155,68 155,132 100,164 45,132 45,68" fill="none" stroke="white" stroke-width="4" />
        
        <!-- White background inside hexagon -->
        <polygon points="100,40 152,70 152,130 100,160 48,130 48,70" fill="white" />
        
        <!-- Outer node white outlines -->
        <circle cx="100" cy="40" r="14" fill="white" stroke="white" stroke-width="3" />
        <circle cx="152" cy="70" r="14" fill="white" stroke="white" stroke-width="3" />
        <circle cx="152" cy="130" r="14" fill="white" stroke="white" stroke-width="3" />
        <circle cx="100" cy="160" r="14" fill="white" stroke="white" stroke-width="3" />
        <circle cx="48" cy="130" r="14" fill="white" stroke="white" stroke-width="3" />
        <circle cx="48" cy="70" r="14" fill="white" stroke="white" stroke-width="3" />
        
        <!-- Lines connecting nodes to center -->
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
        <circle cx="100" cy="40" r="12.5" fill="black" />
        <circle cx="152" cy="70" r="12.5" fill="black" />
        <circle cx="152" cy="130" r="12.5" fill="black" />
        <circle cx="100" cy="160" r="12.5" fill="black" />
        <circle cx="48" cy="130" r="12.5" fill="black" />
        <circle cx="48" cy="70" r="12.5" fill="black" />
        
        <!-- Center node (red) -->
        <circle cx="100" cy="100" r="14.5" fill="#EF4444" stroke="black" stroke-width="5" />
      </svg>
    `;
    
    // Add styles - only for positioning, no background or borders
    floatingIcon.style.cssText = `
      position: fixed;
      z-index: 999999999;
      display: block;
      cursor: pointer;
      user-select: none;
      pointer-events: auto;
    `;
    
    // Add hover effect to the SVG
    floatingIcon.addEventListener('mouseenter', () => {
      if (floatingIcon) {
        const svg = floatingIcon.querySelector('.rcp-floating-svg');
        if (svg) {
          svg.classList.add('rcp-hover');
          (svg as HTMLElement).style.transform = 'scale(1.1)';
        }
      }
    });
    
    floatingIcon.addEventListener('mouseleave', () => {
      if (floatingIcon) {
        const svg = floatingIcon.querySelector('.rcp-floating-svg');
        if (svg) {
          svg.classList.remove('rcp-hover');
          (svg as HTMLElement).style.transform = 'scale(1)';
        }
      }
    });
    
    // Add click event to show the modal
    floatingIcon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showModal();
    });
    
    // Add to the document
    document.body.appendChild(floatingIcon);
  }

  // Position the icon near the mouse cursor with adjustments to ensure it's visible
  const iconSize = 48; // SVG size
  const margin = 10;
  
  // Calculate position based on mouse position
  let left = mousePosition.x + margin;
  let top = mousePosition.y + margin;
  
  // Ensure the icon is fully visible within the viewport
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  if (left + iconSize > viewportWidth) {
    left = mousePosition.x - iconSize - margin;
  }
  
  if (top + iconSize > viewportHeight) {
    top = mousePosition.y - iconSize - margin;
  }
  
  // Adjust for scroll position
  left += window.scrollX;
  top += window.scrollY;
  
  // Set the position
  floatingIcon.style.left = `${left}px`;
  floatingIcon.style.top = `${top}px`;
  
  // Make the icon visible and restart animation
  floatingIcon.style.display = 'block';
  
  // Reset animation
  const svg = floatingIcon.querySelector('.rcp-floating-svg');
  if (svg) {
    svg.classList.remove('rcp-floating-svg');
    void (svg as HTMLElement).offsetWidth; // Force reflow
    svg.classList.add('rcp-floating-svg');
  }
  
  // Add a global click listener to hide the icon when clicking elsewhere
  setTimeout(() => {
    document.addEventListener('click', hideOnClickOutside);
    document.addEventListener('scroll', updateIconPosition);
    window.addEventListener('resize', updateIconPosition);
  }, 100);
}

// Update icon position on scroll or resize
function updateIconPosition() {
  if (floatingIcon && floatingIcon.style.display !== 'none') {
    // Hide and show again to update position
    hideFloatingIcon();
    showFloatingIcon();
  }
}

// Hide the floating icon when clicking outside
function hideOnClickOutside(event: MouseEvent) {
  if (floatingIcon && !floatingIcon.contains(event.target as Node)) {
    hideFloatingIcon();
  }
}

// Hide the floating icon
function hideFloatingIcon() {
  if (floatingIcon) {
    floatingIcon.style.display = 'none';
    
    // Remove event listeners
    document.removeEventListener('click', hideOnClickOutside);
    document.removeEventListener('scroll', updateIconPosition);
    window.removeEventListener('resize', updateIconPosition);
  }
}

// Validate form fields and show error messages
function validateForm(): boolean {
  let isValid = true;

  // Validate title
  const titleInput = document.getElementById('rcp-prompt-title') as HTMLInputElement;
  const titleError = document.getElementById('rcp-title-error');
  
  if (!titleInput.value.trim()) {
    titleInput.classList.add('rcp-error-field');
    if (titleError) {
      titleError.style.display = 'block';
    }
    isValid = false;
  } else {
    titleInput.classList.remove('rcp-error-field');
    if (titleError) {
      titleError.style.display = 'none';
    }
  }

  // Validate folder selection
  const folderSelect = document.getElementById('rcp-folder-select') as HTMLSelectElement;
  const folderError = document.getElementById('rcp-folder-error');
  const newFolderContainer = document.getElementById('rcp-new-folder-container');
  const newFolderInput = document.getElementById('rcp-new-folder-name') as HTMLInputElement;
  const newFolderError = document.getElementById('rcp-new-folder-error');
  
  // Check if folder is selected or we're creating a new one
  const isNewFolderVisible = newFolderContainer && 
                           window.getComputedStyle(newFolderContainer).display !== 'none';
  
  if (!folderSelect.value && (!isNewFolderVisible || !newFolderInput.value.trim())) {
    folderSelect.classList.add('rcp-error-field');
    if (folderError) {
      folderError.style.display = 'block';
    }
    
    // If new folder is visible but empty, show error there too
    if (isNewFolderVisible && !newFolderInput.value.trim()) {
      newFolderInput.classList.add('rcp-error-field');
      if (newFolderError) {
        newFolderError.style.display = 'block';
      }
    }
    
    isValid = false;
  } else {
    folderSelect.classList.remove('rcp-error-field');
    if (folderError) {
      folderError.style.display = 'none';
    }
    
    if (newFolderInput) {
      newFolderInput.classList.remove('rcp-error-field');
    }
    if (newFolderError) {
      newFolderError.style.display = 'none';
    }
  }

  return isValid;
}

// Show the modal for saving the prompt
function showModal() {
  hideFloatingIcon();
  
  // Recheck color scheme in case it changed
  checkColorScheme();
  
  // Create the modal if it doesn't exist
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'rcp-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999999999;
      animation: rcp-fade-in 0.2s ease-in-out;
    `;
    
    document.body.appendChild(modal);
  }
  
  // Update the modal theme
  updateModalTheme();
  
  // Show the modal
  modal.style.display = 'flex';
}

// Update the modal theme based on current color scheme
function updateModalTheme() {
  if (!modal) return;
  
  // Set the modal content based on dark/light mode
  const darkModeClass = isDarkMode ? 'rcp-dark-mode' : '';
  
  // Colors from the app's design system - matched exactly from the RCP interface
  const backgroundColor = isDarkMode ? '#1A1A1A' : '#FFFFFF';
  const borderColor = isDarkMode ? '#333333' : '#E5E7EB';
  const textColor = isDarkMode ? '#E5E7EB' : '#111827';
  const labelColor = isDarkMode ? '#D1D5DB' : '#374151';
  const headerColor = isDarkMode ? '#FFFFFF' : '#111827';
  const previewBgColor = isDarkMode ? '#202124' : '#F9FAFB';
  const previewTextColor = isDarkMode ? '#D1D5DB' : '#4B5563';
  const inputBgColor = isDarkMode ? '#202124' : '#FFFFFF';
  const inputBorderColor = isDarkMode ? '#333333' : '#D1D5DB';
  const secondaryBtnBgColor = isDarkMode ? '#333333' : '#E5E7EB';
  const secondaryBtnTextColor = isDarkMode ? '#D1D5DB' : '#1F2937';
  
  modal.innerHTML = `
    <div class="rcp-modal-container ${darkModeClass}" style="
      background-color: ${backgroundColor};
      border-radius: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      width: 500px;
      max-width: 90vw;
      max-height: 90vh;
      overflow: auto;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      color: ${textColor};
      animation: rcp-fade-in 0.3s ease-out;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid ${borderColor}; padding-bottom: 12px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: ${headerColor};">Save Prompt</h2>
        <button id="rcp-modal-close" style="
          background: none;
          border: none;
          cursor: pointer;
          font-size: 20px;
          color: ${isDarkMode ? '#9CA3AF' : '#6B7280'};
          padding: 4px 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: background-color 0.2s;
        ">×</button>
      </div>
      
      <div style="margin-bottom: 16px;">
        <label for="rcp-prompt-title" style="display: block; margin-bottom: 6px; font-weight: 500; color: ${labelColor};">Title <span style="color: #EF4444;">*</span></label>
        <input id="rcp-prompt-title" type="text" placeholder="Enter a title for your prompt" class="rcp-input" style="background-color: ${inputBgColor}; border-color: ${inputBorderColor};">
        <span id="rcp-title-error" class="rcp-error-message" style="display: none;">Please enter a title for your prompt</span>
      </div>
      
      <div style="margin-bottom: 16px;">
        <label for="rcp-folder-select" style="display: block; margin-bottom: 6px; font-weight: 500; color: ${labelColor};">Folder <span style="color: #EF4444;">*</span></label>
        <div style="display: flex; gap: 8px;">
          <select id="rcp-folder-select" class="rcp-input" style="flex: 1; background-color: ${inputBgColor}; border-color: ${inputBorderColor}; color: ${textColor};">
            <option value="">Select a folder</option>
            ${folders.map(folder => `<option value="${folder.id}">${folder.name}</option>`).join('')}
          </select>
          <button id="rcp-new-folder-btn" class="rcp-btn-secondary" style="background-color: ${secondaryBtnBgColor}; color: ${secondaryBtnTextColor};">New Folder</button>
        </div>
        <span id="rcp-folder-error" class="rcp-error-message" style="display: none;">Please select a folder or create a new one</span>
      </div>
      
      <div id="rcp-new-folder-container" style="display: none; margin-bottom: 16px; padding: 12px; background-color: ${isDarkMode ? '#202124' : '#F9FAFB'}; border-radius: 8px; border-left: 3px solid #EF4444;">
        <label for="rcp-new-folder-name" style="display: block; margin-bottom: 6px; font-weight: 500; color: ${labelColor};">New Folder Name <span style="color: #EF4444;">*</span></label>
        <div style="display: flex; gap: 8px;">
          <input id="rcp-new-folder-name" type="text" placeholder="Enter folder name" class="rcp-input" style="flex: 1; background-color: ${inputBgColor}; border-color: ${inputBorderColor};">
          <button id="rcp-create-folder-btn" class="rcp-btn-primary">Create</button>
        </div>
        <span id="rcp-new-folder-error" class="rcp-error-message" style="display: none;">Please enter a folder name</span>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label for="rcp-prompt-preview" style="display: block; margin-bottom: 6px; font-weight: 500; color: ${labelColor};">Preview</label>
        <div id="rcp-prompt-preview" style="
          width: 100%;
          min-height: 80px;
          max-height: 200px;
          padding: 12px;
          border: 1px solid ${borderColor};
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.5;
          overflow: auto;
          background-color: ${previewBgColor};
          white-space: pre-wrap;
          box-sizing: border-box;
          color: ${previewTextColor};
        ">${currentSelection}</div>
      </div>
      
      <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
        <button id="rcp-cancel-btn" class="rcp-btn-secondary" style="background-color: ${secondaryBtnBgColor}; color: ${secondaryBtnTextColor};">Cancel</button>
        <button id="rcp-save-btn" class="rcp-btn-primary">Save Prompt</button>
      </div>
    </div>
  `;
  
  // Re-attach event listeners after updating HTML
  setupModalEventListeners();
}

// Set up event listeners for the modal
function setupModalEventListeners() {
  // Close button
  document.getElementById('rcp-modal-close')?.addEventListener('click', hideModal);
  
  // Cancel button
  document.getElementById('rcp-cancel-btn')?.addEventListener('click', hideModal);
  
  // New folder button
  document.getElementById('rcp-new-folder-btn')?.addEventListener('click', () => {
    const newFolderContainer = document.getElementById('rcp-new-folder-container');
    if (newFolderContainer) {
      newFolderContainer.style.display = 'block';
      
      // Focus the input field
      setTimeout(() => {
        const newFolderInput = document.getElementById('rcp-new-folder-name') as HTMLInputElement;
        if (newFolderInput) {
          newFolderInput.focus();
        }
      }, 100);
    }
  });
  
  // Create folder button
  document.getElementById('rcp-create-folder-btn')?.addEventListener('click', () => {
    const newFolderInput = document.getElementById('rcp-new-folder-name') as HTMLInputElement;
    const newFolderError = document.getElementById('rcp-new-folder-error');
    const folderName = newFolderInput.value.trim();
    
    if (!folderName) {
      newFolderInput.classList.add('rcp-error-field');
      if (newFolderError) {
        newFolderError.style.display = 'block';
      }
      return;
    }
    
    newFolderInput.classList.remove('rcp-error-field');
    if (newFolderError) {
      newFolderError.style.display = 'none';
    }
    
    // Send a message to create a new folder
    chrome.runtime.sendMessage(
      { action: 'createFolder', name: folderName } as CreateFolderRequest,
      (response) => {
        if (response && response.success) {
          // Add the new folder to the dropdown
          const folderSelect = document.getElementById('rcp-folder-select') as HTMLSelectElement;
          const option = document.createElement('option');
          option.value = response.folderId;
          option.textContent = folderName;
          folderSelect.appendChild(option);
          
          // Select the new folder
          folderSelect.value = response.folderId;
          
          // Hide the new folder form
          const newFolderContainer = document.getElementById('rcp-new-folder-container');
          if (newFolderContainer) {
            newFolderContainer.style.display = 'none';
          }
          
          // Clear the input
          newFolderInput.value = '';
          
          // Clear any folder selection errors
          const folderError = document.getElementById('rcp-folder-error');
          if (folderError) {
            folderError.style.display = 'none';
          }
          folderSelect.classList.remove('rcp-error-field');
        }
      }
    );
  });
  
  // Save button
  document.getElementById('rcp-save-btn')?.addEventListener('click', () => {
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    const titleInput = document.getElementById('rcp-prompt-title') as HTMLInputElement;
    const folderSelect = document.getElementById('rcp-folder-select') as HTMLSelectElement;
    
    const title = titleInput.value.trim();
    const folderId = folderSelect.value;
    
    // Send a message to save the prompt
    chrome.runtime.sendMessage(
      {
        action: 'savePrompt',
        title,
        text: currentSelection,
        folderId
      } as SavePromptRequest,
      (response) => {
        if (response && response.success) {
          hideModal();
          
          // Show a success toast
          showToast('Prompt saved successfully!');
        } else if (response && response.error) {
          // Show error toast
          showToast(`Error: ${response.error}`, true);
        }
      }
    );
  });
  
  // Add input validation listeners
  const titleInput = document.getElementById('rcp-prompt-title') as HTMLInputElement;
  titleInput.addEventListener('input', () => {
    if (titleInput.value.trim()) {
      titleInput.classList.remove('rcp-error-field');
      const titleError = document.getElementById('rcp-title-error');
      if (titleError) {
        titleError.style.display = 'none';
      }
    }
  });
  
  const folderSelect = document.getElementById('rcp-folder-select') as HTMLSelectElement;
  folderSelect.addEventListener('change', () => {
    if (folderSelect.value) {
      folderSelect.classList.remove('rcp-error-field');
      const folderError = document.getElementById('rcp-folder-error');
      if (folderError) {
        folderError.style.display = 'none';
      }
    }
  });
  
  // Focus on title input by default
  setTimeout(() => {
    const titleInput = document.getElementById('rcp-prompt-title') as HTMLInputElement;
    if (titleInput) {
      titleInput.focus();
    }
  }, 100);
}

// Hide the modal
function hideModal() {
  if (modal) {
    modal.style.display = 'none';
  }
}

// Show a toast notification
function showToast(message: string, isError = false) {
  // Recheck color scheme
  checkColorScheme();
  
  const toast = document.createElement('div');
  const bgColor = '#2D2D2D';
  const borderColor = '#EF4444';
  
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: ${bgColor};
    color: white;
    padding: 10px 16px;
    border-radius: 8px;
    border-left: 4px solid ${borderColor};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 999999999;
    min-width: 200px;
    max-width: 80%;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: rcp-fade-in 0.2s ease-in-out;
  `;
  
  // Add icon
  const icon = document.createElement('span');
  if (isError) {
    icon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    `;
  } else {
    icon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    `;
  }
  
  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  
  toast.appendChild(icon);
  toast.appendChild(textSpan);
  document.body.appendChild(toast);
  
  // Remove the toast after 3 seconds with fade out animation
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, -10px)';
    toast.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Initialize the script
init(); 