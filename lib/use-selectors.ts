'use client'

import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

export interface Selectors {
  personal: { id: string; nombre_completo: string; puesto: string }[]
  vehiculos: { id: number; identificador: string; apodo: string }[]
  tipos: { id: number; nombre: string }[]
}

export function useSelectors() {
  const { data } = useSWR<Selectors>('/api/selectors', fetcher)
  return {
    personal: data?.personal ?? [],
    vehiculos: data?.vehiculos ?? [],
    tipos: data?.tipos ?? [],
  }
}
