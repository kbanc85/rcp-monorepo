import * as React from "react"
import { motion } from "framer-motion"
import { FolderOpen, Search, FileText } from "lucide-react"
import { cn } from "@rcp/utils"
import { Button } from "./button"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  variant?: 'default' | 'compact'
  className?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className
}: EmptyStateProps) {
  const isCompact = variant === 'compact'

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        isCompact ? "py-4 px-3" : "py-8 px-6",
        className
      )}
    >
      {icon && (
        <motion.div
          variants={itemVariants}
          className={cn(
            "flex items-center justify-center rounded-xl bg-background-tertiary",
            isCompact ? "w-10 h-10 mb-2" : "w-14 h-14 mb-4"
          )}
        >
          <div className={cn(
            "text-foreground-muted",
            isCompact ? "[&>svg]:w-5 [&>svg]:h-5" : "[&>svg]:w-7 [&>svg]:h-7"
          )}>
            {icon}
          </div>
        </motion.div>
      )}

      <motion.h3
        variants={itemVariants}
        className={cn(
          "font-medium text-foreground",
          isCompact ? "text-sm" : "text-base"
        )}
      >
        {title}
      </motion.h3>

      {description && (
        <motion.p
          variants={itemVariants}
          className={cn(
            "text-foreground-muted mt-1",
            isCompact ? "text-xs" : "text-sm"
          )}
        >
          {description}
        </motion.p>
      )}

      {action && (
        <motion.div variants={itemVariants} className="mt-4">
          <Button
            variant="secondary"
            size={isCompact ? "sm" : "default"}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}

// Pre-configured empty states for common scenarios
export function EmptyFolderState({ onAddPrompt }: { onAddPrompt: () => void }) {
  return (
    <EmptyState
      icon={<FileText />}
      title="No prompts yet"
      description="Add your first prompt to this folder"
      action={{
        label: "Add Prompt",
        onClick: onAddPrompt
      }}
      variant="compact"
    />
  )
}

export function EmptySearchState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<Search />}
      title="No results found"
      description={`No prompts match "${query}"`}
      variant="default"
    />
  )
}

export function EmptyPromptListState({ onAddFolder }: { onAddFolder: () => void }) {
  return (
    <EmptyState
      icon={<FolderOpen />}
      title="No folders yet"
      description="Create a folder to organize your prompts"
      action={{
        label: "New Folder",
        onClick: onAddFolder
      }}
      variant="default"
    />
  )
}
