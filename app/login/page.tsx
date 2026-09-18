import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) {
    if (session.user.mustChangePassword) redirect('/cambiar-password')
    redirect('/')
  }
  return <LoginForm />
}
