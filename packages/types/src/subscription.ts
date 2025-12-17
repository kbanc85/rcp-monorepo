/**
 * Represents a subscribed prompt (read-only, from another user's shared folder)
 */
export interface SubscribedPrompt {
  id: string
  title: string
  text: string
  position: number
  created_at?: string
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
 * Full subscription with labels (dashboard format)
 */
export interface Subscription {
  id: string
  folderId: string
  folderName: string
  sourceLabel: string
  ownerEmail: string
  subscribedAt: string
  prompts: SubscribedPrompt[]
}

/**
 * Shared folder record in database
 */
export interface SharedFolder {
  id: string
  folder_id: string
  owner_id: string
  share_code: string
  is_active: boolean
  source_label?: string
  created_at: string
}
