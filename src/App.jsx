import React, { useState, useEffect } from 'react'
import { dark, light, applyTheme } from './theme'
import TodayScreen from './screens/TodayScreen'
import LogScreen from './screens/LogScreen'
import HealthScreen from './screens/HealthScreen'
import SettingsScreen from './screens/SettingsScreen'

const DeLogo = () => (
  <svg width="26" height="26" viewBox="0 0 72 72" aria-hidden="true">
    <rect x="6" y="10" width="11" height="52" rx="5.5" fill="currentColor"/>
    <path d="M16 10 L30 10 Q56 10 56 36 Q56 62 30 62 L16 62Z" fill="currentColor"/>
    <path d="M17 20 L28 20 Q46 20 46 36 Q46 52 28 52 L17 52Z" fill="var(--bg)"/>
    <rect x="53" y="14" width="22" height="7" rx="3.5" fill="currentColor"/>
    <rect x="50" y="32" width="27" height="7" rx="3.5" fill="currentColor"/>
    <rect x="48" y="51" width="32" height="7" rx="3.5" fill="currentColor"/>
    <circle cx="70" cy="10" r="6" fill="#A100FF"/>
  </svg>
)

export default function App() {
  const [tab, setTab] = useState('today')
  const [isDark, setIsDark] = useState(() => localStorage.getItem('defit_theme') !== 'light')

  useEffect(() => {
    applyTheme(isDark ? dark : light)
    localStorage.setItem('defit_theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const screens = {
    today: TodayScreen,
    log: LogScreen,
    health: HealthScreen,
    settings: SettingsScreen,
  }
  const Screen = screens[tab]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 10px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text)' }}>
          <DeLogo />
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 700, fontStyle: 'italic', color: 'var(--text)' }}>
            <span style={{ color: 'var(--purple)' }}>DE</span>.Fit
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '.06em' }}>{isDark ? 'DARK' : 'LIGHT'}</span>
          <div onClick={() => setIsDark(d => !d)} style={{ width: 42, height: 23, borderRadius: 12, background: isDark ? 'var(--purple)' : '#ccc', position: 'relative', cursor: 'pointer', transition: 'background .2s' }}>
            <div style={{ position: 'absolute', top: 3, left: isDark ? 21 : 3, width: 17, height: 17, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
          </div>
        </div>
      </div>

      {/* Screen content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Screen isDark={isDark} onToggle={() => setIsDark(d => !d)} onNavigate={setTab} />
      </div>

      {/* Bottom nav */}
      <div style={{ display: 'flex', background: 'var(--bg)', borderTop: '0.5px solid var(--border)', padding: '6px 0 10px', position: 'sticky', bottom: 0, zIndex: 10 }}>
        {[
          { id: 'today', icon: '⌂', label: 'Today' },
          { id: 'log', icon: '✎', label: 'Log' },
          { id: 'health', icon: '♡', label: 'Health' },
          { id: 'settings', icon: '⚙', label: 'Settings' },
        ].map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
            <span style={{ fontSize: 22, color: tab === t.id ? 'var(--purple)' : 'var(--dim)', lineHeight: 1.2 }}>{t.icon}</span>
            <span style={{ fontSize: 10, color: tab === t.id ? 'var(--purple)' : 'var(--dim)', letterSpacing: '.04em' }}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
