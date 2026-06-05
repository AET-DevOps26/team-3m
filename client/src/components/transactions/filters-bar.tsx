import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DATE_PRESETS,
  type Filters,
  hasActiveFilters,
} from "./transaction-filters"

const ALL_VALUE = "_all"

export interface FiltersBarProps {
  filters: Filters
  categories: string[]
  types: string[]
  onChange: (patch: Partial<Filters>) => void
  onReset: () => void
}

export function FiltersBar({
  filters,
  categories,
  types,
  onChange,
  onReset,
}: FiltersBarProps) {
  const isActive = hasActiveFilters(filters)

  return (
    <div className="space-y-3 pb-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, counterparty, description…"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="pl-8"
        />
      </div>

      <div className="flex gap-2">
        <Select
          value={filters.category === "" ? ALL_VALUE : filters.category}
          onValueChange={(v) =>
            onChange({ category: v === ALL_VALUE ? "" : v })
          }
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.type === "" ? ALL_VALUE : filters.type}
          onValueChange={(v) => onChange({ type: v === ALL_VALUE ? "" : v })}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {DATE_PRESETS.map(({ label, value }) => (
          <Button
            key={value}
            variant={filters.datePreset === value ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ datePreset: value })}
          >
            {label}
          </Button>
        ))}
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="ml-auto gap-1 text-muted-foreground"
          >
            <X className="size-3" />
            Clear
          </Button>
        )}
      </div>

      {filters.datePreset === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.customFrom}
            onChange={(e) => onChange({ customFrom: e.target.value })}
            className="flex-1"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="date"
            value={filters.customTo}
            onChange={(e) => onChange({ customTo: e.target.value })}
            className="flex-1"
          />
        </div>
      )}
    </div>
  )
}
