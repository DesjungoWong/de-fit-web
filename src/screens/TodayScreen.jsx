import React, { useState, useRef, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useDayStore } from '../store/dayStore'
import { callClaude } from '../api/claude'
import { getDayFromReports, getDatesWithData } from '../store/reportsStore'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

function CalorieRing({ consumed, goal, exercisePct }) {
  const r1 = 52, r2 = 40, cx = 63, cy = 63
  const pct = Math.min(consumed / goal, 1)
  const circ1 = 2 * Math.PI * r1
  const circ2 = 2 * Math.PI * r2
  return (
    <svg viewBox="0 0 126 126" width="140" height="140">
      <circle cx={cx} cy={cy} r={r1} fill="none" stroke="var(--border)" strokeWidth="9"/>
      <circle cx={cx} cy={cy} r={r1} fill="none" stroke="var(--purple)" strokeWidth="9"
        strokeDasharray={`${pct * circ1} ${circ1}`} strokeDashoffset={circ1 * 0.25} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .6s' }}/>
      <circle cx={cx} cy={cy} r={r2} fill="none" stroke="var(--border)" strokeWidth="7"/>
      <circle cx={cx} cy={cy} r={r2} fill="none" stroke="var(--gold)" strokeWidth="7"
        strokeDasharray={`${exercisePct * circ2} ${circ2}`} strokeDashoffset={circ2 * 0.25} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .6s' }}/>
      <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text)" fontSize="22" fontFamily="Georgia,serif" fontWeight="700">{consumed}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--muted)" fontSize="9">of {goal} kcal</text>
    </svg>
  )
}

