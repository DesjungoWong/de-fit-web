import React, { useState, useEffect } from 'react'
import { getWeeks, saveWeek, getDatesWithData } from '../store/reportsStore'
import { getSettings } from '../store/dayStore'

export default function ReportsScreen() {
  const [view, setView] = useState('week')
  const [weeks, setWeeks] = useState(() => getWeeks())
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNarrative, setAiNarrative] = useState('')

  const settings = getSettings()
  const proteinTarget = settings.proteinTarget ?? 140

  const week = weeks[selectedWeekIdx] || null

  function refreshWeeks() {
    const w = getWeeks()
    setWeeks(w)
    setSelectedWeekIdx(0)
  }

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href
      const ab = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: ab }).promise
      let text = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map(item => item.str).join(' ') + '\n'
      }
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          messages: [{
            role: 'user',
            content: `Extract the daily nutrition data from this weekly summary. Return ONLY valid JSON, no markdown:\n{"id":"<weekStartDate>","label":"20-26 Jul 2026","startDate":"2026-07-20","endDate":"2026-07-26","days":[{"date":"2026-07-20","day":"Mon","calories":1635,"protein":100,"carbs":152,"fat":68,"exercise":"HIIT 31 min","burn":280,"netBalance":943}],"weekAvg":{"calories":1953,"protein":128,"carbs":142,"fat":74}}\n\n${text}`
          }]
        })
      })
      const data = await res.json()
      const raw = data.content?.[0]?.text || '{}'
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
      if (!parsed.id || !parsed.days) throw new Error('Could not extract week data from PDF')
      saveWeek(parsed)
      refreshWeeks()
    } catch (err) {
      setUploadError('Could not parse PDF: ' + err.message)
    }
    setUploading(false)
    e.target.value = ''
  }

  async function generateInsights() {
    if (!week) return
    setAiLoading(true)
    setAiNarrative('')
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          messages: [{
            role: 'user',
            content: `You are DE.Fit's nutrition AI. Analyse this week's data and give a concise 3-4 sentence commentary covering: calorie balance, protein vs ${proteinTarget}g target, exercise performance, and one actionable tip. Keep it direct, no padding.\n\nWeek: ${week.label}\nDaily data: ${JSON.stringify(week.days)}\nAverage: ${JSON.stringify(week.weekAvg)}`
          }]
        })
      })
      const data = await res.json()
      setAiNarrative(data.content?.[0]?.text || 'Could not generate insights.')
    } catch (err) {
      setAiNarrative('Error: ' + err.message)
    }
    setAiLoading(false)
  }

  // Month aggregation
  const allWeeks = weeks
  const allDays = allWeeks.flatMap(w => w.days || [])
  const monthAvgCal = allDays.length ? Math.round(allDays.reduce((s, d) => s + (d.calories || 0), 0) / allDays.length) : 0
  const monthAvgProtein = allDays.length ? Math.round(allDays.reduce((s, d) => s + (d.protein || 0), 0) / allDays.length) : 0
  const daysAboveProtein = allDays.filter(d => (d.protein || 0) >= proteinTarget).length

  const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const CAL_LIMIT = 2000

  return (
    <div style={{ padding: '14px 16px', paddingBottom: 24 }}>

      {/* Upload zone */}
      <label style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--panel)', border: '1.5px dashed var(--border)',
        borderRadius: 10, padding: '14px 16px', cursor: uploading ? 'not-allowed' : 'pointer',
        marginBottom: 14, opacity: uploading ? 0.6 : 1
      }}>
        <span style={{ fontSize: 22 }}>📊</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
            {uploading ? 'Parsing PDF…' : 'Upload weekly nutrition PDF'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
            Tap to select · Extracts daily nutrition via AI
          </div>
        </div>
        <span style={{ fontSize: 18, color: 'var(--purple)' }}>↑</span>
        <input type="file" accept=".pdf" onChange={handlePdfUpload} disabled={uploading} style={{ display: 'none' }} />
      </label>
      {uploadError && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 10 }}>{uploadError}</div>}

      {/* Week/Month toggle */}
      <div style={{ display: 'flex', background: 'var(--panel)', borderRadius: 8, padding: 3, marginBottom: 16, border: '0.5px solid var(--border)' }}>
        {['week', 'month'].map(v => (
          <div key={v} onClick={() => setView(v)} style={{
            flex: 1, textAlign: 'center', padding: '7px 0',
            borderRadius: 6, cursor: 'pointer',
            background: view === v ? 'var(--purple)' : 'transparent',
            color: view === v ? '#fff' : 'var(--muted)',
            fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
            transition: 'background .15s'
          }}>{v}</div>
        ))}
      </div>

      {weeks.length === 0 ? (
        <div style={{ color: 'var(--dim)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
          No weeks uploaded yet. Upload a weekly nutrition PDF above.
        </div>
      ) : view === 'week' ? (
        <WeekView
          weeks={weeks}
          selectedIdx={selectedWeekIdx}
          onSelectIdx={setSelectedWeekIdx}
          week={week}
          proteinTarget={proteinTarget}
          aiLoading={aiLoading}
          aiNarrative={aiNarrative}
          onGenerateInsights={generateInsights}
          DAYS={DAYS}
          CAL_LIMIT={CAL_LIMIT}
        />
      ) : (
        <MonthView
          allDays={allDays}
          monthAvgCal={monthAvgCal}
          monthAvgProtein={monthAvgProtein}
          daysAboveProtein={daysAboveProtein}
          proteinTarget={proteinTarget}
          CAL_LIMIT={CAL_LIMIT}
        />
      )}
    </div>
  )
}

