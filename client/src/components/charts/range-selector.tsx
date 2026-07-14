import { TIME_RANGES, type TimeRange } from "@/lib/chart-time"

interface RangeSelectorProps {
  selected: TimeRange
  onSelect: (r: TimeRange) => void
}

/** Time-range button group shared by the portfolio performance and market price charts. */
export function RangeSelector({ selected, onSelect }: RangeSelectorProps) {
  return (
    <div className="flex gap-1">
      {TIME_RANGES.map(({ label }) => (
        <button
          key={label}
          type="button"
          aria-pressed={selected === label}
          onClick={() => onSelect(label)}
          className={[
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            selected === label
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
