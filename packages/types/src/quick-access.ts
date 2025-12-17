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
  sourceLabel?: string | null
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
