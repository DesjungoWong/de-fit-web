import { useState } from 'react'

const periodData = {
  D: {
    bars: [40, 55, 70, 48, 62, 85, 100],
    steps: '7,412', active: '418', sleep: '6h 42m',
    hr: '61', weight: '79.8kg', cycling: '1 ride'
  },
  W: {
    bars: [60, 75, 55, 80, 70, 90, 65],
    steps: '52,884', active: '2,940', sleep: '6h 51m avg',
    hr: '62', weight: '79.8kg', cycling: '2 rides'
  },
  M: {
    bars: [70, 55, 80, 65, 72, 68, 90],
    steps: '228k', active: '12.6k', sleep: '6h 48m avg',
    hr: '63', weight: '80.2kg', cycling: '6 rides'
  },
  Y: {
    bars: [50, 60, 55, 70, 65, 80, 75],
    steps: '2.74M', active: '152k', sleep: '6h 44m avg',
    hr: '64', weight: '82.1kg', cycling: '48 rides'
  }
}

const cards = [
  { id: 'steps',   icon: 'ti-shoe',    label: 'Steps',      sub: 'Goal 8,000' },
  { id: 'active',  icon: 'ti-flame',   label: 'Active kcal', sub: '+12% vs avg' },
  { id: 'sleep',   icon: 'ti-moon',    label: 'Sleep',      sub: 'Deep 1h 12m' },
  { id: 'hr',      icon: 'ti-heart',   label: 'Resting HR', sub: '−2 vs 30d avg' },
  { id: 'weight',  icon: 'ti-scale',   label: 'Weight',     sub: 'Target 76.0kg' },
  { id: 'cycling', icon: 'ti-bike',    label: 'Cycling',    sub: '54km this wk' },
]

export default function HealthScreen() {
  const [period, setPeriod] = useState('D')
  const [drivePath, setDrivePath] = useState(localStorage.getItem('defit_drive_path') || '')
  const d = periodData[period]
  const maxBar = Math.max(...d.bars)

  const ptBtn = (id, label) => (
    <div onClick={() => setPeriod(id)} style={{
      flex: 1, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, border: `1px solid ${period === id ? 'var(--accent)' : 'var(--line2)'}`,
      cursor: 'pointer', borderRadius: 3, color: period === id ? 'var(--accent)' : 'var(--mut)',
      background: period === id ? 'var(--accent-dim)' : 'transparent',
      textTransform: 'uppercase', letterSpacing: '.04em'
    }}>
      {label}
    </div>
  )

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', gap: 4, padding: '12px 16px 8px' }}>
        {ptBtn('D', 'Day')}
        {ptBtn('W', 'Week')}
        {ptBtn('M', 'Month')}
        {ptBtn('Y', 'Year')}
      </div>

      {/* Trend bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 72, padding: '0 16px 6px' }}>
        {d.bars.map((v, i) => (
          <div key={i} style={{
            flex: 1, borderRadius: '2px 2px 0 0',
            height: `${(v / maxBar) * 100}%`,
            background: v === maxBar ? 'var(--accent)' : 'var(--accent-dim)',
            transition: 'height .4s'
          }} />
        ))}
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '4px 16px 10px' }}>
        {cards.map(c => (
          <div key={c.id} style={{ background: 'var(--panel)', borderRadius: 3, padding: 10 }}>
            <div style={{ fontSize: 8, color: 'var(--dim)', letterSpacing: '.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className={`ti ${c.icon}`} style={{ fontSize: 11 }} />
              {c.label}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 21, marginTop: 4, color: 'var(--txt)' }}>
              {d[c.id]}
            </div>
            <div style={{ fontSize: 8, color: 'var(--dim)', marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Import row */}
      <div style={{
        margin: '4px 16px 16px', background: 'var(--panel)',
        border: '1px solid var(--line2)', borderRadius: 3, padding: 10,
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <div style={{ flex: 1, fontSize: 9, color: 'var(--mut)', lineHeight: 1.5 }}>
          Manual import · last synced 2 days ago<br />
          Path: <span style={{ color: 'var(--accent)' }}>{drivePath || 'Not set'}</span>
        </div>
        <label style={{
          background: 'var(--accent)', color: 'var(--bg)', border: 'none',
          borderRadius: 3, padding: '6px 10px', fontSize: 9, letterSpacing: '.05em',
          cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap'
        }}>
          Browse
          <input type="file" style={{ display: 'none' }} onChange={e => {
            const f = e.target.files?.[0]
            if (f) { const p = f.name; setDrivePath(p); localStorage.setItem('defit_drive_path', p) }
          }} />
        </label>
      </div>
    </div>
  )
}
