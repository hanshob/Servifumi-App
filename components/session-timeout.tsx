'use client'

import { useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'

// Auto-logout after 1 hour of inactivity.
const TIMEOUT_MS = 60 * 60 * 1000

export function SessionTimeout() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        signOut({ redirectTo: '/login?expired=1' })
      }, TIMEOUT_MS)
    }
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset))
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return null
}
