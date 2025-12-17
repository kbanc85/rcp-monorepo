import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-background hover:bg-accent-hover shadow-sm hover:shadow-md hover:shadow-accent/20",
        secondary:
          "bg-background-elevated text-foreground-secondary hover:bg-background-hover hover:text-foreground border border-border hover:border-border-hover",
        ghost:
          "text-foreground-secondary hover:bg-background-hover hover:text-foreground",
        destructive:
          "bg-error/10 text-error hover:bg-error/20 border border-error/20",
        outline:
          "border border-border bg-transparent hover:bg-background-hover hover:border-border-hover text-foreground-secondary hover:text-foreground",
        link:
          "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7 rounded-md px-3 text-xs",
        xs: "h-6 rounded-md px-2 text-xs",
        lg: "h-10 rounded-lg px-8",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  disableAnimation?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, disableAnimation = false, ...props }, ref) => {
    // When asChild is true, render Slot (no animation)
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        />
      )
    }

    // When animation is disabled, render regular button
    if (disableAnimation) {
      return (
        <button
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        />
      )
    }

    // Default: render motion button with tap feedback
    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
        {...(props as HTMLMotionProps<"button">)}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
