import { supabase } from '../lib/supabase'
import { upsertWeeklyReport } from '../lib/db'

let _cachedUserId = 'guest'
supabase.auth.getSession().then(({ data: { session } }) => {
  _cachedUserId = session?.user?.id || 'guest'
})
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedUserId = session?.user?.id || 'guest'
})

const KEY = () => `defit_reports_${_cachedUserId}`

export function getWeeks() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY()))
    // Support both old format (array) and new format ({ weeks: [] })
    if (Array.isArray(raw)) return raw
    return raw?.weeks || []
  } catch { return [] }
}

export function saveWeek(week) {
  const weeks = getWeeks()
  const idx = weeks.findIndex(w => w.id === week.id)
  if (idx >= 0) weeks[idx] = week
  else weeks.unshift(week)
  localStorage.setItem(KEY(), JSON.stringify({ weeks }))
  // Sync to Supabase (fire-and-forget)
  if (_cachedUserId !== 'guest') {
    upsertWeeklyReport(_cachedUserId, week).catch(() => {})
  }
}

export function getDayFromReports(dateStr) {
  for (const week of getWeeks()) {
    const day = week.days?.find(d => d.date === dateStr)
    if (day) return { ...day, weekLabel: week.label }
  }
  return null
}

export function getAllDays() {
  return getWeeks().flatMap(w => w.days || [])
}

export function getDatesWithData() {
  return new Set(getAllDays().map(d => d.date))
}
