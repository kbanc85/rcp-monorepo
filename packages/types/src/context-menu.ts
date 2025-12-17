/**
 * Interface for generating context menu IDs (extension-specific)
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
 * Default context menu ID generators
 */
export const CONTEXT_MENU_IDS: ContextMenuIds = {
  parent: 'rightClickPrompt',
  folder: (folderId: string) => `folder_${folderId}`,
  prompt: (promptId: string) => `prompt_${promptId}`
}