// Swipeable meal row with delete + pax divider
function MealRow({ entry, onDelete, onPaxChange, index }) {
  const [swipeX, setSwipeX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startX = useRef(0)
  const pax = entry.pax || 1
  const eff = v => Math.round((v || 0) / pax)

  function onTouchStart(e) {
    startX.current = e.touches[0].clientX
    setSwiping(true)
  }
  function onTouchMove(e) {
    const dx = Math.min(0, Math.max(-90, e.touches[0].clientX - startX.current))
    setSwipeX(dx)
  }
  function onTouchEnd() {
    setSwiping(false)
    if (swipeX < -45) setSwipeX(-72)
    else setSwipeX(0)
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '0.5px solid var(--border)' }}>
      {/* Delete button behind */}
      <div
        onClick={() => onDelete(entry.id)}
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 72,
          background: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>Delete</span>
      </div>

      {/* Row content */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0',
          background: 'var(--bg)',
          transform: `translateX(${swipeX}px)`,
          transition: swiping ? 'none' : 'transform .25s ease'
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: index % 2 === 0 ? 'var(--purple)' : 'var(--gold)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{entry.meal || 'Meal'}{pax > 1 ? ` · ÷${pax} pax` : ''}</div>
        </div>

        {/* Pax stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <button
            onClick={() => onPaxChange(entry.id, Math.max(1, pax - 1))}
            style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: '4px 0 0 4px', color: 'var(--text)', width: 22, height: 22, fontSize: 13, cursor: 'pointer', lineHeight: 1, padding: 0 }}
          >−</button>
          <div style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderLeft: 'none', borderRight: 'none', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{pax}</span>
          </div>
          <button
            onClick={() => onPaxChange(entry.id, Math.min(5, pax + 1))}
            style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: '0 4px 4px 0', color: 'var(--text)', width: 22, height: 22, fontSize: 13, cursor: 'pointer', lineHeight: 1, padding: 0 }}
          >+</button>
        </div>

        <div style={{ fontFamily: 'Georgia,serif', fontSize: 14, fontWeight: 600, color: 'var(--text)', minWidth: 36, textAlign: 'right' }}>{eff(entry.calories)}</div>
      </div>
    </div>
  )
}

// Mini calendar overlay
function MiniCalendar({ selectedDate, onSelect, datesWithData }) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())

  const today = new Date()
  const firstDay = new Date(viewYear, viewMonth, 1)
  // Start week on Monday: 0=Mon..6=Sun
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span onClick={prevMonth} style={{ fontSize: 16, color: 'var(--muted)', cursor: 'pointer', padding: '0 6px' }}>‹</span>
        <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{monthName}</span>
        <span onClick={nextMonth} style={{ fontSize: 16, color: 'var(--muted)', cursor: 'pointer', padding: '0 6px' }}>›</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'var(--dim)', padding: '2px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const cellDate = new Date(viewYear, viewMonth, d)
          const dateStr = cellDate.toISOString().slice(0, 10)
          const isFuture = cellDate > today
          const isSelected = selectedDate.toISOString().slice(0, 10) === dateStr
          const isToday = today.toISOString().slice(0, 10) === dateStr
          const hasData = datesWithData.has(dateStr)

          return (
            <div
              key={i}
              onClick={() => !isFuture && onSelect(cellDate)}
              style={{
                textAlign: 'center', padding: '5px 2px', borderRadius: 6, cursor: isFuture ? 'default' : 'pointer',
                background: isSelected ? 'var(--purple)' : isToday ? 'rgba(161,0,255,0.15)' : 'transparent',
                color: isFuture ? 'var(--border)' : isSelected ? '#fff' : 'var(--text)',
                fontSize: 11, position: 'relative', fontWeight: isToday ? 700 : 400
              }}
            >
              {d}
              {hasData && !isSelected && (
                <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 3, height: 3, borderRadius: '50%', background: 'var(--purple)' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TodayScreen() {
  const { entries, calorieGoal, health, removeEntry, updateEntry, addEntry } = useDayStore()
  const [msg, setMsg] = useState('')
  const [reply, setReply] = useState('Ask me anything about your health today.')
  const [loading, setLoading] = useState(false)

  // Date navigation state
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [showCal, setShowCal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [pastEntries, setPastEntries] = useState([])
  const [pastReportsDay, setPastReportsDay] = useState(null)

  const selectedDateStr = selectedDate.toISOString().slice(0, 10)
  const isToday = selectedDateStr === new Date().toISOString().slice(0, 10)
  const datesWithData = getDatesWithData()

  useEffect(() => {
    if (!isToday) {
      const uid = localStorage.getItem('defit_current_user') || 'guest'
      const key = `defit_day_${uid}_${selectedDateStr}`
      const stored = JSON.parse(localStorage.getItem(key) || '{"entries":[]}')
      setPastEntries(stored.entries || [])
      setPastReportsDay(getDayFromReports(selectedDateStr))
    } else {
      setPastEntries([])
      setPastReportsDay(null)
    }
  }, [selectedDateStr, isToday])

  const displayEntries = isToday ? entries : pastEntries

  // Effective calories/macros accounting for pax dividers
  const effCal = e => Math.round((e.calories || 0) / (e.pax || 1))
  const effMacro = (e, k) => Math.round((e[k] || 0) / (e.pax || 1))

  const totalCal = displayEntries.reduce((s, e) => s + effCal(e), 0)
  const totalProtein = displayEntries.reduce((s, e) => s + effMacro(e, 'protein'), 0)
  const totalCarbs = displayEntries.reduce((s, e) => s + effMacro(e, 'carbs'), 0)
  const totalFat = displayEntries.reduce((s, e) => s + effMacro(e, 'fat'), 0)
  const exercisePct = Math.min((health?.activeCalories || 0) / 500, 1)

  async function sendMsg() {
    if (!msg.trim()) return
    setLoading(true)
    const mealSummary = displayEntries.length
      ? displayEntries.map(e => `${e.name} (${effCal(e)}kcal${e.pax > 1 ? ` ÷${e.pax}pax` : ''})`).join(', ')
      : 'nothing logged yet'
    const dateLabel = isToday ? 'today' : selectedDate.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
    const system = `You are DE.Fit's AI health advisor. Be concise — 2-3 sentences max. Data for ${dateLabel}: Calories eaten: ${totalCal}/${calorieGoal}kcal. Meals: ${mealSummary}. Steps: ${health?.steps || 'unknown'}. Sleep: ${health?.sleep || 'unknown'}hrs.`
    try {
      const r = await callClaude([{ role: 'user', content: msg }], system)
      setReply(r || 'Could not reach AI advisor.')
    } catch (e) {
      setReply('Error: ' + e.message)
    }
    setMsg('')
    setLoading(false)
  }

  async function handleDailyPdfImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportError('')
    try {
      const ab = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: ab }).promise
      let text = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map(item => item.str).join(' ') + '\n'
      }
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          messages: [{ role: 'user', content: `Extract all meal items from this daily nutrition log. Return ONLY valid JSON array, no markdown or explanation: [{"name":"meal name","calories":0,"protein":0,"carbs":0,"fat":0,"meal":"Morning|Lunch|Dinner|Snack"}]\n\n${text}` }]
        })
      })
      const data = await res.json()
      const raw = data.content?.[0]?.text || '[]'
      const meals = JSON.parse(raw.replace(/```json|```/g, '').trim())
      const uid = localStorage.getItem('defit_current_user') || 'guest'
      const dayKey = `defit_day_${uid}_${selectedDateStr}`
      const existing = JSON.parse(localStorage.getItem(dayKey) || '{"entries":[],"calorieGoal":1800}')
      const newEntries = meals.map(m => ({ ...m, id: Date.now() + Math.random(), pax: 1, loggedAt: Date.now(), fromPdf: true }))
      existing.entries = [...(existing.entries || []), ...newEntries]
      localStorage.setItem(dayKey, JSON.stringify(existing))
      if (isToday) {
        newEntries.forEach(m => addEntry(m))
      } else {
        setPastEntries(existing.entries)
      }
    } catch (err) {
      setImportError('Could not parse PDF: ' + err.message)
    }
    setImporting(false)
    e.target.value = ''
  }

  return (
    <div style={{ padding: '14px 16px', paddingBottom: 20 }}>

      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '8px 14px', marginBottom: 12 }}>
        <span
          onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); setShowCal(false) }}
          style={{ fontSize: 18, color: 'var(--muted)', padding: '0 6px', cursor: 'pointer' }}
        >‹</span>
        <div onClick={() => setShowCal(v => !v)} style={{ textAlign: 'center', flex: 1, cursor: 'pointer' }}>
          <div style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--purple)' }}>
            {selectedDate.toLocaleDateString('en-SG', { weekday: 'long' })} · tap for calendar
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {selectedDate.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
        <span
          onClick={() => {
            const d = new Date(selectedDate)
            d.setDate(d.getDate() + 1)
            if (d <= new Date()) { setSelectedDate(d); setShowCal(false) }
          }}
          style={{ fontSize: 18, color: selectedDate.toDateString() === new Date().toDateString() ? 'var(--border)' : 'var(--muted)', padding: '0 6px', cursor: 'pointer' }}
        >›</span>
      </div>

      {/* Calendar overlay */}
      {showCal && (
        <MiniCalendar
          selectedDate={selectedDate}
          onSelect={d => { setSelectedDate(d); setShowCal(false) }}
          datesWithData={datesWithData}
        />
      )}

      {/* Calorie Ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <CalorieRing consumed={totalCal} goal={calorieGoal} exercisePct={exercisePct} />
      </div>

      {/* Macros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 14 }}>
        {[
          ['Protein', totalProtein, 'g', 'var(--gold)', totalProtein / 150],
          ['Carbs', totalCarbs, 'g', 'var(--purple)', totalCarbs / 250],
          ['Fat', totalFat, 'g', 'var(--softPurple)', totalFat / 65],
        ].map(([l, v, u, c, pct]) => (
          <div key={l} style={{ background: 'var(--panel)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 16, fontWeight: 700, color: c }}>{Math.round(v)}{u}</div>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 2 }}>{l}</div>
            <div style={{ height: 2, borderRadius: 1, background: c, width: `${Math.min(pct, 1) * 100}%`, marginTop: 5, transition: 'width .4s' }} />
          </div>
        ))}
      </div>

      {/* PDF import strip */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '0.5px dashed var(--border)', borderRadius: 8, padding: '8px 12px', cursor: importing ? 'not-allowed' : 'pointer', marginBottom: 10, opacity: importing ? 0.6 : 1 }}>
        <span style={{ fontSize: 16 }}>📄</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text)' }}>{importing ? 'Parsing PDF…' : 'Import nutrition PDF'}</div>
          <div style={{ fontSize: 10, color: 'var(--dim)' }}>Appends meals · existing entries kept</div>
        </div>
        <input type="file" accept=".pdf" onChange={handleDailyPdfImport} disabled={importing} style={{ display: 'none' }} />
      </label>
      {importError && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>{importError}</div>}

      {/* Meals section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--dim)' }}>
          {isToday ? "Today's meals" : selectedDate.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' }) + "'s meals"}
        </div>
        {displayEntries.length > 0 && <div style={{ fontSize: 9, color: 'var(--dim)' }}>← swipe to delete · ±pax</div>}
      </div>

      {displayEntries.length === 0 ? (
        <div style={{ color: 'var(--dim)', fontSize: 13, padding: '12px 0' }}>
          {isToday ? 'No meals logged yet. Go to Log to add food.' : 'No meals logged for this date.'}
        </div>
      ) : displayEntries.map((e, i) => (
        <MealRow
          key={e.id || i}
          entry={e}
          index={i}
          onDelete={id => {
            if (isToday) {
              removeEntry(id)
            } else {
              const uid = localStorage.getItem('defit_current_user') || 'guest'
              const dayKey = `defit_day_${uid}_${selectedDateStr}`
              const existing = JSON.parse(localStorage.getItem(dayKey) || '{"entries":[]}')
              existing.entries = existing.entries.filter(en => en.id !== id)
              localStorage.setItem(dayKey, JSON.stringify(existing))
              setPastEntries(existing.entries)
            }
          }}
          onPaxChange={(id, pax) => {
            if (isToday) {
              updateEntry(id, { pax })
            } else {
              const uid = localStorage.getItem('defit_current_user') || 'guest'
              const dayKey = `defit_day_${uid}_${selectedDateStr}`
              const existing = JSON.parse(localStorage.getItem(dayKey) || '{"entries":[]}')
              existing.entries = existing.entries.map(en => en.id === id ? { ...en, pax } : en)
              localStorage.setItem(dayKey, JSON.stringify(existing))
              setPastEntries(existing.entries)
            }
          }}
        />
      ))}

      {/* Past reports day tile */}
      {!isToday && pastReportsDay && (
        <div style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginTop: 8 }}>
          <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 6 }}>
            From weekly report · {pastReportsDay.weekLabel}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {[['Cal in', pastReportsDay.calories + ' kcal'], ['Protein', pastReportsDay.protein + 'g'], ['Exercise', pastReportsDay.exercise || '—']].map(([l, v]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontFamily: 'Georgia,serif', fontWeight: 700, color: 'var(--text)' }}>{v}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Advisor */}
      <div style={{ fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--dim)', marginTop: 16, marginBottom: 8 }}>AI health advisor</div>
      <div style={{ background: 'var(--panel)', borderRadius: 8, padding: '12px' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 10 }}>{reply}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMsg()}
            placeholder="Ask your advisor…"
            style={{ flex: 1, background: '#1a1a1a', border: '0.5px solid var(--border)', borderRadius: 6, padding: '9px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }}
          />
          <button
            onClick={sendMsg}
            disabled={loading}
            style={{ background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 16px', fontSize: 11, fontFamily: 'inherit', letterSpacing: '.06em', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '…' : 'SEND'}
          </button>
        </div>
      </div>
    </div>
  )
}
