import { useState } from 'react'
import { estimateFood } from '../api/claude'
import FoodRow from '../components/FoodRow'

const CATALOG = [
  { name: 'Chicken Rice', kcal: 480, protein: 28, carbs: 62, fat: 12 },
  { name: 'Char Kway Teow', kcal: 744, protein: 22, carbs: 88, fat: 32 },
  { name: 'Nasi Lemak', kcal: 520, protein: 18, carbs: 64, fat: 22 },
  { name: 'Roti Prata (2 pcs)', kcal: 380, protein: 10, carbs: 52, fat: 14 },
  { name: 'Ban Mian (dry)', kcal: 520, protein: 26, carbs: 70, fat: 14 },
  { name: 'Wonton Mee', kcal: 440, protein: 20, carbs: 60, fat: 12 },
  { name: 'Economy Rice (3 dishes)', kcal: 580, protein: 22, carbs: 74, fat: 20 },
  { name: 'Milo Dinosaur', kcal: 220, protein: 4, carbs: 40, fat: 4 },
]

export default function LogScreen({ day, onLog }) {
  const [tab, setTab] = useState('catalog')
  const [desc, setDesc] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function estimate(description, imageBase64 = null) {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const r = await estimateFood(description, imageBase64)
      if (r) setResult(r)
      else setError('Could not parse estimate. Try rephrasing.')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const b64 = ev.target.result.split(',')[1]
      estimate(desc || 'Estimate this meal', b64)
    }
    reader.readAsDataURL(file)
  }

  const chip = (id, label) => (
    <div onClick={() => setTab(id)} style={{
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
        {chip('catalog', 'Catalog')}
        {chip('describe', 'Describe / Photo')}
      </div>

      {tab === 'catalog' && (
        <>
          <div style={{ fontSize: 8, color: 'var(--dim)', letterSpacing: '.16em', textTransform: 'uppercase', padding: '4px 16px 8px' }}>
            Your usual — one tap to log
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '0 16px' }}>
            {CATALOG.map(item => (
              <div key={item.name} onClick={() => onLog(item)} style={{
                background: 'var(--panel)', border: '1px solid var(--line)',
                borderRadius: 3, padding: 9, cursor: 'pointer'
              }}>
                <div style={{ fontSize: 11, color: 'var(--txt)' }}>{item.name}</div>
                <div style={{ fontSize: 9, color: 'var(--accent)', marginTop: 2 }}>{item.kcal} kcal</div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'describe' && (
        <div style={{ margin: '4px 16px', background: 'var(--panel)', border: '1px dashed var(--line2)', borderRadius: 3, padding: 10 }}>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Describe the meal — e.g. 'plate of chicken rice, skin on, with soup'"
            style={{
              width: '100%', background: 'var(--bg2)', border: '1px solid var(--line2)',
              borderRadius: 3, color: 'var(--txt)', fontSize: 11, padding: 8,
              resize: 'none', outline: 'none', minHeight: 52
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <label style={{
              flex: 1, background: 'var(--panel)', border: '1px solid var(--line2)',
              borderRadius: 3, height: 30, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 9, letterSpacing: '.06em',
              color: 'var(--mut)', cursor: 'pointer', textTransform: 'uppercase'
            }}>
              📷 Camera
              <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
            </label>
            <label style={{
              flex: 1, background: 'var(--panel)', border: '1px solid var(--line2)',
              borderRadius: 3, height: 30, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 9, letterSpacing: '.06em',
              color: 'var(--mut)', cursor: 'pointer', textTransform: 'uppercase'
            }}>
              🖼 Gallery
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            </label>
            <button onClick={() => estimate(desc)} disabled={loading || !desc.trim()} style={{
              flex: 1, background: 'var(--accent)', color: 'var(--bg)', border: 'none',
              borderRadius: 3, height: 30, fontSize: 9, letterSpacing: '.06em',
              cursor: 'pointer', textTransform: 'uppercase', opacity: loading ? .6 : 1
            }}>
              {loading ? '…' : 'Estimate'}
            </button>
          </div>
          {error && <div style={{ fontSize: 10, color: 'var(--danger)', marginTop: 6 }}>{error}</div>}
          {result && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--txt)', fontWeight: 500 }}>{result.name}</span>
                <span style={{ fontSize: 7, color: 'var(--accent)', border: '1px solid var(--line2)', borderRadius: 3, padding: '1px 5px', marginLeft: 8, textTransform: 'uppercase' }}>
                  {result.confidence}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--mut)' }}>
                {result.kcal} kcal · P {result.protein}g · C {result.carbs}g · F {result.fat}g
              </div>
              <button onClick={() => { onLog(result); setResult(null); setDesc('') }} style={{
                marginTop: 8, width: '100%', background: 'var(--accent)', color: 'var(--bg)',
                border: 'none', borderRadius: 3, padding: '7px 0', fontSize: 10,
                letterSpacing: '.06em', cursor: 'pointer', textTransform: 'uppercase'
              }}>
                Add to log
              </button>
            </div>
          )}
        </div>
      )}

      {/* Logged today */}
      {day.items.length > 0 && (
        <>
          <div style={{ fontSize: 8, color: 'var(--dim)', letterSpacing: '.16em', textTransform: 'uppercase', padding: '14px 16px 4px' }}>
            Logged today
          </div>
          {day.items.map((item, i) => <FoodRow key={i} item={item} />)}
        </>
      )}
      <div style={{ height: 20 }} />
    </div>
  )
}
