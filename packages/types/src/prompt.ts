/**
 * Represents a prompt in the system.
 * Used by both dashboard and extension.
 */
export interface Prompt {
  /** Unique identifier for the prompt */
  id: string
  /** Title of the prompt */
  title: string
  /** Text content of the prompt */
  text: string
  /** Position for ordering */
  position?: number
  /** Creation timestamp in ISO 8601 format */
  timestamp?: string
  /** Whether the prompt was imported from an external source */
  isImported?: boolean
  /** Whether the prompt is an unedited copy from subscription */
  is_unedited_copy?: boolean
}

/**
 * Cloud/database representation of a prompt
 */
export interface CloudPrompt {
  id: string
  folder_id: string
  user_id: string
  title: string
  text: string
  position: number
  is_imported?: boolean
  is_unedited_copy?: boolean
  use_count?: number
  last_used_at?: string
  created_at: string
  updated_at?: string
  deleted_at?: string | null
}
