"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Share2,
  GripVertical,
  FolderPlus,
  FolderOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@rcp/utils"

export interface Prompt {
  id: string
  title: string
  text: string
  position: number
  is_unedited_copy?: boolean
}

export interface Folder {
  id: string
  name: string
  position: number
  prompts: Prompt[]
  isShared?: boolean
  shareCode?: string
}

interface MyPromptsPanelProps {
  folders: Folder[]
  onCreateFolder: () => void
  onEditFolder: (folder: Folder) => void
  onDeleteFolder: (folder: Folder) => void
  onShareFolder: (folder: Folder) => void
  onAddPrompt: (folderId: string) => void
  onEditPrompt: (prompt: Prompt, folderId: string) => void
  onDeletePrompt: (prompt: Prompt, folderId: string) => void
}

export function MyPromptsPanel({
  folders,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onShareFolder,
  onAddPrompt,
  onEditPrompt,
  onDeletePrompt,
}: MyPromptsPanelProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [draggingFolder, setDraggingFolder] = useState<string | null>(null)

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

  const handleFolderDragStart = (e: React.DragEvent, folder: Folder) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "owned_folder",
        folderId: folder.id,
        folderName: folder.name,
        prompts: folder.prompts.map(p => ({
          id: p.id,
          title: p.title,
          text: p.text,
          position: p.position,
        })),
      })
    )
    e.dataTransfer.effectAllowed = "copy"
    setDraggingFolder(folder.id)
  }

  const handleDragEnd = () => {
    setDraggingFolder(null)
  }

  const handlePromptDragStart = (e: React.DragEvent, prompt: Prompt, folderId: string) => {
    e.stopPropagation()
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "owned_prompt",
        promptId: prompt.id,
        promptTitle: prompt.title,
        promptText: prompt.text,
        folderId,
      })
    )
    e.dataTransfer.effectAllowed = "copy"
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-semibold text-foreground">My Prompts</h2>
        <Button variant="ghost" size="xs" onClick={onCreateFolder}>
          <FolderPlus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Folders List */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {folders.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-xs text-foreground-muted mb-3">
              No folders yet
            </p>
            <Button size="xs" onClick={onCreateFolder}>
              <Plus className="w-3 h-3 mr-1" />
              New Folder
            </Button>
          </div>
        ) : (
          folders.map((folder) => (
            <div
              key={folder.id}
              draggable
              onDragStart={(e) => handleFolderDragStart(e, folder)}
              onDragEnd={handleDragEnd}
              className={cn(
                "rounded-lg bg-background-secondary border overflow-hidden transition-all",
                draggingFolder === folder.id
                  ? "border-accent opacity-50 scale-[0.98]"
                  : "border-border cursor-grab active:cursor-grabbing"
              )}
            >
              {/* Folder Header */}
              <div
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-background-tertiary group"
                onClick={() => toggleFolder(folder.id)}
              >
                <GripVertical className="w-3 h-3 text-foreground-subtle flex-shrink-0" />

                <motion.div
                  animate={{ rotate: expandedFolders.has(folder.id) ? 90 : 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <ChevronRight className="w-3.5 h-3.5 text-foreground-muted" />
                </motion.div>

                <span className="flex-1 text-xs font-medium text-foreground truncate">
                  {folder.name}
                </span>

                <span className="text-2xs text-foreground-muted">
                  {folder.prompts.length}
                </span>

                {folder.isShared && (
                  <Share2 className="w-3 h-3 text-accent" />
                )}

                <div
                  className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="p-1 rounded hover:bg-background-hover"
                    onClick={() => onAddPrompt(folder.id)}
                  >
                    <Plus className="w-3 h-3 text-foreground-muted hover:text-foreground" />
                  </button>
                  <button
                    className="p-1 rounded hover:bg-background-hover"
                    onClick={() => onShareFolder(folder)}
                  >
                    <Share2 className="w-3 h-3 text-foreground-muted hover:text-foreground" />
                  </button>
                  <button
                    className="p-1 rounded hover:bg-background-hover"
                    onClick={() => onEditFolder(folder)}
                  >
                    <Pencil className="w-3 h-3 text-foreground-muted hover:text-foreground" />
                  </button>
                  <button
                    className="p-1 rounded hover:bg-background-hover"
                    onClick={() => onDeleteFolder(folder)}
                  >
                    <Trash2 className="w-3 h-3 text-foreground-muted hover:text-error" />
                  </button>
                </div>
              </div>

              {/* Prompts */}
              <AnimatePresence>
                {expandedFolders.has(folder.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 pb-2 space-y-0.5">
                      {folder.prompts.length === 0 ? (
                        <p className="text-2xs text-foreground-muted py-2 px-2">
                          No prompts yet
                        </p>
                      ) : (
                        folder.prompts.map((prompt) => (
                          <div
                            key={prompt.id}
                            draggable
                            onDragStart={(e) =>
                              handlePromptDragStart(e, prompt, folder.id)
                            }
                            className={cn(
                              "flex items-center gap-2 px-2 py-1.5 rounded",
                              "bg-background-tertiary/50 hover:bg-background-tertiary",
                              "cursor-grab active:cursor-grabbing group",
                              prompt.is_unedited_copy && "border-l-2 border-l-orange-500 bg-orange-500/5"
                            )}
                          >
                            <GripVertical className="w-3 h-3 text-foreground-subtle" />
                            <span className={cn(
                              "flex-1 text-xs truncate",
                              prompt.is_unedited_copy ? "text-orange-400" : "text-foreground-secondary"
                            )}>
                              {prompt.title}
                            </span>
                            <div
                              className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="p-0.5 rounded hover:bg-background-hover"
                                onClick={() => onEditPrompt(prompt, folder.id)}
                              >
                                <Pencil className="w-2.5 h-2.5 text-foreground-muted hover:text-foreground" />
                              </button>
                              <button
                                className="p-0.5 rounded hover:bg-background-hover"
                                onClick={() => onDeletePrompt(prompt, folder.id)}
                              >
                                <Trash2 className="w-2.5 h-2.5 text-foreground-muted hover:text-error" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
