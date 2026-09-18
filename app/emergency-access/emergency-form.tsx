'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export function EmergencyForm() {
  const [token, setToken] = useState('')
  const [nueva, setNueva] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setMsg(null)
    try {
      const res = await fetch('/api/emergency-access', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, new_password: nueva }),
      })
      if (res.ok) {
        setMsg({ type: 'ok', text: 'Contraseña del Gerente General restablecida correctamente.' })
        setToken(''); setNueva('')
      } else {
        setMsg({ type: 'err', text: 'Token inválido.' })
      }
    } catch {
      setMsg({ type: 'err', text: 'Token inválido.' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-8" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <h1 className="text-xl font-display font-bold mb-1 tracking-tight">Acceso de emergencia</h1>
        <p className="text-sm text-muted-foreground mb-6">Restablecer contraseña del Gerente General.</p>
        {msg && (
          <div className={`rounded-md p-3 mb-4 text-sm ${msg.type === 'ok' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
            {msg.text}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="token">Token de emergencia</Label>
            <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nueva">Nueva contraseña</Label>
            <Input id="nueva" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Restablecer
          </Button>
        </form>
      </div>
    </div>
  )
}
