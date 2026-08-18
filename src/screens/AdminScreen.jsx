import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const PURPLE = '#A100FF'
const css = {
  bg:      '#0d0d0f',
  panel:   '#161619',
  border:  'rgba(255,255,255,0.08)',
  dim:     '#555',
  muted:   '#888',
  text:    '#e0e0e0',
  green:   '#34c759',
  orange:  '#ff9f0a',
  red:     '#ff453a',
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function relTime(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function last7Keys() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 864e5)
    return d.toISOString().slice(0, 10)
  })
}

function dayLabel(iso) {
  return new Date(iso).toLocaleDateString('en', { weekday: 'narrow' })
}

// ── Reusable UI pieces ────────────────────────────────────────────────────────

function Panel({ title, children, style }) {
  return (
    <div style={{ background: css.panel, border: `1px solid ${css.border}`, borderRadius: 8, padding: 16, ...style }}>
      {title && <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: css.dim, marginBottom: 12 }}>{title}</div>}
      {children}
    </div>
  )
}

function KPI({ label, value, delta, deltaDir }) {
  const colour = deltaDir === 'up' ? css.green : deltaDir === 'down' ? css.red : css.muted
  return (
    <Panel>
      <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: css.dim, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1, color: css.text }}>{value}</div>
      {delta && <div style={{ fontSize: 10, marginTop: 4, color: colour }}>{delta}</div>}
    </Panel>
  )
}

