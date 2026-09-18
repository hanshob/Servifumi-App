import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.mustChangePassword) redirect('/cambiar-password')
  if (session.user.role === 'Supervisor') redirect('/agenda')
  redirect('/dashboard')
}
