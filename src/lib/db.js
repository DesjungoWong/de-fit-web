import { supabase } from './supabase'

// ── Day logs ──────────────────────────────────────────────────────────────
export async function upsertDayLog(userId, dateStr, data) {
  await supabase.from('day_logs').upsert({
    user_id: userId,
    date: dateStr,
    entries: data.entries || [],
    calorie_goal: data.calorieGoal || 1800,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,date' })
}

export async function fetchDayLogs(userId, sinceDays = 90) {
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString().slice(0, 10)
  const { data } = await supabase
    .from('day_logs')
    .select('date, entries, calorie_goal')
    .eq('user_id', userId)
    .gte('date', since)
  return data || []
}

// ── Settings ──────────────────────────────────────────────────────────────
export async function upsertSettings(userId, settings) {
  await supabase.from('user_settings').upsert({
    user_id: userId,
    calorie_goal: settings.calorieGoal ?? 1800,
    protein_target: settings.proteinTarget ?? 140,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' })
}

export async function fetchSettings(userId) {
  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data
}

// ── Health imports ────────────────────────────────────────────────────────
export async function upsertHealth(userId, healthData) {
  await supabase.from('health_imports').upsert({
    user_id: userId,
    data: healthData,
    imported_at: new Date().toISOString()
  }, { onConflict: 'user_id' })
}

export async function fetchHealth(userId) {
  const { data } = await supabase
    .from('health_imports')
    .select('data')
    .eq('user_id', userId)
    .single()
  return data?.data || null
}

// ── Weekly reports ────────────────────────────────────────────────────────
export async function upsertWeeklyReport(userId, week) {
  await supabase.from('weekly_reports').upsert({
    user_id: userId,
    week_id: week.id,
    data: week,
    created_at: new Date().toISOString()
  }, { onConflict: 'user_id,week_id' })
}

export async function fetchWeeklyReports(userId) {
  const { data } = await supabase
    .from('weekly_reports')
    .select('data')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data || []).map(r => r.data)
}

// ── Load all user data into localStorage ──────────────────────────────────
// Called once on login to hydrate local cache from Supabase.
export async function loadAllUserData(userId) {
  const [logs, settings, health, reports] = await Promise.allSettled([
    fetchDayLogs(userId),
    fetchSettings(userId),
    fetchHealth(userId),
    fetchWeeklyReports(userId)
  ])

  if (logs.status === 'fulfilled') {
    for (const log of logs.value) {
      const key = `defit_day_${userId}_${log.date}`
      localStorage.setItem(key, JSON.stringify({
        entries: log.entries || [],
        calorieGoal: log.calorie_goal || 1800
      }))
    }
  }

  if (settings.status === 'fulfilled' && settings.value) {
    const s = settings.value
    localStorage.setItem(`defit_settings_${userId}`, JSON.stringify({
      calorieGoal: s.calorie_goal,
      proteinTarget: s.protein_target
    }))
  }

  if (health.status === 'fulfilled' && health.value) {
    localStorage.setItem(`defit_health_${userId}`, JSON.stringify(health.value))
  }

  if (reports.status === 'fulfilled' && reports.value.length) {
    localStorage.setItem(`defit_reports_${userId}`, JSON.stringify({ weeks: reports.value }))
  }
}
