"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronRight,
  Copy,
  GripVertical,
  Link,
  Loader2,
  Lock,
  Plus,
  UserCircle,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface SubscribedPrompt {
  id: string
  title: string
  text: string
  position: number
}

export interface Subscription {
  id: string
  folderId: string
  folderName: string
  sourceLabel: string
  ownerEmail: string
  subscribedAt: string
  prompts: SubscribedPrompt[]
}

interface SubscriptionsPanelProps {
  subscriptions: Subscription[]
  onUnsubscribe: (subscriptionId: string) => void
  onSubscribe: (shareCode: string) => Promise<{ success: boolean; message: string }>
  onCopyPrompt?: (prompt: SubscribedPrompt, sourceLabel: string) => void
  onDragStart?: (
    type: "subscribed_prompt",
    data: { prompt: SubscribedPrompt; subscriptionId: string; sourceLabel: string }
  ) => void
}

export function SubscriptionsPanel({
  subscriptions,
  onUnsubscribe,
  onSubscribe,
  onCopyPrompt,
  onDragStart,
}: SubscriptionsPanelProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [draggingFolder, setDraggingFolder] = useState<string | null>(null)
  const [shareLink, setShareLink] = useState("")
  const [subscribing, setSubscribing] = useState(false)
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
  const [subscribeSuccess, setSubscribeSuccess] = useState<string | null>(null)

  // Extract share code from URL or use as-is if it's just the code
  const extractShareCode = (input: string): string => {
    const trimmed = input.trim()
    // Check if it's a full URL
    const urlMatch = trimmed.match(/\/s\/([A-Za-z0-9]+)\/?$/)
    if (urlMatch) {
      return urlMatch[1]
    }
    // Otherwise assume it's just the code
    return trimmed
  }

  const handleSubscribe = async () => {
    if (!shareLink.trim()) return

    setSubscribing(true)
    setSubscribeError(null)
    setSubscribeSuccess(null)

    const shareCode = extractShareCode(shareLink)

    try {
      const result = await onSubscribe(shareCode)
      if (result.success) {
        setSubscribeSuccess(result.message)
        setShareLink("")
        // Clear success message after 3 seconds
        setTimeout(() => setSubscribeSuccess(null), 3000)
      } else {
        setSubscribeError(result.message)
      }
    } catch (err) {
      setSubscribeError(err instanceof Error ? err.message : "Failed to subscribe")
    } finally {
      setSubscribing(false)
    }
  }

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

  const handleFolderDragStart = (e: React.DragEvent, subscription: Subscription) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "subscribed_folder",
        subscriptionId: subscription.id,
        folderName: subscription.folderName,
        sourceLabel: subscription.sourceLabel,
        prompts: subscription.prompts.map(p => ({
          id: p.id,
          title: p.title,
          text: p.text,
          position: p.position,
        })),
      })
    )
    e.dataTransfer.effectAllowed = "copy"
    setDraggingFolder(subscription.id)
  }

  const handleDragEnd = () => {
    setDraggingFolder(null)
  }

  const handlePromptDragStart = (
    e: React.DragEvent,
    prompt: SubscribedPrompt,
    subscription: Subscription
  ) => {
    e.stopPropagation()
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "subscribed_prompt",
        promptId: prompt.id,
        subscriptionId: subscription.id,
        sourceLabel: subscription.sourceLabel,
        title: prompt.title,
      })
    )
    e.dataTransfer.effectAllowed = "copy"
    onDragStart?.("subscribed_prompt", {
      prompt,
      subscriptionId: subscription.id,
      sourceLabel: subscription.sourceLabel,
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-sm font-semibold text-foreground">My Subscriptions</h2>
        <Lock className="w-3.5 h-3.5 text-foreground-muted" />
      </div>

      {/* Subscribe Input */}
      <div className="mb-3 px-1">
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
            <Input
              type="text"
              placeholder="Paste share link..."
              value={shareLink}
              onChange={(e) => {
                setShareLink(e.target.value)
                setSubscribeError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubscribe()
              }}
              className="pl-8 h-8 text-xs"
              disabled={subscribing}
            />
          </div>
          <Button
            size="sm"
            onClick={handleSubscribe}
            disabled={!shareLink.trim() || subscribing}
            className="h-8 px-3"
          >
            {subscribing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
        {subscribeError && (
          <p className="text-2xs text-error mt-1 px-0.5">{subscribeError}</p>
        )}
        {subscribeSuccess && (
          <p className="text-2xs text-success mt-1 px-0.5">{subscribeSuccess}</p>
        )}
      </div>

      {/* Subscriptions List */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {subscriptions.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Lock className="w-8 h-8 text-foreground-muted mx-auto mb-2" />
            <p className="text-xs text-foreground-muted">
              No subscriptions yet
            </p>
            <p className="text-2xs text-foreground-subtle mt-1">
              Subscribe to shared folders to see them here
            </p>
          </div>
        ) : (
          subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              draggable
              onDragStart={(e) => handleFolderDragStart(e, subscription)}
              onDragEnd={handleDragEnd}
              className={cn(
                "rounded-lg bg-background-secondary border overflow-hidden transition-all",
                draggingFolder === subscription.id
                  ? "border-accent opacity-50 scale-[0.98]"
                  : "border-border cursor-grab active:cursor-grabbing"
              )}
            >
              {/* Folder Header */}
              <div
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-background-tertiary group"
                onClick={() => toggleFolder(subscription.id)}
              >
                <GripVertical className="w-3 h-3 text-foreground-subtle flex-shrink-0" />

                <motion.div
                  animate={{ rotate: expandedFolders.has(subscription.id) ? 90 : 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <ChevronRight className="w-3.5 h-3.5 text-foreground-muted" />
                </motion.div>

                <Lock className="w-3 h-3 text-foreground-subtle" />

                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-foreground truncate block">
                    {subscription.folderName}
                  </span>
                  <span className="text-2xs text-accent truncate block">
                    {subscription.sourceLabel}
                  </span>
                </div>

                <span className="text-2xs text-foreground-muted">
                  {subscription.prompts.length}
                </span>

                <button
                  className="p-1 rounded hover:bg-background-hover opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    onUnsubscribe(subscription.id)
                  }}
                  title="Unsubscribe"
                >
                  <X className="w-3 h-3 text-foreground-muted hover:text-error" />
                </button>
              </div>

              {/* Owner info */}
              <div className="px-2 py-1 bg-background-tertiary/30 border-t border-border/50">
                <div className="flex items-center gap-1 text-2xs text-foreground-subtle">
                  <UserCircle className="w-3 h-3" />
                  <span className="truncate">{subscription.ownerEmail}</span>
                </div>
              </div>

              {/* Prompts */}
              <AnimatePresence>
                {expandedFolders.has(subscription.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 pb-2 space-y-0.5">
                      {subscription.prompts.length === 0 ? (
                        <p className="text-2xs text-foreground-muted py-2 px-2">
                          No prompts in this folder
                        </p>
                      ) : (
                        subscription.prompts.map((prompt) => (
                          <div
                            key={prompt.id}
                            draggable
                            onDragStart={(e) =>
                              handlePromptDragStart(e, prompt, subscription)
                            }
                            className={cn(
                              "flex items-center gap-2 px-2 py-1.5 rounded",
                              "bg-background-tertiary/50 hover:bg-background-tertiary",
                              "cursor-grab active:cursor-grabbing group"
                            )}
                          >
                            <GripVertical className="w-3 h-3 text-foreground-subtle" />
                            <span className="flex-1 text-xs text-foreground-secondary truncate">
                              {prompt.title}
                            </span>
                            <button
                              className="p-0.5 rounded hover:bg-background-hover opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation()
                                onCopyPrompt?.(prompt, subscription.sourceLabel)
                              }}
                              title="Copy to My Prompts"
                            >
                              <Copy className="w-2.5 h-2.5 text-foreground-muted hover:text-accent" />
                            </button>
                            <Lock className="w-2.5 h-2.5 text-foreground-subtle" />
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
