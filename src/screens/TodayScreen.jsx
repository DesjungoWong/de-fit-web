import { useState, useEffect } from 'react'
import CalorieRing from '../components/CalorieRing'
import MacroGrid from '../components/MacroGrid'
import FoodRow from '../components/FoodRow'
import AdvisoryChat from '../components/AdvisoryChat'
import { callClaude } from '../api/claude'

export default function TodayScreen({ day }) {
  const [advisory, setAdvisory] = useState('Loading your daily advisory…')

  useEffect(() => {
    const system = 'You are a concise health advisor for DE.Fit. Give a 2-sentence verdict on today\'s nutrition and health data. Be specific and direct. Singapore food context.'
    const msg = `Calories logged: ${day.kcalLogged} of ${day.kcalTarget} kcal. Protein: ${Math.round(day.protein)}g, Carbs: ${Math.round(day.carbs)}g, Fat: ${Math.round(day.fat)}g. Steps: 7,412, Sleep: 6h 42m, RHR: 61 bpm. Fasting window closes at 8pm.`
    callClaude([{ role: 'user', content: msg }], system)
      .then(t => setAdvisory(t))
      .catch(() => setAdvisory('Calories and macros are tracking to your target this week. Protein is a touch low — a high-protein dinner would close the gap before your fasting window closes at 8pm.'))
  }, [day.kcalLogged])

  const date = new Date().toLocaleDateString('en-SG', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      {/* Section label */}
      <div style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: '.16em', textTransform: 'uppercase', padding: '12px 16px 4px' }}>
        {date}
      </div>

      <CalorieRing logged={day.kcalLogged} target={day.kcalTarget} />
      <MacroGrid protein={day.protein} carbs={day.carbs} fat={day.fat} />

      {/* Health metrics */}
      <div style={{ fontSize: 8, color: 'var(--dim)', letterSpacing: '.16em', textTransform: 'uppercase', padding: '10px 16px 6px' }}>
        Synced from Google Health
      </div>
      <div style={{ display: 'flex', gap: 1, margin: '0 16px 8px' }}>
        {[
          { icon: 'ti-shoe',  label: 'Steps', val: '7,412' },
          { icon: 'ti-moon',  label: 'Sleep',  val: '6h 42m' },
          { icon: 'ti-heart', label: 'RHR',    val: '61' },
        ].map(h => (
          <div key={h.label} style={{ flex: 1, background: 'var(--panel)', padding: 9, borderRadius: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--dim)', fontSize: 9 }}>
              <i className={`ti ${h.icon}`} style={{ fontSize: 11 }} />
              {h.label}
              <span style={{ fontSize: 7, color: 'var(--ocean)', border: '1px solid var(--line2)', borderRadius: 3, padding: '1px 4px', marginLeft: 'auto' }}>GH</span>
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 16, marginTop: 2, color: 'var(--txt)' }}>
              {h.val}
            </div>
          </div>
        ))}
      </div>

      {/* Advisory */}
      <div style={{
        margin: '8px 16px', background: 'var(--accent-dim)',
        border: '1px solid var(--line2)', borderRadius: 3, padding: 10
      }}>
        <div style={{ fontSize: 8, letterSpacing: '.1em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
          ✧ AI ADVISORY
        </div>
        <div style={{ fontSize: 11, color: 'var(--mut)', lineHeight: 1.6 }}>{advisory}</div>
      </div>

      <AdvisoryChat day={day} />

      {/* Logged items */}
      {day.items.length > 0 && (
        <>
          <div style={{ fontSize: 8, color: 'var(--dim)', letterSpacing: '.16em', textTransform: 'uppercase', padding: '10px 16px 4px' }}>
            Logged today
          </div>
          {day.items.map((item, i) => <FoodRow key={i} item={item} />)}
        </>
      )}

      <div style={{ height: 20 }} />
    </div>
  )
}
