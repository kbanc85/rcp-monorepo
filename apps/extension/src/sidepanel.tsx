import { useEffect, useState, useCallback, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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
  Lock, GripVertical, ExternalLink
} from 'lucide-react'
import type { Folder, Prompt, SubscribedFolder, QuickAccessFolder } from "./types/types"
import { storageManager } from "./services/storage"
import {
  supabase,
  signIn,
  signOut,
  getCurrentUser,
  syncFromCloud,
  setupRealtimeSubscription,
  stopSync,
  fetchSubscribedFolders,
  syncQuickAccessFromCloud,
  updateCloudPrompt,
  createCloudPrompt,
  trashCloudPrompt,
  restoreCloudPrompt,
  fetchTrashPrompts,
  cleanupOldTrash,
  updateQuickAccessItemPositions,
  updateQuickAccessFolderPositions,
  type SyncState,
  type CloudPrompt
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

// Limit constants
const MAX_QUICK_ACCESS_FOLDERS = 30
const MAX_PROMPTS_PER_FOLDER = 10
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
  dragHandleProps?: any;
}

function FolderHeader({ folder, isExpanded, onToggle, onAddPrompt, onEdit, onDelete, dragHandleProps }: FolderHeaderProps) {
  return (
    <div className="folder-header group" onClick={onToggle}>
      <div className="flex items-center gap-2 min-w-0">
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

// Sortable Folder Component
interface SortableFolderProps {
  folder: Folder;
  children: React.ReactNode;
}

function SortableFolder({ folder, children }: SortableFolderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("folder-card", isDragging && "is-dragging")}
      {...attributes}
    >
      {React.cloneElement(children as React.ReactElement, {
        dragHandleProps: listeners,
        isDragging,
      })}
    </div>
  );
}

// Sortable Prompt Component
interface SortablePromptProps {
  prompt: Prompt;
  folderId: string;
  children: React.ReactNode;
}

function SortablePrompt({ prompt, folderId, children }: SortablePromptProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `prompt-${prompt.id}`,
    data: { type: 'prompt', folderId, prompt },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "is-dragging-prompt")}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

// Sortable Quick Access Item Component
interface SortableQuickAccessItemProps {
  itemId: string;
  children: React.ReactNode;
}

function SortableQuickAccessItem({ itemId, children }: SortableQuickAccessItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: itemId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {React.cloneElement(children as React.ReactElement, {
        dragHandleProps: listeners,
        isDragging,
      })}
    </div>
  );
}

// Sortable Quick Access Folder Component
interface SortableQuickAccessFolderProps {
  folderId: string;
  children: React.ReactNode;
}

