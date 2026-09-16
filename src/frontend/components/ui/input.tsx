import * as React from "react"

import { cn } from "@/lib/utils"

function cleanLeadingZero(val: string): string {
  if (typeof val !== "string") return val
  // Preserves decimals: "0.5", "0,5", ".5", ",5"
  if (/^0[,.]/.test(val) || /^[,\.]/.test(val)) return val
  // If it's single "0", keep it
  if (val === "0") return val
  // If it starts with 0 or multiple 0s followed by other digits ("010000", "0213", "007", "00")
  if (/^(-?)0+[0-9]/.test(val)) {
    return val.replace(/^(-?)0+(?=\d)/, "$1")
  }
  return val
}

function Input({
  className,
  type,
  value,
  defaultValue,
  onChange,
  onFocus,
  ...props
}: React.ComponentProps<"input">) {
  const isNumeric =
    type === "number" ||
    props.inputMode === "numeric" ||
    props.inputMode === "decimal"

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isNumeric && e.target.value) {
      const raw = e.target.value
      const cleaned = cleanLeadingZero(raw)
      if (cleaned !== raw) {
        e.target.value = cleaned
      }
    }
    onChange?.(e)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (isNumeric) {
      // Auto-select if current value is 0 or "0", so pengguna typing immediately replaces it
      if (e.currentTarget.value === "0" || (e.currentTarget.value as any) === 0) {
        e.currentTarget.select()
      }
    }
    onFocus?.(e)
  }

  // Sanitize controlled string values with leading zeros (e.g. "010000" -> "10000")
  let displayValue = value
  if (isNumeric && typeof value === "string") {
    displayValue = cleanLeadingZero(value)
  }

  return (
    <input
      type={type}
      data-slot="input"
      value={displayValue}
      defaultValue={defaultValue}
      onChange={handleChange}
      onFocus={handleFocus}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
