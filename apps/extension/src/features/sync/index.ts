/**
 * RCP v2.0 - Cloud Sync Module
 *
 * Real-time sync between extension and Supabase dashboard
 */

import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../config/supabase'
import type { QuickAccessFolder } from '@rcp/types'

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Types
export interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'offline' | 'not_authenticated'
  lastSyncedAt: Date | null
  pendingChanges: number
  error: string | null
}

export interface CloudFolder {
  id: string
  user_id: string
  name: string
  position: number
  is_imported: boolean
  created_at: string
  updated_at: string
}

export interface CloudPrompt {
  id: string
  folder_id: string
  user_id: string
  title: string
  text: string
  position: number
  is_imported: boolean
  use_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// State
let syncState: SyncState = {
  status: 'idle',
  lastSyncedAt: null,
  pendingChanges: 0,
  error: null
}

let realtimeChannel: RealtimeChannel | null = null

// Debounce and reconnection state
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const SYNC_DEBOUNCE_MS = 1000
const MAX_RECONNECT_ATTEMPTS = 5

// Debounced sync function to prevent rapid API calls
const createDebouncedSync = (onSync: () => void) => {
  return () => {
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer)
    }
    syncDebounceTimer = setTimeout(() => {
      console.log('[Realtime] Debounced sync triggered')
      onSync()
    }, SYNC_DEBOUNCE_MS)
  }
}

