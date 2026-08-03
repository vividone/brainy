/** Local-day helpers. Streaks must follow the child's calendar, not UTC. */

export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function daysBetween(a: string, b: string): number {
  const ms = parseDayKey(b).getTime() - parseDayKey(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** The last `n` day keys, oldest first, ending today. */
export function recentDays(n: number, from: Date = new Date()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from)
    d.setDate(d.getDate() - i)
    out.push(dayKey(d))
  }
  return out
}

export function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60000)
  if (mins < 1) return 'under a minute'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  return `${h} hr ${mins % 60} min`
}

export function friendlyDate(ms: number): string {
  const today = dayKey()
  const key = dayKey(new Date(ms))
  const diff = daysBetween(key, today)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  return parseDayKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
