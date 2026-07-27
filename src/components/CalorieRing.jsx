export default function CalorieRing({ logged, target }) {
  const r = 56
  const circ = 2 * Math.PI * r
  const pct = Math.min(logged / (target || 1780), 1)
  const offset = circ * (1 - pct)
  const remaining = Math.max(0, (target || 1780) - logged)

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 8px' }}>
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        <svg width="160" height="160" viewBox="0 0 132 132" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="66" cy="66" r={r} fill="none" stroke="var(--line2)" strokeWidth="10" />
          <circle
            cx="66" cy="66" r={r} fill="none"
            stroke="var(--accent)" strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset .5s' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 600, fontSize: 28, color: 'var(--txt)'
          }}>
            {remaining.toLocaleString()}
          </div>
          <div style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 2 }}>
            kcal left
          </div>
        </div>
      </div>
    </div>
  )
}
