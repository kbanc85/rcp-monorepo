/**
 * Represents a prompt in the extension.
 */
export interface Prompt {
  /** Unique identifier for the prompt */
  id: string
  /** Title of the prompt */
  title: string
  /** Text content of the prompt */
  text: string
  /** Creation timestamp in ISO 8601 format (created using toISOString()) */
  timestamp: string
  /** Whether the prompt was imported from an external source */
  isImported?: boolean
}

/**
 * Represents a folder containing prompts.
 */
export interface Folder {
  /** Unique identifier for the folder */
  id: string
  /** Name of the folder */
  name: string
  /** Array of prompts in the folder */
  prompts: Prompt[]
  /** Whether the folder was imported from an external source */
  isImported?: boolean
}

/**
 * Interface for generating context menu IDs.
 */
export interface ContextMenuIds {
  /** ID of the parent context menu */
  parent: string
  /** Function to generate a context menu ID for a folder */
  folder: (folderId: string) => string
  /** Function to generate a context menu ID for a prompt */
  prompt: (promptId: string) => string
}

/**
 * Represents the data stored in the extension's storage.
 */
export interface Storage {
  /** Array of folders containing prompts */
  folders: Folder[]
  /** Theme preference object with isDark boolean property */
  theme: { isDark: boolean }
  /** Whether instant paste is enabled */
  instaPaste: boolean
}

export const CONTEXT_MENU_IDS: ContextMenuIds = {
  parent: 'rightClickPrompt',
  folder: (folderId: string) => `folder_${folderId}`,
  prompt: (promptId: string) => `prompt_${promptId}`
}

/**
 * Represents a subscribed prompt (read-only, from another user's shared folder)
 */
export interface SubscribedPrompt {
  id: string
  title: string
  text: string
  position: number
  created_at: string
}

/**
 * Represents a subscribed folder (read-only, from another user)
 */
export interface SubscribedFolder {
  id: string
  folder_id: string
  folder_name: string
  owner_email: string
  share_code: string
  subscribed_at: string
  prompts: SubscribedPrompt[]
}

/**
 * Represents an item in the Quick Access menu
 */
export interface QuickAccessItem {
  id: string
  promptId: string
  title: string
  text: string
  position: number
  sourceType: 'owned' | 'subscribed'
  sourceLabel?: string
}

/**
 * Represents a folder in the Quick Access menu
 */
export interface QuickAccessFolder {
  id: string
  name: string
  position: number
  items: QuickAccessItem[]
}
