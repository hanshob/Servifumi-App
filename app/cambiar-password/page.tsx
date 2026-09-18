import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { ChangePasswordForm } from './change-password-form'

export const dynamic = 'force-dynamic'

export default async function CambiarPasswordPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return <ChangePasswordForm forced={session.user.mustChangePassword} />
}
