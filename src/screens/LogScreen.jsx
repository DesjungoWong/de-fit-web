import React, { useState, useRef } from 'react'
import { useDayStore } from '../store/dayStore'
import { estimateFood, estimateFoodText } from '../api/claude'
import { hpbFoods, categories } from '../data/hpbFoods'

function ResultCard({ items, onAdd }) {
  return (
    <div style={{ background: 'var(--panel)', borderRadius: 8, padding: 12, marginTop: 10 }}>
      <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 8 }}>Estimated nutrition</div>
      {items.map((item, i) => (
        <div key={i} style={{ marginBottom: i < items.length - 1 ? 10 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>{item.name}</span>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 15, color: 'var(--purple)', fontWeight: 700 }}>{item.calories} kcal</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
            P {item.protein}g · C {item.carbs}g · F {item.fat}g · {item.servingSize}
          </div>
          <button
            onClick={() => onAdd(item)}
            style={{ width: '100%', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 0', fontSize: 11, letterSpacing: '.06em', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ADD TO LOG
          </button>
        </div>
      ))}
    </div>
  )
}

export default function LogScreen() {
  const { entries, addEntry } = useDayStore()
  const [subTab, setSubTab] = useState('search')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [aiMode, setAiMode] = useState('describe') // 'gallery' | 'describe'
  const [desc, setDesc] = useState('')
  const [preview, setPreview] = useState(null)
  const [imageDataUrl, setImageDataUrl] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const catLabels = { All: 'All', hawker: 'Hawker', noodles: 'Noodles', indian: 'Indian', malay: 'Malay', western: 'Western', japanese: 'Japanese', drinks: 'Drinks', snacks: 'Snacks' }

  const filtered = hpbFoods.filter(f => {
    const matchCat = category === 'All' || f.category === category
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  function handleAdd(item) {
    addEntry({ ...item, meal: 'Meal' })
    setResult(null)
    setDesc('')
    setPreview(null)
    setImageDataUrl(null)
  }

  async function runEstimateText() {
    if (!desc.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const raw = await estimateFoodText(desc)
      const cleaned = raw.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      setResult(Array.isArray(parsed) ? parsed : [parsed])
    } catch (e) {
      setError('Could not parse estimate. Try rephrasing. ' + e.message)
    }
    setLoading(false)
  }

  async function runEstimateImage() {
    if (!imageDataUrl) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const raw = await estimateFood(imageDataUrl)
      const cleaned = raw.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      setResult(Array.isArray(parsed) ? parsed : [parsed])
    } catch (e) {
      setError('Could not analyse image. ' + e.message)
    }
    setLoading(false)
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setImageDataUrl(ev.target.result)
      setPreview(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const TabBtn = ({ id, label }) => (
    <div
      onClick={() => setSubTab(id)}
      style={{ flex: 1, textAlign: 'center', padding: '8px 0', fontSize: 11, cursor: 'pointer', borderBottom: `2px solid ${subTab === id ? 'var(--purple)' : 'transparent'}`, color: subTab === id ? 'var(--purple)' : 'var(--muted)', transition: 'color .15s' }}
    >
      {label}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        <TabBtn id="search" label="Search" />
        <TabBtn id="catalog" label="Catalog" />
        <TabBtn id="scan" label="Scan" />
      </div>

      {/* Search tab */}
      {(subTab === 'search' || subTab === 'catalog') && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {/* Search input */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search foods…"
            style={{ width: '100%', background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
          />

          {/* Category chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
            {Object.entries(catLabels).map(([id, label]) => (
              <div
                key={id}
                onClick={() => setCategory(id)}
                style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', background: category === id ? 'var(--purple)' : 'var(--panel)', color: category === id ? '#fff' : 'var(--muted)', border: `0.5px solid ${category === id ? 'var(--purple)' : 'var(--border)'}`, transition: 'background .15s' }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Food list */}
          {filtered.map(f => (
            <div
              key={f.id}
              style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}
              onClick={() => handleAdd(f)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{f.name}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{f.servingSize} · P {f.protein}g · C {f.carbs}g · F {f.fat}g</div>
              </div>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 15, fontWeight: 700, color: 'var(--purple)', marginLeft: 10 }}>{f.calories}</div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ color: 'var(--dim)', fontSize: 13, paddingTop: 20 }}>No foods found. Try the Scan tab to use AI estimation.</div>}
        </div>
      )}

      {/* Scan tab — recents + AI estimation */}
      {subTab === 'scan' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Recently logged */}
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 10 }}>Recently logged</div>
            {entries.length === 0 ? (
              <div style={{ color: 'var(--dim)', fontSize: 12 }}>No items logged yet today.</div>
            ) : [...entries].reverse().slice(0, 5).map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < Math.min(entries.length, 5) - 1 ? '0.5px solid var(--border)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{e.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>P {e.protein || 0}g · C {e.carbs || 0}g · F {e.fat || 0}g</div>
                </div>
                <div style={{ fontFamily: 'Georgia,serif', fontSize: 15, fontWeight: 700, color: 'var(--purple)' }}>{e.calories}</div>
                <div
                  onClick={() => addEntry(e)}
                  style={{ fontSize: 11, color: 'var(--purple)', cursor: 'pointer', padding: '4px 8px', border: '0.5px solid var(--purple)', borderRadius: 4 }}
                >
                  +Add
                </div>
              </div>
            ))}
          </div>

          {/* AI Estimation section */}
          <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 12 }}>AI Estimation</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {['gallery', 'describe'].map(m => (
                <div
                  key={m}
                  onClick={() => setAiMode(m)}
                  style={{ flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: aiMode === m ? 'var(--purple)' : 'var(--panel)', color: aiMode === m ? '#fff' : 'var(--muted)', border: `0.5px solid ${aiMode === m ? 'var(--purple)' : 'var(--border)'}` }}
                >
                  {m === 'gallery' ? '🖼 Gallery' : '✎ Describe'}
                </div>
              ))}
            </div>

            {aiMode === 'gallery' && (
              <div style={{ flex: 1 }}>
                {preview ? (
                  <div style={{ position: 'relative', marginBottom: 10 }}>
                    <img src={preview} alt="Food" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} />
                    <div onClick={() => { setPreview(null); setImageDataUrl(null); setResult(null) }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12 }}>✕</div>
                  </div>
                ) : (
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 100, borderRadius: 8, border: '0.5px dashed var(--border)', cursor: 'pointer', marginBottom: 10 }}>
                    <span style={{ fontSize: 24 }}>📷</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Tap to pick image</span>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>
                )}
                {imageDataUrl && (
                  <button onClick={runEstimateImage} disabled={loading} style={{ width: '100%', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 6, padding: '11px 0', fontSize: 11, cursor: 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'inherit', letterSpacing: '.06em' }}>
                    {loading ? 'Analysing…' : 'ESTIMATE WITH AI'}
                  </button>
                )}
              </div>
            )}

            {aiMode === 'describe' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), runEstimateText())}
                  placeholder="Describe meal — e.g. chicken rice with skin, bowl of laksa"
                  style={{ flex: 1, minHeight: 80, background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--text)', fontFamily: 'inherit', outline: 'none', resize: 'none' }}
                />
                <button onClick={runEstimateText} disabled={loading || !desc.trim()} style={{ width: '100%', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 6, padding: '11px 0', fontSize: 11, cursor: 'pointer', opacity: loading || !desc.trim() ? 0.6 : 1, fontFamily: 'inherit', letterSpacing: '.06em' }}>
                  {loading ? 'Estimating…' : 'ESTIMATE WITH AI'}
                </button>
              </div>
            )}

            {error && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 8 }}>{error}</div>}
            {result && <ResultCard items={result} onAdd={handleAdd} />}
          </div>
        </div>
      )}
    </div>
  )
}
