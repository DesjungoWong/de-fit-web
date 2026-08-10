import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { upsertDayLog, upsertSettings, upsertHealth } from '../lib/db'

function userId() {
  // Uses Supabase's cached session (synchronous after initial hydration)
  return supabase.auth.getUser ? _cachedUserId : 'guest'
}

// Supabase user ID cache — avoids awaiting getUser() on every keystroke
let _cachedUserId = 'guest'
supabase.auth.getSession().then(({ data: { session } }) => {
  _cachedUserId = session?.user?.id || 'guest'
})
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedUserId = session?.user?.id || 'guest'
})

const DAY_KEY = () => `defit_day_${_cachedUserId}_${new Date().toISOString().slice(0, 10)}`
const SETTINGS_KEY = () => `defit_settings_${_cachedUserId}`
const HEALTH_KEY = () => `defit_health_${_cachedUserId}`

function loadDay() {
  try {
    return JSON.parse(localStorage.getItem(DAY_KEY())) || { entries: [], calorieGoal: 1800 }
  } catch {
    return { entries: [], calorieGoal: 1800 }
  }
}

function loadHealth() {
  try {
    return JSON.parse(localStorage.getItem(HEALTH_KEY())) || {}
  } catch {
    return {}
  }
}

// Module-level state
let _dayState = loadDay()
let _healthState = loadHealth()
let _listeners = []

function notify() {
  _listeners.forEach(fn => fn())
}

// Called by App when user switches so store reloads from the new user's keys
export function reinitForUser() {
  _dayState = loadDay()
  _healthState = loadHealth()
  notify()
}

// ── Supabase sync helpers (fire-and-forget) ────────────────────────────────
function syncDay() {
  if (_cachedUserId === 'guest') return
  const dateStr = new Date().toISOString().slice(0, 10)
  upsertDayLog(_cachedUserId, dateStr, _dayState).catch(() => {})
}

function syncHealth() {
  if (_cachedUserId === 'guest') return
  upsertHealth(_cachedUserId, _healthState).catch(() => {})
}

function syncSettingsNow(s) {
  if (_cachedUserId === 'guest') return
  upsertSettings(_cachedUserId, s).catch(() => {})
}

// ── React hook ────────────────────────────────────────────────────────────
export function useDayStore() {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1)
    _listeners.push(listener)
    return () => { _listeners = _listeners.filter(l => l !== listener) }
  }, [])

  const addEntry = useCallback((entry) => {
    _dayState = {
      ..._dayState,
      entries: [..._dayState.entries, { ...entry, id: Date.now(), pax: 1, loggedAt: Date.now() }]
    }
    localStorage.setItem(DAY_KEY(), JSON.stringify(_dayState))
    syncDay()
    notify()
  }, [])

  const removeEntry = useCallback((id) => {
    _dayState = { ..._dayState, entries: _dayState.entries.filter(e => e.id !== id) }
    localStorage.setItem(DAY_KEY(), JSON.stringify(_dayState))
    syncDay()
    notify()
  }, [])

  const updateEntry = useCallback((id, patch) => {
    _dayState = { ..._dayState, entries: _dayState.entries.map(e => e.id === id ? { ...e, ...patch } : e) }
    localStorage.setItem(DAY_KEY(), JSON.stringify(_dayState))
    syncDay()
    notify()
  }, [])

  const setHealth = useCallback((h) => {
    _healthState = { ..._healthState, ...h }
    localStorage.setItem(HEALTH_KEY(), JSON.stringify(_healthState))
    syncHealth()
    notify()
  }, [])

  const setCalorieGoal = useCallback((goal) => {
    _dayState = { ..._dayState, calorieGoal: goal }
    localStorage.setItem(DAY_KEY(), JSON.stringify(_dayState))
    syncDay()
    notify()
  }, [])

  return {
    entries: _dayState.entries || [],
    calorieGoal: _dayState.calorieGoal || 1800,
    health: _healthState,
    addEntry,
    removeEntry,
    updateEntry,
    setHealth,
    setCalorieGoal
  }
}

// ── Settings ──────────────────────────────────────────────────────────────
export function getSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY())) || {} } catch { return {} }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY(), JSON.stringify(s))
    syncSettingsNow(s)
  } catch {}
}

// ── Favourites (per-user set of food IDs) ─────────────────────────────────
const FAV_KEY = () => `defit_favs_${_cachedUserId}`

export function getFavourites() {
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY())) || [51, 52, 53]) } catch { return new Set([51, 52, 53]) }
}

export function toggleFavourite(foodId) {
  const favs = getFavourites()
  favs.has(foodId) ? favs.delete(foodId) : favs.add(foodId)
  localStorage.setItem(FAV_KEY(), JSON.stringify([...favs]))
  return new Set(favs)
}
