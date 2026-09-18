import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { AppNav } from '@/components/app-nav'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.estado !== 'Activo') redirect('/login')
  if (session.user.mustChangePassword) redirect('/cambiar-password')

  return (
    <AppNav
      role={session.user.role}
      nombre={session.user.nombreCompleto}
      username={session.user.username}
    >
      {children}
    </AppNav>
  )
}
