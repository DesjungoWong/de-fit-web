import { useState, useRef, useEffect } from 'react'
import { estimateFood } from '../api/claude'

export default function SnapScreen({ onLog }) {
  const [tab, setTab] = useState('camera')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [desc, setDesc] = useState('')
  const [streaming, setStreaming] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    if (tab === 'camera') startCamera()
    else stopCamera()
    return stopCamera
  }, [tab])

  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = s
      if (videoRef.current) {
        videoRef.current.srcObject = s
        setStreaming(true)
      }
    } catch { setStreaming(false) }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setStreaming(false)
  }

  async function captureFromVideo() {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    const b64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
    await runEstimate('Estimate this meal', b64)
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const b64 = ev.target.result.split(',')[1]
      await runEstimate(desc || 'Estimate this meal', b64)
    }
    reader.readAsDataURL(file)
  }

  async function runEstimate(text, b64 = null) {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await estimateFood(text, b64)
      if (r) setResult(r)
      else setError('Could not parse estimate.')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const chip = (id, label) => (
    <div onClick={() => { setTab(id); setResult(null); setError('') }} style={{
      flex: 1, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, border: `1px solid ${tab === id ? 'var(--accent)' : 'var(--line2)'}`,
      cursor: 'pointer', borderRadius: 3, color: tab === id ? 'var(--accent)' : 'var(--mut)',
      background: tab === id ? 'var(--accent-dim)' : 'transparent',
      letterSpacing: '.04em', textTransform: 'uppercase'
    }}>
      {label}
    </div>
  )

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', gap: 4, padding: '12px 16px 8px' }}>
        {chip('camera', 'Camera')}
        {chip('gallery', 'Gallery')}
        {chip('describe', 'Describe')}
      </div>

      {tab === 'camera' && (
        <div style={{ padding: '0 16px' }}>
          <div style={{
            background: 'var(--panel)', borderRadius: 3, overflow: 'hidden',
            aspectRatio: '4/3', position: 'relative', border: '1px solid var(--line2)'
          }}>
            {streaming
              ? <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dim)', fontSize: 11 }}>
                  Camera unavailable
                </div>
            }
          </div>
          <button onClick={captureFromVideo} disabled={!streaming || loading} style={{
            width: '100%', marginTop: 8, background: 'var(--accent)', color: 'var(--bg)',
            border: 'none', borderRadius: 3, padding: '10px 0', fontSize: 11,
            letterSpacing: '.06em', cursor: 'pointer', textTransform: 'uppercase', opacity: loading ? .6 : 1
          }}>
            {loading ? 'Estimating…' : '📷 Capture & Estimate'}
          </button>
        </div>
      )}

      {tab === 'gallery' && (
        <div style={{ padding: '0 16px' }}>
          <label style={{
            display: 'block', background: 'var(--panel)', border: '1px dashed var(--line2)',
            borderRadius: 3, padding: '32px 0', textAlign: 'center', cursor: 'pointer', color: 'var(--dim)', fontSize: 11
          }}>
            <i className="ti ti-photo-up" style={{ fontSize: 28, display: 'block', marginBottom: 6 }} />
            Tap to choose a photo
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          </label>
          {loading && <div style={{ textAlign: 'center', color: 'var(--dim)', fontSize: 11, marginTop: 12 }}>Estimating…</div>}
        </div>
      )}

      {tab === 'describe' && (
        <div style={{ padding: '0 16px' }}>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Describe the meal — e.g. 'ban mian with egg, dry version'"
            style={{
              width: '100%', background: 'var(--panel)', border: '1px solid var(--line2)',
              borderRadius: 3, color: 'var(--txt)', fontSize: 12, padding: 10,
              resize: 'none', outline: 'none', minHeight: 80
            }}
          />
          <button onClick={() => runEstimate(desc)} disabled={loading || !desc.trim()} style={{
            width: '100%', marginTop: 8, background: 'var(--accent)', color: 'var(--bg)',
            border: 'none', borderRadius: 3, padding: '10px 0', fontSize: 11,
            letterSpacing: '.06em', cursor: 'pointer', textTransform: 'uppercase', opacity: loading ? .6 : 1
          }}>
            {loading ? 'Estimating…' : 'Estimate'}
          </button>
        </div>
      )}

      {error && <div style={{ fontSize: 11, color: 'var(--danger)', margin: '8px 16px' }}>{error}</div>}

      {result && (
        <div style={{ margin: '12px 16px', background: 'var(--panel)', border: '1px solid var(--line2)', borderRadius: 3, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 18, color: 'var(--txt)' }}>{result.name}</span>
            <span style={{
              fontSize: 7, color: result.confidence === 'high' ? 'var(--success)' : result.confidence === 'medium' ? 'var(--accent)' : 'var(--danger)',
              border: '1px solid var(--line2)', borderRadius: 3, padding: '1px 5px', marginLeft: 8, textTransform: 'uppercase'
            }}>{result.confidence}</span>
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 32, color: 'var(--accent)' }}>
            {result.kcal} <span style={{ fontSize: 14, fontWeight: 300, color: 'var(--mut)' }}>kcal</span>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: 'var(--mut)' }}>
            <span>P <strong style={{ color: 'var(--forest)' }}>{result.protein}g</strong></span>
            <span>C <strong style={{ color: 'var(--ocean)' }}>{result.carbs}g</strong></span>
            <span>F <strong style={{ color: 'var(--wine)' }}>{result.fat}g</strong></span>
          </div>
          <button onClick={() => { onLog(result); setResult(null) }} style={{
            marginTop: 10, width: '100%', background: 'var(--accent)', color: 'var(--bg)',
            border: 'none', borderRadius: 3, padding: '9px 0', fontSize: 10,
            letterSpacing: '.06em', cursor: 'pointer', textTransform: 'uppercase'
          }}>
            Log it
          </button>
        </div>
      )}
      <div style={{ height: 20 }} />
    </div>
  )
}
