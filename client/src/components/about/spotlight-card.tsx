import { type MouseEvent, type ReactNode, useRef } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const SPOTLIGHT_GRADIENT =
  "radial-gradient(180px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), color-mix(in oklab, var(--chart-2) 12%, transparent), transparent 70%)"

/**
 * Card used on the About page. A soft spotlight glow follows the cursor while
 * hovering; on touch devices it stays invisible.
 */
export function SpotlightCard({ className, children }: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  function trackSpotlight(event: MouseEvent<HTMLDivElement>) {
    const card = cardRef.current
    if (!card) {
      return
    }
    const rect = card.getBoundingClientRect()
    card.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`)
    card.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`)
  }

  return (
    <Card
      ref={cardRef}
      onMouseMove={trackSpotlight}
      className={cn("group/spotlight relative", className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spotlight:opacity-100"
        style={{ background: SPOTLIGHT_GRADIENT }}
      />
      {children}
    </Card>
  )
}

interface SpotlightCardProps {
  className?: string
  children: ReactNode
}
