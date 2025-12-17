"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Copy, Check, Link2, Link2Off, ExternalLink, Tag } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Folder {
  id: string
  name: string
}

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folder: Folder | null
  onRefresh: () => Promise<void>
}

function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const array = new Uint8Array(12)
  crypto.getRandomValues(array)
  return Array.from(array, byte => chars[byte % chars.length]).join('')
}

export function ShareDialog({
  open,
  onOpenChange,
  folder,
  onRefresh,
}: ShareDialogProps) {
  const [loading, setLoading] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isShared, setIsShared] = useState(false)
  const [sourceLabel, setSourceLabel] = useState("")
  const [savedSourceLabel, setSavedSourceLabel] = useState("")
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (open && folder) {
      checkShareStatus()
    }
  }, [open, folder])

  const checkShareStatus = async () => {
    if (!folder) return

    setLoading(true)
    try {
      const { data } = await supabase
        .from("shared_folders")
        .select("share_code, is_active, source_label")
        .eq("folder_id", folder.id)
        .single()

      if (data && data.is_active) {
        setIsShared(true)
        setShareLink(`${window.location.origin}/s/${data.share_code}`)
        setSourceLabel(data.source_label || "")
        setSavedSourceLabel(data.source_label || "")
      } else {
        setIsShared(false)
        setShareLink(null)
        setSourceLabel("")
        setSavedSourceLabel("")
      }
    } catch {
      setIsShared(false)
      setShareLink(null)
      setSourceLabel("")
      setSavedSourceLabel("")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateShareLink = async () => {
    if (!folder) return

    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const shareCode = generateShareCode()
      const label = sourceLabel.trim() || "Shared Prompts"

      // Check if share record already exists
      const { data: existing, error: checkError } = await supabase
        .from("shared_folders")
        .select("id")
        .eq("folder_id", folder.id)
        .maybeSingle()

      if (checkError) {
        console.error("Error checking existing share:", checkError)
        throw new Error(`Check failed: ${checkError.message}`)
      }

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from("shared_folders")
          .update({
            is_active: true,
            share_code: shareCode,
            source_label: label,
          })
          .eq("folder_id", folder.id)

        if (updateError) {
          console.error("Error updating share:", updateError)
          throw new Error(`Update failed: ${updateError.message}`)
        }
      } else {
        // Create new
        const { error: insertError } = await supabase
          .from("shared_folders")
          .insert({
            folder_id: folder.id,
            owner_id: user.id,
            share_code: shareCode,
            is_active: true,
            source_label: label,
          })

        if (insertError) {
          console.error("Error inserting share:", insertError)
          throw new Error(`Insert failed: ${insertError.message}`)
        }
      }

      setShareLink(`${window.location.origin}/s/${shareCode}`)
      setIsShared(true)
      setSavedSourceLabel(label)
      await onRefresh()
    } catch (err) {
      console.error("Error creating share link:", err)
      setError(err instanceof Error ? err.message : "Failed to create share link")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSourceLabel = async () => {
    if (!folder) return

    setLoading(true)
    try {
      const label = sourceLabel.trim() || "Shared Prompts"

      const { error } = await supabase
        .from("shared_folders")
        .update({ source_label: label })
        .eq("folder_id", folder.id)

      if (error) throw error

      setSavedSourceLabel(label)
      await onRefresh()
    } catch (error) {
      console.error("Error updating source label:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeShareLink = async () => {
    if (!folder) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from("shared_folders")
        .update({ is_active: false })
        .eq("folder_id", folder.id)

      if (error) throw error

      setShareLink(null)
      setIsShared(false)
      await onRefresh()
    } catch (error) {
      console.error("Error revoking share link:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareLink) return

    await navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasLabelChanged = sourceLabel.trim() !== savedSourceLabel

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-accent" />
            Share Folder
          </DialogTitle>
          <DialogDescription>
            Share &quot;{folder?.name}&quot; with others via a link. Anyone with the link can subscribe to receive updates.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : isShared && shareLink ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Source Label */}
              <div className="p-4 rounded-xl bg-background-secondary border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-3.5 h-3.5 text-accent" />
                  <p className="text-xs text-foreground-muted">Source Label</p>
                </div>
                <p className="text-2xs text-foreground-subtle mb-2">
                  Subscribers will see this label to identify the source
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={sourceLabel}
                    onChange={(e) => setSourceLabel(e.target.value)}
                    placeholder="e.g., AI Adopters Team, Marketing Dept"
                    className="bg-background-tertiary text-sm"
                  />
                  {hasLabelChanged && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleUpdateSourceLabel}
                      disabled={loading}
                    >
                      Save
                    </Button>
                  )}
                </div>
              </div>

              {/* Share Link */}
              <div className="p-4 rounded-xl bg-background-secondary border border-border">
                <p className="text-xs text-foreground-muted mb-2">Share Link</p>
                <div className="flex items-center gap-2">
                  <Input
                    value={shareLink}
                    readOnly
                    className="bg-background-tertiary text-sm font-mono"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={handleCopyLink}
                    className="flex-shrink-0"
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Check className="w-4 h-4 text-success" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Copy className="w-4 h-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  Sharing is active
                </span>
              </div>

              <p className="text-xs text-foreground-muted">
                Others can subscribe to this folder using the link above. They&apos;ll receive your prompts as read-only content that syncs automatically.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-background-secondary mb-4">
                  <Link2Off className="w-6 h-6 text-foreground-muted" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-2">
                  Not shared yet
                </h3>
                <p className="text-xs text-foreground-muted mb-4 max-w-xs mx-auto">
                  Create a share link to let others subscribe to this folder&apos;s prompts.
                </p>
              </div>

              {/* Source Label Input (before sharing) */}
              <div className="p-4 rounded-xl bg-background-secondary border border-border">
                <Label htmlFor="sourceLabel" className="text-xs text-foreground-muted mb-2 block">
                  Source Label (shown to subscribers)
                </Label>
                <Input
                  id="sourceLabel"
                  value={sourceLabel}
                  onChange={(e) => setSourceLabel(e.target.value)}
                  placeholder="e.g., AI Adopters Team, Marketing Dept"
                  className="bg-background-tertiary text-sm"
                />
                <p className="text-2xs text-foreground-subtle mt-2">
                  This helps subscribers identify where the prompts come from
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-error/10 border border-error/20">
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isShared ? (
            <>
              <Button
                variant="destructive"
                onClick={handleRevokeShareLink}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <Link2Off className="w-4 h-4 mr-2" />
                Revoke Link
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.open(shareLink!, '_blank')}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </>
          ) : (
            <Button
              onClick={handleCreateShareLink}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              Create Share Link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