function BarChart({ data, maxVal, color = PURPLE }) {
  // data: [{ label, value }]
  const max = maxVal || Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <div title={`${d.label}: ${d.value}`} style={{
              width: '100%', borderRadius: '3px 3px 0 0',
              height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%`,
              background: i === data.length - 1 ? color : `${color}44`,
              transition: 'height .3s',
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, fontSize: 8, color: i === data.length - 1 ? color : css.dim, textAlign: 'center' }}>{d.label}</div>
        ))}
      </div>
    </div>
  )
}

function HBar({ label, value, max, right }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: css.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>{label}</span>
        <span style={{ fontSize: 11, color: PURPLE, fontWeight: 600 }}>{right || value}</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: PURPLE, borderRadius: 3, transition: 'width .4s' }} />
      </div>
    </div>
  )
}

function StatusTag({ status }) {
  const map = {
    active: { bg: 'rgba(52,199,89,0.15)', color: css.green, label: 'Active' },
    idle:   { bg: 'rgba(255,159,10,0.15)', color: css.orange, label: 'Idle' },
    new:    { bg: 'rgba(161,0,255,0.15)',  color: PURPLE, label: 'New' },
    gone:   { bg: 'rgba(255,255,255,0.05)', color: css.dim, label: 'Inactive' },
  }
  const s = map[status] || map.gone
  return <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, background: s.bg, color: s.color, letterSpacing: '.06em' }}>{s.label}</span>
}

function userStatus(lastSeenIso) {
  if (!lastSeenIso) return 'new'
  const h = (Date.now() - new Date(lastSeenIso).getTime()) / 36e5
  if (h < 2)   return 'active'
  if (h < 48)  return 'idle'
  if (h < 168) return 'gone'
  return 'gone'
}

// ── Tab components ────────────────────────────────────────────────────────────

function OverviewTab({ d }) {
  const keys = last7Keys()
  const dauByDay = {}
  ;(d.events7d || []).forEach(e => {
    const day = e.created_at.slice(0, 10)
    if (!dauByDay[day]) dauByDay[day] = new Set()
    dauByDay[day].add(e.user_id)
  })
  const dauChart = keys.map(k => ({ label: dayLabel(k), value: dauByDay[k]?.size || 0 }))

  const today = new Date().toISOString().slice(0, 10)
  const dauToday = dauByDay[today]?.size || 0
  const mealsToday = (d.foodLogs7d || []).filter(f => f.logged_at.slice(0, 10) === today).length
  const totalUsers = (d.users || []).length

  // DAU avg (excl today)
  const prevDays = keys.slice(0, 6).map(k => dauByDay[k]?.size || 0)
  const avgDau = prevDays.reduce((a, b) => a + b, 0) / 6
  const dauDelta = avgDau > 0 ? ((dauToday - avgDau) / avgDau * 100).toFixed(0) : null

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
        <KPI label="Total Users" value={totalUsers} delta={`+${(d.users||[]).filter(u => {
          const h = (Date.now() - new Date(u.created_at).getTime()) / 36e5
          return h < 168
        }).length} this week`} deltaDir="up" />
        <KPI label="DAU (today)" value={dauToday} delta={dauDelta ? `${dauDelta > 0 ? '↑' : '↓'} ${Math.abs(dauDelta)}% vs avg` : '—'} deltaDir={dauDelta > 0 ? 'up' : 'down'} />
        <KPI label="Meals logged today" value={mealsToday} delta={mealsToday > 0 ? `avg ${(mealsToday / Math.max(dauToday,1)).toFixed(1)}/user` : '—'} deltaDir="neutral" />
        <KPI label="AI Scans (7d)" value={(d.events7d||[]).filter(e => e.event_type === 'scan_ai').length} delta="last 7 days" deltaDir="neutral" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Panel title="Daily Active Users — last 7 days">
          <BarChart data={dauChart} />
        </Panel>

        <Panel title="Recent Users">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['User','Last seen','Status'].map(h => (
                <th key={h} style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: css.dim, padding: '0 0 8px', textAlign: 'left', borderBottom: `1px solid ${css.border}` }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {(d.users || []).slice(0, 6).map(u => (
                <tr key={u.id}>
                  <td style={{ padding: '8px 0', fontSize: 12, borderBottom: `1px solid ${css.border}` }}>
                    {u.admin && <span style={{ fontSize: 8, background: 'rgba(161,0,255,0.2)', color: PURPLE, borderRadius: 3, padding: '1px 4px', marginRight: 5 }}>ADMIN</span>}
                    {u.username}
                  </td>
                  <td style={{ padding: '8px 0', fontSize: 11, color: css.muted, borderBottom: `1px solid ${css.border}` }}>{relTime(u.last_seen)}</td>
                  <td style={{ padding: '8px 0', borderBottom: `1px solid ${css.border}` }}><StatusTag status={userStatus(u.last_seen)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  )
}

function UsersTab({ d }) {
  const eventsByUser = {}
  ;(d.events7d || []).forEach(e => {
    eventsByUser[e.user_id] = (eventsByUser[e.user_id] || 0) + 1
  })

  return (
    <Panel title={`All Users (${(d.users||[]).length})`}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{['Username','Created','Last Seen','Events (7d)','Status'].map(h => (
            <th key={h} style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: css.dim, padding: '0 12px 8px 0', textAlign: 'left', borderBottom: `1px solid ${css.border}` }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {(d.users || []).map(u => (
            <tr key={u.id}>
              <td style={{ padding: '9px 12px 9px 0', fontSize: 12, borderBottom: `1px solid ${css.border}` }}>
                {u.admin && <span style={{ fontSize: 8, background: 'rgba(161,0,255,0.2)', color: PURPLE, borderRadius: 3, padding: '1px 4px', marginRight: 5 }}>ADMIN</span>}
                {u.username}
              </td>
              <td style={{ padding: '9px 12px 9px 0', fontSize: 11, color: css.muted, borderBottom: `1px solid ${css.border}` }}>
                {new Date(u.created_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td style={{ padding: '9px 12px 9px 0', fontSize: 11, color: css.muted, borderBottom: `1px solid ${css.border}` }}>{relTime(u.last_seen)}</td>
              <td style={{ padding: '9px 12px 9px 0', fontSize: 12, color: PURPLE, fontWeight: 600, borderBottom: `1px solid ${css.border}` }}>{eventsByUser[u.id] || 0}</td>
              <td style={{ padding: '9px 0', borderBottom: `1px solid ${css.border}` }}><StatusTag status={userStatus(u.last_seen)} /></td>
            </tr>
          ))}
          {(d.users || []).length === 0 && (
            <tr><td colSpan={5} style={{ padding: '24px 0', color: css.dim, fontSize: 12, textAlign: 'center' }}>No users synced yet. Users appear here after they log in.</td></tr>
          )}
        </tbody>
      </table>
    </Panel>
  )
}

function FoodLogsTab({ d }) {
  const foodCounts = {}
  ;(d.foodLogs7d || []).forEach(f => {
    if (f.food_name) foodCounts[f.food_name] = (foodCounts[f.food_name] || 0) + 1
  })
  const topFoods = Object.entries(foodCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const maxCount = topFoods[0]?.[1] || 1

  const keys = last7Keys()
  const logsByDay = {}
  ;(d.foodLogs7d || []).forEach(f => {
    const day = f.logged_at.slice(0, 10)
    logsByDay[day] = (logsByDay[day] || 0) + 1
  })
  const logChart = keys.map(k => ({ label: dayLabel(k), value: logsByDay[k] || 0 }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <Panel title={`Top Logged Foods (7d · ${(d.foodLogs7d||[]).length} total entries)`}>
        {topFoods.length === 0
          ? <div style={{ color: css.dim, fontSize: 12 }}>No food logs yet.</div>
          : topFoods.map(([name, count]) => (
              <HBar key={name} label={name} value={count} max={maxCount} right={`${count}×`} />
            ))
        }
      </Panel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Panel title="Meals logged per day (7d)">
          <BarChart data={logChart} />
        </Panel>
        <Panel title="Avg calories logged today">
          {(() => {
            const today = new Date().toISOString().slice(0, 10)
            const todayLogs = (d.foodLogs7d || []).filter(f => f.logged_at.slice(0, 10) === today)
            const totalCal = todayLogs.reduce((s, f) => s + (f.calories || 0), 0)
            const users = new Set(todayLogs.map(f => f.user_id)).size
            return (
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: css.text }}>{totalCal.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: css.muted, marginTop: 4 }}>kcal logged today · {users} users · {todayLogs.length} entries</div>
              </div>
            )
          })()}
        </Panel>
      </div>
    </div>
  )
}

function FeatureUsageTab({ d }) {
  const tabs = ['today', 'log', 'health', 'reports', 'settings']
  const tabLabels = { today: 'Today', log: 'Log', health: 'Health', reports: 'Reports', settings: 'Settings', scan_ai: 'AI Scan' }

  const tabViews = {}
  ;(d.events7d || []).filter(e => e.event_type === 'tab_view').forEach(e => {
    const t = e.payload?.tab
    if (t) tabViews[t] = (tabViews[t] || 0) + 1
  })
  const scanCount = (d.events7d || []).filter(e => e.event_type === 'scan_ai').length
  tabViews.scan_ai = (tabViews.scan_ai || 0) + scanCount

  const allKeys = [...tabs, 'scan_ai']
  const maxViews = Math.max(...Object.values(tabViews), 1)
  const totalActiveUsers = new Set((d.events7d || []).map(e => e.user_id)).size

  const heatColors = (val, max) => {
    const pct = val / max
    if (pct > 0.7) return `rgba(161,0,255,0.80)`
    if (pct > 0.4) return `rgba(161,0,255,0.50)`
    if (pct > 0.15) return `rgba(161,0,255,0.28)`
    return `rgba(161,0,255,0.10)`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Panel title="Feature Heatmap (7d)">
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${allKeys.length}, 1fr)`, gap: 8 }}>
          {allKeys.map(k => {
            const v = tabViews[k] || 0
            const pct = totalActiveUsers > 0 ? Math.round((v / Math.max(totalActiveUsers * 7, 1)) * 100) : 0
            return (
              <div key={k} style={{ borderRadius: 6, padding: '12px 8px', textAlign: 'center', background: heatColors(v, maxViews) }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{pct}%</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{tabLabels[k] || k}</div>
              </div>
            )
          })}
        </div>
        <div style={{ fontSize: 10, color: css.dim, marginTop: 10 }}>% = views ÷ (active users × 7 days) · darker = more engagement</div>
      </Panel>

      <Panel title="Event Counts (7d)">
        <HBar label="Tab: Log"      value={tabViews.log || 0}      max={maxViews} right={`${tabViews.log || 0} views`} />
        <HBar label="Tab: Today"    value={tabViews.today || 0}    max={maxViews} right={`${tabViews.today || 0} views`} />
        <HBar label="Tab: Health"   value={tabViews.health || 0}   max={maxViews} right={`${tabViews.health || 0} views`} />
        <HBar label="Tab: Reports"  value={tabViews.reports || 0}  max={maxViews} right={`${tabViews.reports || 0} views`} />
        <HBar label="AI Scan used"  value={tabViews.scan_ai || 0}  max={maxViews} right={`${tabViews.scan_ai || 0} scans`} />
        <HBar label="Tab: Settings" value={tabViews.settings || 0} max={maxViews} right={`${tabViews.settings || 0} views`} />
      </Panel>
    </div>
  )
}

