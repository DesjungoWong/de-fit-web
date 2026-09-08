import React, { useEffect, useState } from 'react'
import { scenes, resolveEnding, FIRST_SCENE, START_STATS } from './storyData'
import { backgrounds } from './art/backgrounds'
import { Wren } from './art/portraits'

const SAVE_KEY = 'defit_vn_save_v1'

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSave(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)) } catch { /* ignore */ }
}

function StatBar({ label, value, color }) {
  const pct = Math.max(0, Math.min(100, ((value + 10) / 30) * 100))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: '#cfc6e0' }}>
      <span style={{ width: 62, letterSpacing: '.06em', opacity: 0.8 }}>{label}</span>
      <div style={{ width: 70, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width .25s' }} />
      </div>
    </div>
  )
}

export default function GameApp({ onExit }) {
  const existing = loadSave()
  const [phase, setPhase] = useState(existing ? 'playing' : 'title')
  const [playerName, setPlayerName] = useState(existing?.playerName || '')
  const [nameInput, setNameInput] = useState('')
  const [sceneId, setSceneId] = useState(existing?.sceneId || FIRST_SCENE)
  const [lineIdx, setLineIdx] = useState(0)
  const [stats, setStats] = useState(existing?.stats || { ...START_STATS })
  const [flags, setFlags] = useState(existing?.flags || {})
  const [log, setLog] = useState([])

  const scene = scenes[sceneId]

  useEffect(() => {
    if (phase === 'playing') {
      writeSave({ playerName, sceneId, stats, flags })
    }
  }, [phase, playerName, sceneId, stats, flags])

  useEffect(() => {
    if (scene?.isFinaleGate) {
      const endingId = resolveEnding(stats, flags)
      setSceneId(endingId)
      setLineIdx(0)
    }
  }, [scene, stats, flags])

  function applyEffects(effects, flag) {
    if (effects) {
      setStats(s => ({
        trust: s.trust + (effects.trust || 0),
        confidence: s.confidence + (effects.confidence || 0),
        affection: s.affection + (effects.affection || 0),
      }))
    }
    if (flag) setFlags(f => ({ ...f, [flag]: true }))
  }

  function startGame() {
    const nm = nameInput.trim() || 'Kai'
    setPlayerName(nm)
    setPhase('playing')
    setSceneId(FIRST_SCENE)
    setLineIdx(0)
    setStats({ ...START_STATS })
    setFlags({})
    setLog([])
  }

  function resetGame() {
    localStorage.removeItem(SAVE_KEY)
    setPhase('title')
    setNameInput('')
  }

  function advance() {
    if (!scene) return
    if (lineIdx < scene.text.length - 1) {
      setLineIdx(i => i + 1)
      return
    }
    if (scene.choices) return // wait for choice
    if (scene.next) {
      goTo(scene.next, scene.effects)
    }
  }

  function goTo(nextId, effects, flag) {
    applyEffects(effects, flag)
    setSceneId(nextId)
    setLineIdx(0)
  }

  function pickChoice(choice) {
    setLog(l => [...l, choice.label])
    goTo(choice.next, choice.effects, choice.flag)
  }

  const Bg = backgrounds[scene?.bg] || backgrounds.campus

  const containerStyle = {
    position: 'fixed', inset: 0, zIndex: 50, background: '#0d0716',
    fontFamily: "'Inter', system-ui, sans-serif", color: '#fff',
    display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto',
  }

  if (phase === 'title') {
    return (
      <div style={containerStyle}>
        <div style={{ position: 'absolute', inset: 0 }}><backgrounds.title /></div>
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '.25em', color: '#c9a6ff', marginBottom: 10 }}>A VISUAL NOVEL</div>
          <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 30, marginBottom: 26 }}>Level Up: First Semester</div>
          <div style={{ fontSize: 12, color: '#cfc6e0', maxWidth: 300, marginBottom: 26, lineHeight: 1.6 }}>
            A "system" appears in your head on your first day of college. It only ever rewards you for being honest, brave, and kind — never anything else.
          </div>
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            placeholder="Your character's name (e.g. Kai)"
            style={{ width: 220, padding: '10px 14px', borderRadius: 8, border: '1px solid #6b4fa0', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, textAlign: 'center', outline: 'none', marginBottom: 16 }}
          />
          <div onClick={startGame} style={{ background: '#A100FF', padding: '11px 30px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', letterSpacing: '.04em' }}>
            Begin
          </div>
          {onExit && (
            <div onClick={onExit} style={{ marginTop: 22, fontSize: 11, color: '#9c8fb8', cursor: 'pointer', textDecoration: 'underline' }}>
              Back to DE.Fit
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!scene) return null

  const speakerName = scene.speaker === 'wren' ? 'Wren'
    : scene.speaker === 'system' ? 'SYSTEM'
    : null

  return (
    <div style={containerStyle}>
      <div style={{ position: 'absolute', inset: 0 }}><Bg /></div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.55))' }} />

      {/* HUD */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
        <div style={{ fontSize: 10, color: '#cfc6e0', letterSpacing: '.05em' }}>{playerName}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <StatBar label="TRUST" value={stats.trust} color="#5bc4ff" />
          <StatBar label="CONFID." value={stats.confidence} color="#ffd479" />
          <StatBar label="AFFEC." value={stats.affection} color="#ff7ab0" />
        </div>
      </div>

      {/* Portrait */}
      {scene.portrait && (
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8 }}>
          <div style={{ width: '62%', maxWidth: 220 }}>
            <Wren expression={scene.portrait} />
          </div>
        </div>
      )}
      {!scene.portrait && <div style={{ flex: 1 }} />}

      {/* Dialogue box */}
      <div style={{ position: 'relative', padding: 16 }}>
        {scene.isEnding && (
          <div style={{ fontSize: 10, letterSpacing: '.18em', color: '#c9a6ff', marginBottom: 8, textAlign: 'center' }}>{scene.title}</div>
        )}
        <div
          onClick={advance}
          style={{
            background: 'rgba(15,10,25,0.86)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
            padding: '16px 18px', minHeight: 90, cursor: scene.choices ? 'default' : 'pointer',
          }}
        >
          {speakerName && (
            <div style={{ fontSize: 10.5, letterSpacing: '.08em', color: scene.speaker === 'system' ? '#8fe0c9' : '#ffb6d5', marginBottom: 6, fontWeight: 700 }}>
              {speakerName}
            </div>
          )}
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#f2eefa' }}>
            {scene.text[lineIdx].replace(/\{name\}/g, playerName)}
          </div>
          {!scene.choices && !scene.isEnding && (
            <div style={{ textAlign: 'right', fontSize: 10, color: '#9c8fb8', marginTop: 8 }}>
              {lineIdx < scene.text.length - 1 ? 'tap to continue ▸' : (scene.next ? 'tap to continue ▸' : '')}
            </div>
          )}
        </div>

        {scene.choices && lineIdx === scene.text.length - 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {scene.choices.map((c, i) => (
              <div
                key={i}
                onClick={() => pickChoice(c)}
                style={{
                  background: 'rgba(161,0,255,0.16)', border: '1px solid rgba(161,0,255,0.5)', borderRadius: 10,
                  padding: '11px 14px', fontSize: 12.5, cursor: 'pointer', color: '#f2eefa',
                }}
              >
                {c.label}
              </div>
            ))}
          </div>
        )}

        {scene.isEnding && (
          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'center' }}>
            <div onClick={resetGame} style={{ fontSize: 12, background: '#A100FF', padding: '9px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              Play Again
            </div>
            {onExit && (
              <div onClick={onExit} style={{ fontSize: 12, border: '1px solid rgba(255,255,255,0.3)', padding: '9px 20px', borderRadius: 8, cursor: 'pointer' }}>
                Back to DE.Fit
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