function SortableQuickAccessFolder({ folderId, children }: SortableQuickAccessFolderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `qa-folder-${folderId}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {React.cloneElement(children as React.ReactElement, {
        folderDragHandleProps: listeners,
        isFolderDragging: isDragging,
      })}
    </div>
  );
}

// FolderContent Component - renders the inside of a folder
interface FolderContentProps {
  folder: Folder;
  isExpanded: boolean;
  expandedPrompts: Set<string>;
  editingFolder: string | null;
  editingPrompt: string | null;
  addingPromptToFolder: string | null;
  newFolderName: string;
  newPromptTitle: string;
  newPromptText: string;
  dragHandleProps?: any;
  isDragging?: boolean;
  onToggleFolder: () => void;
  onTogglePrompt: (promptId: string) => void;
  onAddPrompt: () => void;
  onEditFolder: () => void;
  onDeleteFolder: () => void;
  onEditPrompt: (prompt: Prompt) => void;
  onDeletePrompt: (prompt: Prompt) => void;
  onCopyPrompt: (prompt: Prompt) => void;
  setNewFolderName: (name: string) => void;
  setNewPromptTitle: (title: string) => void;
  setNewPromptText: (text: string) => void;
  saveFolderEdit: () => void;
  cancelFolderEdit: () => void;
  savePromptEdit: () => void;
  cancelPromptEdit: () => void;
}

function FolderContent({
  folder,
  isExpanded,
  expandedPrompts,
  editingFolder,
  editingPrompt,
  addingPromptToFolder,
  newFolderName,
  newPromptTitle,
  newPromptText,
  dragHandleProps,
  onToggleFolder,
  onTogglePrompt,
  onAddPrompt,
  onEditFolder,
  onDeleteFolder,
  onEditPrompt,
  onDeletePrompt,
  onCopyPrompt,
  setNewFolderName,
  setNewPromptTitle,
  setNewPromptText,
  saveFolderEdit,
  cancelFolderEdit,
  savePromptEdit,
  cancelPromptEdit,
}: FolderContentProps) {
  return (
    <>
      <FolderHeader
        dragHandleProps={dragHandleProps}
        folder={folder}
        isExpanded={isExpanded}
        onToggle={onToggleFolder}
        onAddPrompt={onAddPrompt}
        onEdit={onEditFolder}
        onDelete={onDeleteFolder}
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
                if (e.key === 'Enter') saveFolderEdit();
                if (e.key === 'Escape') cancelFolderEdit();
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
        {isExpanded && (
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

            <SortableContext
              items={folder.prompts.map(p => `prompt-${p.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div>
                {folder.prompts.map((prompt) => (
                  <SortablePrompt key={prompt.id} prompt={prompt} folderId={folder.id}>
                    <PromptItem
                      prompt={prompt}
                      isExpanded={expandedPrompts.has(prompt.id)}
                      onToggle={() => onTogglePrompt(prompt.id)}
                      onCopy={() => onCopyPrompt(prompt)}
                      onEdit={() => onEditPrompt(prompt)}
                      onDelete={() => onDeletePrompt(prompt)}
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
                  </SortablePrompt>
                ))}
              </div>
            </SortableContext>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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

            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={() => window.open('https://rcp-dashboard.vercel.app', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-1.5" />
              Open Dashboard
            </Button>
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
                href="https://rcp-dashboard.vercel.app"
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

// Read-only Subscribed Folder Header
interface SubscribedFolderHeaderProps {
  folder: SubscribedFolder;
  isExpanded: boolean;
  onToggle: () => void;
}

function SubscribedFolderHeader({ folder, isExpanded, onToggle }: SubscribedFolderHeaderProps) {
  return (
    <div className="folder-header group" onClick={onToggle}>
      <div className="flex items-center gap-2 min-w-0">
        <Lock className="w-3 h-3 text-foreground-muted flex-shrink-0" />
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="flex-shrink-0"
        >
          <ChevronRight className="w-4 h-4 text-foreground-muted" />
        </motion.div>
        <span className="text-sm font-medium text-foreground truncate">
          {folder.folder_name}
        </span>
        <span className="text-2xs text-foreground-muted flex-shrink-0">
          ({folder.prompts.length})
        </span>
      </div>
      <span className="text-2xs text-foreground-subtle truncate max-w-[100px]">
        {folder.owner_email.split('@')[0]}
      </span>
    </div>
  );
}

// Quick Access Folder Component (editable for owned items)
interface QuickAccessFolderItemProps {
  folder: QuickAccessFolder;
  isExpanded: boolean;
  onToggle: () => void;
  expandedItems: Set<string>;
  onToggleItem: (itemId: string) => void;
  onCopyItem: (text: string) => void;
  // Edit props
  editingItemId: string | null;
  editTitle: string;
  editText: string;
  onStartEdit: (item: any) => void;
  onSaveEdit: (item: any) => void;
  onCancelEdit: () => void;
  onDeleteItem: (item: any) => void;
  setEditTitle: (v: string) => void;
  setEditText: (v: string) => void;
  // Add prompt props
  addingToFolderId: string | null;
  newPromptTitle: string;
  newPromptText: string;
  onStartAdd: (folderId: string) => void;
  onSaveAdd: (folderId: string) => void;
  onCancelAdd: () => void;
  setNewPromptTitle: (v: string) => void;
  setNewPromptText: (v: string) => void;
  // Reorder props
  onReorderItems: (folderId: string, itemIds: string[]) => void;
  // Folder drag handle props
  folderDragHandleProps?: any;
  isFolderDragging?: boolean;
}

function QuickAccessFolderItem({
  folder,
  isExpanded,
  onToggle,
  expandedItems,
  onToggleItem,
  onCopyItem,
  editingItemId,
  editTitle,
  editText,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteItem,
  setEditTitle,
  setEditText,
  addingToFolderId,
  newPromptTitle,
  newPromptText,
  onStartAdd,
  onSaveAdd,
  onCancelAdd,
  setNewPromptTitle,
  setNewPromptText,
  onReorderItems,
  folderDragHandleProps,
  isFolderDragging
}: QuickAccessFolderItemProps) {
  // Check if folder contains subscribed items and get the source label
  const subscribedItem = folder.items.find(item => item.sourceType === 'subscribed' && item.sourceLabel);
  const sourceLabel = subscribedItem?.sourceLabel;
  const isAddingToThis = addingToFolderId === folder.id;
  const isAtCapacity = folder.items.length >= MAX_PROMPTS_PER_FOLDER;

  // Local state for items to enable drag reordering
  const [localItems, setLocalItems] = useState(folder.items);

  // Update local items when folder.items changes from parent
  useEffect(() => {
    setLocalItems(folder.items);
  }, [folder.items]);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Handle drag end for item reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localItems.findIndex(item => item.id === active.id);
      const newIndex = localItems.findIndex(item => item.id === over.id);

      const newItems = arrayMove(localItems, oldIndex, newIndex);
      setLocalItems(newItems);

      // Call parent handler to sync to database
      onReorderItems(folder.id, newItems.map(item => item.id));
    }
  };

  return (
    <motion.div className={cn("folder-card mb-1", isFolderDragging && "opacity-50")} variants={itemVariants}>
      {/* Folder Header */}
      <div className="folder-header group" onClick={onToggle}>
        <div className="flex items-center gap-2 min-w-0">
          {folderDragHandleProps && (
            <div
              {...folderDragHandleProps}
              className="cursor-grab hover:text-foreground active:cursor-grabbing p-0.5 rounded hover:bg-background-hover transition-colors -ml-1"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-3.5 h-3.5 text-foreground-muted hover:text-foreground" />
            </div>
          )}
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
          {sourceLabel && (
            <span className="text-2xs text-accent bg-accent/10 px-1.5 py-0.5 rounded flex-shrink-0">
              {sourceLabel}
            </span>
          )}
        </div>

        {/* Add button */}
        {!isAtCapacity && (
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={() => onStartAdd(folder.id)}
                  className="p-1 rounded hover:bg-background-hover"
                  whileTap={iconTapFeedback.whileTap}
                  whileHover={iconTapFeedback.whileHover}
                >
                  <Plus className="w-3.5 h-3.5 text-foreground-muted hover:text-foreground" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent>Add prompt</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Items */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="pb-2 overflow-hidden"
            variants={accordionVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            {/* Add New Prompt Form */}
            {isAddingToThis && (
              <div className="mx-2 mb-2 p-3 rounded-lg bg-background-tertiary border border-accent/20">
                <input
                  type="text"
                  value={newPromptTitle}
                  onChange={(e) => setNewPromptTitle(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:border-accent mb-2"
                  placeholder="Title"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Escape' && onCancelAdd()}
                />
                <textarea
                  value={newPromptText}
                  onChange={(e) => setNewPromptText(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:border-accent min-h-[80px] resize-none"
                  placeholder="Prompt text... Use {{selection}} for selected text"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="ghost" size="xs" onClick={onCancelAdd}>Cancel</Button>
                  <Button size="xs" onClick={() => onSaveAdd(folder.id)}>Add</Button>
                </div>
              </div>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {localItems.map((item) => (
                  <SortableQuickAccessItem key={item.id} itemId={item.id}>
                    <QuickAccessItemComponent
                      item={item}
                      isExpanded={expandedItems.has(item.id)}
                      isEditing={editingItemId === item.id}
                      editTitle={editTitle}
                      editText={editText}
                      onToggle={() => onToggleItem(item.id)}
                      onCopy={() => onCopyItem(item.text)}
                      onEdit={() => onStartEdit(item)}
                      onSave={() => onSaveEdit(item)}
                      onCancel={onCancelEdit}
                      onDelete={() => onDeleteItem(item)}
                      setEditTitle={setEditTitle}
                      setEditText={setEditText}
                    />
                  </SortableQuickAccessItem>
                ))}
              </SortableContext>
            </DndContext>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Quick Access Item Component
interface QuickAccessItemComponentProps {
  item: { id: string; promptId: string; title: string; text: string; sourceType: 'owned' | 'subscribed'; sourceLabel?: string };
  isExpanded: boolean;
  isEditing: boolean;
  editTitle: string;
  editText: string;
  onToggle: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  setEditTitle: (v: string) => void;
  setEditText: (v: string) => void;
  dragHandleProps?: any;
  isDragging?: boolean;
}

function QuickAccessItemComponent({
  item,
  isExpanded,
  isEditing,
  editTitle,
  editText,
  onToggle,
  onCopy,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  setEditTitle,
  setEditText,
  dragHandleProps,
  isDragging
}: QuickAccessItemComponentProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className={cn("prompt-item group", isDragging && "opacity-50")}>
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-1 min-w-0">
          {/* Drag Handle */}
          <div
            className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
            {...dragHandleProps}
            onClick={e => e.stopPropagation()}
          >
            <GripVertical className="w-3 h-3 text-foreground-subtle" />
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <ChevronRight className="w-3.5 h-3.5 text-foreground-muted" />
          </motion.div>
          <span className="text-sm text-foreground-secondary truncate group-hover:text-foreground transition-colors">
            {item.title}
          </span>
          {item.sourceType === 'subscribed' && (
            <Lock className="w-3 h-3 text-foreground-subtle flex-shrink-0" />
          )}
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

          {item.sourceType === 'owned' && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Inline Edit Form */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 rounded-lg bg-background-tertiary border border-accent/20" onKeyDown={handleKeyDown}>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:border-accent mb-2"
                placeholder="Title"
                autoFocus
              />
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:border-accent min-h-[80px] resize-none"
                placeholder="Prompt text..."
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="ghost" size="xs" onClick={onCancel}>Cancel</Button>
                <Button size="xs" onClick={onSave}>Save</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExpanded && !isEditing && (
          <motion.div
            variants={promptContentVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="overflow-hidden"
          >
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-foreground-secondary whitespace-pre-wrap leading-relaxed">
                {item.text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Read-only Subscribed Prompt Item
interface SubscribedPromptItemProps {
  prompt: { id: string; title: string; text: string };
  isExpanded: boolean;
  onToggle: () => void;
  onCopy: () => void;
}

function SubscribedPromptItem({ prompt, isExpanded, onToggle, onCopy }: SubscribedPromptItemProps) {
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

// Main Popup Component
function Popup() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [subscribedFolders, setSubscribedFolders] = useState<SubscribedFolder[]>([])
  const [quickAccessFolders, setQuickAccessFolders] = useState<QuickAccessFolder[]>([])
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

  // Quick Access editing state
  const [editingQuickAccessItem, setEditingQuickAccessItem] = useState<string | null>(null)
  const [quickAccessEditTitle, setQuickAccessEditTitle] = useState("")
  const [quickAccessEditText, setQuickAccessEditText] = useState("")

  // Quick Access adding state
  const [addingToQuickAccessFolder, setAddingToQuickAccessFolder] = useState<string | null>(null)
  const [newQuickAccessTitle, setNewQuickAccessTitle] = useState("")
  const [newQuickAccessText, setNewQuickAccessText] = useState("")

  // Trash state
  const [trashPrompts, setTrashPrompts] = useState<CloudPrompt[]>([])
  const [showTrash, setShowTrash] = useState(false)

  // Drag and drop state
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null)
  const [activePrompt, setActivePrompt] = useState<{ prompt: Prompt; folderId: string } | null>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
        // Load subscribed folders from local storage
        const storedSubscribed = await storageManager.getSubscribedFolders();
        setSubscribedFolders(storedSubscribed);

        // Load Quick Access folders from local storage
        const storedQuickAccess = await storageManager.getQuickAccessFolders();
        setQuickAccessFolders(storedQuickAccess);

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

      // Fetch and save subscribed folders
      const subscribedData = await fetchSubscribedFolders();
      const mappedSubscribed: SubscribedFolder[] = subscribedData.map(sf => ({
        id: sf.share_code,
        folder_id: sf.folder_id,
        folder_name: sf.folder_name,
        owner_email: sf.owner_email,
        share_code: sf.share_code,
        subscribed_at: sf.subscribed_at,
        prompts: sf.prompts.map(p => ({
          id: p.id,
          title: p.title,
          text: p.text,
          position: p.position,
          created_at: p.created_at
        }))
      }));
      await storageManager.saveSubscribedFolders(mappedSubscribed);
      setSubscribedFolders(mappedSubscribed);

      // Fetch and save Quick Access folders
      const quickAccess = await syncQuickAccessFromCloud();
      setQuickAccessFolders(quickAccess);

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

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);

    // Check if it's a folder or prompt being dragged
    const idString = String(active.id);
    if (idString.startsWith('prompt-')) {
      const promptId = idString.replace('prompt-', '');
      for (const folder of folders) {
        const prompt = folder.prompts.find(p => p.id === promptId);
        if (prompt) {
          setActivePrompt({ prompt, folderId: folder.id });
          setActiveFolder(null);
          return;
        }
      }
    } else {
      const folder = folders.find(f => f.id === idString);
      if (folder) {
        setActiveFolder(folder);
        setActivePrompt(null);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setActiveFolder(null);
    setActivePrompt(null);

    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Handle folder reordering
    if (!activeIdStr.startsWith('prompt-') && !overIdStr.startsWith('prompt-')) {
      const oldIndex = folders.findIndex(f => f.id === activeIdStr);
      const newIndex = folders.findIndex(f => f.id === overIdStr);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newFolders = arrayMove(folders, oldIndex, newIndex);
        saveFolders(newFolders);
      }
      return;
    }

    // Handle prompt reordering within or between folders
    if (activeIdStr.startsWith('prompt-')) {
      const promptId = activeIdStr.replace('prompt-', '');

      // Find source folder and prompt
      let sourceFolder: Folder | undefined;
      let sourcePromptIndex = -1;

      for (const folder of folders) {
        const index = folder.prompts.findIndex(p => p.id === promptId);
        if (index !== -1) {
          sourceFolder = folder;
          sourcePromptIndex = index;
          break;
        }
      }

      if (!sourceFolder || sourcePromptIndex === -1) return;

      // Determine destination
      let destFolder: Folder | undefined;
      let destIndex = 0;

      if (overIdStr.startsWith('prompt-')) {
        // Dropped on another prompt
        const overPromptId = overIdStr.replace('prompt-', '');
        for (const folder of folders) {
          const index = folder.prompts.findIndex(p => p.id === overPromptId);
          if (index !== -1) {
            destFolder = folder;
            destIndex = index;
            break;
          }
        }
      } else {
        // Dropped on a folder (add to end)
        destFolder = folders.find(f => f.id === overIdStr);
        destIndex = destFolder ? destFolder.prompts.length : 0;
      }

      if (!destFolder) return;

      // Same folder - just reorder
      if (sourceFolder.id === destFolder.id) {
        const newPrompts = arrayMove(sourceFolder.prompts, sourcePromptIndex, destIndex);
        const newFolders = folders.map(f =>
          f.id === sourceFolder!.id ? { ...f, prompts: newPrompts } : f
        );
        saveFolders(newFolders);
      } else {
        // Different folder - move prompt (keep original ID)
        const movedPrompt = sourceFolder.prompts[sourcePromptIndex];
        const newSourcePrompts = sourceFolder.prompts.filter((_, i) => i !== sourcePromptIndex);
        const newDestPrompts = [...destFolder.prompts];
        newDestPrompts.splice(destIndex, 0, movedPrompt);

        const newFolders = folders.map(f => {
          if (f.id === sourceFolder!.id) return { ...f, prompts: newSourcePrompts };
          if (f.id === destFolder!.id) return { ...f, prompts: newDestPrompts };
          return f;
        });
        saveFolders(newFolders);
      }
    }
  };

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
          ? {
            ...f, prompts: f.prompts.map(p =>
              p.id === editingPrompt
                ? { ...p, title: newPromptTitle.trim(), text: newPromptText.trim() }
                : p
            )
          }
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

  // Copy prompt text (for Quick Access)
  const copyPromptText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard', 'success');
    } catch (error) {
      console.error('Clipboard error:', error);
      showToast('Failed to copy', 'error');
    }
  }

  // ============================================
  // Quick Access Edit Handlers
  // ============================================

  // Start editing a Quick Access item
  const startQuickAccessEdit = (item: any) => {
    setEditingQuickAccessItem(item.id)
    setQuickAccessEditTitle(item.title)
    setQuickAccessEditText(item.text)
  }

  // Cancel Quick Access edit
  const cancelQuickAccessEdit = () => {
    setEditingQuickAccessItem(null)
    setQuickAccessEditTitle("")
    setQuickAccessEditText("")
  }

  // Save Quick Access edit
  const saveQuickAccessEdit = async (item: any) => {
    if (!quickAccessEditTitle.trim() || !quickAccessEditText.trim()) {
      cancelQuickAccessEdit()
      return
    }

    try {
      await updateCloudPrompt(item.promptId, {
        title: quickAccessEditTitle.trim(),
        text: quickAccessEditText.trim()
      })

      // Optimistic update
      setQuickAccessFolders(prev => prev.map(folder => ({
        ...folder,
        items: folder.items.map(i =>
          i.id === item.id
            ? { ...i, title: quickAccessEditTitle.trim(), text: quickAccessEditText.trim() }
            : i
        )
      })))

      showToast('Prompt updated', 'success')
      cancelQuickAccessEdit()
    } catch (error: any) {
      console.error('[QuickAccess] Error updating prompt:', error)
      showToast(error.message || 'Failed to update prompt', 'error')
    }
  }

  // Delete (trash) a Quick Access item
  const deleteQuickAccessItem = (item: any) => {
    setDeleteModal({
      isOpen: true,
      title: "Delete prompt",
      message: `"${item.title}" will be moved to trash.`,
      onConfirm: async () => {
        try {
          await trashCloudPrompt(item.promptId)
          await cleanupOldTrash()

          // Remove from Quick Access
          setQuickAccessFolders(prev => prev.map(f => ({
            ...f,
            items: f.items.filter(i => i.promptId !== item.promptId)
          })))

          // Refresh trash list
          const trash = await fetchTrashPrompts()
          setTrashPrompts(trash)

          showToast('Moved to trash', 'success')
          setDeleteModal(null)
        } catch (error: any) {
          console.error('[QuickAccess] Error deleting prompt:', error)
          showToast(error.message || 'Failed to delete prompt', 'error')
          setDeleteModal(null)
        }
      }
    })
  }

  // Reorder Quick Access items within a folder
  const reorderQuickAccessItems = async (folderId: string, itemIds: string[]) => {
    try {
      // Update positions in database
      await updateQuickAccessItemPositions(folderId, itemIds)

      // Optimistic update - reorder items in state
      setQuickAccessFolders(prev => prev.map(folder => {
        if (folder.id !== folderId) return folder

        const reorderedItems = itemIds.map(id =>
          folder.items.find(item => item.id === id)
        ).filter(Boolean) as typeof folder.items

        return { ...folder, items: reorderedItems }
      }))

      console.log('[QuickAccess] ✅ Reordered items in folder:', folderId)
    } catch (error: any) {
      console.error('[QuickAccess] Error reordering items:', error)
      showToast('Failed to reorder prompts', 'error')

      // Refresh from cloud on error
      const updatedQuickAccess = await syncQuickAccessFromCloud()
      setQuickAccessFolders(updatedQuickAccess)
    }
  }

  // Reorder Quick Access folders within a section
  const reorderQuickAccessFolders = async (section: 'owned' | 'subscribed', folderIds: string[]) => {
    try {
      // Get current separation
      const currentOwned = quickAccessFolders.filter(f =>
        f.items.length === 0 || f.items.some(i => i.sourceType === 'owned')
      )
      const currentSubscribed = quickAccessFolders.filter(f =>
        f.items.length > 0 && f.items.every(i => i.sourceType === 'subscribed')
      )

      // Reorder the specific section
      const reorderedSection = folderIds.map(id =>
        quickAccessFolders.find(f => f.id === id)
      ).filter(Boolean) as QuickAccessFolder[]

      // Combine: owned first, then subscribed
      const newOrder = section === 'owned'
        ? [...reorderedSection, ...currentSubscribed]
        : [...currentOwned, ...reorderedSection]

      // Update all positions in database
      await updateQuickAccessFolderPositions(newOrder.map(f => f.id))

      // Update state
      setQuickAccessFolders(newOrder.map((f, i) => ({ ...f, position: i })))

      console.log('[QuickAccess] ✅ Reordered folders in section:', section)
    } catch (error: any) {
      console.error('[QuickAccess] Error reordering folders:', error)
      showToast('Failed to reorder folders', 'error')

      // Refresh from cloud on error
      const updatedQuickAccess = await syncQuickAccessFromCloud()
      setQuickAccessFolders(updatedQuickAccess)
    }
  }

  // Restore from trash
  const restoreFromTrash = async (prompt: CloudPrompt) => {
    try {
      await restoreCloudPrompt(prompt.id)
      setTrashPrompts(prev => prev.filter(p => p.id !== prompt.id))
      showToast('Prompt restored', 'success')
      // Trigger sync to refresh Quick Access
      await performSync()
    } catch (error: any) {
      console.error('[Trash] Error restoring prompt:', error)
      showToast(error.message || 'Failed to restore prompt', 'error')
    }
  }

  // ============================================
  // Quick Access Add Handlers
  // ============================================

  // Start adding a prompt to a Quick Access folder
  const startAddToQuickAccess = (folderId: string) => {
    setAddingToQuickAccessFolder(folderId)
    setNewQuickAccessTitle("")
    setNewQuickAccessText("")
  }

  // Cancel adding
  const cancelAddToQuickAccess = () => {
    setAddingToQuickAccessFolder(null)
    setNewQuickAccessTitle("")
    setNewQuickAccessText("")
  }

  // Save new prompt to Quick Access
  const saveAddToQuickAccess = async (quickAccessFolderId: string) => {
    if (!newQuickAccessTitle.trim() || !newQuickAccessText.trim()) {
      cancelAddToQuickAccess()
      return
    }

    try {
      // Check if folder is at max capacity
      const folder = quickAccessFolders.find(f => f.id === quickAccessFolderId)
      if (folder && folder.items.length >= MAX_PROMPTS_PER_FOLDER) {
        showToast(`Maximum ${MAX_PROMPTS_PER_FOLDER} prompts per folder`, 'error')
        return
      }

      // Get user's first folder to add the prompt to (or create one)
      const { data: userFolders } = await supabase
        .from('folders')
        .select('id')
        .order('position')
        .limit(1)

      let targetFolderId: string

      if (userFolders && userFolders.length > 0) {
        targetFolderId = userFolders[0].id
      } else {
        // Create a default folder if none exists
        const user = await getCurrentUser()
        if (!user) throw new Error('Not authenticated')

        const { data: newFolder, error } = await supabase
          .from('folders')
          .insert({ name: 'My Prompts', position: 0, user_id: user.id })
          .select()
          .single()

        if (error) throw error
        targetFolderId = newFolder.id
      }

      // Create the prompt
      const newPrompt = await createCloudPrompt(
        targetFolderId,
        newQuickAccessTitle.trim(),
        newQuickAccessText.trim(),
        0
      )

      // Add to Quick Access
      const user = await getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      // Get max position in the Quick Access folder (reuse folder from capacity check)
      const maxPosition = folder && folder.items.length > 0
        ? Math.max(...folder.items.map(i => i.position))
        : -1

      await supabase.from('quick_access_items').insert({
        user_id: user.id,
        quick_access_folder_id: quickAccessFolderId,
        owned_prompt_id: newPrompt.id,
        position: maxPosition + 1
      })

      showToast('Prompt added', 'success')
      cancelAddToQuickAccess()

      // Refresh Quick Access
      const updatedQuickAccess = await syncQuickAccessFromCloud()
      setQuickAccessFolders(updatedQuickAccess)
    } catch (error: any) {
      console.error('[QuickAccess] Error adding prompt:', error)
      showToast(error.message || 'Failed to add prompt', 'error')
    }
  }

  // Load trash on mount when user is logged in
  useEffect(() => {
    const loadTrash = async () => {
      if (cloudUser) {
        const trash = await fetchTrashPrompts()
        setTrashPrompts(trash)
      }
    }
    loadTrash()
  }, [cloudUser])

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

  // Filter subscribed folders
  const filteredSubscribedFolders = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return subscribedFolders;
    return subscribedFolders.map(folder => ({
      ...folder,
      prompts: folder.prompts.filter(prompt =>
        prompt.title.toLowerCase().includes(query) ||
        prompt.text.toLowerCase().includes(query)
      )
    })).filter(folder =>
      folder.folder_name.toLowerCase().includes(query) || folder.prompts.length > 0
    );
  }, [subscribedFolders, searchQuery]);

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
      <div className="w-full h-screen min-h-screen gradient-bg noise-overlay flex flex-col" style={{ backgroundColor: '#1B1B1B' }}>
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

          {/* User Profile - Show when logged in */}
          {cloudUser && (
            <div className="mt-3 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-background-secondary/50">
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-accent">
                  {cloudUser.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-foreground-muted truncate">
                {cloudUser.email}
              </span>
            </div>
          )}

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
                    onClick={() => window.open('https://rcp-dashboard.vercel.app', '_blank')}
                    className="p-1.5 rounded-lg hover:bg-background-hover transition-colors"
                    whileTap={iconTapFeedback.whileTap}
                    whileHover={iconTapFeedback.whileHover}
                  >
                    <ExternalLink className="w-4 h-4 text-foreground-muted hover:text-foreground" />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>Open Dashboard</TooltipContent>
              </Tooltip>

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

          {/* Search & Create - only show when NOT in Quick Access mode */}
          {!(cloudUser && quickAccessFolders.length > 0) && (
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
          )}

          {/* Search bar for Quick Access mode */}
          {cloudUser && quickAccessFolders.length > 0 && (
            <div className="mt-4">
              <div className="search-wrapper">
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
          )}
        </header>

        {/* Folders List */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {/* Quick Access Mode - Show when logged in with Quick Access data */}
          {cloudUser && quickAccessFolders.length > 0 ? (
            <motion.div
              className="space-y-1"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {/* Separate folders: My Prompts (owned) first, then Subscribed */}
              {(() => {
                const filterBySearch = (folder: QuickAccessFolder) => {
                  if (!searchQuery) return true;
                  const query = searchQuery.toLowerCase();
                  return folder.name.toLowerCase().includes(query) ||
                    folder.items.some(item =>
                      item.title.toLowerCase().includes(query) ||
                      item.text.toLowerCase().includes(query)
                    );
                };

                // A folder is "owned" if it has at least one owned item or no subscribed items
                const ownedFolders = quickAccessFolders.filter(f =>
                  f.items.length === 0 || f.items.some(item => item.sourceType === 'owned')
                ).filter(filterBySearch);

                // A folder is "subscribed" if ALL items are subscribed
                const subscribedFolders = quickAccessFolders.filter(f =>
                  f.items.length > 0 && f.items.every(item => item.sourceType === 'subscribed')
                ).filter(filterBySearch);

                // Handle folder drag end for owned section
                const handleOwnedFolderDragEnd = (event: DragEndEvent) => {
                  const { active, over } = event;
                  if (over && active.id !== over.id) {
                    const activeId = String(active.id).replace('qa-folder-', '');
                    const overId = String(over.id).replace('qa-folder-', '');
                    const oldIndex = ownedFolders.findIndex(f => f.id === activeId);
                    const newIndex = ownedFolders.findIndex(f => f.id === overId);
                    const newOrder = arrayMove(ownedFolders, oldIndex, newIndex);
                    reorderQuickAccessFolders('owned', newOrder.map(f => f.id));
                  }
                };

                // Handle folder drag end for subscribed section
                const handleSubscribedFolderDragEnd = (event: DragEndEvent) => {
                  const { active, over } = event;
                  if (over && active.id !== over.id) {
                    const activeId = String(active.id).replace('qa-folder-', '');
                    const overId = String(over.id).replace('qa-folder-', '');
                    const oldIndex = subscribedFolders.findIndex(f => f.id === activeId);
                    const newIndex = subscribedFolders.findIndex(f => f.id === overId);
                    const newOrder = arrayMove(subscribedFolders, oldIndex, newIndex);
                    reorderQuickAccessFolders('subscribed', newOrder.map(f => f.id));
                  }
                };

                const renderFolder = (folder: QuickAccessFolder) => (
                  <QuickAccessFolderItem
                    key={folder.id}
                    folder={folder}
                    isExpanded={expandedFolders.has(folder.id)}
                    onToggle={() => toggleFolder(folder.id)}
                    expandedItems={expandedPrompts}
                    onToggleItem={togglePrompt}
                    onCopyItem={copyPromptText}
                    editingItemId={editingQuickAccessItem}
                    editTitle={quickAccessEditTitle}
                    editText={quickAccessEditText}
                    onStartEdit={startQuickAccessEdit}
                    onSaveEdit={saveQuickAccessEdit}
                    onCancelEdit={cancelQuickAccessEdit}
                    onDeleteItem={deleteQuickAccessItem}
                    setEditTitle={setQuickAccessEditTitle}
                    setEditText={setQuickAccessEditText}
                    addingToFolderId={addingToQuickAccessFolder}
                    newPromptTitle={newQuickAccessTitle}
                    newPromptText={newQuickAccessText}
                    onStartAdd={startAddToQuickAccess}
                    onSaveAdd={saveAddToQuickAccess}
                    onCancelAdd={cancelAddToQuickAccess}
                    setNewPromptTitle={setNewQuickAccessTitle}
                    setNewPromptText={setNewQuickAccessText}
                    onReorderItems={reorderQuickAccessItems}
                  />
                );

                return (
                  <>
                    {/* My Prompts Section */}
                    {ownedFolders.length > 0 && (
                      <div className="mb-3">
                        <div className="text-2xs font-medium text-foreground-muted uppercase tracking-wider px-2 py-1.5 mb-1">
                          My Prompts
                        </div>
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleOwnedFolderDragEnd}
                        >
                          <SortableContext
                            items={ownedFolders.map(f => `qa-folder-${f.id}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            {ownedFolders.map(folder => (
                              <SortableQuickAccessFolder key={folder.id} folderId={folder.id}>
                                {renderFolder(folder)}
                              </SortableQuickAccessFolder>
                            ))}
                          </SortableContext>
                        </DndContext>
                      </div>
                    )}

                    {/* Subscribed Section */}
                    {subscribedFolders.length > 0 && (
                      <div className="mb-3">
                        <div className="text-2xs font-medium text-foreground-muted uppercase tracking-wider px-2 py-1.5 mb-1 flex items-center gap-1.5">
                          <Lock className="w-3 h-3" />
                          Subscribed
                        </div>
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleSubscribedFolderDragEnd}
                        >
                          <SortableContext
                            items={subscribedFolders.map(f => `qa-folder-${f.id}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            {subscribedFolders.map(folder => (
                              <SortableQuickAccessFolder key={folder.id} folderId={folder.id}>
                                {renderFolder(folder)}
                              </SortableQuickAccessFolder>
                            ))}
                          </SortableContext>
                        </DndContext>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Empty state */}
              {quickAccessFolders.filter(folder => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return folder.name.toLowerCase().includes(query) ||
                  folder.items.some(item =>
                    item.title.toLowerCase().includes(query) ||
                    item.text.toLowerCase().includes(query)
                  );
              }).length === 0 && searchQuery && (
                <EmptySearchState query={searchQuery} />
              )}

              {/* Trash Bin Section */}
              {trashPrompts.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                  <button
                    onClick={() => setShowTrash(!showTrash)}
                    className="flex items-center gap-2 text-xs text-foreground-muted hover:text-foreground w-full px-2 py-1.5 rounded hover:bg-background-secondary transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Trash ({trashPrompts.length})</span>
                    <motion.div
                      animate={{ rotate: showTrash ? 90 : 0 }}
                      transition={{ duration: 0.15 }}
                      className="ml-auto"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {showTrash && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 space-y-1 px-1">
                          {trashPrompts.map(prompt => (
                            <div
                              key={prompt.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded bg-background-secondary group"
                            >
                              <span className="flex-1 text-xs text-foreground-muted truncate">
                                {prompt.title}
                              </span>
                              <button
                                onClick={() => restoreFromTrash(prompt)}
                                className="text-2xs text-accent hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Restore
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Manage in Dashboard CTA */}
              <div className="pt-4 pb-2">
                <a
                  href="https://rcp-dashboard.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-colors text-sm text-foreground-secondary hover:text-accent"
                >
                  <ExternalLink className="w-4 h-4" />
                  Manage in Dashboard
                </a>
                <p className="text-2xs text-foreground-muted text-center mt-2">
                  Manage subscriptions & organize your Quick Access menu
                </p>
              </div>
            </motion.div>
          ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={[...regularFolders.map(f => f.id), ...importedFolders.map(f => f.id)]}
              strategy={verticalListSortingStrategy}
            >
              <motion.div
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
                {regularFolders.map((folder) => (
                  <SortableFolder key={folder.id} folder={folder}>
                    <FolderContent
                      folder={folder}
                      isExpanded={expandedFolders.has(folder.id)}
                      expandedPrompts={expandedPrompts}
                      editingFolder={editingFolder}
                      editingPrompt={editingPrompt}
                      addingPromptToFolder={addingPromptToFolder}
                      newFolderName={newFolderName}
                      newPromptTitle={newPromptTitle}
                      newPromptText={newPromptText}
                      onToggleFolder={() => toggleFolder(folder.id)}
                      onTogglePrompt={togglePrompt}
                      onAddPrompt={() => {
                        if (!expandedFolders.has(folder.id)) {
                          setExpandedFolders(prev => new Set([...prev, folder.id]));
                        }
                        startAddPrompt(folder.id);
                      }}
                      onEditFolder={() => {
                        setEditingFolder(folder.id);
                        setNewFolderName(folder.name);
                      }}
                      onDeleteFolder={() => deleteFolder(folder)}
                      onEditPrompt={(prompt: Prompt) => {
                        setEditingPrompt(prompt.id);
                        setAddingPromptToFolder(folder.id);
                        setNewPromptTitle(prompt.title);
                        setNewPromptText(prompt.text);
                      }}
                      onDeletePrompt={(prompt: Prompt) => deletePrompt(folder, prompt)}
                      onCopyPrompt={copyPrompt}
                      setNewFolderName={setNewFolderName}
                      setNewPromptTitle={setNewPromptTitle}
                      setNewPromptText={setNewPromptText}
                      saveFolderEdit={saveFolderEdit}
                      cancelFolderEdit={cancelFolderEdit}
                      savePromptEdit={savePromptEdit}
                      cancelPromptEdit={cancelPromptEdit}
                    />
                  </SortableFolder>
                ))}

                {/* Imported folders section */}
                {importedFolders.length > 0 && (
                  <div className="pt-4">
                    <div className="text-xs font-medium text-foreground-muted px-1 mb-2">
                      Imported
                    </div>
                    {importedFolders.map((folder) => (
                      <SortableFolder key={folder.id} folder={folder}>
                        <FolderContent
                          folder={folder}
                          isExpanded={expandedFolders.has(folder.id)}
                          expandedPrompts={expandedPrompts}
                          editingFolder={editingFolder}
                          editingPrompt={editingPrompt}
                          addingPromptToFolder={addingPromptToFolder}
                          newFolderName={newFolderName}
                          newPromptTitle={newPromptTitle}
                          newPromptText={newPromptText}
                          onToggleFolder={() => toggleFolder(folder.id)}
                          onTogglePrompt={togglePrompt}
                          onAddPrompt={() => {
                            if (!expandedFolders.has(folder.id)) {
                              setExpandedFolders(prev => new Set([...prev, folder.id]));
                            }
                            startAddPrompt(folder.id);
                          }}
                          onEditFolder={() => {
                            setEditingFolder(folder.id);
                            setNewFolderName(folder.name);
                          }}
                          onDeleteFolder={() => deleteFolder(folder)}
                          onEditPrompt={(prompt: Prompt) => {
                            setEditingPrompt(prompt.id);
                            setAddingPromptToFolder(folder.id);
                            setNewPromptTitle(prompt.title);
                            setNewPromptText(prompt.text);
                          }}
                          onDeletePrompt={(prompt: Prompt) => deletePrompt(folder, prompt)}
                          onCopyPrompt={copyPrompt}
                          setNewFolderName={setNewFolderName}
                          setNewPromptTitle={setNewPromptTitle}
                          setNewPromptText={setNewPromptText}
                          saveFolderEdit={saveFolderEdit}
                          cancelFolderEdit={cancelFolderEdit}
                          savePromptEdit={savePromptEdit}
                          cancelPromptEdit={cancelPromptEdit}
                        />
                      </SortableFolder>
                    ))}
                  </div>
                )}

                {/* Subscribed folders section (read-only) */}
                {filteredSubscribedFolders.length > 0 && (
                  <div className="pt-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground-muted px-1 mb-2">
                      <Lock className="w-3 h-3" />
                      Subscribed
                    </div>
                    {filteredSubscribedFolders.map((folder) => (
                      <motion.div
                        key={folder.id}
                        className="folder-card mb-1"
                        variants={itemVariants}
                      >
                        <SubscribedFolderHeader
                          folder={folder}
                          isExpanded={expandedFolders.has(`subscribed_${folder.folder_id}`)}
                          onToggle={() => toggleFolder(`subscribed_${folder.folder_id}`)}
                        />

                        <AnimatePresence>
                          {expandedFolders.has(`subscribed_${folder.folder_id}`) && (
                            <motion.div
                              className="pb-2 overflow-hidden"
                              variants={accordionVariants}
                              initial="closed"
                              animate="open"
                              exit="closed"
                            >
                              {folder.prompts.map((prompt) => (
                                <SubscribedPromptItem
                                  key={prompt.id}
                                  prompt={prompt}
                                  isExpanded={expandedPrompts.has(`subscribed_${prompt.id}`)}
                                  onToggle={() => togglePrompt(`subscribed_${prompt.id}`)}
                                  onCopy={async () => {
                                    try {
                                      await navigator.clipboard.writeText(prompt.text);
                                      showToast('Copied to clipboard', 'success');
                                    } catch (error) {
                                      console.error('Clipboard error:', error);
                                      showToast('Failed to copy', 'error');
                                    }
                                  }}
                                />
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </SortableContext>

            {/* Drag Overlay - shows floating preview while dragging */}
            <DragOverlay dropAnimation={{
              duration: 200,
              easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              {activeFolder ? (
                <div className="folder-card dragging-overlay">
                  <FolderHeader
                    folder={activeFolder}
                    isExpanded={false}
                    onToggle={() => {}}
                    onAddPrompt={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                </div>
              ) : activePrompt ? (
                <div className="prompt-item dragging-overlay">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-foreground-muted" />
                    <span className="text-sm text-foreground-secondary">
                      {activePrompt.prompt.title}
                    </span>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          )}
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
