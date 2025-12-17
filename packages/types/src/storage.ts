import type { Folder } from './folder'

/**
 * Represents the data stored in the extension's storage
 */
export interface Storage {
  /** Array of folders containing prompts */
  folders: Folder[]
  /** Theme preference object with isDark boolean property */
  theme: { isDark: boolean }
  /** Whether instant paste is enabled */
  instaPaste: boolean
}

/**
 * Storage keys used by the extension
 */
export const STORAGE_KEYS = {
  FOLDERS: 'folders',
  SYNC_ENABLED: 'syncEnabled',
  SUBSCRIBED_FOLDERS: 'subscribedFolders',
  QUICK_ACCESS_FOLDERS: 'quickAccessFolders',
  THEME: 'theme',
  INSTA_PASTE: 'instaPaste'
} as const
