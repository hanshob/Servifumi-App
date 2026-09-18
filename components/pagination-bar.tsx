'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function PaginationBar({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil((total ?? 0) / (pageSize || 1)))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
      <p className="text-xs text-muted-foreground">
        Mostrando <span className="font-medium text-foreground">{from}</span>–<span className="font-medium text-foreground">{to}</span> de <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        <span className="text-sm px-2">Página {page} de {totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Siguiente <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
