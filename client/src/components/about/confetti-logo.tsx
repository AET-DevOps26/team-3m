import confetti from "canvas-confetti"
import { type MouseEvent, useState } from "react"
import { cn } from "@/lib/utils"

const CONFETTI_PARTICLE_COUNT = 120
const CONFETTI_SPREAD_DEGREES = 75
const CONFETTI_START_VELOCITY = 30

/**
 * Kontor logo on the About page. Clicking it spins the logo once and fires a
 * confetti burst from the logo's position.
 */
export function ConfettiLogo({ className }: ConfettiLogoProps) {
  const [isSpinning, setIsSpinning] = useState(false)

  function celebrate(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    setIsSpinning(true)
    void confetti({
      particleCount: CONFETTI_PARTICLE_COUNT,
      spread: CONFETTI_SPREAD_DEGREES,
      startVelocity: CONFETTI_START_VELOCITY,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      },
    })
  }

  return (
    <button
      type="button"
      onClick={celebrate}
      aria-label="Celebrate Kontor"
      className={cn(
        "rounded-lg outline-none transition-transform hover:scale-110 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      <img
        src="/kontor_v3.png"
        alt=""
        className={cn(
          "size-10 sm:size-12",
          isSpinning && "animate-logo-spin motion-reduce:animate-none",
        )}
        onAnimationEnd={() => setIsSpinning(false)}
      />
    </button>
  )
}

interface ConfettiLogoProps {
  className?: string
}
