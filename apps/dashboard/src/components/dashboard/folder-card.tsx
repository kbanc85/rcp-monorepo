"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  MoreHorizontal,
  Plus,
  Share2,
  Trash2,
  Edit3,
  Copy,
  Check,
  GripVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { accordionVariants, itemVariants } from "@rcp/utils"
import { cn } from "@rcp/utils"

export interface Prompt {
  id: string
  title: string
  text: string
  position: number
}

export interface Folder {
  id: string
  name: string
  position: number
  prompts: Prompt[]
  isShared?: boolean
  shareCode?: string
}

interface FolderCardProps {
  folder: Folder
  onEdit: (folder: Folder) => void
  onDelete: (folder: Folder) => void
  onShare: (folder: Folder) => void
  onAddPrompt: (folderId: string) => void
  onEditPrompt: (prompt: Prompt, folderId: string) => void
  onDeletePrompt: (prompt: Prompt, folderId: string) => void
}

export function FolderCard({
  folder,
  onEdit,
  onDelete,
  onShare,
  onAddPrompt,
  onEditPrompt,
  onDeletePrompt,
}: FolderCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyPrompt = async (prompt: Prompt) => {
    await navigator.clipboard.writeText(prompt.text)
    setCopiedId(prompt.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <motion.div
      variants={itemVariants}
      className="folder-card"
    >
      {/* Folder Header */}
      <div
        className="folder-header group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GripVertical className="w-4 h-4 text-foreground-subtle opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />

          <motion.div
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-foreground-muted" />
          </motion.div>

          <span className="font-medium text-foreground truncate">
            {folder.name}
          </span>

          <span className="text-xs text-foreground-muted">
            ({folder.prompts.length})
          </span>

          {folder.isShared && (
            <span className="px-1.5 py-0.5 text-2xs bg-accent/10 text-accent rounded">
              Shared
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onShare(folder)
                }}
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share folder</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddPrompt(folder.id)
                }}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add prompt</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(folder)
                }}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit folder</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="xs"
                className="text-error hover:text-error hover:bg-error/10"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(folder)
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete folder</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Prompts List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={accordionVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="overflow-hidden"
          >
            <div className="pb-2">
              {folder.prompts.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-foreground-muted">
                  No prompts yet.{" "}
                  <button
                    onClick={() => onAddPrompt(folder.id)}
                    className="text-accent hover:underline"
                  >
                    Add one
                  </button>
                </div>
              ) : (
                folder.prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="prompt-item group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <GripVertical className="w-3.5 h-3.5 text-foreground-subtle opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0" />
                        <span className="text-sm text-foreground truncate">
                          {prompt.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => handleCopyPrompt(prompt)}
                            >
                              {copiedId === prompt.id ? (
                                <Check className="w-3 h-3 text-success" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {copiedId === prompt.id ? "Copied!" : "Copy prompt"}
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => onEditPrompt(prompt, folder.id)}
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit prompt</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="text-error hover:text-error hover:bg-error/10"
                              onClick={() => onDeletePrompt(prompt, folder.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete prompt</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
