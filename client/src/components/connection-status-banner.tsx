import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const bannerVariants = cva("space-y-1 rounded-lg border p-3 text-sm", {
  variants: {
    variant: {
      success: "border-success/30 bg-success/5",
      error: "border-destructive/30 bg-destructive/5",
    },
  },
  defaultVariants: {
    variant: "success",
  },
})

type BannerVariant = NonNullable<VariantProps<typeof bannerVariants>["variant"]>

interface ConnectionStatusBannerProps {
  label: string
  message: React.ReactNode
  caption?: React.ReactNode
  variant?: BannerVariant
  className?: string
}

const BADGE_LABEL_SUFFIX: Record<BannerVariant, string> = {
  success: "Connected",
  error: "Connection Failed",
}

const MESSAGE_TONE: Record<BannerVariant, string> = {
  success: "text-foreground",
  error: "text-destructive",
}

export function ConnectionStatusBanner({
  label,
  message,
  caption,
  variant = "success",
  className,
}: ConnectionStatusBannerProps) {
  return (
    <div className={cn(bannerVariants({ variant }), className)}>
      <div className="flex items-center gap-2">
        <Badge
          variant={variant === "success" ? "default" : "destructive"}
          className={
            variant === "success"
              ? "bg-success/20 text-success-foreground"
              : undefined
          }
        >
          {label} {BADGE_LABEL_SUFFIX[variant]}
        </Badge>
        {caption && <span className="text-muted-foreground">{caption}</span>}
      </div>
      <p className={cn("font-mono", MESSAGE_TONE[variant])}>{message}</p>
    </div>
  )
}