function HealthDataTab({ d }) {
  const totalUsers = (d.users || []).length
  const healthImporters = new Set((d.events7d || []).filter(e => e.event_type === 'health_imported').map(e => e.user_id)).size
  // All-time health importers from all events
  const allTimeHealthImporters = new Set((d.allEvents || []).filter(e => e.event_type === 'health_imported').map(e => e.user_id)).size

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <Panel title="Health Connect Coverage">
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: css.muted, marginBottom: 4 }}>Users who imported Health Connect (7d)</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: css.text }}>{healthImporters}</div>
          <div style={{ fontSize: 11, color: css.dim }}>{totalUsers > 0 ? Math.round(healthImporters / totalUsers * 100) : 0}% of total users</div>
        </div>
        <div style={{ height: 1, background: css.border, margin: '12px 0' }} />
        <HBar label="Health import events (7d)" value={healthImporters} max={Math.max(totalUsers, 1)} right={`${healthImporters}/${totalUsers} users`} />
      </Panel>

      <Panel title="Health Import Timeline (7d)">
        {(() => {
          const keys = last7Keys()
          const importsByDay = {}
          ;(d.events7d || []).filter(e => e.event_type === 'health_imported').forEach(e => {
            const day = e.created_at.slice(0, 10)
            importsByDay[day] = (importsByDay[day] || 0) + 1
          })
          const chartData = keys.map(k => ({ label: dayLabel(k), value: importsByDay[k] || 0 }))
          return <BarChart data={chartData} color={css.green} />
        })()}
        <div style={{ marginTop: 12, fontSize: 11, color: css.muted }}>
          {(d.events7d || []).filter(e => e.event_type === 'health_imported').length} import events in last 7 days
        </div>
      </Panel>
    </div>
  )
}

