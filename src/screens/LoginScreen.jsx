import React, { useState } from 'react'
import { signIn, signUp, resetPassword } from '../store/authStore'

const DeLogo = () => (
  <svg width="36" height="36" viewBox="0 0 72 72" aria-hidden="true">
    <rect x="6" y="10" width="11" height="52" rx="5.5" fill="currentColor"/>
    <path d="M16 10 L30 10 Q56 10 56 36 Q56 62 30 62 L16 62Z" fill="currentColor"/>
    <path d="M17 20 L28 20 Q46 20 46 36 Q46 52 28 52 L17 52Z" fill="var(--bg)"/>
    <rect x="53" y="14" width="22" height="7" rx="3.5" fill="currentColor"/>
    <rect x="50" y="32" width="27" height="7" rx="3.5" fill="currentColor"/>
    <rect x="48" y="51" width="32" height="7" rx="3.5" fill="currentColor"/>
    <circle cx="70" cy="10" r="6" fill="#A100FF"/>
  </svg>
)

const inp = {
  background: 'var(--panel)',
  border: '0.5px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  padding: '12px 14px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box'
}

const btn = {
  width: '100%',
  background: 'var(--purple)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '13px 0',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
  letterSpacing: '.06em',
  fontWeight: 600
}

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  function clearForm() {
    setEmail(''); setPassword(''); setConfirmPassword('')
    setError(''); setInfo('')
  }

  function switchMode(m) { clearForm(); setMode(m) }

  async function handleSignIn(e) {
    e.preventDefault()
    if (!email || !password) { setError('Enter your email and password'); return }
    setLoading(true); setError('')
    try {
      const user = await signIn(email.trim().toLowerCase(), password)
      onLogin(user)
    } catch (err) {
      setError(err.message.includes('Invalid login') ? 'Incorrect email or password.' : err.message)
    }
    setLoading(false)
  }

  async function handleSignUp(e) {
    e.preventDefault()
    if (!email || !password) { setError('Fill in all fields'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true); setError('')
    try {
      const { user, needsConfirmation } = await signUp(email.trim().toLowerCase(), password)
      if (needsConfirmation) {
        setInfo('Check your inbox — we sent a confirmation link. Once confirmed, sign in here.')
        setMode('signin')
        setPassword(''); setConfirmPassword('')
      } else {
        onLogin(user)
      }
    } catch (err) {
      setError(err.message.includes('already registered') ? 'An account with this email already exists. Sign in instead.' : err.message)
    }
    setLoading(false)
  }

  async function handleReset(e) {
    e.preventDefault()
    if (!email) { setError('Enter your email address'); return }
    setLoading(true); setError('')
    try {
      await resetPassword(email.trim().toLowerCase())
      setInfo('Password reset email sent. Check your inbox.')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100dvh',
      background: 'var(--bg)', padding: '0 24px', boxSizing: 'border-box'
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36, color: 'var(--text)' }}>
          <DeLogo />
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 700, fontStyle: 'italic', marginTop: 10 }}>
            <span style={{ color: 'var(--purple)' }}>DE</span>.Fit
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4, letterSpacing: '.08em' }}>
            YOUR PERSONAL NUTRITION TRACKER
          </div>
        </div>

        {/* Mode toggle (only sign in / sign up) */}
        {mode !== 'reset' && (
          <div style={{ display: 'flex', marginBottom: 24, borderRadius: 8, overflow: 'hidden', border: '0.5px solid var(--border)' }}>
            {[['signin', 'Sign In'], ['signup', 'Sign Up']].map(([m, label]) => (
              <div key={m} onClick={() => switchMode(m)} style={{
                flex: 1, textAlign: 'center', padding: '10px 0', fontSize: 12,
                cursor: 'pointer', fontWeight: 600, letterSpacing: '.04em',
                background: mode === m ? 'var(--purple)' : 'var(--panel)',
                color: mode === m ? '#fff' : 'var(--muted)',
                transition: 'background .15s'
              }}>
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Info banner */}
        {info && (
          <div style={{ background: 'rgba(161,0,255,0.10)', border: '0.5px solid var(--purple)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>
            {info}
          </div>
        )}

        {/* ── Sign In ── */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email" autoComplete="email" inputMode="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email address" style={inp}
            />
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Password" style={inp}
              />
              <span onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--dim)', cursor: 'pointer', userSelect: 'none' }}>
                {showPass ? 'Hide' : 'Show'}
              </span>
            </div>
            {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ ...btn, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Signing in…' : 'SIGN IN'}
            </button>
            <div onClick={() => switchMode('reset')} style={{ textAlign: 'center', fontSize: 12, color: 'var(--purple)', cursor: 'pointer', marginTop: 4 }}>
              Forgot password?
            </div>
          </form>
        )}

        {/* ── Sign Up ── */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email" autoComplete="email" inputMode="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email address" style={inp}
            />
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Password (min 8 characters)" style={inp}
              />
              <span onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--dim)', cursor: 'pointer', userSelect: 'none' }}>
                {showPass ? 'Hide' : 'Show'}
              </span>
            </div>
            <input
              type={showPass ? 'text' : 'password'} autoComplete="new-password"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm password" style={inp}
            />
            {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ ...btn, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Creating account…' : 'CREATE ACCOUNT'}
            </button>
            <div style={{ fontSize: 11, color: 'var(--dim)', textAlign: 'center', lineHeight: 1.6 }}>
              By signing up you agree to use this app for personal tracking only.
            </div>
          </form>
        )}

        {/* ── Forgot Password ── */}
        {mode === 'reset' && (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4, fontWeight: 600 }}>Reset your password</div>
            <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.6, marginBottom: 4 }}>
              Enter your email and we'll send you a reset link.
            </div>
            <input
              type="email" autoComplete="email" inputMode="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email address" style={inp}
            />
            {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ ...btn, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Sending…' : 'SEND RESET LINK'}
            </button>
            <div onClick={() => switchMode('signin')} style={{ textAlign: 'center', fontSize: 12, color: 'var(--purple)', cursor: 'pointer', marginTop: 4 }}>
              ← Back to sign in
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
