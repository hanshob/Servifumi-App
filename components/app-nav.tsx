'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, CalendarDays, Users, FileText, ClipboardList, ScrollText,
  Settings, UserCog, CalendarRange, Menu, X, LogOut, KeyRound, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SessionTimeout } from '@/components/session-timeout'
import { GlobalSearch } from '@/components/global-search'
import { PerfilModal } from '@/components/perfil-modal'
import { SinConducePopup } from '@/components/sin-conduce-popup'

interface NavItem { href: string; label: string; icon: React.ComponentType<{ className?: string }>; roles: string[] }

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Gerente General', 'Administración'] },
  { href: '/calendario', label: 'Calendario', icon: CalendarDays, roles: ['Gerente General', 'Administración'] },
  { href: '/clientes', label: 'Clientes', icon: Users, roles: ['Gerente General', 'Administración'] },
  { href: '/contratos', label: 'Contratos', icon: FileText, roles: ['Gerente General', 'Administración'] },
  { href: '/programacion', label: 'Programación', icon: ClipboardList, roles: ['Gerente General', 'Administración'] },
  { href: '/conduces', label: 'Conduces', icon: ScrollText, roles: ['Gerente General', 'Administración'] },
  { href: '/agenda', label: 'Agenda Semanal', icon: CalendarRange, roles: ['Supervisor'] },
  { href: '/configuracion', label: 'Configuración', icon: Settings, roles: ['Gerente General', 'Administración'] },
  { href: '/usuarios', label: 'Usuarios', icon: UserCog, roles: ['Gerente General'] },
]

export function AppNav({ role, nombre, username, children }: { role: string; nombre: string; username: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [perfilOpen, setPerfilOpen] = useState(false)
  const items = NAV.filter((i) => i.roles.includes(role))
  const isStaff = role !== 'Supervisor'

  const initials = (nombre || username || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()

  const Sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-primary-foreground/10">
        <Image src="/logo-servifumi.jpg" alt="Servifumi" width={40} height={40} className="rounded-md" />
        <div className="leading-tight">
          <div className="font-display font-bold text-primary-foreground text-sm">Servifumi</div>
          <div className="text-[10px] text-primary-foreground/70">Pest Control</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-primary-foreground text-primary shadow-sm' : 'text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground',
              )}>
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="px-4 py-3 border-t border-primary-foreground/10">
        <p className="text-[11px] italic text-primary-foreground/60">Somos parte activa de la solución</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-muted/30">
      <SessionTimeout />
      {isStaff && <SinConducePopup />}
      {perfilOpen && <PerfilModal onClose={() => setPerfilOpen(false)} />}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 bg-primary flex-col z-30">{Sidebar}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-60 bg-primary">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 text-primary-foreground/80"><X className="h-5 w-5" /></button>
            {Sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/90 backdrop-blur px-4 lg:px-6">
          <button className="lg:hidden text-foreground" onClick={() => setMobileOpen(true)}><Menu className="h-6 w-6" /></button>
          {isStaff && <div className="flex-1 max-w-md"><GlobalSearch /></div>}
          <div className="flex-1" />
          <div className="relative">
            <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 hover:bg-muted transition-colors">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">{initials}</span>
              <span className="hidden sm:block text-sm font-medium max-w-[140px] truncate">{nombre || username}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-md border bg-card shadow-lg z-20 py-1.5">
                  <div className="px-3 py-2 border-b">
                    <p className="text-sm font-medium truncate">{nombre || username}</p>
                    <p className="text-xs text-muted-foreground">{role}</p>
                  </div>
                  <button onClick={() => { setMenuOpen(false); setPerfilOpen(true) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                    <KeyRound className="h-4 w-4" /> Cambiar contraseña
                  </button>
                  <button onClick={() => signOut({ redirectTo: '/login' })} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-muted">
                    <LogOut className="h-4 w-4" /> Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="p-4 lg:p-6 max-w-[1200px] mx-auto">{children}</main>
      </div>
    </div>
  )
}
