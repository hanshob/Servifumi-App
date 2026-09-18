'use client'

import { Input } from '@/components/ui/input'

// 30-minute interval suggestions, but free text allowed.
function buildTimes(): string[] {
  const out: string[] = []
  for (let h = 6; h <= 20; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return out
}
const TIMES = buildTimes()

export function TimeInput({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  return (
    <>
      <Input id={id} type="text" list="time-options" value={value} onChange={(e) => onChange(e.target.value)} placeholder="08:00" />
      <datalist id="time-options">
        {TIMES.map((t) => <option key={t} value={t} />)}
      </datalist>
    </>
  )
}
