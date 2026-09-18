import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

// Supervisors have no access to operational modules — send them to the weekly agenda.
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role === 'Supervisor') redirect('/agenda')
  return <>{children}</>
}