function WeekView({ weeks, selectedIdx, onSelectIdx, week, proteinTarget, aiLoading, aiNarrative, onGenerateInsights, DAYS, CAL_LIMIT }) {
  if (!week) return null

  const avgCal = week.weekAvg?.calories || 0
  const avgProtein = week.weekAvg?.protein || 0
  const proteinDeficit = proteinTarget - avgProtein

  const days = week.days || []
  const maxCal = Math.max(...days.map(d => d.calories || 0), 1)
  const bestProteinDay = days.length ? days.reduce((a, b) => (b.protein || 0) > (a.protein || 0) ? b : a, days[0]) : null
  const worstProteinDay = days.length ? days.reduce((a, b) => (b.protein || 0) < (a.protein || 0) ? b : a, days[0]) : null

  return (
    <div>
      {/* Week selector */}
      {weeks.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
          {weeks.map((w, i) => (
            <div key={w.id} onClick={() => onSelectIdx(i)} style={{
              padding: '5px 12px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
              background: i === selectedIdx ? 'var(--purple)' : 'var(--panel)',
              color: i === selectedIdx ? '#fff' : 'var(--muted)',
              border: `0.5px solid ${i === selectedIdx ? 'var(--purple)' : 'var(--border)'}`,
              fontSize: 11
            }}>{w.label}</div>
          ))}
        </div>
      )}

      {/* Week label */}
      <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 10 }}>
        Week of {week.label}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          ['Avg Cal In', avgCal + ' kcal', 'var(--text)'],
          ['Avg Protein', avgProtein + 'g', proteinDeficit > 0 ? 'var(--gold)' : 'var(--green)'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 3 }}>{l}</div>
            {l === 'Avg Protein' && proteinDeficit > 0 && (
              <div style={{ fontSize: 9, color: 'var(--gold)', marginTop: 4, background: 'rgba(212,175,106,0.12)', borderRadius: 4, padding: '2px 6px', display: 'inline-block' }}>
                −{proteinDeficit}g vs target
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 10 }}>Daily calories</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 70 }}>
          {DAYS.map((d, i) => {
            const day = days[i]
            const cal = day?.calories || 0
            const h = maxCal > 0 ? Math.round((cal / maxCal) * 60) : 0
            const over = cal > CAL_LIMIT
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: h, background: over ? 'var(--gold)' : 'var(--purple)', borderRadius: '3px 3px 0 0', minHeight: cal > 0 ? 4 : 0, opacity: cal > 0 ? 1 : 0.2, transition: 'height .3s' }} />
                <div style={{ fontSize: 8, color: 'var(--muted)' }}>{d}</div>
              </div>
            )
          })}
        </div>
        <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 6 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--gold)', borderRadius: 2, marginRight: 4 }} />
          gold = over {CAL_LIMIT} kcal
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          ['Protein deficit', proteinDeficit > 0 ? `−${proteinDeficit}g/day` : 'On track', proteinDeficit > 0 ? 'var(--gold)' : 'var(--green)'],
          ['Cal balance', avgCal > CAL_LIMIT ? `+${avgCal - CAL_LIMIT} over` : `${CAL_LIMIT - avgCal} under`, avgCal > CAL_LIMIT ? 'var(--red)' : 'var(--green)'],
          ['Best protein day', bestProteinDay ? `${bestProteinDay.day} · ${bestProteinDay.protein}g` : '—', 'var(--purple)'],
          ['Worst protein day', worstProteinDay ? `${worstProteinDay.day} · ${worstProteinDay.protein}g` : '—', 'var(--muted)'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '9px 10px' }}>
            <div style={{ fontSize: 12, fontFamily: 'Georgia,serif', fontWeight: 700, color: c }}>{v}</div>
            <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* AI Insights */}
      <div
        onClick={!aiLoading ? onGenerateInsights : undefined}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'var(--purple)', color: '#fff', borderRadius: 8, padding: '11px',
          fontSize: 12, fontWeight: 600, cursor: aiLoading ? 'not-allowed' : 'pointer',
          opacity: aiLoading ? 0.7 : 1, marginBottom: 10, letterSpacing: '.04em'
        }}
      >
        <span style={{ fontSize: 14 }}>✦</span>
        {aiLoading ? 'Generating insights…' : 'Generate AI Insights'}
      </div>

      {aiNarrative && (
        <div style={{
          background: 'rgba(161,0,255,0.07)', border: '0.5px solid rgba(161,0,255,0.3)',
          borderRadius: 10, padding: '14px', marginBottom: 14
        }}>
          <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--purple)', marginBottom: 8 }}>AI Insights · {week.label}</div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65 }}>{aiNarrative}</div>
        </div>
      )}
    </div>
  )
}

