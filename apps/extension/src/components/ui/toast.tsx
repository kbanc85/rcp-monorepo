import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, AlertCircle, Info, X } from "lucide-react"
import { cn } from "@rcp/utils"
import { toastVariants } from "@rcp/utils"

export type ToastType = 'success' | 'error' | 'info'

export interface ToastData {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastProps extends ToastData {
  onDismiss: (id: string) => void
}

const icons = {
  success: Check,
  error: AlertCircle,
  info: Info
}

function Toast({ id, message, type, duration = 2500, onDismiss }: ToastProps) {
  const Icon = icons[type]
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const startTime = Date.now()
    const endTime = startTime + duration

    const updateProgress = () => {
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      const percent = (remaining / duration) * 100
      setProgress(percent)

      if (remaining > 0) {
        requestAnimationFrame(updateProgress)
      } else {
        onDismiss(id)
      }
    }

    const animationId = requestAnimationFrame(updateProgress)
    return () => cancelAnimationFrame(animationId)
  }, [id, duration, onDismiss])

  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onClick={() => onDismiss(id)}
      className={cn(
        "relative flex items-center gap-2.5 px-4 py-3 rounded-xl cursor-pointer",
        "bg-background-elevated/95 backdrop-blur-lg border shadow-elevated",
        "text-sm font-medium text-foreground",
        "overflow-hidden",
        type === 'success' && "border-success/30",
        type === 'error' && "border-error/30",
        type === 'info' && "border-accent/30"
      )}
    >
      <Icon
        className={cn(
          "w-4 h-4 flex-shrink-0",
          type === 'success' && "text-success",
          type === 'error' && "text-error",
          type === 'info' && "text-accent"
        )}
      />
      <span className="flex-1">{message}</span>
      <X className="w-3.5 h-3.5 text-foreground-muted hover:text-foreground transition-colors" />

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border/30">
        <motion.div
          className={cn(
            "h-full",
            type === 'success' && "bg-success",
            type === 'error' && "bg-error",
            type === 'info' && "bg-accent"
          )}
          initial={{ width: "100%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.05, ease: "linear" }}
        />
      </div>
    </motion.div>
  )
}

interface ToastContainerProps {
  toasts: ToastData[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-auto">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Hook for managing toast state
export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    duration: number = 2500
  ) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type, duration }])
    return id
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    setToasts([])
  }, [])

  return {
    toasts,
    showToast,
    dismissToast,
    dismissAll
  }
}

// Simple single-toast variant for backwards compatibility
interface SimpleToastProps {
  message: string
  type: ToastType
  visible: boolean
  duration?: number
  onDismiss?: () => void
}

export function SimpleToast({ message, type, visible, duration = 2500, onDismiss }: SimpleToastProps) {
  const Icon = icons[type]
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (!visible) {
      setProgress(100)
      return
    }

    const startTime = Date.now()
    const endTime = startTime + duration

    const updateProgress = () => {
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      const percent = (remaining / duration) * 100
      setProgress(percent)

      if (remaining > 0) {
        requestAnimationFrame(updateProgress)
      }
    }

    const animationId = requestAnimationFrame(updateProgress)
    return () => cancelAnimationFrame(animationId)
  }, [visible, duration])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          variants={toastVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onDismiss}
          className={cn(
            "fixed top-4 left-1/2 -translate-x-1/2 z-50",
            "flex items-center gap-2.5 px-4 py-3 rounded-xl cursor-pointer",
            "bg-background-elevated/95 backdrop-blur-lg border shadow-elevated",
            "text-sm font-medium text-foreground",
            "overflow-hidden",
            type === 'success' && "border-success/30",
            type === 'error' && "border-error/30",
            type === 'info' && "border-accent/30"
          )}
        >
          <Icon
            className={cn(
              "w-4 h-4 flex-shrink-0",
              type === 'success' && "text-success",
              type === 'error' && "text-error",
              type === 'info' && "text-accent"
            )}
          />
          <span>{message}</span>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border/30">
            <motion.div
              className={cn(
                "h-full",
                type === 'success' && "bg-success",
                type === 'error' && "bg-error",
                type === 'info' && "bg-accent"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
