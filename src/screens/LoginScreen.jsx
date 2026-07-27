import React, { useState } from 'react'
import { getUsers, saveUser, setCurrentUser, generateTotpSecret, verifyTotp } from '../store/authStore'

const DeLogo = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" aria-hidden="true">
    <rect x="6" y="10" width="11" height="52" rx="5.5" fill="currentColor"/>
    <path d="M16 10 L30 10 Q56 10 56 36 Q56 62 30 62 L16 62Z" fill="currentColor"/>
    <path d="M17 20 L28 20 Q46 20 46 36 Q46 52 28 52 L17 52Z" fill="var(--bg)"/>
    <rect x="53" y="14" width="22" height="7" rx="3.5" fill="currentColor"/>
    <rect x="50" y="32" width="27" height="7" rx="3.5" fill="currentColor"/>
    <rect x="48" y="51" width="32" height="7" rx="3.5" fill="currentColor"/>
    <circle cx="70" cy="10" r="6" fill="#A100FF"/>
  </svg>
)

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [welcome, setWelcome] = useState('')

  // Register state
  const [regStep, setRegStep] = useState(1) // 1=enter username, 2=show secret, 3=confirm code
  const [regSecret, setRegSecret] = useState('')
  const [regUsername, setRegUsername] = useState('')

  const users = getUsers()

  async function handleLogin(e) {
    e.preventDefault()
    if (!selectedUser || !code) { setError('Select a user and enter your 6-digit code'); return }
    setLoading(true); setError('')
    const user = users.find(u => u.id === selectedUser)
    if (!user) { setError('User not found'); setLoading(false); return }
    const ok = await verifyTotp(user.totpSecret, code)
    if (!ok) { setError('Invalid code. Check your authenticator app.'); setLoading(false); return }
    setCurrentUser(user.id)
    setWelcome(`Welcome back, ${user.username}`)
    setTimeout(() => onLogin(), 1000)
    setLoading(false)
  }

  function startRegister() {
    setRegStep(1)
    setRegUsername('')
    setRegSecret('')
    setCode('')
    setError('')
  }

  function handleRegisterStep1(e) {
    e.preventDefault()
    if (!regUsername.trim()) { setError('Enter a username'); return }
    const existing = users.find(u => u.username.toLowerCase() === regUsername.trim().toLowerCase())
    if (existing) { setError('Username already taken'); return }
    const secret = generateTotpSecret()
    setRegSecret(secret)
    setRegStep(2)
    setError('')
  }

  async function handleRegisterConfirm(e) {
    e.preventDefault()
    if (!code || code.length !== 6) { setError('Enter the 6-digit code from your authenticator'); return }
    setLoading(true); setError('')
    const ok = await verifyTotp(regSecret, code)
    if (!ok) { setError('Code did not match. Make sure you added the account correctly.'); setLoading(false); return }
    const user = { id: 'u_' + Date.now(), username: regUsername.trim(), totpSecret: regSecret, createdAt: Date.now() }
    saveUser(user)
    setCurrentUser(user.id)
    setWelcome(`Welcome, ${user.username}`)
    setTimeout(() => onLogin(), 1000)
    setLoading(false)
  }

  const otpauthUri = regSecret
    ? `otpauth://totp/DE.Fit:${encodeURIComponent(regUsername)}?secret=${regSecret}&issuer=DE.Fit`
    : ''

  const inp = {
    background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 8,
    color: 'var(--text)', padding: '11px 14px', fontSize: 13, width: '100%',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
  }

  if (welcome) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--bg)', gap: 16 }}>
        <div style={{ color: 'var(--purple)', fontSize: 18, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{welcome}</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: 'var(--bg)', padding: '0 24px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32, color: 'var(--text)' }}>
          <DeLogo />
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, fontStyle: 'italic', marginTop: 10 }}>
            <span style={{ color: 'var(--purple)' }}>DE</span>.Fit
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', marginBottom: 20, borderRadius: 8, overflow: 'hidden', border: '0.5px solid var(--border)' }}>
          {['login', 'register'].map(m => (
            <div key={m} onClick={() => { setMode(m); setError(''); if (m === 'register') startRegister() }}
              style={{ flex: 1, textAlign: 'center', padding: '9px 0', fontSize: 12, cursor: 'pointer', background: mode === m ? 'var(--purple)' : 'var(--panel)', color: mode === m ? '#fff' : 'var(--muted)', transition: 'background .15s', textTransform: 'capitalize' }}>
              {m}
            </div>
          ))}
        </div>

        {/* Login form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {users.length === 0 ? (
              <div style={{ color: 'var(--dim)', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
                No accounts yet. Register first.
              </div>
            ) : (
              <>
                <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
                  style={{ ...inp, appearance: 'none' }}>
                  <option value="">Select account…</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
                <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                  value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit authenticator code" style={inp} />
                {error && <div style={{ color: 'var(--red)', fontSize: 11 }}>{error}</div>}
                <button type="submit" disabled={loading}
                  style={{ background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 8, padding: '13px 0', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '.06em', opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Verifying…' : 'LOGIN'}
                </button>
              </>
            )}
          </form>
        )}

        {/* Register form */}
        {mode === 'register' && (
          <>
            {regStep === 1 && (
              <form onSubmit={handleRegisterStep1} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input value={regUsername} onChange={e => setRegUsername(e.target.value)}
                  placeholder="Choose a username" style={inp} />
                {error && <div style={{ color: 'var(--red)', fontSize: 11 }}>{error}</div>}
                <button type="submit"
                  style={{ background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 8, padding: '13px 0', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '.06em' }}>
                  CONTINUE
                </button>
              </form>
            )}

            {regStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>
                  Add this account to <strong>Microsoft Authenticator</strong> or any TOTP app:
                </div>
                <div style={{ background: 'var(--panel)', borderRadius: 8, padding: '12px 14px', wordBreak: 'break-all' }}>
                  <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 6 }}>Secret Key</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text)', letterSpacing: '.08em' }}>{regSecret}</div>
                </div>
                <div style={{ background: 'var(--panel)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 6 }}>OTPAuth URI</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'var(--muted)', wordBreak: 'break-all' }}>{otpauthUri}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.6 }}>
                  In the Authenticator app: tap + → Other account → enter the secret key above. Then enter the 6-digit code shown.
                </div>
                <button onClick={() => setRegStep(3)}
                  style={{ background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 8, padding: '13px 0', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '.06em' }}>
                  I'VE ADDED IT
                </button>
              </div>
            )}

            {regStep === 3 && (
              <form onSubmit={handleRegisterConfirm} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Enter the 6-digit code from your authenticator to confirm setup:</div>
                <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                  value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit code" style={inp} autoFocus />
                {error && <div style={{ color: 'var(--red)', fontSize: 11 }}>{error}</div>}
                <button type="submit" disabled={loading}
                  style={{ background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 8, padding: '13px 0', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '.06em', opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Verifying…' : 'CONFIRM & LOGIN'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
