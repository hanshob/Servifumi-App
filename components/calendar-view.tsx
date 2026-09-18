'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, EventDropArg, DateSelectArg, DatesSetArg, EventContentArg } from '@fullcalendar/core'

export interface CalEvent {
  id: string
  title: string
  start: string
  color: string
  recurrente: boolean
  hora: string
  tecnicos: string
  tipos: string
}

export default function CalendarView({
  events,
  onEventClick,
  onSelect,
  onEventDrop,
  onRange,
}: {
  events: CalEvent[]
  onEventClick: (id: string) => void
  onSelect: (iso: string) => void
  onEventDrop: (id: string, iso: string) => void
  onRange: (desde: string, hasta: string) => void
}) {
  return (
    <div className="rounded-lg bg-card shadow-sm p-3 sm:p-4 servifumi-calendar">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        timeZone="UTC"
        locale="es"
        firstDay={1}
        height="auto"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' }}
        buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Agenda' }}
        events={events.map((e) => ({ id: e.id, title: e.title, start: e.start, backgroundColor: e.color, borderColor: e.color, extendedProps: { recurrente: e.recurrente, hora: e.hora, tecnicos: e.tecnicos, tipos: e.tipos } }))}
        editable
        selectable
        dayMaxEvents={3}
        nowIndicator
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        eventClick={(arg: EventClickArg) => onEventClick(arg.event.id)}
        select={(arg: DateSelectArg) => onSelect(arg.startStr)}
        eventDrop={(arg: EventDropArg) => { if (arg.event.start) onEventDrop(arg.event.id, arg.event.start.toISOString()) }}
        datesSet={(arg: DatesSetArg) => onRange(arg.start.toISOString(), arg.end.toISOString())}
        eventContent={(arg: EventContentArg) => {
          const p = arg.event.extendedProps as { recurrente: boolean; hora: string; tecnicos: string; tipos: string }
          return (
            <div className="px-1 py-0.5 overflow-hidden text-[11px] leading-tight">
              <div className="font-semibold truncate">{p.recurrente ? '↺ ' : ''}{p.hora} {arg.event.title}</div>
              {p.tipos && <div className="truncate opacity-90">{p.tipos}</div>}
              {p.tecnicos && <div className="truncate opacity-80">{p.tecnicos}</div>}
            </div>
          )
        }}
      />
    </div>
  )
}
