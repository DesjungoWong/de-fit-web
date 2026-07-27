import React, { useState, useRef } from 'react'
import { useDayStore } from '../store/dayStore'
import { callClaude } from '../api/claude'

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

export default function TodayScreen() {
  const { entries, calorieGoal, health, removeEntry, updateEntry } = useDayStore()
  const [msg, setMsg] = useState('')
  const [reply, setReply] = useState('Ask me anything about your health today.')
  const [loading, setLoading] = useState(false)

  // Effective calories/macros accounting for pax dividers
  const effCal = e => Math.round((e.calories || 0) / (e.pax || 1))
  const effMacro = (e, k) => Math.round((e[k] || 0) / (e.pax || 1))

  const totalCal = entries.reduce((s, e) => s + effCal(e), 0)
  const totalProtein = entries.reduce((s, e) => s + effMacro(e, 'protein'), 0)
  const totalCarbs = entries.reduce((s, e) => s + effMacro(e, 'carbs'), 0)
  const totalFat = entries.reduce((s, e) => s + effMacro(e, 'fat'), 0)
  const exercisePct = Math.min((health?.activeCalories || 0) / 500, 1)

  async function sendMsg() {
    if (!msg.trim()) return
    setLoading(true)
    const mealSummary = entries.length
      ? entries.map(e => `${e.name} (${effCal(e)}kcal${e.pax > 1 ? ` ÷${e.pax}pax` : ''})`).join(', ')
      : 'nothing logged yet'
    const system = `You are DE.Fit's AI health advisor. Be concise — 2-3 sentences max. Today's data: Calories eaten: ${totalCal}/${calorieGoal}kcal. Meals: ${mealSummary}. Steps: ${health?.steps || 'unknown'}. Sleep: ${health?.sleep || 'unknown'}hrs.`
    try {
      const r = await callClaude([{ role: 'user', content: msg }], system)
      setReply(r || 'Could not reach AI advisor.')
    } catch (e) {
      setReply('Error: ' + e.message)
    }
    setMsg('')
    setLoading(false)
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <div style={{ padding: '14px 16px', paddingBottom: 20 }}>
      <div style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 12 }}>{dateStr}</div>

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

      {/* Today's Meals */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--dim)' }}>Today's meals</div>
        {entries.length > 0 && <div style={{ fontSize: 9, color: 'var(--dim)' }}>← swipe to delete · ±pax</div>}
      </div>

      {entries.length === 0 ? (
        <div style={{ color: 'var(--dim)', fontSize: 13, padding: '12px 0' }}>No meals logged yet. Go to Log to add food.</div>
      ) : entries.map((e, i) => (
        <MealRow
          key={e.id || i}
          entry={e}
          index={i}
          onDelete={id => removeEntry(id)}
          onPaxChange={(id, pax) => updateEntry(id, { pax })}
        />
      ))}

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
