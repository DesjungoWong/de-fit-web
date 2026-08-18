import { supabase } from './supabase'
import { getCurrentUser } from '../store/authStore'

// Fire-and-forget — all errors are silent so they never break the app
function uid()      { return getCurrentUser()?.id || null }
function uname()    { return getCurrentUser()?.username || null }

export async function upsertUser(user) {
  if (!supabase || !user) return
  try {
    await supabase.from('users').upsert({
      id: user.id,
      username: user.username,
      admin: user.admin || false,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'id' })
  } catch {}
}

export async function track(eventType, payload = {}) {
  if (!supabase) return
  const id = uid()
  if (!id) return
  try {
    await supabase.from('events').insert({
      user_id: id,
      username: uname(),
      event_type: eventType,
      payload,
    })
  } catch {}
}

export async function trackFoodLog(food) {
  if (!supabase) return
  const id = uid()
  if (!id) return
  try {
    await supabase.from('food_logs').insert({
      user_id: id,
      username: uname(),
      food_name: food.name || 'Unknown',
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
    })
  } catch {}
}
