/**
 * Context Menu Manager Service
 * Handles creation and management of context menu items.
 */
import type { Folder } from "../types";
import { CONTEXT_MENU_IDS } from "../types";
import { storageManager } from "../storage";

/**
 * Rebuilds the entire context menu structure based on current folders
 */
export async function rebuildContextMenu(): Promise<void> {
  // Remove existing menu items
  await chrome.contextMenus.removeAll();

  // Create parent menu
  chrome.contextMenus.create({
    id: CONTEXT_MENU_IDS.parent,
    title: "Right Click Prompt",
    contexts: ["all"]
  });

  // Get folders from storage
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
}

/**
 * Creates a default folder if none exists
 * @returns The created folder or null if folders already exist
 */
export async function createDefaultFolderIfNeeded(): Promise<Folder | null> {
  const folders = await storageManager.getFolders();
  
  if (folders.length === 0) {
    const defaultFolder: Folder = {
      id: crypto.randomUUID(),
      name: "Default",
      prompts: []
    };
    
    await storageManager.saveFolders([defaultFolder]);
    return defaultFolder;
  }
  
  return null;
}

/**
 * Adds a new prompt to the first folder
 * @param title - Title of the prompt
 * @param text - Text content of the prompt
 */
export async function addPromptToFirstFolder(title: string, text: string): Promise<void> {
  const folders = await storageManager.getFolders();
  
  // If there are no folders, create a default one
  if (folders.length === 0) {
    await createDefaultFolderIfNeeded();
  }
  
  // Get folders again in case we just created one
  const updatedFolders = await storageManager.getFolders();
  
  // Add prompt to the first folder
  updatedFolders[0].prompts.push({
    id: crypto.randomUUID(),
    title: title.trim(),
    text: text,
    timestamp: new Date().toISOString()
  });
  
  await storageManager.saveFolders(updatedFolders);
} 