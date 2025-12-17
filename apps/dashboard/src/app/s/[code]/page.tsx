"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Loader2,
  FolderOpen,
  User,
  Plus,
  Check,
  AlertCircle,
  LogIn,
  FileText,
  ChevronRight,
  Tag,
  Lock,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { pageVariants, itemVariants } from "@rcp/utils"

interface PromptPreview {
  id: string
  title: string
  text: string
}

interface FolderPreview {
  folder_id: string
  folder_name: string
  owner_email: string
  source_label: string
  prompt_count: number
  prompts: PromptPreview[]
  created_at: string
}

type SubscribeState = "idle" | "loading" | "success" | "already_subscribed" | "own_folder" | "error"

export default function SharePage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<FolderPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [subscribeState, setSubscribeState] = useState<SubscribeState>("idle")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchPreview()
    checkAuth()
  }, [code])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setIsLoggedIn(!!user)
  }

  const fetchPreview = async () => {
    try {
      // First try the enhanced preview that includes prompts
      const { data: folderData, error: folderError } = await supabase
        .from("shared_folders")
        .select(`
          folder_id,
          source_label,
          folders!inner (
            id,
            name,
            user_id,
            prompts (
              id,
              title,
              text,
              position
            )
          )
        `)
        .eq("share_code", code)
        .eq("is_active", true)
        .single()

      if (folderError) throw folderError

      if (folderData) {
        // Get owner email
        const { data: userData } = await supabase
          .from("auth.users")
          .select("email")
          .eq("id", (folderData.folders as any).user_id)
          .single()

        const folder = folderData.folders as any
        const prompts = (folder.prompts || [])
          .sort((a: any, b: any) => a.position - b.position)
          .map((p: any) => ({
            id: p.id,
            title: p.title,
            text: p.text,
          }))

        setPreview({
          folder_id: folder.id,
          folder_name: folder.name,
          owner_email: userData?.email || "Unknown",
          source_label: folderData.source_label || "Shared Prompts",
          prompt_count: prompts.length,
          prompts,
          created_at: new Date().toISOString(),
        })
      } else {
        setError("This share link is invalid or has expired.")
      }
    } catch (err) {
      console.error("Error fetching preview:", err)
      // Fallback to RPC if direct query fails
      try {
        const { data, error: rpcError } = await supabase
          .rpc("get_shared_folder_preview", { p_share_code: code })

        if (rpcError) throw rpcError

        if (data && data.length > 0) {
          setPreview({
            ...data[0],
            source_label: data[0].source_label || "Shared Prompts",
            prompts: [],
          })
        } else {
          setError("This share link is invalid or has expired.")
        }
      } catch {
        setError("Failed to load folder preview.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/s/${code}`)
      return
    }

    setSubscribeState("loading")

    try {
      const { data, error } = await supabase
        .rpc("subscribe_to_folder", { p_share_code: code })

      if (error) throw error

      if (data && data.length > 0) {
        const result = data[0]
        if (result.success) {
          setSubscribeState("success")
        } else if (result.message.includes("Already subscribed")) {
          setSubscribeState("already_subscribed")
        } else if (result.message.includes("own folder")) {
          setSubscribeState("own_folder")
        } else {
          setError(result.message)
          setSubscribeState("error")
        }
      }
    } catch (err) {
      console.error("Error subscribing:", err)
      setError("Failed to subscribe to folder.")
      setSubscribeState("error")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  if (error && !preview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-error/10 mb-4">
            <AlertCircle className="w-8 h-8 text-error" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Link Not Found
          </h1>
          <p className="text-sm text-foreground-secondary mb-6 max-w-sm">
            {error}
          </p>
          <Button onClick={() => router.push("/login")}>
            Sign In
          </Button>
        </motion.div>
      </div>
    )
  }

  const isSubscribed = subscribeState === "success" || subscribeState === "already_subscribed"

  return (
    <div className="min-h-screen bg-background p-4 gradient-bg">
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        className="max-w-2xl mx-auto pt-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 mb-4">
            <span className="text-3xl font-bold text-accent">R</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Shared Prompts
          </h1>
          <p className="text-sm text-foreground-secondary">
            Subscribe to get these prompts in your extension
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-background-secondary border border-border rounded-2xl overflow-hidden shadow-elevated">
          {/* Folder Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-accent/10 flex-shrink-0">
                  <FolderOpen className="w-7 h-7 text-accent" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold text-foreground truncate">
                    {preview?.folder_name}
                  </h2>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm text-foreground-secondary">
                      <User className="w-4 h-4" />
                      <span className="truncate">{preview?.owner_email}</span>
                    </div>
                    {preview?.source_label && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Tag className="w-4 h-4 text-accent" />
                        <span className="text-accent font-medium">{preview.source_label}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-foreground-muted mt-2">
                    <FileText className="w-4 h-4" />
                    <span>{preview?.prompt_count || 0} prompts</span>
                    <span className="mx-1">•</span>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Read-only access</span>
                  </div>
                </div>
              </div>

              {/* Big Subscribe Button */}
              {!isSubscribed && subscribeState !== "own_folder" && (
                <motion.button
                  onClick={handleSubscribe}
                  disabled={subscribeState === "loading"}
                  className="flex-shrink-0 w-14 h-14 rounded-xl bg-accent hover:bg-accent-hover text-background flex items-center justify-center transition-colors shadow-lg hover:shadow-xl hover:shadow-accent/20"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {subscribeState === "loading" ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Plus className="w-8 h-8" />
                  )}
                </motion.button>
              )}

              {isSubscribed && (
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center">
                  <Check className="w-7 h-7 text-success" />
                </div>
              )}
            </div>

            {/* Status Messages */}
            <AnimatePresence>
              {subscribeState === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20"
                >
                  <p className="text-sm text-success font-medium">
                    Subscribed! This folder will appear in your extension.
                  </p>
                </motion.div>
              )}

              {subscribeState === "already_subscribed" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20"
                >
                  <p className="text-sm text-accent font-medium">
                    You&apos;re already subscribed to this folder.
                  </p>
                </motion.div>
              )}

              {subscribeState === "own_folder" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20"
                >
                  <p className="text-sm text-warning font-medium">
                    This is your own folder - no need to subscribe!
                  </p>
                </motion.div>
              )}

              {!isLoggedIn && subscribeState === "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 rounded-lg bg-background-tertiary border border-border"
                >
                  <p className="text-sm text-foreground-secondary">
                    <LogIn className="w-4 h-4 inline mr-1.5" />
                    <button
                      onClick={() => router.push(`/login?redirect=/s/${code}`)}
                      className="text-accent hover:underline font-medium"
                    >
                      Sign in
                    </button>
                    {" "}to subscribe to this folder.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Prompts List */}
          <div className="p-4">
            <p className="text-xs font-medium text-foreground-muted mb-3 px-2">
              PROMPTS IN THIS FOLDER
            </p>

            {preview?.prompts && preview.prompts.length > 0 ? (
              <div className="space-y-1">
                {preview.prompts.map((prompt, index) => (
                  <motion.div
                    key={prompt.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    custom={index}
                    className="rounded-lg bg-background-tertiary/50 hover:bg-background-tertiary border border-transparent hover:border-border transition-colors"
                  >
                    <button
                      onClick={() => setExpandedPrompt(expandedPrompt === prompt.id ? null : prompt.id)}
                      className="w-full text-left px-3 py-2.5 flex items-center gap-2"
                    >
                      <motion.div
                        animate={{ rotate: expandedPrompt === prompt.id ? 90 : 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <ChevronRight className="w-4 h-4 text-foreground-muted" />
                      </motion.div>
                      <FileText className="w-4 h-4 text-foreground-muted" />
                      <span className="text-sm text-foreground flex-1 truncate">
                        {prompt.title}
                      </span>
                    </button>

                    <AnimatePresence>
                      {expandedPrompt === prompt.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 pt-1 ml-6 border-l-2 border-border">
                            <p className="text-xs text-foreground-secondary whitespace-pre-wrap leading-relaxed">
                              {prompt.text.length > 500
                                ? `${prompt.text.substring(0, 500)}...`
                                : prompt.text}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-foreground-muted mx-auto mb-2" />
                <p className="text-sm text-foreground-muted">
                  Prompts will be visible after subscribing
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {isSubscribed && (
            <div className="p-4 border-t border-border bg-background-tertiary/30">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => router.push("/")}
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-foreground-muted mt-6">
          Powered by{" "}
          <span className="text-accent font-medium">Right-Click Prompts</span>
        </p>
      </motion.div>
    </div>
  )
}
