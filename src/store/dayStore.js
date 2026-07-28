import { useState, useEffect, useCallback } from 'react'
import { getCurrentUser } from './authStore'

function userId() {
  return getCurrentUser()?.id || 'guest'
}

const DAY_KEY = () => `defit_day_${userId()}_${new Date().toISOString().slice(0, 10)}`
const SETTINGS_KEY = () => `defit_settings_${userId()}`
const HEALTH_KEY = () => `defit_health_${userId()}`

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

// Module-level state — call reinitForUser() on login/logout to reload
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
    notify()
  }, [])

  const removeEntry = useCallback((id) => {
    _dayState = { ..._dayState, entries: _dayState.entries.filter(e => e.id !== id) }
    localStorage.setItem(DAY_KEY(), JSON.stringify(_dayState))
    notify()
  }, [])

  const updateEntry = useCallback((id, patch) => {
    _dayState = { ..._dayState, entries: _dayState.entries.map(e => e.id === id ? { ...e, ...patch } : e) }
    localStorage.setItem(DAY_KEY(), JSON.stringify(_dayState))
    notify()
  }, [])

  const setHealth = useCallback((h) => {
    _healthState = { ..._healthState, ...h }
    localStorage.setItem(HEALTH_KEY(), JSON.stringify(_healthState))
    notify()
  }, [])

  const setCalorieGoal = useCallback((goal) => {
    _dayState = { ..._dayState, calorieGoal: goal }
    localStorage.setItem(DAY_KEY(), JSON.stringify(_dayState))
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

export function getSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY())) || {} } catch { return {} }
}

export function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY(), JSON.stringify(s)) } catch {}
}