// Retry utility with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; baseDelay?: number; name?: string } = {}
): Promise<T> {
  const { retries = 3, baseDelay = 1000, name = 'operation' } = options

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const isLastAttempt = attempt === retries - 1
      if (isLastAttempt) {
        console.error(`[Sync] ${name} failed after ${retries} attempts:`, error)
        throw error
      }

      const delay = baseDelay * Math.pow(2, attempt)
      console.warn(`[Sync] ${name} failed (attempt ${attempt + 1}/${retries}), retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Unreachable')
}

// Get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser()
  return !!user
}

// Sign in
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

// Reset sync state (for cleanup on logout or error recovery)
export const resetSyncState = () => {
  syncState = {
    status: 'idle',
    lastSyncedAt: null,
    pendingChanges: 0,
    error: null
  }
  reconnectAttempts = 0

  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer)
    syncDebounceTimer = null
  }

  console.log('[Sync] State reset')
}

// Sign out
export const signOut = async () => {
  await supabase.auth.signOut()
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
  resetSyncState()
}

// Fetch folders from cloud (with retry)
export const fetchCloudFolders = async (): Promise<CloudFolder[]> => {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .order('position')

    if (error) throw error
    return data || []
  }, { name: 'fetchCloudFolders' })
}

// Fetch prompts from cloud (with retry) - excludes deleted prompts
export const fetchCloudPrompts = async (): Promise<CloudPrompt[]> => {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .is('deleted_at', null)
      .order('position')

    if (error) throw error
    return data || []
  }, { name: 'fetchCloudPrompts' })
}

// Create folder in cloud
export const createCloudFolder = async (name: string, position: number = 0): Promise<CloudFolder> => {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('folders')
    .insert({ name, position, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update folder in cloud
export const updateCloudFolder = async (id: string, updates: Partial<CloudFolder>): Promise<CloudFolder> => {
  const { data, error } = await supabase
    .from('folders')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete folder in cloud
export const deleteCloudFolder = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Create prompt in cloud
export const createCloudPrompt = async (folderId: string, title: string, text: string, position: number = 0): Promise<CloudPrompt> => {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('prompts')
    .insert({ folder_id: folderId, title, text, position, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update prompt in cloud
export const updateCloudPrompt = async (id: string, updates: Partial<CloudPrompt>): Promise<CloudPrompt> => {
  const { data, error } = await supabase
    .from('prompts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete prompt in cloud (permanent delete)
export const deleteCloudPrompt = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('prompts')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================
// TRASH BIN FUNCTIONS
// ============================================

// Soft delete a prompt (move to trash)
export const trashCloudPrompt = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('prompts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
  console.log('[Sync] ✅ Moved prompt to trash:', id)
}

// Restore a prompt from trash
export const restoreCloudPrompt = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('prompts')
    .update({ deleted_at: null })
    .eq('id', id)

  if (error) throw error
  console.log('[Sync] ✅ Restored prompt from trash:', id)
}

// Fetch trash (up to 10 most recent deleted prompts)
export const fetchTrashPrompts = async (): Promise<CloudPrompt[]> => {
  const user = await getCurrentUser()
  if (!user) return []

  try {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(10)

    if (error) throw error
    console.log('[Sync] ✅ Fetched trash:', data?.length || 0, 'prompts')
    return data || []
  } catch (error) {
    console.error('[Sync] ❌ Error fetching trash:', error)
    return []
  }
}

// Clean up old trash (keep only 10 most recent)
export const cleanupOldTrash = async (): Promise<void> => {
  const user = await getCurrentUser()
  if (!user) return

  try {
    // Get IDs of prompts beyond the 10 most recent in trash
    const { data: oldTrash } = await supabase
      .from('prompts')
      .select('id')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .range(10, 100)

    if (oldTrash && oldTrash.length > 0) {
      const ids = oldTrash.map(p => p.id)
      await supabase.from('prompts').delete().in('id', ids)
      console.log('[Sync] ✅ Cleaned up', ids.length, 'old trash items')
    }
  } catch (error) {
    console.error('[Sync] ❌ Error cleaning up trash:', error)
  }
}

// Full sync - pull from cloud and update local storage
export const syncFromCloud = async (): Promise<{ folders: CloudFolder[], prompts: CloudPrompt[] }> => {
  syncState.status = 'syncing'

  try {
    const [folders, prompts] = await Promise.all([
      fetchCloudFolders(),
      fetchCloudPrompts()
    ])

    // Sort folders and prompts by position to preserve order
    const sortedFolders = [...folders].sort((a, b) => a.position - b.position)
    const sortedPrompts = [...prompts].sort((a, b) => a.position - b.position)

    // Convert to local storage format (matching extension's Folder/Prompt types)
    const localFolders = sortedFolders.map(f => ({
      id: f.id,
      name: f.name,
      isImported: f.is_imported || false,
      prompts: sortedPrompts
        .filter(p => p.folder_id === f.id)
        .map(p => ({
          id: p.id,
          title: p.title,
          text: p.text,
          timestamp: p.created_at,
          isImported: p.is_imported || false
        }))
    }))

    // Save to chrome storage
    await chrome.storage.local.set({ folders: localFolders })

    syncState.status = 'idle'
    syncState.lastSyncedAt = new Date()
    syncState.error = null

    console.log('[Sync] ✅ Synced from cloud:', folders.length, 'folders,', prompts.length, 'prompts')

    return { folders, prompts }
  } catch (error) {
    syncState.status = 'error'
    syncState.error = (error as Error).message
    console.error('[Sync] ❌ Error:', error)
    throw error
  }
}

// Setup realtime subscription with debouncing and reconnection
export const setupRealtimeSubscription = async (onSync: () => void): Promise<void> => {
  const user = await getCurrentUser()
  if (!user) {
    syncState.status = 'not_authenticated'
    return
  }

  // Remove existing channel if any
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }

  // Create debounced sync function
  const debouncedSync = createDebouncedSync(onSync)

  realtimeChannel = supabase
    .channel('rcp-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, () => {
      console.log('[Realtime] Folder changed')
      debouncedSync()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'prompts' }, () => {
      console.log('[Realtime] Prompt changed')
      debouncedSync()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_access_folders' }, () => {
      console.log('[Realtime] Quick Access folder changed')
      debouncedSync()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_access_items' }, () => {
      console.log('[Realtime] Quick Access item changed')
      debouncedSync()
    })
    .subscribe((status, err) => {
      console.log('[Realtime] Subscription status:', status)

      if (status === 'SUBSCRIBED') {
        // Successfully connected - reset reconnect counter
        reconnectAttempts = 0
        syncState.status = 'idle'
        syncState.error = null
        console.log('[Realtime] ✅ Connected successfully')
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // Connection lost - attempt reconnection with exponential backoff
        console.warn('[Realtime] ⚠️ Connection lost:', err?.message || status)
        syncState.status = 'error'
        syncState.error = 'Connection lost'

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
          console.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
          setTimeout(() => setupRealtimeSubscription(onSync), delay)
        } else {
          console.error('[Realtime] ❌ Max reconnect attempts reached, going offline')
          syncState.status = 'offline'
          syncState.error = 'Unable to connect after multiple attempts'
        }
      } else if (status === 'CLOSED') {
        console.log('[Realtime] Channel closed')
        syncState.status = 'idle'
      }
    })
}

// Get sync status
export const getSyncStatus = (): SyncState => {
  return { ...syncState }
}

// Stop sync
export const stopSync = async (): Promise<void> => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
  syncState.status = 'idle'
}

// Subscribed folder types
export interface SubscribedFolderData {
  folder_id: string
  folder_name: string
  owner_id: string
  owner_email: string
  share_code: string
  source_label: string
  subscribed_at: string
  subscription_id: string
  prompts: {
    id: string
    title: string
    text: string
    position: number
    created_at: string
  }[]
}

// Quick Access types
export interface QuickAccessItem {
  item_id: string
  prompt_id: string
  prompt_title: string
  prompt_text: string
  item_position: number
  source_type: 'owned' | 'subscribed'
  source_label: string | null
}

export interface QuickAccessFolder {
  folder_id: string
  folder_name: string
  folder_position: number
  items: QuickAccessItem[]
}

// Fetch subscribed folders from cloud (with retry)
export const fetchSubscribedFolders = async (): Promise<SubscribedFolderData[]> => {
  const user = await getCurrentUser()
  if (!user) return []

  try {
    return await withRetry(async () => {
      const { data, error } = await supabase
        .rpc('get_subscribed_folders', { p_user_id: user.id })

      if (error) throw error

      console.log('[Sync] ✅ Fetched subscribed folders:', data?.length || 0)
      return data || []
    }, { name: 'fetchSubscribedFolders' })
  } catch (error) {
    console.error('[Sync] ❌ Error fetching subscribed folders:', error)
    return []
  }
}

// Fetch quick access menu from cloud (with retry)
export const fetchQuickAccessMenu = async (): Promise<QuickAccessFolder[]> => {
  const user = await getCurrentUser()
  if (!user) return []

  try {
    return await withRetry(async () => {
      const { data, error } = await supabase
        .rpc('get_quick_access_menu', { p_user_id: user.id })

      if (error) throw error

      // Group by folder
      const foldersMap = new Map<string, QuickAccessFolder>()

      for (const row of data || []) {
        if (!foldersMap.has(row.folder_id)) {
          foldersMap.set(row.folder_id, {
            folder_id: row.folder_id,
            folder_name: row.folder_name,
            folder_position: row.folder_position,
            items: []
          })
        }

        if (row.item_id && row.prompt_title) {
          foldersMap.get(row.folder_id)!.items.push({
            item_id: row.item_id,
            prompt_id: row.prompt_id,
            prompt_title: row.prompt_title,
            prompt_text: row.prompt_text,
            item_position: row.item_position,
            source_type: row.source_type,
            source_label: row.source_label
          })
        }
      }

      const sortedFolders = Array.from(foldersMap.values())
        .sort((a, b) => a.folder_position - b.folder_position)
        .map(f => ({
          ...f,
          items: f.items.sort((a, b) => a.item_position - b.item_position)
        }))

      console.log('[Sync] ✅ Fetched quick access menu:', sortedFolders.length, 'folders')
      return sortedFolders
    }, { name: 'fetchQuickAccessMenu' })
  } catch (error) {
    console.error('[Sync] ❌ Error fetching quick access menu:', error)
    return []
  }
}

// Push local folder to cloud (for two-way sync)
export const pushFolderToCloud = async (folder: { id: string, name: string, position: number }): Promise<void> => {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  try {
    // Check if folder exists in cloud
    const { data: existing } = await supabase
      .from('folders')
      .select('id')
      .eq('id', folder.id)
      .single()

    if (existing) {
      // Update
      await supabase
        .from('folders')
        .update({ name: folder.name, position: folder.position })
        .eq('id', folder.id)
    } else {
      // Insert
      await supabase
        .from('folders')
        .insert({
          id: folder.id,
          name: folder.name,
          position: folder.position,
          user_id: user.id
        })
    }

    console.log('[Sync] ✅ Pushed folder to cloud:', folder.name)
  } catch (error) {
    console.error('[Sync] ❌ Error pushing folder:', error)
    throw error
  }
}

// Push local prompt to cloud (for two-way sync)
export const pushPromptToCloud = async (prompt: { id: string, title: string, text: string, position: number }, folderId: string): Promise<void> => {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  try {
    // Check if prompt exists in cloud
    const { data: existing } = await supabase
      .from('prompts')
      .select('id')
      .eq('id', prompt.id)
      .single()

    if (existing) {
      // Update
      await supabase
        .from('prompts')
        .update({
          title: prompt.title,
          text: prompt.text,
          position: prompt.position
        })
        .eq('id', prompt.id)
    } else {
      // Insert
      await supabase
        .from('prompts')
        .insert({
          id: prompt.id,
          title: prompt.title,
          text: prompt.text,
          position: prompt.position,
          folder_id: folderId,
          user_id: user.id
        })
    }

    console.log('[Sync] ✅ Pushed prompt to cloud:', prompt.title)
  } catch (error) {
    console.error('[Sync] ❌ Error pushing prompt:', error)
    throw error
  }
}

// Sync Quick Access from cloud and save to local storage
export const syncQuickAccessFromCloud = async (): Promise<QuickAccessFolder[]> => {
  const user = await getCurrentUser()
  if (!user) {
    console.log('[Sync] Not authenticated, skipping Quick Access sync')
    return []
  }

  try {
    const quickAccessData = await fetchQuickAccessMenu()

    // Transform from snake_case (database) to camelCase (app)
    const transformedData: QuickAccessFolder[] = quickAccessData.map(folder => ({
      id: folder.folder_id,
      name: folder.folder_name,
      position: folder.folder_position,
      items: folder.items.map(item => ({
        id: item.item_id,
        promptId: item.prompt_id,
        title: item.prompt_title,
        text: item.prompt_text,
        position: item.item_position,
        sourceType: item.source_type as 'owned' | 'subscribed',
        sourceLabel: item.source_label
      }))
    }))

    // Save to chrome storage
    await chrome.storage.local.set({ quickAccessFolders: transformedData })

    console.log('[Sync] ✅ Synced Quick Access:', transformedData.length, 'folders')
    return transformedData
  } catch (error) {
    console.error('[Sync] ❌ Error syncing Quick Access:', error)
    return []
  }
}

// ============================================
// QUICK ACCESS ITEM REORDERING
// ============================================

// Update positions for Quick Access items in a folder
export const updateQuickAccessItemPositions = async (
  folderId: string,
  itemIds: string[]
): Promise<void> => {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  // Update each item's position in batch
  const updates = itemIds.map((id, index) => ({
    id,
    position: index,
    quick_access_folder_id: folderId,
    user_id: user.id
  }))

  // Use upsert to update positions
  for (const update of updates) {
    const { error } = await supabase
      .from('quick_access_items')
      .update({ position: update.position })
      .eq('id', update.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[Sync] ❌ Error updating item position:', error)
      throw error
    }
  }

  console.log('[Sync] ✅ Updated Quick Access item positions in folder:', folderId)
}

// ============================================
// QUICK ACCESS FOLDER REORDERING
// ============================================

// Update positions for Quick Access folders
export const updateQuickAccessFolderPositions = async (
  folderIds: string[]
): Promise<void> => {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  // Update each folder's position
  for (let i = 0; i < folderIds.length; i++) {
    const { error } = await supabase
      .from('quick_access_folders')
      .update({ position: i })
      .eq('id', folderIds[i])
      .eq('user_id', user.id)

    if (error) {
      console.error('[Sync] ❌ Error updating folder position:', error)
      throw error
    }
  }

  console.log('[Sync] ✅ Updated Quick Access folder positions:', folderIds.length, 'folders')
}
