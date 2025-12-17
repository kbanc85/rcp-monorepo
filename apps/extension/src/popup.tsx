import { useEffect, useState, useCallback, useMemo } from "react"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import { createRoot } from 'react-dom/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  Plus,
  Search,
  X,
  Copy,
  Pencil,
  Trash2,
  FolderPlus,
  Download,
  Upload,
  Package,
  Link2,
  Heart,
  Check,
  AlertCircle,
  Info,
  Cloud,
  CloudOff,
  RefreshCw,
  LogOut,
  Mail,
  Lock
} from 'lucide-react'
import type { Folder, Prompt } from "./types/types"
import { storageManager } from "./services/storage"
import {
  supabase,
  signIn,
  signOut,
  getCurrentUser,
  syncFromCloud,
  setupRealtimeSubscription,
  stopSync,
  type SyncState
} from "./features/sync"
import tipJarGif from './assets/tip-jar.gif'
import rcpLogo from './assets/logo-512.png'
import "./style.css"
import React from "react"
import confetti from 'canvas-confetti'
import defaultPromptFolders from "./config/default-prompts.json"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { SimpleToast } from "@/components/ui/toast"
import { EmptySearchState, EmptyFolderState } from "@/components/ui/empty-state"
import {
  containerVariants,
  itemVariants,
  accordionVariants,
  promptContentVariants,
  iconSwapVariants,
  modalOverlayVariants,
  modalContentVariants,
  shakeVariants,
  iconTapFeedback
} from "@/lib/animation-variants"