function MonthView({ allDays, monthAvgCal, monthAvgProtein, daysAboveProtein, proteinTarget, CAL_LIMIT }) {
  const maxCal = Math.max(...allDays.map(d => d.calories || 0), 1)
  const recent = allDays.slice(-28)

  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 10 }}>
        All uploaded weeks · {allDays.length} days
      </div>

      {/* Monthly averages */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {[
          ['Avg Cal', monthAvgCal + ' kcal', 'var(--text)'],
          ['Avg Protein', monthAvgProtein + 'g', monthAvgProtein >= proteinTarget ? 'var(--green)' : 'var(--gold)'],
          ['Days ≥ target', daysAboveProtein + ' days', 'var(--purple)'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
            <div style={{ fontSize: 8, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Multi-week bar chart */}
      {recent.length > 0 && (
        <div style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 10 }}>Daily calories (last {recent.length} days)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 70, overflowX: 'auto' }}>
            {recent.map((day, i) => {
              const cal = day.calories || 0
              const h = Math.round((cal / maxCal) * 60)
              const over = cal > CAL_LIMIT
              return (
                <div key={i} style={{ flex: '0 0 auto', width: 10, height: h, background: over ? 'var(--gold)' : 'var(--purple)', borderRadius: '2px 2px 0 0', minHeight: cal > 0 ? 3 : 0, opacity: cal > 0 ? 1 : 0.2 }} />
              )
            })}
          </div>
          <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 6 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--gold)', borderRadius: 2, marginRight: 4 }} />
            gold = over {CAL_LIMIT} kcal
          </div>
        </div>
      )}

      {/* Days above protein target */}
      <div style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 6 }}>Protein target ({proteinTarget}g)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: 28, fontWeight: 700, color: 'var(--purple)' }}>{daysAboveProtein}</div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>days hit target</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>out of {allDays.length} days logged</div>
          </div>
          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${allDays.length ? (daysAboveProtein / allDays.length) * 100 : 0}%`, background: 'var(--purple)', borderRadius: 3, transition: 'width .4s' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
