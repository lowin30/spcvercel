declare module 'react-big-calendar' {
  import { ComponentType, ReactNode } from 'react'

  export interface Views {
    MONTH: string
    WEEK: string
    WORK_WEEK: string
    DAY: string
    AGENDA: string
  }

  export const Views: Views

  export interface CalendarProps<T> {
    localizer: any
    events: T[]
    startAccessor?: string | ((event: T) => Date)
    endAccessor?: string | ((event: T) => Date)
    style?: React.CSSProperties
    className?: string
    culture?: string
    defaultView?: string
    views?: Record<string, boolean> | undefined
    components?: {
      event?: ComponentType<any>
      toolbar?: ComponentType<any>
      month?: {
        dateHeader?: ComponentType<any>
      }
    }
    onSelectEvent?: (event: T, e: React.SyntheticEvent) => void
    messages?: {
      today?: string
      previous?: string
      next?: string
      month?: string
      week?: string
      day?: string
      agenda?: string
      date?: string
      time?: string
      event?: string
      noEventsInRange?: string
      showMore?: (total: number) => string
    }
  }

  export class Calendar<T> extends React.Component<CalendarProps<T>> {}
  export function dateFnsLocalizer(config: any): any
}
