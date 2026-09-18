'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Lock, User } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (params?.get('expired')) {
      toast.error('Tu sesión ha expirado por inactividad.')
    }
  }, [params])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      toast.error('Ingresa usuario y contraseña.')
      return
    }
    setLoading(true)
    try {
      const res = await signIn('credentials', {
        username: username.trim().toLowerCase(),
        password,
        redirect: false,
      })
      if (res?.error) {
        toast.error('Usuario o contraseña incorrectos.')
        setLoading(false)
        return
      }
      toast.success('Bienvenido a Servifumi')
      router.replace('/')
    } catch {
      toast.error('Error al iniciar sesión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-8" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-56 h-24 mb-2">
              <Image src="/logo-servifumi.jpg" alt="Servifumi Pest Control" fill className="object-contain" priority />
            </div>
            <p className="text-sm text-muted-foreground text-center italic">Somos parte activa de la solución</p>
          </div>
          <h1 className="text-xl font-display font-bold text-center mb-1 tracking-tight">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">Sistema de gestión operativa</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Usuario</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="usuario" className="pl-9" autoComplete="username" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••" className="pl-9" autoComplete="current-password" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">Servifumi Pest Control — Santo Domingo, R.D.</p>
      </div>
    </div>
  )
}
