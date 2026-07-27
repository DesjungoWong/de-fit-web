const macros = [
  { key: 'protein', label: 'Protein', target: 120, color: 'var(--forest)' },
  { key: 'carbs',   label: 'Carbs',   target: 200, color: 'var(--ocean)' },
  { key: 'fat',     label: 'Fat',     target: 60,  color: 'var(--wine)' },
]

export default function MacroGrid({ protein, carbs, fat }) {
  const vals = { protein, carbs, fat }
  return (
    <div style={{ display: 'flex', gap: 1, margin: '0 16px 8px' }}>
      {macros.map(m => {
        const pct = Math.min((vals[m.key] || 0) / m.target * 100, 100)
        return (
          <div key={m.key} style={{
            flex: 1, background: 'var(--panel)', padding: 8,
            textAlign: 'center', borderRadius: 2
          }}>
            <div style={{ fontSize: 7, color: 'var(--dim)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
              {m.label}
            </div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600, fontSize: 17, marginTop: 2, color: 'var(--txt)'
            }}>
              {Math.round(vals[m.key] || 0)}g
            </div>
            <div style={{ height: 2, background: 'var(--line2)', marginTop: 5, borderRadius: 1, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: m.color, transition: 'width .4s' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
