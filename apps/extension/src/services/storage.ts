import type { Folder, Prompt, SubscribedFolder, QuickAccessFolder } from '../types/types'

// Storage keys
export const STORAGE_KEYS = {
  FOLDERS: 'folders',
  SYNC_ENABLED: 'syncEnabled',
  SUBSCRIBED_FOLDERS: 'subscribedFolders',
  QUICK_ACCESS_FOLDERS: 'quickAccessFolders',
} as const

// Storage schema version for future migrations
export const STORAGE_VERSION = 1

export interface StorageSchema {
  version: number
  folders: Folder[]
  syncEnabled?: boolean
}

class StorageManager {
  private static instance: StorageManager
  
  private constructor() {}
  
  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager()
    }
    return StorageManager.instance
  }

  // Initialize storage with schema version
  public async initialize(): Promise<void> {
    const data = await chrome.storage.local.get(['version', STORAGE_KEYS.FOLDERS, STORAGE_KEYS.SYNC_ENABLED])
    
    if (!data.version || data.version < STORAGE_VERSION) {
      // Initialize with empty data if no version exists
      await this.setStorageData({
        version: STORAGE_VERSION,
        folders: data[STORAGE_KEYS.FOLDERS] || [],
        syncEnabled: data[STORAGE_KEYS.SYNC_ENABLED] || false
      })
    }
  }

  // Get all folders
  public async getFolders(): Promise<Folder[]> {
    const data = await chrome.storage.local.get(STORAGE_KEYS.FOLDERS)
    return data[STORAGE_KEYS.FOLDERS] || []
  }

  // Get subscribed folders
  public async getSubscribedFolders(): Promise<SubscribedFolder[]> {
    const data = await chrome.storage.local.get(STORAGE_KEYS.SUBSCRIBED_FOLDERS)
    return data[STORAGE_KEYS.SUBSCRIBED_FOLDERS] || []
  }

  // Save subscribed folders
  public async saveSubscribedFolders(folders: SubscribedFolder[]): Promise<void> {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SUBSCRIBED_FOLDERS]: folders
    })
  }

  // Get Quick Access folders
  public async getQuickAccessFolders(): Promise<QuickAccessFolder[]> {
    const data = await chrome.storage.local.get(STORAGE_KEYS.QUICK_ACCESS_FOLDERS)
    return data[STORAGE_KEYS.QUICK_ACCESS_FOLDERS] || []
  }

  // Save Quick Access folders
  public async saveQuickAccessFolders(folders: QuickAccessFolder[]): Promise<void> {
    await chrome.storage.local.set({
      [STORAGE_KEYS.QUICK_ACCESS_FOLDERS]: folders
    })
  }

  // Save to cloud
  public async saveToCloud(): Promise<void> {
    const folders = await this.getFolders();
    try {
      await chrome.storage.sync.set({ [STORAGE_KEYS.FOLDERS]: folders });
    } catch (error) {
      console.error('Failed to save to cloud:', error);
      throw error;
    }
  }

  // Load from cloud
  public async loadFromCloud(): Promise<void> {
    try {
      const data = await chrome.storage.sync.get(STORAGE_KEYS.FOLDERS);
      const cloudFolders = data[STORAGE_KEYS.FOLDERS] || [];
      await this.saveFolders(cloudFolders);
    } catch (error) {
      console.error('Failed to load from cloud:', error);
      throw error;
    }
  }

  // Save folders
  public async saveFolders(folders: Folder[]): Promise<void> {
    // Validate folder structure before saving
    this.validateFolders(folders)
    await chrome.storage.local.set({
      [STORAGE_KEYS.FOLDERS]: folders
    })
  }

  // Export folders to JSON file
  public async exportFolders(): Promise<void> {
    const folders = await this.getFolders()
    const dataStr = JSON.stringify(folders, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const downloadLink = document.createElement('a')
    downloadLink.href = url
    downloadLink.download = `RCP-backup-${new Date().toISOString().split('T')[0]}.json`
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (favicon) {
      downloadLink.setAttribute('data-icon', favicon.href)
    }
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
    URL.revokeObjectURL(url)
  }

  // Import folders from JSON file
  public async importFolders(file: File): Promise<{ success: boolean; error?: string }> {
    try {
      const text = await file.text()
      
      // First try to parse the JSON
      let folders
      try {
        folders = JSON.parse(text)
      } catch (e) {
        return {
          success: false,
          error: 'Invalid JSON format. Please make sure your backup file is a valid JSON file.'
        }
      }
      
      // Validate the imported data structure
      if (!Array.isArray(folders)) {
        return {
          success: false,
          error: 'Invalid backup format. The file should contain an array of folders.'
        }
      }
      
      // Validate each folder and its prompts
      for (const folder of folders) {
        if (!folder.id || typeof folder.id !== 'string') {
          return {
            success: false,
            error: `Invalid folder structure: missing or invalid 'id' in folder "${folder.name || 'unnamed'}"`
          }
        }
        
        if (!folder.name || typeof folder.name !== 'string') {
          return {
            success: false,
            error: `Invalid folder structure: missing or invalid 'name' in folder with ID "${folder.id}"`
          }
        }
        
        if (!Array.isArray(folder.prompts)) {
          return {
            success: false,
            error: `Invalid folder structure: 'prompts' must be an array in folder "${folder.name}"`
          }
        }
        
        for (const prompt of folder.prompts) {
          if (!prompt.id || typeof prompt.id !== 'string') {
            return {
              success: false,
              error: `Invalid prompt structure: missing or invalid 'id' in prompt "${prompt.title || 'unnamed'}" in folder "${folder.name}"`
            }
          }
          
          if (!prompt.title || typeof prompt.title !== 'string') {
            return {
              success: false,
              error: `Invalid prompt structure: missing or invalid 'title' in prompt with ID "${prompt.id}" in folder "${folder.name}"`
            }
          }
          
          if (!prompt.text || typeof prompt.text !== 'string') {
            return {
              success: false,
              error: `Invalid prompt structure: missing or invalid 'text' in prompt "${prompt.title}" in folder "${folder.name}"`
            }
          }
          
          if (!prompt.timestamp || typeof prompt.timestamp !== 'string' || isNaN(Date.parse(prompt.timestamp))) {
            return {
              success: false,
              error: `Invalid prompt structure: missing or invalid 'timestamp' in prompt "${prompt.title}" in folder "${folder.name}"`
            }
          }
        }
      }
      
      // If all validation passes, save the folders
      await this.saveFolders(folders)
      return { success: true }
    } catch (error) {
      console.error('Error importing folders:', error)
      return {
        success: false,
        error: 'An unexpected error occurred while importing folders. Please check the console for details.'
      }
    }
  }

  // Import prompt package without replacing existing folders
  public async importPromptPackage(file: File): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const text = await file.text()
      
      // First try to parse the JSON
      let folders
      try {
        folders = JSON.parse(text)
      } catch (e) {
        return {
          success: false,
          error: 'Invalid JSON format. Please make sure your package file is a valid JSON file.'
        }
      }
      
      // Validate the imported data structure
      if (!Array.isArray(folders)) {
        return {
          success: false,
          error: 'Invalid package format. The file should contain an array of folders.'
        }
      }
      
      // Validate each folder and its prompts (reusing existing validation logic)
      for (const folder of folders) {
        if (!folder.id || typeof folder.id !== 'string') {
          return {
            success: false,
            error: `Invalid folder structure: missing or invalid 'id' in folder "${folder.name || 'unnamed'}"`
          }
        }
        
        if (!folder.name || typeof folder.name !== 'string') {
          return {
            success: false,
            error: `Invalid folder structure: missing or invalid 'name' in folder with ID "${folder.id}"`
          }
        }
        
        if (!Array.isArray(folder.prompts)) {
          return {
            success: false,
            error: `Invalid folder structure: 'prompts' must be an array in folder "${folder.name}"`
          }
        }
        
        // Additional validation for prompts
        for (const prompt of folder.prompts as Prompt[]) {
          if (!prompt.id || typeof prompt.id !== 'string') {
            return {
              success: false,
              error: `Invalid prompt structure: missing or invalid 'id' in prompt "${prompt.title || 'unnamed'}" in folder "${folder.name}"`
            }
          }
          
          if (!prompt.title || typeof prompt.title !== 'string') {
            return {
              success: false,
              error: `Invalid prompt structure: missing or invalid 'title' in prompt with ID "${prompt.id}" in folder "${folder.name}"`
            }
          }
          
          if (!prompt.text || typeof prompt.text !== 'string') {
            return {
              success: false,
              error: `Invalid prompt structure: missing or invalid 'text' in prompt "${prompt.title}" in folder "${folder.name}"`
            }
          }
          
          if (!prompt.timestamp || typeof prompt.timestamp !== 'string' || isNaN(Date.parse(prompt.timestamp))) {
            return {
              success: false,
              error: `Invalid prompt structure: missing or invalid 'timestamp' in prompt "${prompt.title}" in folder "${folder.name}"`
            }
          }
        }
      }
      
      // Get existing folders
      const existingFolders = await this.getFolders()
      
      // Filter out any existing imported folders
      const regularFolders = existingFolders.filter(f => !f.isImported)
      const currentImportedFolders = existingFolders.filter(f => f.isImported)
      
      // Generate new IDs for imported folders and prompts to avoid conflicts
      const importedFolders = folders.map(folder => ({
        ...folder,
        id: crypto.randomUUID(),
        name: folder.name,
        isImported: true, // Mark as imported
        prompts: folder.prompts.map((prompt: Prompt) => ({
          ...prompt,
          id: crypto.randomUUID()
        }))
      }))
      
      // Combine regular folders first, then all imported folders
      const newFolders = [...regularFolders, ...currentImportedFolders, ...importedFolders]
      
      // Save the combined folders
      await this.saveFolders(newFolders)
      return { 
        success: true,
        message: `Successfully imported ${importedFolders.length} folder${importedFolders.length === 1 ? '' : 's'}`
      }
    } catch (error) {
      console.error('Error importing prompt package:', error)
      return {
        success: false,
        error: 'An unexpected error occurred while importing the prompt package. Please check the console for details.'
      }
    }
  }

  // Set complete storage data
  private async setStorageData(data: StorageSchema): Promise<void> {
    await chrome.storage.local.set(data)
  }

  // Validate folder structure
  private validateFolders(folders: Folder[]): void {
    if (!Array.isArray(folders)) {
      throw new Error('Folders must be an array')
    }

    folders.forEach(folder => {
      if (!folder.id || typeof folder.id !== 'string') {
        throw new Error('Each folder must have a valid string ID')
      }
      if (!folder.name || typeof folder.name !== 'string') {
        throw new Error('Each folder must have a valid string name')
      }
      if (!Array.isArray(folder.prompts)) {
        throw new Error('Folder prompts must be an array')
      }

      folder.prompts.forEach(prompt => {
        if (!prompt.id || typeof prompt.id !== 'string') {
          throw new Error('Each prompt must have a valid string ID')
        }
        if (!prompt.title || typeof prompt.title !== 'string') {
          throw new Error('Each prompt must have a valid string title')
        }
        if (!prompt.text || typeof prompt.text !== 'string') {
          throw new Error('Each prompt must have valid string text')
        }
        if (!prompt.timestamp || typeof prompt.timestamp !== 'string') {
          throw new Error('Each prompt must have a valid timestamp')
        }
      })
    })
  }

  // Clear all storage data
  public async clearStorage(): Promise<void> {
    await chrome.storage.local.clear()
    await this.initialize()
  }

  // Toggle sync functionality
  public async toggleSync(enabled: boolean): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.SYNC_ENABLED]: enabled })
    
    if (enabled) {
      // If enabling sync, try to sync with cloud immediately
      try {
        const syncData = await chrome.storage.sync.get(STORAGE_KEYS.FOLDERS)
        if (syncData[STORAGE_KEYS.FOLDERS]) {
          await this.saveFolders(syncData[STORAGE_KEYS.FOLDERS])
        } else {
          // If no cloud data exists, push local data to cloud
          const localData = await this.getFolders()
          await chrome.storage.sync.set({ [STORAGE_KEYS.FOLDERS]: localData })
        }
      } catch (error) {
        console.error('Error during initial sync:', error)
        throw error
      }
    }
  }
}

// Export a singleton instance
export const storageManager = StorageManager.getInstance()
