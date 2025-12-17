"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { Loader2, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/dashboard/header"
import { MyPromptsPanel, type Folder, type Prompt } from "@/components/dashboard/my-prompts-panel"
import { SubscriptionsPanel, type Subscription, type SubscribedPrompt } from "@/components/dashboard/subscriptions-panel"
import { QuickAccessPanel, type QuickAccessFolder, type QuickAccessItem } from "@/components/dashboard/quick-access-panel"
import { FolderDialog } from "@/components/dashboard/folder-dialog"
import { PromptDialog } from "@/components/dashboard/prompt-dialog"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import { ShareDialog } from "@/components/dashboard/share-dialog"
import { pageVariants } from "@rcp/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Rate limiting constants
const SYNC_COOLDOWN_MS = 2000
const REALTIME_DEBOUNCE_MS = 1000

// Pagination limits to prevent loading too much data
const MAX_FOLDERS = 50
const MAX_PROMPTS_PER_FOLDER = 10  // Hard limit: 10 prompts per folder
const MAX_SUBSCRIPTIONS = 50
const MAX_QUICK_ACCESS_FOLDERS = 30  // Quick Access supports up to 30 folders

export default function DashboardPage() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [quickAccessFolders, setQuickAccessFolders] = useState<QuickAccessFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [userEmail, setUserEmail] = useState<string | undefined>()
  const [userId, setUserId] = useState<string | undefined>()
  const [userFirstName, setUserFirstName] = useState<string | undefined>()
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [editingFirstName, setEditingFirstName] = useState("")

  // Rate limiting state
  const lastSyncTimeRef = useRef<number>(0)
  const realtimeDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Dialog states
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [quickAccessFolderDialogOpen, setQuickAccessFolderDialogOpen] = useState(false)
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  // Edit states
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string>("")
  const [deletingItem, setDeletingItem] = useState<{
    type: "folder" | "prompt" | "quick_access_folder" | "subscription"
    item: any
    folderId?: string
  } | null>(null)
  const [sharingFolder, setSharingFolder] = useState<Folder | null>(null)

  // Copy prompt state
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [promptToCopy, setPromptToCopy] = useState<{ prompt: SubscribedPrompt; sourceLabel: string } | null>(null)
  const [selectedCopyFolder, setSelectedCopyFolder] = useState<string>("")

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email)
        setUserId(user.id)
        setUserFirstName(user.user_metadata?.first_name)
      }

      // Fetch my folders with prompts (with pagination limits)
      const { data: foldersData, error: foldersError } = await supabase
        .from("folders")
        .select(`
          id,
          name,
          position,
          prompts (
            id,
            title,
            text,
            position,
            is_unedited_copy
          )
        `)
        .eq("user_id", user?.id)
        .order("position", { ascending: true })
        .limit(MAX_FOLDERS)

      if (foldersError) throw foldersError

      // Check which folders are shared
      const { data: sharedData } = await supabase
        .from("shared_folders")
        .select("folder_id, share_code, is_active, source_label")
        .eq("owner_id", user?.id)

      const sharedMap = new Map(
        sharedData?.map(s => [s.folder_id, {
          shareCode: s.share_code,
          isActive: s.is_active,
          sourceLabel: s.source_label
        }]) || []
      )

      const formattedFolders: Folder[] = (foldersData || []).map(folder => ({
        id: folder.id,
        name: folder.name,
        position: folder.position,
        prompts: (folder.prompts || [])
          .sort((a: any, b: any) => a.position - b.position)
          .slice(0, MAX_PROMPTS_PER_FOLDER) // Limit prompts per folder
          .map((p: any) => ({
            id: p.id,
            title: p.title,
            text: p.text,
            position: p.position,
            is_unedited_copy: p.is_unedited_copy || false,
          })),
        isShared: sharedMap.get(folder.id)?.isActive || false,
        shareCode: sharedMap.get(folder.id)?.shareCode,
      }))

      setFolders(formattedFolders)

      // Fetch subscriptions (with client-side limit)
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .rpc("get_subscriptions_with_labels", { p_user_id: user?.id })

      if (!subscriptionsError && subscriptionsData) {
        const formattedSubscriptions: Subscription[] = subscriptionsData
          .slice(0, MAX_SUBSCRIPTIONS) // Limit subscriptions
          .map((sub: any) => ({
            id: sub.subscription_id,
            folderId: sub.folder_id,
            folderName: sub.folder_name,
            sourceLabel: sub.source_label || "Shared Prompts",
            ownerEmail: sub.owner_email,
            subscribedAt: sub.subscribed_at,
            prompts: (sub.prompts || [])
              .slice(0, MAX_PROMPTS_PER_FOLDER) // Limit prompts per subscription
              .map((p: any) => ({
                id: p.id,
                title: p.title,
                text: p.text,
                position: p.position,
              })),
          }))
        setSubscriptions(formattedSubscriptions)
      }

      // Fetch quick access menu
      const { data: quickAccessData, error: quickAccessError } = await supabase
        .rpc("get_quick_access_menu", { p_user_id: user?.id })

      if (!quickAccessError && quickAccessData) {
        // Group by folder
        const foldersMap = new Map<string, QuickAccessFolder>()

        for (const row of quickAccessData) {
          if (!foldersMap.has(row.folder_id)) {
            foldersMap.set(row.folder_id, {
              id: row.folder_id,
              name: row.folder_name,
              position: row.folder_position,
              items: [],
            })
          }

          if (row.item_id && row.prompt_title) {
            foldersMap.get(row.folder_id)!.items.push({
              id: row.item_id,
              promptId: row.prompt_id,
              title: row.prompt_title,
              text: row.prompt_text,
              position: row.item_position,
              sourceType: row.source_type,
              sourceLabel: row.source_label,
            })
          }
        }

        const sortedFolders = Array.from(foldersMap.values())
          .sort((a, b) => a.position - b.position)
          .slice(0, MAX_QUICK_ACCESS_FOLDERS) // Limit quick access folders
          .map(f => ({
            ...f,
            items: f.items.sort((a, b) => a.position - b.position),
          }))

        setQuickAccessFolders(sortedFolders)
      } else {
        // Fetch folders directly if RPC doesn't exist yet
        const { data: qaFolders } = await supabase
          .from("quick_access_folders")
          .select("*")
          .eq("user_id", user?.id)
          .order("position")

        if (qaFolders) {
          setQuickAccessFolders(qaFolders.map(f => ({
            id: f.id,
            name: f.name,
            position: f.position,
            items: [],
          })))
        }
      }

    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Debounced fetch for realtime updates
  const debouncedFetch = useCallback(() => {
    if (realtimeDebounceRef.current) {
      clearTimeout(realtimeDebounceRef.current)
    }
    realtimeDebounceRef.current = setTimeout(() => {
      console.log('[Dashboard] Realtime update triggered')
      fetchData()
    }, REALTIME_DEBOUNCE_MS)
  }, [fetchData])

  // Setup realtime subscriptions for live updates
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'folders' },
        () => {
          console.log('[Realtime] Folders changed')
          debouncedFetch()
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'prompts' },
        () => {
          console.log('[Realtime] Prompts changed')
          debouncedFetch()
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'quick_access_folders' },
        () => {
          console.log('[Realtime] Quick Access folders changed')
          debouncedFetch()
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'quick_access_items' },
        () => {
          console.log('[Realtime] Quick Access items changed')
          debouncedFetch()
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => {
          console.log('[Realtime] Subscriptions changed')
          debouncedFetch()
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Dashboard subscription status:', status)
      })

    return () => {
      console.log('[Realtime] Cleaning up dashboard subscription')
      supabase.removeChannel(channel)
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current)
      }
    }
  }, [supabase, debouncedFetch])

  // Rate-limited sync handler
  const handleSync = async () => {
    const now = Date.now()
    if (now - lastSyncTimeRef.current < SYNC_COOLDOWN_MS) {
      console.log('[Dashboard] Sync rate limited, please wait')
      return
    }

    lastSyncTimeRef.current = now
    setSyncing(true)
    await fetchData()
    setSyncing(false)
  }

  // ========== My Prompts CRUD ==========

  const handleSaveFolder = async (name: string, folderId?: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    if (folderId) {
      const { error } = await supabase
        .from("folders")
        .update({ name })
        .eq("id", folderId)
        .eq("user_id", user.id)

      if (error) throw error
    } else {
      const maxPosition = folders.length > 0
        ? Math.max(...folders.map(f => f.position))
        : -1

      const { error } = await supabase
        .from("folders")
        .insert({
          name,
          user_id: user.id,
          position: maxPosition + 1,
        })

      if (error) throw error
    }

    await fetchData()
  }

  const handleDeleteFolder = async () => {
    if (!deletingItem || deletingItem.type !== "folder") return

    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", deletingItem.item.id)

    if (error) throw error
    await fetchData()
  }

  const handleSavePrompt = async (
    title: string,
    text: string,
    folderId: string,
    promptId?: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    if (promptId) {
      // When editing, clear the is_unedited_copy flag
      const { error } = await supabase
        .from("prompts")
        .update({ title, text, is_unedited_copy: false })
        .eq("id", promptId)
        .eq("user_id", user.id)

      if (error) throw error
    } else {
      const folder = folders.find(f => f.id === folderId)

      // Check if folder is at capacity
      if (folder && folder.prompts.length >= MAX_PROMPTS_PER_FOLDER) {
        throw new Error(`Maximum ${MAX_PROMPTS_PER_FOLDER} prompts per folder`)
      }

      const maxPosition = folder && folder.prompts.length > 0
        ? Math.max(...folder.prompts.map(p => p.position))
        : -1

      const { error } = await supabase
        .from("prompts")
        .insert({
          title,
          text,
          folder_id: folderId,
          user_id: user.id,
          position: maxPosition + 1,
        })

      if (error) throw error
    }

    await fetchData()
  }

  const handleDeletePrompt = async () => {
    if (!deletingItem || deletingItem.type !== "prompt") return

    const { error } = await supabase
      .from("prompts")
      .delete()
      .eq("id", deletingItem.item.id)

    if (error) throw error
    await fetchData()
  }

  // ========== Quick Access CRUD ==========

  const handleCreateQuickAccessFolder = async (name: string) => {
    if (!userId) return

    const maxPosition = quickAccessFolders.length > 0
      ? Math.max(...quickAccessFolders.map(f => f.position))
      : -1

    const { error } = await supabase
      .from("quick_access_folders")
      .insert({
        name,
        user_id: userId,
        position: maxPosition + 1,
      })

    if (error) throw error
    await fetchData()
  }

  const handleDeleteQuickAccessFolder = async (folderId: string) => {
    const { error } = await supabase
      .from("quick_access_folders")
      .delete()
      .eq("id", folderId)

    if (error) throw error
    await fetchData()
  }

  const handleReorderQuickAccessFolders = async (folderIds: string[]) => {
    // Optimistic update
    const reorderedFolders = folderIds.map(id =>
      quickAccessFolders.find(f => f.id === id)!
    ).filter(Boolean).map((f, i) => ({ ...f, position: i }))
    setQuickAccessFolders(reorderedFolders)

    // Update database
    for (let i = 0; i < folderIds.length; i++) {
      const { error } = await supabase
        .from("quick_access_folders")
        .update({ position: i })
        .eq("id", folderIds[i])

      if (error) {
        console.error("Error reordering folders:", error)
        await fetchData() // Refresh on error
        return
      }
    }
  }

  const handleAddToQuickAccess = async (folderId: string, data: any) => {
    if (!userId) return

    const folder = quickAccessFolders.find(f => f.id === folderId)
    const maxPosition = folder && folder.items.length > 0
      ? Math.max(...folder.items.map(i => i.position))
      : -1

    if (data.type === "owned_prompt") {
      const { error } = await supabase
        .from("quick_access_items")
        .insert({
          user_id: userId,
          quick_access_folder_id: folderId,
          owned_prompt_id: data.promptId,
          position: maxPosition + 1,
        })

      if (error) throw error
    } else if (data.type === "subscribed_prompt") {
      const { error } = await supabase
        .from("quick_access_items")
        .insert({
          user_id: userId,
          quick_access_folder_id: folderId,
          subscribed_prompt_id: data.promptId,
          subscription_id: data.subscriptionId,
          position: maxPosition + 1,
        })

      if (error) throw error
    } else if (data.type === "owned_folder") {
      // Drag entire owned folder - add all prompts to Quick Access (batch insert)
      const prompts = data.prompts || []
      if (prompts.length > 0) {
        const items = prompts.map((prompt: any, i: number) => ({
          user_id: userId,
          quick_access_folder_id: folderId,
          owned_prompt_id: prompt.id,
          position: maxPosition + 1 + i,
        }))

        const { error } = await supabase
          .from("quick_access_items")
          .insert(items)

        if (error) {
          console.error("Error adding prompts to quick access:", error)
          throw error
        }
      }
    } else if (data.type === "subscribed_folder") {
      // Drag entire subscribed folder - add all prompts to Quick Access (batch insert)
      const prompts = data.prompts || []
      if (prompts.length > 0) {
        const items = prompts.map((prompt: any, i: number) => ({
          user_id: userId,
          quick_access_folder_id: folderId,
          subscribed_prompt_id: prompt.id,
          subscription_id: data.subscriptionId,
          position: maxPosition + 1 + i,
        }))

        const { error } = await supabase
          .from("quick_access_items")
          .insert(items)

        if (error) {
          console.error("Error adding subscribed prompts to quick access:", error)
          throw error
        }
      }
    }

    await fetchData()
  }

  const handleRemoveFromQuickAccess = async (folderId: string, itemId: string) => {
    const { error } = await supabase
      .from("quick_access_items")
      .delete()
      .eq("id", itemId)

    if (error) throw error
    await fetchData()
  }

  const handleDropFolderToQuickAccess = async (data: any) => {
    if (!userId) return

    const folderName = data.folderName || data.folder_name || "New Folder"
    const prompts = data.prompts || []

    // Create new Quick Access folder
    const maxPosition = quickAccessFolders.length > 0
      ? Math.max(...quickAccessFolders.map(f => f.position))
      : -1

    const { data: newFolder, error: folderError } = await supabase
      .from("quick_access_folders")
      .insert({
        name: folderName,
        user_id: userId,
        position: maxPosition + 1,
      })
      .select()
      .single()

    if (folderError) {
      console.error("Error creating quick access folder:", folderError)
      return
    }

    // Add all prompts to the new folder (batch insert for atomicity)
    if (prompts.length > 0) {
      if (data.type === "owned_folder") {
        const items = prompts.map((prompt: any, i: number) => ({
          user_id: userId,
          quick_access_folder_id: newFolder.id,
          owned_prompt_id: prompt.id,
          position: i,
        }))

        const { error } = await supabase
          .from("quick_access_items")
          .insert(items)

        if (error) {
          console.error("Error adding prompts to quick access:", error)
          throw error
        }
      } else if (data.type === "subscribed_folder") {
        const items = prompts.map((prompt: any, i: number) => ({
          user_id: userId,
          quick_access_folder_id: newFolder.id,
          subscribed_prompt_id: prompt.id,
          subscription_id: data.subscriptionId,
          position: i,
        }))

        const { error } = await supabase
          .from("quick_access_items")
          .insert(items)

        if (error) {
          console.error("Error adding subscribed prompts to quick access:", error)
          throw error
        }
      }
    }

    await fetchData()
  }

  // ========== Subscriptions ==========

  const handleUnsubscribe = async (subscriptionId: string) => {
    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", subscriptionId)

    if (error) throw error
    await fetchData()
  }

  const handleSubscribe = async (shareCode: string): Promise<{ success: boolean; message: string }> => {
    const { data, error } = await supabase.rpc("subscribe_to_folder", {
      p_share_code: shareCode,
    })

    if (error) {
      return { success: false, message: error.message }
    }

    if (data && data.length > 0) {
      const result = data[0]
      if (result.success) {
        await fetchData()
      }
      return { success: result.success, message: result.message }
    }

    return { success: false, message: "Unknown error" }
  }

  // ========== Copy Subscribed Prompt ==========

  const openCopyPromptDialog = (prompt: SubscribedPrompt, sourceLabel: string) => {
    setPromptToCopy({ prompt, sourceLabel })
    setSelectedCopyFolder(folders.length > 0 ? folders[0].id : "")
    setCopyDialogOpen(true)
  }

  const handleCopyPromptToMyPrompts = async () => {
    if (!promptToCopy || !selectedCopyFolder || !userId) return

    const folder = folders.find(f => f.id === selectedCopyFolder)
    if (!folder) return

    // Check if folder is at capacity
    if (folder.prompts.length >= MAX_PROMPTS_PER_FOLDER) {
      alert(`Maximum ${MAX_PROMPTS_PER_FOLDER} prompts per folder`)
      return
    }

    const maxPosition = folder.prompts.length > 0
      ? Math.max(...folder.prompts.map(p => p.position))
      : -1

    // Create the copy with is_unedited_copy = true
    const { error } = await supabase
      .from("prompts")
      .insert({
        title: promptToCopy.prompt.title,
        text: promptToCopy.prompt.text,
        folder_id: selectedCopyFolder,
        user_id: userId,
        position: maxPosition + 1,
        is_unedited_copy: true,
      })

    if (error) {
      console.error("Error copying prompt:", error)
      alert("Failed to copy prompt")
      return
    }

    setCopyDialogOpen(false)
    setPromptToCopy(null)
    await fetchData()
  }

  // ========== Profile Handlers ==========

  const openProfileDialog = () => {
    setEditingFirstName(userFirstName || "")
    setProfileDialogOpen(true)
  }

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { first_name: editingFirstName.trim() }
      })

      if (error) throw error

      setUserFirstName(editingFirstName.trim())
      setProfileDialogOpen(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Failed to update profile")
    }
  }

  // ========== Import/Export Handlers ==========

  const handleExport = () => {
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      folders: folders.map(folder => ({
        name: folder.name,
        prompts: folder.prompts.map(prompt => ({
          title: prompt.title,
          text: prompt.text
        }))
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `rcp-prompts-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = async (data: any) => {
    if (!userId) return

    try {
      // Validate structure
      if (!data.folders || !Array.isArray(data.folders)) {
        alert("Invalid file format. Expected 'folders' array.")
        return
      }

      let importedFolders = 0
      let importedPrompts = 0

      for (const folder of data.folders) {
        if (!folder.name || !Array.isArray(folder.prompts)) continue

        // Create folder
        const { data: newFolder, error: folderError } = await supabase
          .from("folders")
          .insert({
            name: folder.name,
            user_id: userId,
            position: folders.length + importedFolders
          })
          .select()
          .single()

        if (folderError) {
          console.error("Error creating folder:", folderError)
          continue
        }

        importedFolders++

        // Create prompts for this folder (max 10 per folder)
        const promptsToImport = folder.prompts.slice(0, MAX_PROMPTS_PER_FOLDER)
        for (let i = 0; i < promptsToImport.length; i++) {
          const prompt = promptsToImport[i]
          if (!prompt.title || !prompt.text) continue

          const { error: promptError } = await supabase
            .from("prompts")
            .insert({
              title: prompt.title,
              text: prompt.text,
              folder_id: newFolder.id,
              user_id: userId,
              position: i
            })

          if (!promptError) {
            importedPrompts++
          }
        }
      }

      await fetchData()
      alert(`Import complete!\n\nImported ${importedFolders} folders and ${importedPrompts} prompts.`)
    } catch (error) {
      console.error("Import error:", error)
      alert("Failed to import prompts. Please check the file format.")
    }
  }

  // ========== Dialog Handlers ==========

  const openCreateFolder = () => {
    setEditingFolder(null)
    setFolderDialogOpen(true)
  }

  const openEditFolder = (folder: Folder) => {
    setEditingFolder(folder)
    setFolderDialogOpen(true)
  }

  const openDeleteFolder = (folder: Folder) => {
    setDeletingItem({ type: "folder", item: folder })
    setDeleteDialogOpen(true)
  }

  const openShareFolder = (folder: Folder) => {
    setSharingFolder(folder)
    setShareDialogOpen(true)
  }

  const openAddPrompt = (folderId: string) => {
    setEditingPrompt(null)
    setCurrentFolderId(folderId)
    setPromptDialogOpen(true)
  }

  const openEditPrompt = (prompt: Prompt, folderId: string) => {
    setEditingPrompt(prompt)
    setCurrentFolderId(folderId)
    setPromptDialogOpen(true)
  }

  const openDeletePrompt = (prompt: Prompt, folderId: string) => {
    setDeletingItem({ type: "prompt", item: prompt, folderId })
    setDeleteDialogOpen(true)
  }

  const openCreateQuickAccessFolder = () => {
    setQuickAccessFolderDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        userEmail={userEmail}
        userFirstName={userFirstName}
        onExport={handleExport}
        onImport={handleImport}
        onEditProfile={openProfileDialog}
      />

      <main className="flex-1 container mx-auto px-4 py-6">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          className="h-full"
        >
          {/* Page Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                RCP Dashboard
              </h1>
              <p className="text-xs text-foreground-secondary mt-0.5">
                Manage prompts and organize your right-click menu
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              Sync
            </Button>
          </div>

          {/* Three-Panel Layout */}
          <div className="grid grid-cols-3 gap-4 h-[calc(100vh-180px)]">
            {/* Panel 1: My Prompts */}
            <div className="bg-background-secondary rounded-xl border border-border p-3 overflow-hidden">
              <MyPromptsPanel
                folders={folders}
                onCreateFolder={openCreateFolder}
                onEditFolder={openEditFolder}
                onDeleteFolder={openDeleteFolder}
                onShareFolder={openShareFolder}
                onAddPrompt={openAddPrompt}
                onEditPrompt={openEditPrompt}
                onDeletePrompt={openDeletePrompt}
              />
            </div>

            {/* Panel 2: My Subscriptions */}
            <div className="bg-background-secondary rounded-xl border border-border p-3 overflow-hidden">
              <SubscriptionsPanel
                subscriptions={subscriptions}
                onUnsubscribe={handleUnsubscribe}
                onSubscribe={handleSubscribe}
                onCopyPrompt={openCopyPromptDialog}
              />
            </div>

            {/* Panel 3: Quick Access Menu */}
            <div className="bg-background-secondary rounded-xl border border-border p-3 overflow-hidden">
              <QuickAccessPanel
                folders={quickAccessFolders}
                onCreateFolder={openCreateQuickAccessFolder}
                onDeleteFolder={handleDeleteQuickAccessFolder}
                onRemoveItem={handleRemoveFromQuickAccess}
                onDrop={handleAddToQuickAccess}
                onDropFolder={handleDropFolderToQuickAccess}
                onReorderFolders={handleReorderQuickAccessFolders}
              />
            </div>
          </div>
        </motion.div>
      </main>

      {/* Dialogs */}
      <FolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        folder={editingFolder}
        onSave={handleSaveFolder}
      />

      <FolderDialog
        open={quickAccessFolderDialogOpen}
        onOpenChange={setQuickAccessFolderDialogOpen}
        folder={null}
        onSave={(name) => handleCreateQuickAccessFolder(name)}
        title="Create Quick Access Folder"
        description="This folder will appear in your right-click menu"
      />

      <PromptDialog
        open={promptDialogOpen}
        onOpenChange={setPromptDialogOpen}
        prompt={editingPrompt}
        folderId={currentFolderId}
        onSave={handleSavePrompt}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={
          deletingItem?.type === "folder" ? "Delete Folder" :
          deletingItem?.type === "quick_access_folder" ? "Delete Quick Access Folder" :
          "Delete Prompt"
        }
        description={
          deletingItem?.type === "folder"
            ? "This will permanently delete the folder and all prompts inside it."
            : deletingItem?.type === "quick_access_folder"
            ? "This will remove the folder from your quick access menu."
            : "This will permanently delete this prompt."
        }
        itemName={deletingItem?.item?.name || deletingItem?.item?.title || ""}
        onConfirm={
          deletingItem?.type === "folder" ? handleDeleteFolder :
          deletingItem?.type === "quick_access_folder" ? () => handleDeleteQuickAccessFolder(deletingItem.item.id) :
          handleDeletePrompt
        }
      />

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        folder={sharingFolder}
        onRefresh={fetchData}
      />

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your display name. This will be shown in your dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={editingFirstName}
                onChange={(e) => setEditingFirstName(e.target.value)}
                placeholder="Enter your first name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveProfile()
                  if (e.key === "Escape") setProfileDialogOpen(false)
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Prompt Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Copy to My Prompts</DialogTitle>
            <DialogDescription>
              Create an editable copy of &quot;{promptToCopy?.prompt.title}&quot; in your prompts.
              {promptToCopy?.sourceLabel && (
                <span className="block mt-1 text-2xs text-foreground-subtle">
                  From: {promptToCopy.sourceLabel}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="copyFolder">Destination Folder</Label>
              {folders.length === 0 ? (
                <p className="text-sm text-foreground-muted">
                  You need to create a folder first.
                </p>
              ) : (
                <select
                  id="copyFolder"
                  value={selectedCopyFolder}
                  onChange={(e) => setSelectedCopyFolder(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name} ({folder.prompts.length}/{MAX_PROMPTS_PER_FOLDER})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCopyPromptToMyPrompts}
              disabled={!selectedCopyFolder || folders.length === 0}
            >
              Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
