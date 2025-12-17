import type { Prompt } from './prompt'

/**
 * Represents a folder containing prompts.
 * Used by both dashboard and extension.
 */
export interface Folder {
  /** Unique identifier for the folder */
  id: string
  /** Name of the folder */
  name: string
  /** Position for ordering */
  position?: number
  /** Array of prompts in the folder */
  prompts: Prompt[]
  /** Whether the folder was imported from an external source */
  isImported?: boolean
  /** Whether the folder is shared */
  isShared?: boolean
  /** Share code for the folder (if shared) */
  shareCode?: string
}

/**
 * Cloud/database representation of a folder
 */
export interface CloudFolder {
  id: string
  user_id: string
  name: string
  position: number
  is_imported?: boolean
  created_at: string
  updated_at?: string
}