// Delete Modal Component
interface DeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteModal({ isOpen, title, message, onConfirm, onCancel }: DeleteModalProps) {
  const deleteButtonRef = React.useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      deleteButtonRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onConfirm();
    else if (e.key === 'Escape') onCancel();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="modal-overlay"
      variants={modalOverlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onKeyDown={handleKeyDown}
    >
      <motion.div
        className="modal-content"
        variants={modalContentVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center"
            variants={shakeVariants}
            initial="initial"
            animate="animate"
          >
            <Trash2 className="w-5 h-5 text-error" />
          </motion.div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-foreground-secondary">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            ref={deleteButtonRef}
            variant="destructive"
            size="sm"
            onClick={onConfirm}
          >
            Delete
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Folder Header Component
interface FolderHeaderProps {
  folder: Folder;
  isExpanded: boolean;
  onToggle: () => void;
  onAddPrompt: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function FolderHeader({ folder, isExpanded, onToggle, onAddPrompt, onEdit, onDelete }: FolderHeaderProps) {
  return (
    <div className="folder-header group" onClick={onToggle}>
      <div className="flex items-center gap-2 min-w-0">
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="flex-shrink-0"
        >
          <ChevronRight className="w-4 h-4 text-foreground-muted" />
        </motion.div>
        <span className="text-sm font-medium text-foreground truncate">
          {folder.name}
        </span>
        <span className="text-2xs text-foreground-muted flex-shrink-0">
          ({folder.prompts.length})
        </span>
      </div>

      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={onAddPrompt}
              className="p-1 rounded hover:bg-background-hover"
              whileTap={iconTapFeedback.whileTap}
              whileHover={iconTapFeedback.whileHover}
            >
              <Plus className="w-3.5 h-3.5 text-foreground-muted hover:text-foreground" />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>Add prompt</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={onEdit}
              className="p-1 rounded hover:bg-background-hover"
              whileTap={iconTapFeedback.whileTap}
              whileHover={iconTapFeedback.whileHover}
            >
              <Pencil className="w-3.5 h-3.5 text-foreground-muted hover:text-foreground" />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>Edit folder</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={onDelete}
              className="p-1 rounded hover:bg-background-hover"
              whileTap={iconTapFeedback.whileTap}
              whileHover={iconTapFeedback.whileHover}
            >
              <Trash2 className="w-3.5 h-3.5 text-foreground-muted hover:text-error" />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>Delete folder</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// Animated Copy Icon with checkmark feedback
function AnimatedCopyIcon({ copied }: { copied: boolean }) {
  return (
    <AnimatePresence mode="wait">
      {copied ? (
        <motion.div
          key="check"
          variants={iconSwapVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <Check className="w-3 h-3 text-success" />
        </motion.div>
      ) : (
        <motion.div
          key="copy"
          variants={iconSwapVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <Copy className="w-3 h-3 text-foreground-muted group-hover/copy:text-accent transition-colors" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Prompt Item Component
interface PromptItemProps {
  prompt: Prompt;
  isExpanded: boolean;
  onToggle: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function PromptItem({ prompt, isExpanded, onToggle, onCopy, onEdit, onDelete }: PromptItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="prompt-item group">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 min-w-0">
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <ChevronRight className="w-3.5 h-3.5 text-foreground-muted" />
          </motion.div>
          <span className="text-sm text-foreground-secondary truncate group-hover:text-foreground transition-colors">
            {prompt.title}
          </span>
        </div>

        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-background-hover group/copy"
                whileTap={iconTapFeedback.whileTap}
                whileHover={iconTapFeedback.whileHover}
              >
                <AnimatedCopyIcon copied={copied} />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent>{copied ? 'Copied!' : 'Copy prompt'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={onEdit}
                className="p-1 rounded hover:bg-background-hover"
                whileTap={iconTapFeedback.whileTap}
                whileHover={iconTapFeedback.whileHover}
              >
                <Pencil className="w-3 h-3 text-foreground-muted hover:text-foreground" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={onDelete}
                className="p-1 rounded hover:bg-background-hover"
                whileTap={iconTapFeedback.whileTap}
                whileHover={iconTapFeedback.whileHover}
              >
                <Trash2 className="w-3 h-3 text-foreground-muted hover:text-error" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={promptContentVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="overflow-hidden"
          >
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-foreground-secondary whitespace-pre-wrap leading-relaxed">
                {prompt.text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Welcome Modal Component
interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  setAutoPaste: React.Dispatch<React.SetStateAction<boolean>>;
}

function WelcomeModal({ isOpen, onClose, setAutoPaste }: WelcomeModalProps) {
  const requestAutoPastePermissions = async () => {
    try {
      const granted = await chrome.permissions.request({
        permissions: ['activeTab', 'scripting']
      });

      if (granted) {
        await chrome.storage.local.set({ autoPaste: true });
        setAutoPaste(true);
      } else {
        await chrome.storage.local.set({ autoPaste: false });
      }
      onClose();
    } catch (error) {
      console.error('Error requesting permissions:', error);
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      const colors = ['#ff6b4a', '#fafafa', '#27272a'];
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.3 }, colors, gravity: 0.8, scalar: 0.9, ticks: 300 });
      setTimeout(() => confetti({ particleCount: 50, spread: 60, origin: { y: 0.4 }, colors, gravity: 0.8, scalar: 0.75, ticks: 250 }), 250);
      setTimeout(() => confetti({ particleCount: 80, spread: 65, origin: { y: 0.35 }, colors, gravity: 0.7, scalar: 0.85, ticks: 200 }), 500);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal-content text-center"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.4 }}
      >
        <motion.img
          src={rcpLogo}
          alt="RCP Logo"
          className="w-20 h-20 mx-auto mb-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />

        <h2 className="text-xl font-semibold text-foreground mb-2">
          Right-Click Prompt
        </h2>

        <div className="accent-line mx-auto mb-4" />

        <p className="text-sm text-foreground-secondary mb-6">
          Your AI prompt manager. Check out the tutorial folder to get started.
        </p>

        <div className="bg-background-tertiary rounded-xl p-4 mb-4 text-left">
          <h3 className="text-sm font-medium text-foreground mb-1">Auto-Paste</h3>
          <p className="text-xs text-foreground-muted mb-3">
            Automatically paste prompts into text fields when selected.
          </p>
          <Button onClick={requestAutoPastePermissions} className="w-full" size="sm">
            Enable Auto-Paste
          </Button>
        </div>

        <Button variant="ghost" onClick={onClose} className="w-full">
          Maybe Later
        </Button>

        <div className="flex items-center justify-center gap-1 mt-4 text-xs text-success">
          <Check className="w-3.5 h-3.5" />
          <span>Ready to use!</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Toast is imported from @/components/ui/toast

// Cloud Sync Modal Component
interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { email: string } | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onSync: () => Promise<void>;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSynced: Date | null;
  showConfirmSync: boolean;
  onConfirmSync: () => void;
  onCancelSync: () => void;
}

function CloudSyncModal({
  isOpen,
  onClose,
  user,
  onLogin,
  onLogout,
  onSync,
  syncStatus,
  lastSynced,
  showConfirmSync,
  onConfirmSync,
  onCancelSync
}: CloudSyncModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await onLogin(email, password);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sync Confirmation Dialog */}
        {showConfirmSync && (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-accent/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-accent" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Replace Local Prompts?
            </h2>
            <p className="text-sm text-foreground-secondary mb-2">
              This will replace your local prompts with data from the cloud.
            </p>
            <p className="text-xs text-foreground-muted mb-6">
              <strong>Tip:</strong> Export your prompts first using the Backup button below if you want to keep them.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onCancelSync}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={onConfirmSync}>
                Yes, Sync Now
              </Button>
            </div>
          </div>
        )}

        {/* Logged In View */}
        {!showConfirmSync && user && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Cloud className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-foreground">Cloud Sync</h2>
                <p className="text-xs text-foreground-muted truncate">{user.email}</p>
              </div>
            </div>

            <div className="bg-background-tertiary rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-secondary">Status</span>
                <span className={cn(
                  "flex items-center gap-1.5",
                  syncStatus === 'syncing' ? "text-accent" : "text-success"
                )}>
                  {syncStatus === 'syncing' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Connected
                    </>
                  )}
                </span>
              </div>
              {lastSynced && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-foreground-secondary">Last synced</span>
                  <span className="text-foreground-muted">
                    {lastSynced.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={onSync}
                disabled={syncStatus === 'syncing'}
              >
                <RefreshCw className={cn("w-4 h-4 mr-1.5", syncStatus === 'syncing' && "animate-spin")} />
                Sync Now
              </Button>
              <Button variant="ghost" onClick={onLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Login View */}
        {!showConfirmSync && !user && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-foreground-muted/10 flex items-center justify-center">
                <CloudOff className="w-5 h-5 text-foreground-muted" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Cloud Sync</h2>
                <p className="text-xs text-foreground-muted">Sign in to sync with dashboard</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              {error && (
                <div className="flex items-center gap-2 p-2.5 bg-error/10 border border-error/20 rounded-lg text-error text-xs">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="input-inline w-full pl-10"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="input-inline w-full pl-10"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <p className="text-xs text-foreground-muted text-center mt-4">
              Create an account at{' '}
              <a
                href="https://dashboard-m3xw5v5va-mail-kbanccoms-projects.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                RCP Dashboard
              </a>
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// Main Popup Component
function Popup() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set())
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState("")
  const [newPromptTitle, setNewPromptTitle] = useState("")
  const [newPromptText, setNewPromptText] = useState("")
  const [addingPromptToFolder, setAddingPromptToFolder] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [autoPaste, setAutoPaste] = useState(false)
  const [toast, setToast] = useState<{ message: string; visible: boolean; type: 'success' | 'error' | 'info' }>({ message: '', visible: false, type: 'info' })
  const [showNewsletterPrompt, setShowNewsletterPrompt] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null)

  // Cloud sync state
  const [showCloudSync, setShowCloudSync] = useState(false)
  const [cloudUser, setCloudUser] = useState<{ email: string } | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle')
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [showConfirmSync, setShowConfirmSync] = useState(false)
  const [pendingSync, setPendingSync] = useState(false)

  // Initialize
  useEffect(() => {
    chrome.storage.local.get(['autoPaste', 'extensionOpenCount']).then((result) => {
      setAutoPaste(result.autoPaste ?? false)
      const openCount = (result.extensionOpenCount ?? 0) + 1
      chrome.storage.local.set({ extensionOpenCount: openCount })
      if (openCount === 10 || openCount === 100) setShowNewsletterPrompt(true)
    })
  }, [])

  useEffect(() => {
    chrome.storage.local.set({ autoPaste })
  }, [autoPaste])

  useEffect(() => {
    const handleMessage = (request: { type: string; message: string }) => {
      if (request.type === 'PROMPT_COPIED') showToast(request.message);
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  useEffect(() => {
    const initializeStorage = async () => {
      try {
        const result = await chrome.storage.local.get(['folders']);

        if (!result.folders || result.folders.length === 0) {
          const defaultFolders = [
            {
              id: crypto.randomUUID(),
              name: "Tutorial",
              prompts: [
                {
                  id: crypto.randomUUID(),
                  title: "Getting Started",
                  text: "# How to Use Right-Click Prompt\n\n## Organizing Prompts\n1. Click '+' to create a new folder\n2. Add prompts to your folders\n3. Give prompts descriptive titles\n\n## Using Prompts\n1. Right-click anywhere in your browser\n2. Find 'Right Click Prompt' in the context menu\n3. Select your prompt - it's copied automatically!\n4. Paste with Ctrl+V or Cmd+V\n\n## Auto-Paste\nEnable Auto-Paste to automatically insert prompts into text fields.\n\nVisit: https://aiadopters.substack.com/p/right-click-prompt",
                  timestamp: new Date().toISOString(),
                  isImported: false
                }
              ],
              isImported: false
            },
            ...defaultPromptFolders.map(folder => ({
              ...folder,
              prompts: folder.prompts.map(prompt => ({
                ...prompt,
                timestamp: new Date().toISOString(),
                isImported: false
              })),
              isImported: false
            }))
          ]

          await chrome.storage.local.set({ folders: defaultFolders })
          setFolders(defaultFolders)
        } else {
          const updatedFolders = result.folders.map((f: Folder) => ({
            ...f,
            isImported: f.isImported ?? false,
            prompts: f.prompts.map((p: Prompt) => ({
              ...p,
              isImported: p.isImported ?? f.isImported ?? false
            }))
          }))
          setFolders(updatedFolders)
        }
      } catch (error) {
        console.error('Error initializing storage:', error)
      }
    }

    initializeStorage()
  }, [])

  useEffect(() => {
    chrome.storage.local.get(['hasSeenWelcome']).then((result) => {
      if (!result.hasSeenWelcome) {
        setShowWelcome(true);
        chrome.storage.local.set({ hasSeenWelcome: true });
      }
    });
  }, []);

  // Check for existing cloud session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user?.email) {
          setCloudUser({ email: user.email });
          // Setup realtime subscription
          setupRealtimeSubscription(async () => {
            // On realtime change, sync from cloud
            await performSync();
          });
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    };
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email) {
        setCloudUser({ email: session.user.email });
      } else {
        setCloudUser(null);
        stopSync();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Cloud sync handlers
  const handleCloudLogin = async (email: string, password: string) => {
    await signIn(email, password);
    const user = await getCurrentUser();
    if (user?.email) {
      setCloudUser({ email: user.email });
      // Show confirmation before first sync
      setShowConfirmSync(true);
    }
  };

  const handleCloudLogout = async () => {
    await signOut();
    setCloudUser(null);
    setLastSynced(null);
    setSyncStatus('idle');
    showToast('Signed out', 'info');
  };

  const performSync = async () => {
    setSyncStatus('syncing');
    try {
      const { folders: cloudFolders, prompts: cloudPrompts } = await syncFromCloud();
      // Reload folders from storage
      const newFolders = await storageManager.getFolders();
      setFolders(newFolders);
      setLastSynced(new Date());
      setSyncStatus('idle');
      showToast('Synced from cloud', 'success');
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      showToast(error.message || 'Sync failed', 'error');
    }
  };

  const handleCloudSync = async () => {
    // If first sync, show confirmation
    if (!lastSynced) {
      setShowConfirmSync(true);
      return;
    }
    await performSync();
  };

  const handleConfirmSync = async () => {
    setShowConfirmSync(false);
    await performSync();
    // Setup realtime after first sync
    setupRealtimeSubscription(performSync);
  };

  const handleCancelSync = () => {
    setShowConfirmSync(false);
  };

  // Toggle handlers
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      next.has(folderId) ? next.delete(folderId) : next.add(folderId)
      return next
    })
  }

  const togglePrompt = (promptId: string) => {
    setExpandedPrompts(prev => {
      const next = new Set(prev)
      next.has(promptId) ? next.delete(promptId) : next.add(promptId)
      return next
    })
  }

  // Save folders
  const saveFolders = async (newFolders: Folder[]) => {
    try {
      await storageManager.saveFolders(newFolders)
      setFolders(newFolders)
    } catch (error) {
      console.error('Error saving folders:', error)
    }
  }

  // Drag and drop
  const onDragEnd = (result: { destination?: { droppableId: string; index: number }; source: { droppableId: string; index: number }; type: string }) => {
    if (!result.destination) return

    const newFolders = Array.from(folders)

    if (result.type === 'folder') {
      const [removed] = newFolders.splice(result.source.index, 1)
      newFolders.splice(result.destination.index, 0, removed)
      saveFolders(newFolders)
      return
    }

    if (result.type === 'prompt') {
      const sourceFolder = newFolders.find(f => f.id === result.source.droppableId)
      const destFolder = newFolders.find(f => f.id === result.destination!.droppableId)

      if (!sourceFolder || !destFolder) return

      const [movedPrompt] = sourceFolder.prompts.splice(result.source.index, 1)
      const newPrompt = {
        ...movedPrompt,
        id: crypto.randomUUID(),
        isImported: destFolder.isImported ?? false,
        timestamp: new Date().toISOString()
      }

      destFolder.prompts.splice(result.destination.index, 0, newPrompt)

      const updatedFolders = newFolders.map(folder => ({
        ...folder,
        prompts: folder.id === sourceFolder.id ? [...sourceFolder.prompts] :
                 folder.id === destFolder.id ? [...destFolder.prompts] :
                 [...folder.prompts]
      }))

      saveFolders(updatedFolders)
    }
  }

  // Folder operations
  const startAddFolder = () => {
    setNewFolderName("")
    setEditingFolder("new")
  }

  const cancelFolderEdit = () => {
    setEditingFolder(null)
    setNewFolderName("")
  }

  const saveFolderEdit = () => {
    if (!newFolderName.trim()) {
      cancelFolderEdit()
      return
    }

    if (editingFolder === "new") {
      const newFolder = {
        id: crypto.randomUUID(),
        name: newFolderName.trim(),
        prompts: [],
        isImported: false
      }
      saveFolders([newFolder, ...folders])
      setExpandedFolders(prev => new Set([...prev, newFolder.id]))
    } else if (editingFolder) {
      saveFolders(folders.map(f =>
        f.id === editingFolder ? { ...f, name: newFolderName.trim(), isImported: false } : f
      ))
    }
    cancelFolderEdit()
  }

  // Prompt operations
  const startAddPrompt = (folderId: string) => {
    setAddingPromptToFolder(folderId)
    setNewPromptTitle("")
    setNewPromptText("")
    setEditingPrompt("new")
  }

  const cancelPromptEdit = () => {
    setEditingPrompt(null)
    setAddingPromptToFolder(null)
    setNewPromptTitle("")
    setNewPromptText("")
  }

  const savePromptEdit = () => {
    if (!newPromptTitle.trim() || !newPromptText.trim()) {
      cancelPromptEdit()
      return
    }

    if (editingPrompt === "new" && addingPromptToFolder) {
      const newPrompt = {
        id: crypto.randomUUID(),
        title: newPromptTitle.trim(),
        text: newPromptText.trim(),
        timestamp: new Date().toISOString(),
        isImported: false
      }

      saveFolders(folders.map(f =>
        f.id === addingPromptToFolder
          ? { ...f, prompts: [...f.prompts, newPrompt] }
          : f
      ))
      setExpandedPrompts(prev => new Set([...prev, newPrompt.id]))
    } else if (editingPrompt && addingPromptToFolder) {
      saveFolders(folders.map(f =>
        f.id === addingPromptToFolder
          ? { ...f, prompts: f.prompts.map(p =>
              p.id === editingPrompt
                ? { ...p, title: newPromptTitle.trim(), text: newPromptText.trim() }
                : p
            )}
          : f
      ))
    }
    cancelPromptEdit()
  }

  // Delete operations
  const deleteFolder = (folder: Folder) => {
    setDeleteModal({
      isOpen: true,
      title: "Delete folder",
      message: `"${folder.name}" and all prompts will be deleted.`,
      onConfirm: () => {
        saveFolders(folders.filter(f => f.id !== folder.id));
        setDeleteModal(null);
      }
    });
  }

  const deletePrompt = (folder: Folder, prompt: Prompt) => {
    setDeleteModal({
      isOpen: true,
      title: "Delete prompt",
      message: `"${prompt.title}" will be deleted.`,
      onConfirm: () => {
        saveFolders(folders.map(f =>
          f.id === folder.id
            ? { ...f, prompts: f.prompts.filter(p => p.id !== prompt.id) }
            : f
        ));
        setDeleteModal(null);
      }
    });
  }

  // Toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast(prev => ({ ...prev, visible: false }));
    setTimeout(() => {
      setToast({ message, visible: true, type });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2000);
    }, 10);
  };

  // Copy prompt
  const copyPrompt = async (prompt: Prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.text);
      showToast('Copied to clipboard', 'success');
    } catch (error) {
      console.error('Clipboard error:', error);
      showToast('Failed to copy', 'error');
    }
  }

  // Filter
  const filterFoldersWithQuery = useCallback((folders: Folder[]) => {
    const query = searchQuery.toLowerCase();
    return folders.map(folder => ({
      ...folder,
      prompts: folder.prompts.filter(prompt =>
        prompt.title.toLowerCase().includes(query) ||
        prompt.text.toLowerCase().includes(query)
      )
    })).filter(folder =>
      folder.name.toLowerCase().includes(query) || folder.prompts.length > 0
    );
  }, [searchQuery]);

  const regularFolders = useMemo(() =>
    filterFoldersWithQuery(folders.filter(f => f.isImported === false)),
    [folders, filterFoldersWithQuery]
  );

  const importedFolders = useMemo(() =>
    filterFoldersWithQuery(folders.filter(f => f.isImported === true)),
    [folders, filterFoldersWithQuery]
  );

  // Toggle handlers
  const handleAutoPasteToggle = async () => {
    if (!autoPaste) {
      try {
        const granted = await chrome.permissions.request({
          permissions: ['activeTab', 'scripting']
        });
        if (granted) {
          await chrome.storage.local.set({ autoPaste: true });
          setAutoPaste(true);
          chrome.runtime.sendMessage({ action: 'enableAutoPaste' });
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }
    } else {
      await chrome.storage.local.set({ autoPaste: false });
      setAutoPaste(false);
      chrome.runtime.sendMessage({ action: 'disableAutoPaste' });
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-[420px] h-fit bg-background gradient-bg noise-overlay flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 p-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                Right-Click Prompt
              </h1>
              <div className="accent-line mt-2" />
              <a
                href="https://aiadopters.substack.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:text-accent-hover transition-colors mt-2 inline-block"
              >
                Join AI Adopters Club
              </a>
            </div>

            {/* RCP Logo */}
            <img
              src={rcpLogo}
              alt="RCP"
              className="w-10 h-10 flex-shrink-0"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-muted">Auto-Paste</span>
              <Switch
                checked={autoPaste}
                onCheckedChange={handleAutoPasteToggle}
              />
            </div>

            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={() => setShowCloudSync(true)}
                    className={cn(
                      "p-1.5 rounded-lg hover:bg-background-hover transition-colors",
                      cloudUser && "text-success"
                    )}
                    whileTap={iconTapFeedback.whileTap}
                    whileHover={iconTapFeedback.whileHover}
                  >
                    {cloudUser ? (
                      <Cloud className="w-4 h-4" />
                    ) : (
                      <CloudOff className="w-4 h-4 text-foreground-muted hover:text-foreground" />
                    )}
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>{cloudUser ? 'Cloud Sync' : 'Sign in to sync'}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={() => {
                      navigator.clipboard.writeText('https://chromewebstore.google.com/detail/rcp-right-click-prompt/pdhaalepogdcfdkbhgphjppjcmjbjfkd')
                        .then(() => showToast('Link copied!', 'success'));
                    }}
                    className="p-1.5 rounded-lg hover:bg-background-hover transition-colors"
                    whileTap={iconTapFeedback.whileTap}
                    whileHover={iconTapFeedback.whileHover}
                  >
                    <Link2 className="w-4 h-4 text-foreground-muted hover:text-foreground" />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>Share RCP</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.a
                    href="https://buy.stripe.com/5kA03AfrD3a70De147"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-background-hover transition-colors"
                    whileTap={iconTapFeedback.whileTap}
                    whileHover={iconTapFeedback.whileHover}
                  >
                    <Heart className="w-4 h-4 text-foreground-muted hover:text-accent" />
                  </motion.a>
                </TooltipTrigger>
                <TooltipContent>Support RCP</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Search & Create */}
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={startAddFolder}
              className="flex-shrink-0"
            >
              <FolderPlus className="w-4 h-4 mr-1.5" />
              New Folder
            </Button>

            <div className="flex-1 search-wrapper">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 p-0.5 rounded hover:bg-background-hover"
                >
                  <X className="w-3 h-3 text-foreground-muted" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Folders List */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="folders" type="folder">
              {(provided) => (
                <motion.div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-1"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {/* New folder input */}
                  <AnimatePresence>
                    {editingFolder === "new" && (
                      <motion.div
                        className="folder-card p-3"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <input
                          type="text"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="Folder name..."
                          className="input-inline w-full mb-2"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const folderId = crypto.randomUUID();
                              saveFolders([{ id: folderId, name: newFolderName.trim(), prompts: [], isImported: false }, ...folders]);
                              setExpandedFolders(prev => new Set([...prev, folderId]));
                              cancelFolderEdit();
                              setTimeout(() => startAddPrompt(folderId), 0);
                            }
                            if (e.key === 'Escape') cancelFolderEdit()
                          }}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="xs" onClick={cancelFolderEdit}>Cancel</Button>
                          <Button size="xs" onClick={saveFolderEdit}>Save</Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Empty search state */}
                  {searchQuery && regularFolders.length === 0 && importedFolders.length === 0 && (
                    <EmptySearchState query={searchQuery} />
                  )}

                  {/* Folders */}
                  {regularFolders.map((folder, index) => (
                    <Draggable key={folder.id} draggableId={folder.id} index={index}>
                      {(provided, snapshot) => (
                        <motion.div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={cn("folder-card", snapshot.isDragging && "dragging")}
                          variants={itemVariants}
                        >
                          <FolderHeader
                            folder={folder}
                            isExpanded={expandedFolders.has(folder.id)}
                            onToggle={() => toggleFolder(folder.id)}
                            onAddPrompt={() => {
                              if (!expandedFolders.has(folder.id)) {
                                setExpandedFolders(prev => new Set([...prev, folder.id]));
                              }
                              startAddPrompt(folder.id);
                            }}
                            onEdit={() => {
                              setEditingFolder(folder.id)
                              setNewFolderName(folder.name)
                            }}
                            onDelete={() => deleteFolder(folder)}
                          />

                          {/* Folder name edit */}
                          <AnimatePresence>
                            {editingFolder === folder.id && (
                              <motion.div
                                className="px-3 pb-3"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                              >
                                <input
                                  type="text"
                                  value={newFolderName}
                                  onChange={(e) => setNewFolderName(e.target.value)}
                                  className="input-inline w-full mb-2"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveFolderEdit()
                                    if (e.key === 'Escape') cancelFolderEdit()
                                  }}
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="xs" onClick={cancelFolderEdit}>Cancel</Button>
                                  <Button size="xs" onClick={saveFolderEdit}>Save</Button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Prompts */}
                          <AnimatePresence>
                            {expandedFolders.has(folder.id) && (
                              <motion.div
                                className="pb-2 overflow-hidden"
                                variants={accordionVariants}
                                initial="closed"
                                animate="open"
                                exit="closed"
                              >
                                {/* New prompt input */}
                                {addingPromptToFolder === folder.id && editingPrompt === "new" && (
                                  <div className="mx-2 mb-2 p-3 rounded-lg bg-background-tertiary border border-accent/20">
                                    <input
                                      type="text"
                                      value={newPromptTitle}
                                      onChange={(e) => setNewPromptTitle(e.target.value)}
                                      placeholder="Prompt title..."
                                      className="input-inline w-full mb-2"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          (e.currentTarget.parentElement?.querySelector('textarea') as HTMLTextAreaElement)?.focus();
                                        }
                                      }}
                                    />
                                    <textarea
                                      value={newPromptText}
                                      onChange={(e) => setNewPromptText(e.target.value)}
                                      placeholder="Prompt text..."
                                      className="textarea-premium min-h-[80px]"
                                    />
                                    <div className="flex justify-end gap-2 mt-2">
                                      <Button variant="ghost" size="xs" onClick={cancelPromptEdit}>Cancel</Button>
                                      <Button size="xs" onClick={savePromptEdit}>Save</Button>
                                    </div>
                                  </div>
                                )}

                                <Droppable droppableId={folder.id} type="prompt">
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                    >
                                      {folder.prompts.map((prompt, promptIndex) => (
                                        <Draggable
                                          key={prompt.id}
                                          draggableId={`prompt-${prompt.id}`}
                                          index={promptIndex}
                                        >
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              className={cn(snapshot.isDragging && "opacity-70")}
                                            >
                                              <PromptItem
                                                prompt={prompt}
                                                isExpanded={expandedPrompts.has(prompt.id)}
                                                onToggle={() => togglePrompt(prompt.id)}
                                                onCopy={() => copyPrompt(prompt)}
                                                onEdit={() => {
                                                  setEditingPrompt(prompt.id)
                                                  setAddingPromptToFolder(folder.id)
                                                  setNewPromptTitle(prompt.title)
                                                  setNewPromptText(prompt.text)
                                                }}
                                                onDelete={() => deletePrompt(folder, prompt)}
                                              />

                                              {/* Edit prompt inline */}
                                              {editingPrompt === prompt.id && (
                                                <div className="mx-2 mb-2 p-3 rounded-lg bg-background-tertiary border border-accent/20">
                                                  <input
                                                    type="text"
                                                    value={newPromptTitle}
                                                    onChange={(e) => setNewPromptTitle(e.target.value)}
                                                    className="input-inline w-full mb-2"
                                                    autoFocus
                                                  />
                                                  <textarea
                                                    value={newPromptText}
                                                    onChange={(e) => setNewPromptText(e.target.value)}
                                                    className="textarea-premium min-h-[80px]"
                                                  />
                                                  <div className="flex justify-end gap-2 mt-2">
                                                    <Button variant="ghost" size="xs" onClick={cancelPromptEdit}>Cancel</Button>
                                                    <Button size="xs" onClick={savePromptEdit}>Save</Button>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </Draggable>
                                      ))}
                                      {provided.placeholder}
                                    </div>
                                  )}
                                </Droppable>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </Draggable>
                  ))}

                  {/* Imported folders section */}
                  {importedFolders.length > 0 && (
                    <div className="pt-4">
                      <div className="text-xs font-medium text-foreground-muted px-1 mb-2">
                        Imported
                      </div>
                      {importedFolders.map((folder, index) => (
                        <Draggable
                          key={folder.id}
                          draggableId={folder.id}
                          index={regularFolders.length + index}
                        >
                          {(provided, snapshot) => (
                            <motion.div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn("folder-card mb-2", snapshot.isDragging && "dragging")}
                              variants={itemVariants}
                            >
                              <FolderHeader
                                folder={folder}
                                isExpanded={expandedFolders.has(folder.id)}
                                onToggle={() => toggleFolder(folder.id)}
                                onAddPrompt={() => {
                                  if (!expandedFolders.has(folder.id)) {
                                    setExpandedFolders(prev => new Set([...prev, folder.id]));
                                  }
                                  startAddPrompt(folder.id);
                                }}
                                onEdit={() => {
                                  setEditingFolder(folder.id)
                                  setNewFolderName(folder.name)
                                }}
                                onDelete={() => deleteFolder(folder)}
                              />

                              <AnimatePresence>
                                {expandedFolders.has(folder.id) && (
                                  <motion.div
                                    className="pb-2 overflow-hidden"
                                    variants={accordionVariants}
                                    initial="closed"
                                    animate="open"
                                    exit="closed"
                                  >
                                    <Droppable droppableId={folder.id} type="prompt">
                                      {(provided) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps}>
                                          {folder.prompts.map((prompt, promptIndex) => (
                                            <Draggable
                                              key={prompt.id}
                                              draggableId={`prompt-${prompt.id}`}
                                              index={promptIndex}
                                            >
                                              {(provided, snapshot) => (
                                                <div
                                                  ref={provided.innerRef}
                                                  {...provided.draggableProps}
                                                  {...provided.dragHandleProps}
                                                  className={cn(snapshot.isDragging && "opacity-70")}
                                                >
                                                  <PromptItem
                                                    prompt={prompt}
                                                    isExpanded={expandedPrompts.has(prompt.id)}
                                                    onToggle={() => togglePrompt(prompt.id)}
                                                    onCopy={() => copyPrompt(prompt)}
                                                    onEdit={() => {
                                                      setEditingPrompt(prompt.id)
                                                      setAddingPromptToFolder(folder.id)
                                                      setNewPromptTitle(prompt.title)
                                                      setNewPromptText(prompt.text)
                                                    }}
                                                    onDelete={() => deletePrompt(folder, prompt)}
                                                  />
                                                </div>
                                              )}
                                            </Draggable>
                                          ))}
                                          {provided.placeholder}
                                        </div>
                                      )}
                                    </Droppable>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )}
                        </Draggable>
                      ))}
                    </div>
                  )}

                  {provided.placeholder}
                </motion.div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Footer */}
        <footer className="flex-shrink-0 px-5 py-3 border-t border-border/50 bg-background-secondary/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => storageManager.exportFolders()}
                    className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Backup</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Export all prompts</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Restore</span>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const result = await storageManager.importFolders(file)
                          if (result.success) {
                            const newFolders = await storageManager.getFolders()
                            setFolders(newFolders)
                            showToast('Prompts restored', 'success')
                          } else {
                            showToast(result.error || 'Failed to restore', 'error')
                          }
                          e.target.value = ''
                        }
                      }}
                    />
                  </label>
                </TooltipTrigger>
                <TooltipContent>Import backup file</TooltipContent>
              </Tooltip>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <label className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors cursor-pointer">
                  <Package className="w-3.5 h-3.5" />
                  <span>Add Package</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const result = await storageManager.importPromptPackage(file)
                        if (result.success) {
                          const newFolders = await storageManager.getFolders()
                          setFolders(newFolders)
                          showToast(result.message || 'Package added', 'success')
                        } else {
                          showToast(result.error || 'Failed to add package', 'error')
                        }
                        e.target.value = ''
                      }
                    }}
                  />
                </label>
              </TooltipTrigger>
              <TooltipContent>Import prompt package</TooltipContent>
            </Tooltip>
          </div>
        </footer>

        {/* Modals */}
        <AnimatePresence>
          <WelcomeModal
            isOpen={showWelcome}
            onClose={() => setShowWelcome(false)}
            setAutoPaste={setAutoPaste}
          />
        </AnimatePresence>

        <AnimatePresence>
          {deleteModal && (
            <DeleteModal
              isOpen={deleteModal.isOpen}
              title={deleteModal.title}
              message={deleteModal.message}
              onConfirm={deleteModal.onConfirm}
              onCancel={() => setDeleteModal(null)}
            />
          )}
        </AnimatePresence>

        {/* Cloud Sync Modal */}
        <AnimatePresence>
          <CloudSyncModal
            isOpen={showCloudSync}
            onClose={() => {
              setShowCloudSync(false);
              setShowConfirmSync(false);
            }}
            user={cloudUser}
            onLogin={handleCloudLogin}
            onLogout={handleCloudLogout}
            onSync={handleCloudSync}
            syncStatus={syncStatus}
            lastSynced={lastSynced}
            showConfirmSync={showConfirmSync}
            onConfirmSync={handleConfirmSync}
            onCancelSync={handleCancelSync}
          />
        </AnimatePresence>

        {/* Newsletter Modal */}
        <AnimatePresence>
          {showNewsletterPrompt && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="modal-content"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
              >
                <h2 className="text-lg font-semibold text-foreground mb-2">Stay Updated</h2>
                <p className="text-sm text-foreground-secondary mb-4">
                  Join the AI Adopters Club for the latest updates, tips, and improvements!
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      window.open('https://aiadopters.substack.com/p/rcp', '_blank');
                      setShowNewsletterPrompt(false);
                    }}
                    className="flex-1"
                  >
                    Visit Club
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowNewsletterPrompt(false)}
                    className="flex-1"
                  >
                    Maybe Later
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast */}
        <SimpleToast
          message={toast.message}
          type={toast.type}
          visible={toast.visible}
          onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
        />
      </div>
    </TooltipProvider>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<Popup />)
