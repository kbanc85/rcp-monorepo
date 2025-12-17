"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
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
import type { Prompt } from "./folder-card"

interface PromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt?: Prompt | null
  folderId: string
  onSave: (title: string, text: string, folderId: string, promptId?: string) => Promise<void>
}

export function PromptDialog({
  open,
  onOpenChange,
  prompt,
  folderId,
  onSave,
}: PromptDialogProps) {
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!prompt

  useEffect(() => {
    if (open) {
      setTitle(prompt?.title || "")
      setText(prompt?.text || "")
      setError(null)
    }
  }, [open, prompt])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError("Prompt title is required")
      return
    }

    if (!text.trim()) {
      setError("Prompt text is required")
      return
    }

    setLoading(true)
    try {
      await onSave(title.trim(), text.trim(), folderId, prompt?.id)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prompt")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Prompt" : "Create Prompt"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the prompt title and text."
              : "Create a new prompt for your right-click menu."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="promptTitle">Title</Label>
              <Input
                id="promptTitle"
                placeholder="e.g., Explain this code"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <p className="text-xs text-foreground-muted">
                This appears in the right-click menu
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promptText">Prompt Text</Label>
              <textarea
                id="promptText"
                className="textarea-premium min-h-[120px]"
                placeholder="Enter your prompt text here. Use {{selection}} to include selected text."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-foreground-muted">
                Use <code className="px-1 py-0.5 bg-background-tertiary rounded text-accent">{"{{selection}}"}</code> to include selected text
              </p>
            </div>

            {error && (
              <p className="text-sm text-error">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? "Saving..." : "Creating..."}
                </>
              ) : (
                isEditing ? "Save Changes" : "Create Prompt"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
