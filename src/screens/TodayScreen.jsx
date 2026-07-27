import React, { useState } from 'react'
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

export default function TodayScreen() {
  const { entries, calorieGoal, health } = useDayStore()
  const [msg, setMsg] = useState('')
  const [reply, setReply] = useState('Ask me anything about your health today.')
  const [loading, setLoading] = useState(false)

  const totalCal = entries.reduce((s, e) => s + (e.calories || 0), 0)
  const totalProtein = entries.reduce((s, e) => s + (e.protein || 0), 0)
  const totalCarbs = entries.reduce((s, e) => s + (e.carbs || 0), 0)
  const totalFat = entries.reduce((s, e) => s + (e.fat || 0), 0)
  const exercisePct = Math.min((health?.activeCalories || 0) / 500, 1)

  async function sendMsg() {
    if (!msg.trim()) return
    setLoading(true)
    const mealSummary = entries.length
      ? entries.map(e => `${e.name} (${e.calories}kcal)`).join(', ')
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
      <div style={{ fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 8 }}>Today's meals</div>
      {entries.length === 0 ? (
        <div style={{ color: 'var(--dim)', fontSize: 13, padding: '12px 0' }}>No meals logged yet. Go to Log to add food.</div>
      ) : entries.slice(-5).map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: i % 2 === 0 ? 'var(--purple)' : 'var(--gold)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>{e.name}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{e.meal || 'Meal'}</div>
          </div>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{e.calories}</div>
        </div>
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
