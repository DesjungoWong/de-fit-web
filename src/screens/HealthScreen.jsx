import React, { useState } from 'react'
import { useDayStore } from '../store/dayStore'
import { parseHealthConnect } from '../lib/healthParser'

async function extractDbFromZip(zipFile) {
  const readSlice = async (offset, length) => {
    const ab = await zipFile.slice(offset, offset + length).arrayBuffer()
    return new DataView(ab)
  }

  const hdr = await readSlice(0, 4)
  if (hdr.getUint32(0, true) !== 0x04034b50) throw new Error('Not a valid ZIP file')

  const meta = await readSlice(0, 30)
  const method = meta.getUint16(8, true)
  const compressedSize = meta.getUint32(18, true)
  const uncompressedSize = meta.getUint32(22, true)
  const fnLen = meta.getUint16(26, true)
  const exLen = meta.getUint16(28, true)
  const dataOffset = 30 + fnLen + exLen

  if (method === 0) {
    return zipFile.slice(dataOffset, dataOffset + uncompressedSize)
  }
  if (method === 8) {
    const compressedAb = await zipFile.slice(dataOffset, dataOffset + compressedSize).arrayBuffer()
    const ds = new DecompressionStream('deflate-raw')
    const writer = ds.writable.getWriter()
    writer.write(new Uint8Array(compressedAb))
    writer.close()
    const chunks = []
    const reader = ds.readable.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    return new Blob(chunks)
  }
  throw new Error(`Unsupported ZIP compression method: ${method}`)
}

export default function HealthScreen() {
  const { setHealth } = useDayStore()
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState('')

  async function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    setError('')
    setMetrics(null)

    try {
      let dbBlob = file
      if (file.name.endsWith('.zip')) {
        setLoadingMsg('Extracting ZIP… (this may take 10–20s on mobile)')
        dbBlob = await extractDbFromZip(file)
      }
      setLoadingMsg('Reading health data…')
      const result = await parseHealthConnect(dbBlob)
      setMetrics(result)
      setHealth(result)
    } catch (err) {
      setError('Could not read file: ' + err.message)
    }
    setLoading(false)
    setLoadingMsg('')
  }

  const score = metrics ? Math.min(100, Math.round(
    ((Math.min(metrics.steps || 0, 10000) / 10000) * 30) +
    ((metrics.sleep ? Math.min(parseFloat(metrics.sleep), 8) / 8 : 0) * 30) +
    ((metrics.heartRate ? (metrics.heartRate < 80 ? 1 : 0.6) : 0) * 20) +
    20
  )) : null

  const s = (v, fallback = '—') => (v !== null && v !== undefined && v !== 0 && v !== '0' && v !== '0.00') ? v : fallback

  return (
    <div style={{ padding: '14px 16px 20px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--panel)', borderRadius: 8, border: '0.5px dashed var(--border)', cursor: 'pointer', marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>🗜</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>Import Health Connect data</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>Select health_connect_export.zip or .db</div>
        </div>
        <span style={{ fontSize: 18, color: 'var(--dim)' }}>›</span>
        <input type="file" accept=".zip,.db" onChange={handleFileSelect} style={{ display: 'none' }} />
      </label>

      {loading && (
        <div style={{ background: 'var(--panel)', borderRadius: 7, padding: '10px 14px', marginBottom: 10, fontSize: 13, color: 'var(--muted)' }}>
          {loadingMsg || 'Processing…'}
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 12, background: 'var(--panel)', borderRadius: 6, padding: '10px 12px', marginBottom: 8 }}>
          {error}
        </div>
      )}

      {metrics && (
        <>
          <div style={{ background: 'var(--panel)', borderRadius: 7, padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--green)', fontSize: 16 }}>✓</span>
            <span style={{ fontSize: 12, color: 'var(--green)' }}>Health data imported</span>
          </div>

          <div style={{ fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 8 }}>Metrics</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6, marginBottom: 12 }}>
            {[
              ['Steps', s(metrics.steps?.toLocaleString()), '', 'var(--green)'],
              ['Heart rate', s(metrics.heartRate), metrics.heartRate ? 'bpm' : '', '#FF5C7A'],
              ['Sleep', s(metrics.sleep), metrics.sleep ? 'hrs' : '', 'var(--softPurple)'],
              ['Weight', s(metrics.weight), metrics.weight ? 'kg' : '', 'var(--gold)'],
              ['Active cal', s(metrics.activeCalories), metrics.activeCalories ? 'kcal' : '', 'var(--purple)'],
              ['Hydration', s(metrics.hydration), metrics.hydration && metrics.hydration !== '0.00' ? 'L' : '', 'var(--blue)'],
            ].map(([l, v, u, c]) => (
              <div key={l} style={{ background: 'var(--panel)', borderRadius: 7, padding: 10 }}>
                <div style={{ fontSize: 8, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 3 }}>{l}</div>
                <span style={{ fontFamily: 'Georgia,serif', fontSize: 18, fontWeight: 700, color: v === '—' ? 'var(--dim)' : c }}>{v}</span>
                {u && <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 2 }}>{u}</span>}
              </div>
            ))}
          </div>

          <div style={{ fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 8 }}>Health score</div>
          <div style={{ background: 'var(--panel)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
              <span style={{ fontFamily: 'Georgia,serif', fontSize: 36, fontWeight: 700, color: 'var(--text)' }}>{score}</span>
              <span style={{ fontSize: 12, color: score >= 70 ? 'var(--green)' : score >= 50 ? 'var(--gold)' : '#FF5C7A' }}>
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
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Import your Health Connect data to see metrics</div>
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8, lineHeight: 1.6 }}>
            On your phone: Health Connect → Settings → Export data<br/>
            Then select the exported .zip here
          </div>
        </div>
      )}
    </div>
  )
}
