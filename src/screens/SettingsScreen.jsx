import React, { useState } from 'react'
import { useDayStore } from '../store/dayStore'
import { hasEnvKey } from '../api/claude'
import { getSettings, saveSettings } from '../store/dayStore'
import JSZip from 'jszip'
import { parseHealthConnect } from '../lib/healthParser'

async function extractDbFromZip(zipBlob) {
  const zip = await JSZip.loadAsync(zipBlob)
  const entry = zip.file('health_connect_export.db')
  if (!entry) throw new Error('health_connect_export.db not found in ZIP')
  return entry.async('blob')
}

export default function SettingsScreen({ isDark, onToggle, onNavigate }) {
  const { calorieGoal, setCalorieGoal, health, setHealth } = useDayStore()
  const s0 = getSettings()
  const [kcalTarget, setKcalTarget] = useState(calorieGoal)
  const [proteinTarget, setProteinTarget] = useState(s0.proteinTarget ?? 140)
  const [fasting, setFasting] = useState(s0.fasting ?? false)
  const [apiKey, setApiKey] = useState(localStorage.getItem('claude_api_key') || '')
  const [drivePath, setDrivePath] = useState(s0.drivePath || '')
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchMsg, setBatchMsg] = useState('')
  const [batchError, setBatchError] = useState('')
  const [lastBatchRun, setLastBatchRun] = useState(s0.lastBatchRun || null)
  const envKey = hasEnvKey()

  async function runBatchJob(fileId) {
    if (!fileId) { setBatchError('Enter a Google Drive file ID first'); return }
    setBatchLoading(true); setBatchMsg('Downloading from Google Drive…'); setBatchError('')
    try {
      const r = await fetch(`/api/gdrive?fileId=${fileId}`)
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${r.status}`)
      }
      setBatchMsg('Extracting ZIP…')
      const zipBlob = await r.blob()
      const dbBlob = await extractDbFromZip(zipBlob)
      setBatchMsg('Parsing health data…')
      const result = await parseHealthConnect(dbBlob)
      setHealth(result)
      const now = Date.now()
      setLastBatchRun(now)
      persist({ lastBatchRun: now })
      setBatchMsg('✓ Imported successfully')
    } catch (err) {
      setBatchError(err.message)
      setBatchMsg('')
    }
    setBatchLoading(false)
  }

  function persist(patch) {
    saveSettings({ ...getSettings(), ...patch })
  }

  const Toggle = ({ on, onClick, disabled }) => (
    <div
      onClick={disabled ? undefined : onClick}
      style={{ width: 42, height: 23, borderRadius: 12, background: on ? 'var(--purple)' : 'var(--panel)', border: `0.5px solid ${on ? 'var(--purple)' : 'var(--border)'}`, position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, transition: 'background .2s' }}
    >
      <div style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 17, height: 17, borderRadius: '50%', background: on ? '#fff' : 'var(--dim)', transition: 'left .2s' }} />
    </div>
  )

  const Row = ({ label, sub, right }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '0.5px solid var(--border)' }}>
      <div style={{ flex: 1, marginRight: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--text)' }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )

  const SectionHeader = ({ title }) => (
    <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--dim)', padding: '14px 16px 4px' }}>{title}</div>
  )

  return (
    <div style={{ overflowY: 'auto', height: '100%', paddingBottom: 20 }}>
      <SectionHeader title="Appearance" />

      <Row
        label="Theme"
        sub={isDark ? 'Currently dark mode' : 'Currently light mode'}
        right={<Toggle on={isDark} onClick={onToggle} />}
      />

      <SectionHeader title="Nutrition" />

      <Row
        label="Daily calorie target"
        sub="Used for the calorie ring"
        right={
          <input
            type="number"
            value={kcalTarget}
            onChange={e => {
              const v = Number(e.target.value)
              setKcalTarget(v)
              setCalorieGoal(v)
              persist({ calorieGoal: v })
            }}
            style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: '7px 10px', fontSize: 12, width: 80, textAlign: 'right', outline: 'none', fontFamily: 'inherit' }}
          />
        }
      />

      <Row
        label="Daily protein target"
        sub="Used in Reports for deficit / surplus tracking"
        right={
          <input
            type="number"
            value={proteinTarget}
            onChange={e => {
              const v = Number(e.target.value)
              setProteinTarget(v)
              persist({ proteinTarget: v })
            }}
            style={{ background: 'var(--panel)', border: '0.5px solid var(--purple)', borderRadius: 6, color: 'var(--purple)', padding: '7px 10px', fontSize: 12, width: 80, textAlign: 'right', outline: 'none', fontFamily: 'inherit' }}
          />
        }
      />

      <Row
        label="Fasting window"
        sub="16:8 — eating 12pm to 8pm"
        right={<Toggle on={fasting} onClick={() => { setFasting(f => { persist({ fasting: !f }); return !f }) }} />}
      />

      <SectionHeader title="AI" />

      <Row
        label="Claude API key"
        sub={envKey ? '✓ Using environment key (VITE_CLAUDE_API_KEY)' : 'Stored locally in browser'}
        right={
          envKey ? (
            <span style={{ fontSize: 9, color: 'var(--green)', border: '0.5px solid var(--green)', borderRadius: 4, padding: '3px 8px' }}>ENV</span>
          ) : (
            <input
              type="password"
              value={apiKey}
              onChange={e => {
                const cleaned = e.target.value.replace(/[^\x20-\x7E]/g, '').trim()
                setApiKey(cleaned)
                localStorage.setItem('claude_api_key', cleaned)
              }}
              placeholder="sk-ant-…"
              style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: '7px 10px', fontSize: 11, width: 130, outline: 'none', fontFamily: 'inherit' }}
            />
          )
        }
      />

      <SectionHeader title="Data" />

      <Row
        label="Google Drive file ID"
        sub="health_connect_export.zip file ID from Google Drive"
        right={
          <input
            value={drivePath}
            onChange={e => { setDrivePath(e.target.value); persist({ drivePath: e.target.value }) }}
            placeholder="1AbCdEf…"
            style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: '7px 10px', fontSize: 11, width: 130, outline: 'none', fontFamily: 'inherit' }}
          />
        }
      />

      <div style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 8 }}>
          {lastBatchRun
            ? `Last batch run: ${new Date(lastBatchRun).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
            : 'Never run'}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div
            onClick={() => !batchLoading && runBatchJob(drivePath)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: batchLoading ? 'var(--panel)' : 'var(--purple)', color: batchLoading ? 'var(--muted)' : '#fff',
              borderRadius: 6, padding: '7px 16px', fontSize: 11, cursor: batchLoading ? 'not-allowed' : 'pointer',
              fontWeight: 500, border: `0.5px solid ${batchLoading ? 'var(--border)' : 'var(--purple)'}`, transition: 'background .15s'
            }}
          >
            {batchLoading ? batchMsg || 'Running…' : '▶ Run batch now'}
          </div>
          {!batchLoading && batchMsg && (
            <span style={{ fontSize: 11, color: 'var(--green)' }}>{batchMsg}</span>
          )}
        </div>
        {batchError && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>{batchError}</div>}
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>Health Connect import</div>
        <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 10 }}>
          {health?.importedAt
            ? `Last import: ${new Date(health.importedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
            : 'No data imported yet'}
        </div>
        <div
          onClick={() => onNavigate?.('health')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--purple)', color: '#fff', borderRadius: 6,
            padding: '7px 16px', fontSize: 11, cursor: 'pointer', fontWeight: 500
          }}
        >
          ↑ Import now
        </div>
      </div>

      <SectionHeader title="About" />

      <Row label="Version" sub="DE.Fit Web v2.0" right={
        <span style={{ fontSize: 10, color: 'var(--dim)' }}>Vite + React</span>
      } />

      <Row label="Build" sub="DE brand · 4 tabs · HPB catalog" right={
        <span style={{ fontSize: 10, color: 'var(--purple)' }}>A100FF</span>
      } />
    </div>
  )
}
