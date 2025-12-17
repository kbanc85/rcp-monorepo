import type { Transition, Variants } from 'framer-motion'

// Reusable easing transition config
export const defaultTransition: Transition = {
  duration: 0.2,
  ease: [0.25, 0.1, 0.25, 1]
}

// Softer transition for larger movements
export const softTransition: Transition = {
  duration: 0.25,
  ease: [0.25, 0.1, 0.25, 1]
}

// Quick transition for micro-interactions
export const quickTransition: Transition = {
  duration: 0.15,
  ease: [0.25, 0.1, 0.25, 1]
}

// Container variants for staggered lists
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1
    }
  }
}

// Item variants for staggered list children
export const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.98
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: defaultTransition
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: { duration: 0.15 }
  }
}

// Folder accordion expand/collapse
export const accordionVariants: Variants = {
  closed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.2 },
      opacity: { duration: 0.1 }
    }
  },
  open: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
      opacity: { duration: 0.15, delay: 0.05 }
    }
  }
}

// Prompt content accordion (inner content)
export const promptContentVariants: Variants = {
  closed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.15 },
      opacity: { duration: 0.1 }
    }
  },
  open: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
      opacity: { duration: 0.15, delay: 0.05 }
    }
  }
}

// Icon swap animation (Copy -> Check)
export const iconSwapVariants: Variants = {
  initial: {
    scale: 0.5,
    opacity: 0,
    rotate: -45
  },
  animate: {
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  exit: {
    scale: 0.5,
    opacity: 0,
    rotate: 45,
    transition: { duration: 0.1 }
  }
}

// Modal overlay animations
export const modalOverlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 }
  }
}

// Modal content animations
export const modalContentVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 10
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15 }
  }
}

// Toast notification animations
export const toastVariants: Variants = {
  initial: {
    opacity: 0,
    y: -20,
    scale: 0.95
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.15 }
  }
}

// Shake animation for delete confirmations
export const shakeVariants: Variants = {
  initial: { rotate: 0 },
  animate: {
    rotate: [0, -8, 8, -5, 5, -2, 2, 0],
    transition: {
      duration: 0.5,
      delay: 0.1,
      ease: "easeInOut"
    }
  }
}

// Button tap feedback (use with whileTap/whileHover props)
export const tapFeedback = {
  whileTap: { scale: 0.97 },
  whileHover: { scale: 1.02 },
  transition: { duration: 0.1, ease: "easeOut" }
}

// Subtle tap for smaller buttons
export const subtleTapFeedback = {
  whileTap: { scale: 0.95 },
  whileHover: { scale: 1.05 },
  transition: { duration: 0.1, ease: "easeOut" }
}

// Icon button tap feedback
export const iconTapFeedback = {
  whileTap: { scale: 0.9 },
  whileHover: { scale: 1.1 },
  transition: { duration: 0.1, ease: "easeOut" }
}

// Fade in/out simple
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
}

// Scale in from small
export const scaleInVariants: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: quickTransition
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.1 }
  }
}

// Slide up from bottom
export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: defaultTransition
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { duration: 0.15 }
  }
}

// Page transition variants
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 }
  }
}
