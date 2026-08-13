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

// ── Favourites (per-user set of food IDs) ──────────────────────────────────
const FAV_KEY = () => `defit_favs_${userId()}`

export function getFavourites() {
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY())) || [51, 52, 53]) } catch { return new Set([51, 52, 53]) }
}

export function toggleFavourite(foodId) {
  const favs = getFavourites()
  favs.has(foodId) ? favs.delete(foodId) : favs.add(foodId)
  localStorage.setItem(FAV_KEY(), JSON.stringify([...favs]))
  return new Set(favs)
}

// ── Custom foods (AI-estimated items saved as favourites) ──────────────────
const CUSTOM_KEY = () => `defit_custom_${userId()}`

export function getCustomFoods() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY())) || [] } catch { return [] }
}

export function saveCustomFood(food) {
  const foods = getCustomFoods()
  if (!foods.find(f => f.id === food.id)) {
    foods.unshift(food)
    localStorage.setItem(CUSTOM_KEY(), JSON.stringify(foods))
  }
  // Also add to favourites
  const favs = getFavourites()
  favs.add(food.id)
  localStorage.setItem(FAV_KEY(), JSON.stringify([...favs]))
  return new Set(favs)
}

export function removeCustomFood(foodId) {
  const foods = getCustomFoods().filter(f => f.id !== foodId)
  localStorage.setItem(CUSTOM_KEY(), JSON.stringify(foods))
  const favs = getFavourites()
  favs.delete(foodId)
  localStorage.setItem(FAV_KEY(), JSON.stringify([...favs]))
  return new Set(favs)
}
