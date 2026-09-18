'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Option { value: string; label: string; hint?: string }

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Seleccionar...',
  max,
  maxMessage,
}: {
  options: Option[]
  selected: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  max?: number
  maxMessage?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val))
    } else {
      if (max && selected.length >= max) return
      onChange([...selected, val])
    }
  }

  const selectedOpts = options.filter((o) => selected.includes(o.value))

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm min-h-10 text-left"
      >
        <span className="flex flex-wrap gap-1 flex-1">
          {selectedOpts.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
          {selectedOpts.map((o) => (
            <span key={o.value} className="inline-flex items-center gap-1 rounded bg-primary/10 text-primary px-1.5 py-0.5 text-xs">
              {o.label}
              <X className="h-3 w-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggle(o.value) }} />
            </span>
          ))}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-md border bg-card shadow-lg z-50 py-1">
          {max && selected.length >= max && (
            <p className="px-3 py-1.5 text-xs text-amber-600">{maxMessage ?? `Máximo ${max} seleccionados.`}</p>
          )}
          {options.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Sin opciones</p>}
          {options.map((o) => {
            const isSel = selected.includes(o.value)
            const disabled = !isSel && !!max && selected.length >= max
            return (
              <button
                key={o.value}
                type="button"
                disabled={disabled}
                onClick={() => toggle(o.value)}
                className={cn('flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted', disabled && 'opacity-40 cursor-not-allowed')}
              >
                <span className={cn('flex h-4 w-4 items-center justify-center rounded border', isSel ? 'bg-primary border-primary text-primary-foreground' : 'border-input')}>
                  {isSel && <Check className="h-3 w-3" />}
                </span>
                <span className="flex-1">{o.label}</span>
                {o.hint && <span className="text-xs text-muted-foreground">{o.hint}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
