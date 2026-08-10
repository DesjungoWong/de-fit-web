import React, { useState, useRef, useEffect } from 'react'
import { useDayStore, getFavourites, toggleFavourite } from '../store/dayStore'
import { estimateFood, estimateFoodText } from '../api/claude'
import { hpbFoods, categories } from '../data/hpbFoods'
import { getCurrentUser } from '../store/authStore'

function MiniCalendar({ selectedDate, onSelect, onClose }) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())
  const today = new Date()
  const firstDay = new Date(viewYear, viewMonth, 1)
  let startDow = firstDay.getDay() - 1; if (startDow < 0) startDow = 6
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })
  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }
  const cells = []; for (let i = 0; i < startDow; i++) cells.push(null); for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return (
    <div style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 10, padding: 12, margin: '0 0 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span onClick={prevMonth} style={{ fontSize: 18, color: 'var(--muted)', cursor: 'pointer', padding: '0 8px' }}>‹</span>
        <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{monthName}</span>
        <span onClick={nextMonth} style={{ fontSize: 18, color: 'var(--muted)', cursor: 'pointer', padding: '0 8px' }}>›</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {['M','T','W','T','F','S','S'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'var(--dim)' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const cellDate = new Date(viewYear, viewMonth, d)
          const isFuture = cellDate > today
          const isSelected = selectedDate.toISOString().slice(0, 10) === cellDate.toISOString().slice(0, 10)
          const isToday = today.toISOString().slice(0, 10) === cellDate.toISOString().slice(0, 10)
          return (
            <div key={i} onClick={() => { if (!isFuture) { onSelect(cellDate); onClose() } }}
              style={{ textAlign: 'center', padding: '5px 2px', borderRadius: 6,
                cursor: isFuture ? 'default' : 'pointer',
                background: isSelected ? 'var(--purple)' : isToday ? 'rgba(161,0,255,0.15)' : 'transparent',
                color: isFuture ? 'var(--border)' : isSelected ? '#fff' : 'var(--text)',
                fontSize: 11, fontWeight: isToday ? 700 : 400 }}>
              {d}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FoodRow({ f, isFav, onAdd, onToggleFav }) {
  const [added, setAdded] = useState(false)

  function handleAdd() {
    if (added) return
    onAdd(f)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
      <div style={{ flex: 1, cursor: 'pointer' }} onClick={handleAdd}>
        <div style={{ fontSize: 13, color: 'var(--text)' }}>{f.name}</div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{f.servingSize} · P {f.protein}g · C {f.carbs}g · F {f.fat}g</div>
      </div>
      <div
        onClick={handleAdd}
        style={{
          marginLeft: 10, cursor: added ? 'default' : 'pointer',
          minWidth: 54, textAlign: 'right',
          transition: 'all .2s'
        }}
      >
        {added
          ? <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, letterSpacing: '.04em' }}>✓ Added</span>
          : <span style={{ fontFamily: 'Georgia,serif', fontSize: 15, fontWeight: 700, color: 'var(--purple)' }}>{f.calories}</span>
        }
      </div>
      <div
        onClick={e => onToggleFav(f.id, e)}
        style={{ marginLeft: 8, fontSize: 16, cursor: 'pointer', color: isFav ? '#FFB800' : 'var(--border)', transition: 'color .15s', lineHeight: 1, padding: '2px 4px' }}
        title={isFav ? 'Remove from favourites' : 'Add to favourites'}
      >★</div>
    </div>
  )
}

function ResultCard({ items, onAdd, onAddDone }) {
  const [selected, setSelected] = useState(() => new Set(items.map((_, i) => i)))

  function toggle(i) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function addSelected() {
    items.filter((_, i) => selected.has(i)).forEach(item => onAdd(item))
    onAddDone()
  }

  const selCount = selected.size

  return (
    <div style={{ background: 'var(--panel)', borderRadius: 8, padding: 12, marginTop: 10 }}>
      <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 8 }}>Estimated nutrition · tap to select</div>
      {items.map((item, i) => {
        const isOn = selected.has(i)
        return (
          <div
            key={i}
            onClick={() => toggle(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 8px', borderRadius: 7, marginBottom: 4, cursor: 'pointer',
              background: isOn ? 'rgba(161,0,255,0.10)' : 'transparent',
              border: `0.5px solid ${isOn ? 'var(--purple)' : 'var(--border)'}`,
              transition: 'background .15s, border-color .15s'
            }}
          >
            {/* Checkbox circle */}
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${isOn ? 'var(--purple)' : 'var(--border)'}`,
              background: isOn ? 'var(--purple)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .15s, border-color .15s'
            }}>
              {isOn && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                P {item.protein}g · C {item.carbs}g · F {item.fat}g · {item.servingSize}
              </div>
            </div>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 15, color: 'var(--purple)', fontWeight: 700, flexShrink: 0 }}>{item.calories}</span>
          </div>
        )
      })}
      <button
        onClick={addSelected}
        disabled={selCount === 0}
        style={{
          width: '100%', marginTop: 6,
          background: selCount > 0 ? 'var(--purple)' : 'var(--border)',
          color: selCount > 0 ? '#fff' : 'var(--dim)',
          border: 'none', borderRadius: 6, padding: '10px 0',
          fontSize: 11, letterSpacing: '.06em', cursor: selCount > 0 ? 'pointer' : 'default',
          fontFamily: 'inherit', transition: 'background .15s'
        }}
      >
        {selCount === 0 ? 'SELECT ITEMS TO ADD' : `ADD ${selCount} ITEM${selCount > 1 ? 'S' : ''} TO LOG`}
      </button>
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
  const [favs, setFavs] = useState(() => getFavourites())
  const fileRef = useRef()

  // Date navigation
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [showCal, setShowCal] = useState(false)
  const [pastEntries, setPastEntries] = useState([])
  const todayStr = new Date().toISOString().slice(0, 10)
  const selectedDateStr = selectedDate.toISOString().slice(0, 10)
  const isToday = selectedDateStr === todayStr

  useEffect(() => {
    if (!isToday) {
      const uid = getCurrentUser()?.id || 'guest'
      const key = `defit_day_${uid}_${selectedDateStr}`
      const stored = JSON.parse(localStorage.getItem(key) || '{"entries":[]}')
      setPastEntries(stored.entries || [])
    } else {
      setPastEntries([])
    }
  }, [selectedDateStr, isToday])

  const displayEntries = isToday ? entries : pastEntries

  function addEntryToDate(item) {
    if (isToday) {
      addEntry({ ...item, meal: 'Meal' })
    } else {
      const uid = getCurrentUser()?.id || 'guest'
      const key = `defit_day_${uid}_${selectedDateStr}`
      const stored = JSON.parse(localStorage.getItem(key) || '{"entries":[]}')
      stored.entries = [...(stored.entries || []), { ...item, meal: 'Meal', id: Date.now(), pax: 1, loggedAt: Date.now() }]
      localStorage.setItem(key, JSON.stringify(stored))
      setPastEntries(stored.entries)
    }
  }

  const dateLabel = isToday ? 'Today' : selectedDate.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })

  const catLabels = { All: 'All', favourites: '★ Favourites', hawker: 'Hawker', noodles: 'Noodles', indian: 'Indian', malay: 'Malay', western: 'Western', japanese: 'Japanese', drinks: 'Drinks', snacks: 'Snacks' }

  function handleToggleFav(foodId, e) {
    e.stopPropagation()
    setFavs(toggleFavourite(foodId))
  }

  const filtered = hpbFoods.filter(f => {
    const matchCat = category === 'All' ? f.category !== 'favourites' : f.category === category || (category === 'favourites' && favs.has(f.id))
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  // Pinned favourites strip (shown when not already in favourites tab)
  const pinnedFavs = category !== 'favourites' && !search
    ? hpbFoods.filter(f => favs.has(f.id))
    : []

  function handleAdd(item) {
    addEntryToDate(item)
  }

  function handleAddDone() {
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
      {/* Date nav bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 6px', borderBottom: '0.5px solid var(--border)', flexShrink: 0, background: 'var(--bg)' }}>
        <span
          onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); setShowCal(false) }}
          style={{ fontSize: 18, color: 'var(--muted)', cursor: 'pointer', padding: '2px 8px' }}>‹</span>
        <div onClick={() => setShowCal(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: isToday ? 'var(--purple)' : 'var(--text)' }}>{dateLabel}</span>
          <span style={{ fontSize: 10, color: 'var(--dim)' }}>▾</span>
        </div>
        <span
          onClick={() => { if (!isToday) { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); setShowCal(false) } }}
          style={{ fontSize: 18, color: isToday ? 'var(--border)' : 'var(--muted)', cursor: isToday ? 'default' : 'pointer', padding: '2px 8px' }}>›</span>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        <TabBtn id="search" label="Search" />
        <TabBtn id="catalog" label="Catalog" />
        <TabBtn id="scan" label="Scan" />
      </div>

      {/* Search tab */}
      {(subTab === 'search' || subTab === 'catalog') && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {/* Calendar overlay */}
          {showCal && <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} onClose={() => setShowCal(false)} />}
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

          {/* Pinned favourites strip */}
          {pinnedFavs.length > 0 && (
            <>
              <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 4 }}>★ Favourites</div>
              {pinnedFavs.map(f => (
                <FoodRow key={`fav-${f.id}`} f={f} isFav onAdd={handleAdd} onToggleFav={handleToggleFav} />
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '8px 0 10px' }} />
            </>
          )}

          {/* Food list */}
          {filtered.map(f => (
            <FoodRow key={f.id} f={f} isFav={favs.has(f.id)} onAdd={handleAdd} onToggleFav={handleToggleFav} />
          ))}
          {filtered.length === 0 && pinnedFavs.length === 0 && (
            <div style={{ color: 'var(--dim)', fontSize: 13, paddingTop: 20 }}>No foods found. Try the Scan tab to use AI estimation.</div>
          )}
        </div>
      )}

      {/* Scan tab — recents + AI estimation */}
      {subTab === 'scan' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Recently logged */}
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
            {showCal && <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} onClose={() => setShowCal(false)} />}
            <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 10 }}>
              {isToday ? 'Logged today' : `Logged on ${dateLabel}`}
            </div>
            {displayEntries.length === 0 ? (
              <div style={{ color: 'var(--dim)', fontSize: 12 }}>No items logged{isToday ? ' yet today' : ' on this date'}.</div>
            ) : [...displayEntries].reverse().slice(0, 5).map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < Math.min(displayEntries.length, 5) - 1 ? '0.5px solid var(--border)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{e.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>P {e.protein || 0}g · C {e.carbs || 0}g · F {e.fat || 0}g</div>
                </div>
                <div style={{ fontFamily: 'Georgia,serif', fontSize: 15, fontWeight: 700, color: 'var(--purple)' }}>{e.calories}</div>
                <div
                  onClick={() => addEntryToDate(e)}
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
            {result && <ResultCard items={result} onAdd={handleAdd} onAddDone={handleAddDone} />}
          </div>
        </div>
      )}
    </div>
  )
}
