const tabs = [
  { id: 'today', icon: 'ti-layout-dashboard', label: 'Today' },
  { id: 'log', icon: 'ti-plus', label: 'Log' },
  { id: 'snap', icon: 'ti-camera', label: 'Snap' },
  { id: 'health', icon: 'ti-activity', label: 'Health' },
  { id: 'settings', icon: 'ti-settings', label: 'Settings' },
]

export default function BottomNav({ active, onSelect }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: 'var(--bg)', borderTop: '1px solid var(--line)',
      display: 'flex', height: 60
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 2, fontSize: 8, letterSpacing: '.06em',
          color: active === t.id ? 'var(--accent)' : 'var(--dim)',
          cursor: 'pointer', background: 'none', border: 'none',
          textTransform: 'uppercase', transition: 'color .15s'
        }}>
          <i className={`ti ${t.icon}`} style={{ fontSize: 20 }} />
          {t.label}
        </button>
      ))}
    </div>
  )
}