// ── Main AdminScreen ───────────────────────────────────────────────────────────

export default function AdminScreen({ onBack, currentUser }) {
  const [adminTab, setAdminTab] = useState('overview')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshedAt, setRefreshedAt] = useState(null)

  const loadData = useCallback(async () => {
    if (!supabase) { setError('Supabase not configured — check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars'); setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString()
      const [usersRes, events7dRes, foodLogs7dRes] = await Promise.all([
        supabase.from('users').select('*').order('last_seen', { ascending: false }),
        supabase.from('events').select('*').gte('created_at', sevenDaysAgo).order('created_at', { ascending: false }),
        supabase.from('food_logs').select('*').gte('logged_at', sevenDaysAgo).order('logged_at', { ascending: false }),
      ])
      if (usersRes.error)     throw usersRes.error
      if (events7dRes.error)  throw events7dRes.error
      if (foodLogs7dRes.error) throw foodLogs7dRes.error
      setData({ users: usersRes.data, events7d: events7dRes.data, foodLogs7d: foodLogs7dRes.data })
      setRefreshedAt(new Date())
    } catch (e) {
      setError(e.message || 'Failed to load data')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const navItems = [
    { id: 'overview',  icon: '◼', label: 'Overview' },
    { id: 'users',     icon: '👤', label: 'Users' },
    { id: 'foodlogs',  icon: '🍽', label: 'Food Logs' },
    { id: 'features',  icon: '⚡', label: 'Feature Usage' },
    { id: 'health',    icon: '❤️', label: 'Health Data' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', background: css.bg, fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, color: css.text }}>

      {/* Sidebar */}
      <div style={{ width: 200, background: '#101012', borderRight: `1px solid ${css.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: `1px solid ${css.border}` }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700, fontStyle: 'italic' }}>
            <span style={{ color: PURPLE }}>DE</span>.Fit
            <span style={{ display: 'inline-block', fontSize: 8, background: PURPLE, color: '#fff', borderRadius: 3, padding: '1px 5px', marginLeft: 6, letterSpacing: '.08em', fontStyle: 'normal', verticalAlign: 'middle' }}>ADMIN</span>
          </div>
        </div>

        <div style={{ padding: '12px 8px', flex: 1 }}>
          {navItems.map(item => (
            <div key={item.id}
              onClick={() => setAdminTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
                background: adminTab === item.id ? 'rgba(161,0,255,0.15)' : 'transparent',
                color: adminTab === item.id ? '#fff' : css.muted,
                fontSize: 12, transition: 'all .15s'
              }}>
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 16px', borderTop: `1px solid ${css.border}` }}>
          <div onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: css.muted, fontSize: 11, padding: '6px 0' }}>
            ← Back to app
          </div>
          {refreshedAt && (
            <div style={{ fontSize: 9, color: css.dim, marginTop: 4 }}>
              Updated {refreshedAt.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          <div style={{ fontSize: 10, color: css.muted, marginTop: 8 }}>{currentUser?.username} · Admin</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.02em' }}>
              {navItems.find(n => n.id === adminTab)?.label}
            </div>
            <div style={{ fontSize: 11, color: css.dim, marginTop: 2 }}>
              {new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <button onClick={loadData} disabled={loading} style={{
            padding: '7px 14px', borderRadius: 6, fontSize: 11, cursor: loading ? 'wait' : 'pointer',
            background: css.panel, color: loading ? css.dim : css.muted,
            border: `1px solid ${css.border}`, fontFamily: 'inherit', letterSpacing: '.06em'
          }}>
            {loading ? '↻ Loading…' : '↻ Refresh'}
          </button>
        </div>

        {/* Content */}
        {error ? (
          <div style={{ background: 'rgba(255,69,58,0.1)', border: `1px solid ${css.red}`, borderRadius: 8, padding: 16, color: css.red, fontSize: 12 }}>
            <strong>Error:</strong> {error}
            <div style={{ marginTop: 8, color: css.muted, fontSize: 11 }}>
              Make sure you have run SUPABASE_SCHEMA.sql in your Supabase SQL editor, and VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set in Vercel.
            </div>
          </div>
        ) : loading ? (
          <div style={{ color: css.dim, fontSize: 12, padding: '40px 0', textAlign: 'center' }}>Loading analytics…</div>
        ) : data ? (
          <>
            {adminTab === 'overview'  && <OverviewTab d={data} />}
            {adminTab === 'users'     && <UsersTab d={data} />}
            {adminTab === 'foodlogs'  && <FoodLogsTab d={data} />}
            {adminTab === 'features'  && <FeatureUsageTab d={data} />}
            {adminTab === 'health'    && <HealthDataTab d={data} />}
          </>
        ) : null}
      </div>
    </div>
  )
}
