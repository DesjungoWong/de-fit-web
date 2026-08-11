import { getCurrentUser } from './authStore'

function userId() { return getCurrentUser()?.id || 'guest' }
const KEY = () => `defit_reports_${userId()}`

export function getWeeks() {
  try { return JSON.parse(localStorage.getItem(KEY())) || [] } catch { return [] }
}

export function saveWeek(week) {
  const weeks = getWeeks()
  const idx = weeks.findIndex(w => w.id === week.id)
  if (idx >= 0) weeks[idx] = week
  else weeks.unshift(week)
  localStorage.setItem(KEY(), JSON.stringify(weeks))
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

export function reinitReportsForUser() {
  // no-op, store reads from KEY() on demand
}
