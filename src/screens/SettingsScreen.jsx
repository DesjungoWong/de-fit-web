import { useState } from 'react'
import { hasEnvKey } from '../api/claude'
import { getSettings, saveSettings } from '../store/dayStore'

export default function SettingsScreen({ theme, onToggleTheme, day, onUpdateTarget }) {
  const s0 = getSettings()
  const [kcalTarget, setKcalTarget] = useState(day.kcalTarget)
  const [fasting, setFasting] = useState(s0.fasting ?? true)
  const [apiKey, setApiKey] = useState(localStorage.getItem('defit_api_key') || '')
  const [drivePath, setDrivePath] = useState(s0.drivePath || '')
  const envKey = hasEnvKey()

  function persist(patch) {
    const next = { ...getSettings(), ...patch }
    saveSettings(next)
  }

  const Toggle = ({ on, onClick, disabled }) => (
    <div onClick={disabled ? undefined : onClick} style={{
      width: 38, height: 20, borderRadius: 12,
      background: on ? 'var(--accent-dim)' : 'var(--panel)',
      border: `1px solid ${on ? 'var(--accent)' : 'var(--line2)'}`,
      position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? .4 : 1
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 20 : 2,
        width: 14, height: 14, borderRadius: '50%',
        background: on ? 'var(--accent)' : 'var(--dim)',
        transition: 'left .2s'
      }} />
    </div>
  )

  const Row = ({ label, sub, right }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 16px', borderBottom: '1px solid var(--line)'
    }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--txt)' }}>{label}</div>
        {sub && <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: '.16em', textTransform: 'uppercase', padding: '12px 16px 4px' }}>
        Appearance
      </div>

      <Row
        label="Theme"
        sub="Dark / Light — visual only, same data"
        right={<Toggle on={theme === 'dark'} onClick={onToggleTheme} />}
      />

      <div style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: '.16em', textTransform: 'uppercase', padding: '14px 16px 4px' }}>
        Nutrition
      </div>

      <Row
        label="Daily calorie target"
        sub="Used for calorie ring calculation"
        right={
          <input
            type="number"
            value={kcalTarget}
            onChange={e => {
              const v = Number(e.target.value)
              setKcalTarget(v)
              onUpdateTarget(v)
            }}
            style={{
              background: 'var(--panel)', border: '1px solid var(--line2)',
              borderRadius: 3, color: 'var(--txt)', padding: '6px 8px',
              fontSize: 11, width: 80, textAlign: 'right', outline: 'none'
            }}
          />
        }
      />

      <Row
        label="Fasting window"
        sub="16:8 · eating 12pm–8pm"
        right={<Toggle on={fasting} onClick={() => { setFasting(f => { persist({ fasting: !f }); return !f }) }} />}
      />

      <div style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: '.16em', textTransform: 'uppercase', padding: '14px 16px 4px' }}>
        AI
      </div>

      <Row
        label="Claude API key"
        sub={envKey ? '✓ Using environment key (VITE_CLAUDE_API_KEY)' : 'Stored locally in browser'}
        right={
          envKey ? (
            <span style={{ fontSize: 9, color: 'var(--success)', border: '1px solid var(--line2)', borderRadius: 3, padding: '3px 6px' }}>ENV</span>
          ) : (
            <input
              type="password"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); localStorage.setItem('defit_api_key', e.target.value) }}
              placeholder="sk-ant-…"
              style={{
                background: 'var(--panel)', border: '1px solid var(--line2)',
                borderRadius: 3, color: 'var(--txt)', padding: '6px 8px',
                fontSize: 11, width: 130, outline: 'none'
              }}
            />
          )
        }
      />

      <div style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: '.16em', textTransform: 'uppercase', padding: '14px 16px 4px' }}>
        Data
      </div>

      <Row
        label="Google Drive export path"
        sub="Backend will poll this daily (not yet wired)"
        right={
          <input
            type="text"
            value={drivePath}
            onChange={e => { setDrivePath(e.target.value); persist({ drivePath: e.target.value }) }}
            placeholder="/Health Exports/"
            style={{
              background: 'var(--panel)', border: '1px solid var(--line2)',
              borderRadius: 3, color: 'var(--txt)', padding: '6px 8px',
              fontSize: 11, width: 120, outline: 'none'
            }}
          />
        }
      />

      <Row
        label="Auto-sync (daily)"
        sub="Requires backend — not yet built"
        right={<Toggle on={false} disabled />}
      />

      <div style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: '.16em', textTransform: 'uppercase', padding: '14px 16px 4px' }}>
        About
      </div>

      <Row label="Version" sub="DE.Fit Web v1.0.0" right={
        <span style={{ fontSize: 9, color: 'var(--dim)' }}>Vite + React</span>
      } />

      <div style={{ padding: '12px 16px 24px', borderTop: '1px solid var(--line)' }}>
        <a
          href="https://github.com/DesjungoWong/de-fit-web"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}
        >
          github.com/DesjungoWong/de-fit-web ↗
        </a>
      </div>
    </div>
  )
}
