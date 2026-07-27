import { useState, useRef, useEffect } from 'react'
import { callClaude } from '../api/claude'

export default function AdvisoryChat({ day }) {
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const logRef = useRef(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [msgs])

  async function send() {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    const next = [...msgs, { role: 'user', text: q }]
    setMsgs(next)
    setLoading(true)
    try {
      const system = `You are a concise health and nutrition assistant for DE.Fit.
Today's data: ${day.kcalLogged} kcal logged of ${day.kcalTarget} kcal target.
Macros — Protein: ${Math.round(day.protein)}g, Carbs: ${Math.round(day.carbs)}g, Fat: ${Math.round(day.fat)}g.
Answer in 1-3 sentences. Be direct and practical. Singapore food context.`
      const history = next.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))
      const reply = await callClaude(history, system)
      setMsgs(m => [...m, { role: 'ai', text: reply }])
    } catch (e) {
      setMsgs(m => [...m, { role: 'ai', text: `Error: ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ margin: '8px 16px 4px', borderTop: '1px solid var(--line)', paddingTop: 8 }}>
      <div style={{ fontSize: 8, color: 'var(--dim)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 6 }}>
        Ask about today
      </div>
      <div ref={logRef} style={{
        maxHeight: 160, overflowY: 'auto', display: 'flex',
        flexDirection: 'column', gap: 6, marginBottom: 6
      }}>
        {msgs.map((m, i) => (
          <div key={i} style={{
            fontSize: 11, lineHeight: 1.4, padding: '7px 9px', borderRadius: 3,
            maxWidth: '88%',
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            background: m.role === 'user' ? 'var(--panel)' : 'var(--accent-dim)',
            color: m.role === 'user' ? 'var(--txt)' : 'var(--mut)'
          }}>
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{
            fontSize: 11, padding: '7px 9px', borderRadius: 3, alignSelf: 'flex-start',
            background: 'var(--accent-dim)', color: 'var(--dim)'
          }}>…</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="e.g. can I still have a beer tonight?"
          style={{
            flex: 1, background: 'var(--panel)', border: '1px solid var(--line2)',
            borderRadius: 3, padding: '7px 9px', color: 'var(--txt)', fontSize: 11,
            outline: 'none'
          }}
        />
        <button onClick={send} disabled={loading} style={{
          background: 'var(--accent)', color: 'var(--bg)', border: 'none',
          borderRadius: 3, padding: '0 14px', fontSize: 10, letterSpacing: '.06em',
          cursor: 'pointer', textTransform: 'uppercase', opacity: loading ? .6 : 1
        }}>
          Ask
        </button>
      </div>
    </div>
  )
}
