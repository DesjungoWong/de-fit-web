import { useState, useEffect } from 'react'
import { dark, light, applyTheme } from './theme'
import { getDay, logItem } from './store/dayStore'
import TopBar from './components/TopBar'
import BottomNav from './components/BottomNav'
import TodayScreen from './screens/TodayScreen'
import LogScreen from './screens/LogScreen'
import SnapScreen from './screens/SnapScreen'
import HealthScreen from './screens/HealthScreen'
import SettingsScreen from './screens/SettingsScreen'

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('defit_theme') || 'dark')
  const [tab, setTab] = useState('today')
  const [day, setDay] = useState(() => getDay())

  useEffect(() => {
    applyTheme(theme === 'dark' ? dark : light)
    localStorage.setItem('defit_theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  function handleLog(item) {
    setDay(d => logItem(d, item))
    setTab('today')
  }

  function handleUpdateTarget(kcalTarget) {
    setDay(d => {
      const next = { ...d, kcalTarget }
      import('./store/dayStore').then(m => m.saveDay(next))
      return next
    })
  }

  const screens = {
    today:    <TodayScreen day={day} />,
    log:      <LogScreen day={day} onLog={handleLog} />,
    snap:     <SnapScreen onLog={handleLog} />,
    health:   <HealthScreen />,
    settings: <SettingsScreen theme={theme} onToggleTheme={toggleTheme} day={day} onUpdateTarget={handleUpdateTarget} />
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', maxWidth: 480,
      margin: '0 auto', background: 'var(--bg)',
      boxShadow: '0 0 60px rgba(0,0,0,.3)'
    }}>
      <TopBar theme={theme} onToggleTheme={toggleTheme} />
      <div style={{ flex: 1, overflow: 'hidden', paddingTop: 58, paddingBottom: 60 }}>
        {screens[tab]}
      </div>
      <BottomNav active={tab} onSelect={setTab} />
    </div>
  )
}
