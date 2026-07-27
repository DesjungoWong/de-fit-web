export default function TopBar({ theme, onToggleTheme }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'var(--bg)', borderBottom: '1px solid var(--line)',
      height: 58, display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 16, backdropFilter: 'blur(12px)'
    }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif", fontWeight: 600,
        fontSize: 22, letterSpacing: '.02em', fontStyle: 'italic', color: 'var(--txt)'
      }}>
        DE<span style={{ color: 'var(--accent)', fontStyle: 'normal' }}>.</span>Fit
      </div>
      <div style={{
        fontSize: 10, color: 'var(--dim)', letterSpacing: '.14em',
        marginLeft: 'auto', marginRight: 14, textTransform: 'uppercase'
      }}>
        Health · Nutrition · AI
      </div>
      <button onClick={onToggleTheme} style={{
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        background: 'none', border: 'none', padding: 0
      }}>
        <span style={{ fontSize: 9, letterSpacing: '.1em', color: 'var(--dim)', textTransform: 'uppercase' }}>
          {theme === 'dark' ? 'Dark' : 'Light'}
        </span>
        <div style={{
          width: 44, height: 22, border: '1px solid var(--line2)', borderRadius: 12,
          position: 'relative', background: 'var(--panel)'
        }}>
          <div style={{
            position: 'absolute', top: 2,
            left: theme === 'dark' ? 2 : 24,
            width: 16, height: 16, borderRadius: '50%',
            background: 'var(--accent)', transition: 'left .25s'
          }} />
        </div>
      </button>
    </div>
  )
}
