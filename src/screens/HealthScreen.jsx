import React, { useState } from 'react'
import { useDayStore } from '../store/dayStore'
import { parseHealthConnect } from '../lib/healthParser'
import JSZip from 'jszip'
import { track } from '../lib/analytics'

async function extractDbFromZip(zipFile) {
  const zip = await JSZip.loadAsync(zipFile)
  const entry = zip.file('health_connect_export.db')
  if (!entry) throw new Error('health_connect_export.db not found in ZIP')
  return entry.async('blob')
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function BarChart({ data, color = 'var(--purple)' }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{
            width: '100%', borderRadius: 3,
            height: Math.max(3, Math.round((d.value / max) * 40)),
            background: d.isToday ? color : `${color}55`,
            transition: 'height .4s'
          }} />
          <span style={{ fontSize: 8, color: 'var(--dim)' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function MetricTile({ label, value, unit, color, sub }) {
  return (
    <div style={{ background: 'var(--panel)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 8, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontFamily: 'Georgia,serif', fontSize: 22, fontWeight: 700, color: value === '—' ? 'var(--dim)' : color }}>{value}</span>
        {unit && value !== '—' && <span style={{ fontSize: 9, color: 'var(--muted)' }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function HealthScreen() {
  const { health, setHealth } = useDayStore()
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState('')

  const m = health || {}
  const lastImport = m.importedAt ? new Date(m.importedAt) : null
  const lastImportStr = lastImport
    ? lastImport.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  async function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true); setError('')
    try {
      let dbBlob = file
      if (file.name.endsWith('.zip')) {
        setLoadingMsg('Extracting ZIP… (10–20s on mobile)')
        dbBlob = await extractDbFromZip(file)
      }
      setLoadingMsg('Reading health data…')
      const result = await parseHealthConnect(dbBlob)
      setHealth(result)
      track('health_imported', { steps: result.steps || 0 })
    } catch (err) {
      setError('Could not read file: ' + err.message)
    }
    setLoading(false); setLoadingMsg('')
    e.target.value = ''
  }

  // Score: steps 30%, sleep 30%, HR 20%, base 20%
  const score = (m.steps || m.heartRate || m.sleep || m.weight) ? Math.min(100, Math.round(
    ((Math.min(m.steps || 0, 10000) / 10000) * 30) +
    ((m.sleep ? Math.min(parseFloat(m.sleep), 8) / 8 : 0) * 30) +
    ((m.heartRate ? (m.heartRate < 80 ? 1 : 0.6) : 0) * 20) +
    20
  )) : null

  const s = v => (v !== null && v !== undefined && v !== 0 && v !== '0' && v !== '0.00') ? String(v) : '—'

  // Build 7-day bar chart — use last7 directly (anchored to last data date by parser)
  const todayDs = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime() })()
  const chartData = (m.last7 || []).map(b => {
    const d = new Date(b.dayStart)
    return {
      label: DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1],
      value: b.steps || 0,
      isToday: b.dayStart === todayDs
    }
  })

  const hasData = !!(m.steps || m.heartRate || m.sleep || m.weight)
  const allZero = m.importedAt && !hasData
  const [showDebug, setShowDebug] = useState(false)

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '12px 14px 24px', boxSizing: 'border-box' }}>

      {/* Import row */}
      <label style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--panel)', borderRadius: 8,
        border: '0.5px dashed var(--border)', padding: '10px 12px',
        cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 8, opacity: loading ? 0.6 : 1
      }}>
        <span style={{ fontSize: 18 }}>🗜</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>
            {loading ? loadingMsg || 'Processing…' : 'Import Health Connect'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 1 }}>
            {lastImportStr ? (allZero ? 'Re-import to refresh data' : `Last import: ${lastImportStr}`) : 'Select health_connect_export.zip or .db'}
          </div>
        </div>
        {!loading && <span style={{ fontSize: 14, color: 'var(--purple)' }}>↑</span>}
        <input type="file" accept=".zip,.db" onChange={handleFileSelect} disabled={loading} style={{ display: 'none' }} />
      </label>

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 11, background: 'var(--panel)', borderRadius: 6, padding: '8px 12px', marginBottom: 8 }}>
          {error}
        </div>
      )}

      {/* Health Score */}
      <div style={{ background: 'var(--panel)', borderRadius: 10, padding: '14px 16px', marginBottom: 8 }}>
        <div style={{ fontSize: 8, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 6 }}>Health Score</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 42, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
              {score ?? '—'}
            </span>
            {score && (
              <span style={{ fontSize: 12, color: score >= 70 ? 'var(--green)' : score >= 50 ? 'var(--gold)' : '#FF5C7A' }}>
                {score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Needs attention'}
              </span>
            )}
          </div>
          {!hasData && (
            <span style={{ fontSize: 10, color: 'var(--dim)', textAlign: 'right', lineHeight: 1.5 }}>
              Import data<br/>to calculate
            </span>
          )}
        </div>
        <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', marginTop: 10 }}>
          <div style={{ height: 3, borderRadius: 2, background: score >= 70 ? 'var(--green)' : score >= 50 ? 'var(--gold)' : '#FF5C7A', width: `${score ?? 0}%`, transition: 'width .6s' }} />
        </div>
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6, marginBottom: 8 }}>
        <MetricTile label="Steps" value={s(m.steps?.toLocaleString())} color="var(--green)"
          sub={m.steps > 0 ? `${Math.round((m.steps / 10000) * 100)}% of 10k goal` : null} />
        <MetricTile label="Resting Heart Rate" value={s(m.heartRate)} unit="bpm" color="#FF5C7A"
          sub={m.heartRate ? (m.heartRate < 60 ? 'Low' : m.heartRate < 80 ? 'Normal' : 'Elevated') : null} />
        <MetricTile label="Sleep" value={s(m.sleep)} unit="hrs" color="var(--softPurple)"
          sub={m.sleep ? (parseFloat(m.sleep) >= 7 ? 'On target' : 'Below 7hr target') : null} />
        <MetricTile label="Weight" value={s(m.weight)} unit="kg" color="var(--gold)" />
      </div>

      {/* BMI */}
      {m.bmi && (
        <div style={{ background: 'var(--panel)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 8, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 2 }}>BMI</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'Georgia,serif', fontSize: 22, fontWeight: 700, color: parseFloat(m.bmi) < 23 ? 'var(--green)' : 'var(--gold)' }}>{m.bmi}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{parseFloat(m.bmi) < 18.5 ? 'Underweight' : parseFloat(m.bmi) < 23 ? 'Normal' : parseFloat(m.bmi) < 27.5 ? 'Overweight' : 'Obese'}</span>
            </div>
          </div>
          <div style={{ fontSize: 9, color: 'var(--dim)', textAlign: 'right' }}>Asian BMI<br/>cutoffs</div>
        </div>
      )}

      {/* 7-day steps chart */}
      <div style={{ background: 'var(--panel)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
        <div style={{ fontSize: 8, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 8 }}>Steps — last 7 days</div>
        <BarChart data={chartData} color="var(--purple)" />
      </div>

      {!hasData && (
        <div style={{ textAlign: 'center', padding: '20px 16px', color: 'var(--dim)', fontSize: 11, lineHeight: 1.7 }}>
          On your phone: Health Connect → Settings → Export data<br/>
          Then tap Import above to load your .zip file
        </div>
      )}

      {/* Debug section */}
      {(m.debugLog || m.error) && (
        <div style={{ background: 'var(--panel)', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
          <div
            onClick={() => setShowDebug(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--dim)' }}>Debug</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{showDebug ? '▲' : '▼'}</span>
          </div>
          {showDebug && (
            <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 10, lineHeight: 1.6 }}>
              {m.error && (
                <div style={{ color: 'var(--red)', marginBottom: 6 }}>Error: {m.error}</div>
              )}
              {(m.debugLog || []).map((entry, i) => (
                <div key={i} style={{ color: 'var(--muted)', borderBottom: '0.5px solid var(--border)', paddingBottom: 4, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text)' }}>{entry.event}</span>:{' '}
                  {JSON.stringify(entry, (k, v) => k === 'event' ? undefined : v)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
