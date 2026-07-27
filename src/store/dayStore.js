const KEY = 'defit_day_' + new Date().toISOString().slice(0, 10)
const defaults = { kcalTarget: 1780, kcalLogged: 0, protein: 0, carbs: 0, fat: 0, items: [] }

export function getDay() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { ...defaults } }
  catch { return { ...defaults } }
}

export function saveDay(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
}

export function logItem(state, item) {
  const next = {
    ...state,
    kcalLogged: state.kcalLogged + (item.kcal || 0),
    protein: state.protein + (item.protein || 0),
    carbs: state.carbs + (item.carbs || 0),
    fat: state.fat + (item.fat || 0),
    items: [...state.items, { ...item, loggedAt: Date.now() }]
  }
  saveDay(next)
  return next
}

export function getSettings() {
  try { return JSON.parse(localStorage.getItem('defit_settings')) || {} }
  catch { return {} }
}

export function saveSettings(s) {
  try { localStorage.setItem('defit_settings', JSON.stringify(s)) } catch {}
}
