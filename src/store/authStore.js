import { supabase } from '../lib/supabase'

// Module-level cache — kept in sync by onAuthStateChange
let _currentUser = null

function adaptUser(supabaseUser) {
  if (!supabaseUser) return null
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    // Display name: part before @ (e.g. desmond.ym.wong)
    username: supabaseUser.email?.split('@')[0] || 'user'
  }
}

// Hydrate cache from stored session on module load (synchronous path)
supabase.auth.getSession().then(({ data: { session } }) => {
  _currentUser = adaptUser(session?.user ?? null)
})

// Keep cache live for the whole session
supabase.auth.onAuthStateChange((_event, session) => {
  _currentUser = adaptUser(session?.user ?? null)
})

// ── Public API ─────────────────────────────────────────────────────────────

export function getCurrentUser() {
  return _currentUser
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  _currentUser = adaptUser(data.user)
  return _currentUser
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  // If email confirmation is disabled in Supabase, data.user is set immediately.
  // If confirmation is required, data.user may be null until confirmed.
  if (data.user) {
    _currentUser = adaptUser(data.user)
    return { user: _currentUser, needsConfirmation: false }
  }
  return { user: null, needsConfirmation: true }
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })
  if (error) throw error
}

export async function clearCurrentUser() {
  await supabase.auth.signOut()
  _currentUser = null
}

// Expose supabase for App.jsx auth state listener
export { supabase }
