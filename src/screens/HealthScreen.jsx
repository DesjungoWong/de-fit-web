import React, { useState } from 'react'
import { useDayStore } from '../store/dayStore'

export default function HealthScreen() {
  const { setHealth } = useDayStore()
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const ab = await file.arrayBuffer()

      // Dynamic imports for JSZip and sql.js
      const JSZip = (await import('jszip')).default
      const initSqlJs = (await import('sql.js')).default

      const zip = await JSZip.loadAsync(ab)
      const dbFile = zip.file('health_connect_export.db')
      if (!dbFile) throw new Error('health_connect_export.db not found in ZIP. Make sure you exported from Health Connect.')
      const dbAb = await dbFile.async('arraybuffer')

      const SQL = await initSqlJs({ locateFile: f => `/${f}` })
      const db = new SQL.Database(new Uint8Array(dbAb))

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayMs = today.getTime()
      const tomorrowMs = todayMs + 86400000

      function q(sql, params = []) {
        try { const r = db.exec(sql, params); return r[0]?.values || [] } catch { return [] }
      }

      // Steps today
      const stepsRows = q(`SELECT SUM(count) FROM steps_record_table WHERE start_time >= ? AND start_time < ?`, [todayMs, tomorrowMs])
      const steps = Math.round(stepsRows[0]?.[0] || 0)

      // Latest resting HR
      const hrRows = q(`SELECT beats_per_minute FROM resting_heart_rate_record_table ORDER BY time DESC LIMIT 1`)
      const heartRate = hrRows[0]?.[0] || null

      // Last sleep session
      const sleepRows = q(`SELECT start_time, end_time FROM sleep_session_record_table ORDER BY start_time DESC LIMIT 1`)
      let sleep = null
      if (sleepRows[0]) {
        sleep = ((sleepRows[0][1] - sleepRows[0][0]) / 3600000).toFixed(1)
      }

      // Latest weight (stored in kg)
      const weightRows = q(`SELECT weight FROM weight_record_table ORDER BY time DESC LIMIT 1`)
      const weight = weightRows[0]?.[0] ? parseFloat(weightRows[0][0]).toFixed(1) : null

      // Active calories today (stored in joules, convert to kcal)
      const calRows = q(`SELECT SUM(energy) FROM active_calories_burned_record_table WHERE start_time >= ? AND start_time < ?`, [todayMs, tomorrowMs])
      const activeCalories = calRows[0]?.[0] ? Math.round(calRows[0][0] / 4184) : 0

      // Hydration today (stored in litres)
      const hydRows = q(`SELECT SUM(volume) FROM hydration_record_table WHERE start_time >= ? AND start_time < ?`, [todayMs, tomorrowMs])
      const hydration = hydRows[0]?.[0] ? parseFloat(hydRows[0][0]).toFixed(2) : 0

      db.close()

      const result = { steps, heartRate, sleep, weight, activeCalories, hydration }
      setMetrics(result)
      setHealth(result)
    } catch (err) {
      setError('Could not read file: ' + err.message)
    }
    setLoading(false)
  }

  const score = metrics ? Math.min(100, Math.round(
    ((Math.min(metrics.steps, 10000) / 10000) * 30) +
    ((metrics.sleep ? Math.min(parseFloat(metrics.sleep), 8) / 8 : 0) * 30) +
    ((metrics.heartRate ? (metrics.heartRate < 80 ? 1 : 0.6) : 0) * 20) +
    20
  )) : null

  return (
    <div style={{ padding: '14px 16px', paddingBottom: 20, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      {/* Import button */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--panel)', borderRadius: 8, border: '0.5px dashed #333', cursor: 'pointer', marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>🗜</span>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>Import Health Connect data</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>Select your health_connect_export.zip</div>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 18, color: 'var(--dim)' }}>›</span>
        <input type="file" accept=".zip" onChange={handleFileSelect} style={{ display: 'none' }} />
      </label>

      {loading && <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>Reading Health Connect data…</div>}
      {error && <div style={{ color: 'var(--red)', fontSize: 12, padding: '8px 0', background: 'var(--panel)', borderRadius: 6, padding: '10px 12px', marginBottom: 8 }}>{error}</div>}

      {metrics && (
        <>
          <div style={{ background: 'var(--panel)', borderRadius: 7, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>✓</span>
            <span style={{ fontSize: 12, color: 'var(--green)' }}>Health data imported successfully</span>
          </div>

          <div style={{ fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 8 }}>Today's metrics</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 5, marginBottom: 10 }}>
            {[
              ['Steps', metrics.steps?.toLocaleString() || '—', '', 'var(--green)'],
              ['Heart rate', metrics.heartRate || '—', metrics.heartRate ? 'bpm' : '', 'var(--red)'],
              ['Sleep', metrics.sleep || '—', metrics.sleep ? 'hrs' : '', 'var(--softPurple)'],
              ['Weight', metrics.weight || '—', metrics.weight ? 'kg' : '', 'var(--gold)'],
              ['Active cal', metrics.activeCalories || '—', metrics.activeCalories ? 'kcal' : '', 'var(--purple)'],
              ['Hydration', metrics.hydration || '—', metrics.hydration ? 'L' : '', 'var(--blue)'],
            ].map(([l, v, u, c]) => (
              <div key={l} style={{ background: 'var(--panel)', borderRadius: 7, padding: 10 }}>
                <div style={{ fontSize: 8, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 3 }}>{l}</div>
                <span style={{ fontFamily: 'Georgia,serif', fontSize: 18, fontWeight: 700, color: c }}>{v}</span>
                {u && <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 2 }}>{u}</span>}
              </div>
            ))}
          </div>

          <div style={{ fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 8 }}>Health score</div>
          <div style={{ background: 'var(--panel)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
              <span style={{ fontFamily: 'Georgia,serif', fontSize: 36, fontWeight: 700, color: 'var(--text)' }}>{score}</span>
              <span style={{ fontSize: 12, color: score >= 70 ? 'var(--green)' : score >= 50 ? 'var(--gold)' : 'var(--red)' }}>
                {score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Needs attention'}
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--border)' }}>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--green)', width: `${score}%`, transition: 'width .6s' }} />
            </div>
          </div>
        </>
      )}

      {!metrics && !loading && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>❤</div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Import your Health Connect ZIP to see metrics</div>
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>Export from Android Health Connect app → Settings → Export data</div>
        </div>
      )}
    </div>
  )
}
