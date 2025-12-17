"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
  FolderPlus,
  MousePointer2,
  Lock,
} from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { cn } from "@rcp/utils"

export interface QuickAccessItem {
  id: string
  promptId: string
  title: string
  text: string
  position: number
  sourceType: "owned" | "subscribed"
  sourceLabel?: string | null
}

export interface QuickAccessFolder {
  id: string
  name: string
  position: number
  items: QuickAccessItem[]
}

interface QuickAccessPanelProps {
  folders: QuickAccessFolder[]
  onCreateFolder: () => void
  onDeleteFolder: (folderId: string) => void
  onRemoveItem: (folderId: string, itemId: string) => void
  onDrop: (folderId: string, data: any) => void
  onDropFolder?: (data: any) => void
  onReorder?: (folderId: string, items: QuickAccessItem[]) => void
  onReorderFolders?: (folderIds: string[]) => void
}

// Sortable Folder Wrapper
interface SortableFolderProps {
  folder: QuickAccessFolder
  children: (props: { dragHandleProps: any }) => React.ReactNode
}

function SortableFolder({ folder, children }: SortableFolderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `folder-${folder.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children({ dragHandleProps: listeners })}
    </div>
  )
}

export function QuickAccessPanel({
  folders,
  onCreateFolder,
  onDeleteFolder,
  onRemoveItem,
  onDrop,
  onDropFolder,
  onReorder,
  onReorderFolders,
}: QuickAccessPanelProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(folders.map((f) => f.id))
  )
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  const [dragOverPanel, setDragOverPanel] = useState(false)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Separate folders by source type
  const ownedFolders = folders.filter(f =>
    f.items.length === 0 || f.items.some(item => item.sourceType === 'owned')
  )
  const subscribedFolders = folders.filter(f =>
    f.items.length > 0 && f.items.every(item => item.sourceType === 'subscribed')
  )

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setDragOverFolder(folderId)
  }

  const handleDragLeave = () => {
    setDragOverFolder(null)
  }

  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolder(null)
    setDragOverPanel(false)

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"))
      onDrop(folderId, data)
    } catch (err) {
      console.error("Invalid drop data:", err)
    }
  }

  const handlePanelDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setDragOverPanel(true)
  }

  const handlePanelDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverPanel(false)
    }
  }

  const handlePanelDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverPanel(false)
    setDragOverFolder(null)

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"))
      if (data.type === "owned_folder" || data.type === "subscribed_folder") {
        onDropFolder?.(data)
      }
    } catch (err) {
      console.error("Invalid drop data:", err)
    }
  }

  // Handle folder reorder for owned section
  const handleOwnedFolderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const activeId = String(active.id).replace('folder-', '')
      const overId = String(over.id).replace('folder-', '')
      const oldIndex = ownedFolders.findIndex(f => f.id === activeId)
      const newIndex = ownedFolders.findIndex(f => f.id === overId)
      const newOrder = arrayMove(ownedFolders, oldIndex, newIndex)
      // Combine with subscribed folders (owned first)
      const allFolderIds = [...newOrder.map(f => f.id), ...subscribedFolders.map(f => f.id)]
      onReorderFolders?.(allFolderIds)
    }
  }

  // Handle folder reorder for subscribed section
  const handleSubscribedFolderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const activeId = String(active.id).replace('folder-', '')
      const overId = String(over.id).replace('folder-', '')
      const oldIndex = subscribedFolders.findIndex(f => f.id === activeId)
      const newIndex = subscribedFolders.findIndex(f => f.id === overId)
      const newOrder = arrayMove(subscribedFolders, oldIndex, newIndex)
      // Combine with owned folders (owned first)
      const allFolderIds = [...ownedFolders.map(f => f.id), ...newOrder.map(f => f.id)]
      onReorderFolders?.(allFolderIds)
    }
  }

  // Render a single folder
  const renderFolder = (folder: QuickAccessFolder, dragHandleProps?: any) => {
    const subscribedItem = folder.items.find(item => item.sourceType === 'subscribed' && item.sourceLabel)
    const sourceLabel = subscribedItem?.sourceLabel

    return (
      <div
        key={folder.id}
        className={cn(
          "rounded-lg bg-background-secondary border overflow-hidden transition-colors",
          dragOverFolder === folder.id
            ? "border-accent bg-accent-muted"
            : "border-border"
        )}
        onDragOver={(e) => handleDragOver(e, folder.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, folder.id)}
      >
        {/* Folder Header */}
        <div
          className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-background-tertiary group"
          onClick={() => toggleFolder(folder.id)}
        >
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              className="cursor-grab hover:text-foreground active:cursor-grabbing p-0.5 rounded hover:bg-background-hover transition-colors -ml-1"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-3.5 h-3.5 text-foreground-muted hover:text-foreground" />
            </div>
          )}
          <motion.div
            animate={{ rotate: expandedFolders.has(folder.id) ? 90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronRight className="w-3.5 h-3.5 text-foreground-muted" />
          </motion.div>

          <span className="flex-1 text-xs font-medium text-foreground truncate">
            {folder.name}
          </span>

          {sourceLabel && (
            <span className="text-2xs px-1.5 py-0.5 rounded bg-accent-muted text-accent truncate max-w-[80px]">
              {sourceLabel}
            </span>
          )}

          <span className="text-2xs text-foreground-muted">
            {folder.items.length}
          </span>

          <button
            className="p-1 rounded hover:bg-background-hover opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteFolder(folder.id)
            }}
          >
            <Trash2 className="w-3 h-3 text-foreground-muted hover:text-error" />
          </button>
        </div>

        {/* Items */}
        <AnimatePresence>
          {expandedFolders.has(folder.id) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className={cn(
                  "px-2 pb-2 space-y-0.5 min-h-[40px]",
                  dragOverFolder === folder.id && "bg-accent-muted/50"
                )}
              >
                {folder.items.length === 0 ? (
                  <p className="text-2xs text-foreground-muted py-2 px-2 text-center border border-dashed border-border rounded">
                    Drag prompts here
                  </p>
                ) : (
                  folder.items.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded",
                        "bg-background-tertiary/50 hover:bg-background-tertiary",
                        "group"
                      )}
                    >
                      <GripVertical className="w-3 h-3 text-foreground-subtle cursor-grab" />
                      <span className="flex-1 text-xs text-foreground-secondary truncate">
                        {item.title}
                      </span>

                      <button
                        className="p-0.5 rounded hover:bg-background-hover opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRemoveItem(folder.id, item.id)}
                      >
                        <Trash2 className="w-2.5 h-2.5 text-foreground-muted hover:text-error" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-full"
      onDragOver={handlePanelDragOver}
      onDragLeave={handlePanelDragLeave}
      onDrop={handlePanelDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Quick Access Menu</h2>
          <p className="text-2xs text-foreground-muted">Right-click menu</p>
        </div>
        <Button variant="ghost" size="xs" onClick={onCreateFolder}>
          <FolderPlus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Drop zone for creating new folder */}
      {dragOverPanel && (
        <div className="mb-2 p-3 rounded-lg border-2 border-dashed border-accent bg-accent/10 text-center">
          <p className="text-xs text-accent font-medium">Drop folder here to add all prompts</p>
        </div>
      )}

      {/* Folders List */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {folders.length === 0 ? (
          <div className="text-center py-8 px-4 border-2 border-dashed border-border rounded-lg">
            <MousePointer2 className="w-8 h-8 text-foreground-muted mx-auto mb-2" />
            <p className="text-xs text-foreground-muted mb-1">
              Create folders and drag prompts here
            </p>
            <p className="text-2xs text-foreground-subtle mb-3">
              This is what appears in your right-click menu
            </p>
            <Button size="xs" onClick={onCreateFolder}>
              <Plus className="w-3 h-3 mr-1" />
              New Folder
            </Button>
          </div>
        ) : (
          <>
            {/* My Prompts Section */}
            {ownedFolders.length > 0 && (
              <div className="mb-3">
                <div className="text-2xs font-semibold text-foreground-muted uppercase tracking-wider px-1 py-1.5 mb-1">
                  My Prompts
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleOwnedFolderDragEnd}
                >
                  <SortableContext
                    items={ownedFolders.map(f => `folder-${f.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1">
                      {ownedFolders.map(folder => (
                        <SortableFolder key={folder.id} folder={folder}>
                          {({ dragHandleProps }: { dragHandleProps: any }) => renderFolder(folder, dragHandleProps)}
                        </SortableFolder>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* Subscribed Section */}
            {subscribedFolders.length > 0 && (
              <div className="mb-3">
                <div className="text-2xs font-semibold text-foreground-muted uppercase tracking-wider px-1 py-1.5 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  Subscribed
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleSubscribedFolderDragEnd}
                >
                  <SortableContext
                    items={subscribedFolders.map(f => `folder-${f.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1">
                      {subscribedFolders.map(folder => (
                        <SortableFolder key={folder.id} folder={folder}>
                          {({ dragHandleProps }: { dragHandleProps: any }) => renderFolder(folder, dragHandleProps)}
                        </SortableFolder>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer hint */}
      <div className="mt-3 px-1">
        <p className="text-2xs text-foreground-subtle text-center">
          Drag folders or prompts from left panels to add to menu
        </p>
      </div>
    </div>
  )
}
