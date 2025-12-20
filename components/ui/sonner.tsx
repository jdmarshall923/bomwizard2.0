"use client"

import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--bg-elevated)] group-[.toaster]:text-[var(--text-primary)] group-[.toaster]:border-[var(--border-default)] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-[var(--text-secondary)]",
          actionButton:
            "group-[.toast]:bg-[var(--accent-blue)] group-[.toast]:text-[var(--text-primary)]",
          cancelButton:
            "group-[.toast]:bg-[var(--bg-tertiary)] group-[.toast]:text-[var(--text-secondary)]",
          success: "group-[.toaster]:border-[var(--accent-green)]/30",
          error: "group-[.toaster]:border-[var(--accent-red)]/30",
          warning: "group-[.toaster]:border-[var(--accent-orange)]/30",
          info: "group-[.toaster]:border-[var(--accent-blue)]/30",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
