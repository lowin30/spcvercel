// Format a date to a localized string (Argentina)
export function formatDate(dateString: string): string {
  if (!dateString) return ""

  const clean = dateString.trim().split("T")[0]
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [year, month, day] = clean.split("-").map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(date)
  }

  const date = new Date(dateString)
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

// Format a date to a short format (DD/MM/YYYY)
export function formatShortDate(dateString: string): string {
  if (!dateString) return ""
  return formatDate(dateString)
}

// Format a date with time (DD/MM/YYYY HH:MM)
export function formatDateTime(dateString: string): string {
  if (!dateString) return ""

  const date = new Date(dateString)
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

