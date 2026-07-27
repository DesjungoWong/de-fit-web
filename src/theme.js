export const dark = {
  bg: '#1C1510', bg2: '#241C16', panel: '#2A2019',
  line: 'rgba(245,239,224,.10)', line2: 'rgba(245,239,224,.20)',
  txt: '#F5EFE0', mut: '#C9BCA8', dim: '#8A7A64',
  accent: '#C9A84C', accentSoft: '#E0C878', accentDim: 'rgba(201,168,76,.14)',
  wine: '#B36767', forest: '#4A7562', ocean: '#3E6E92',
  success: '#5FA37D', danger: '#C46B63'
}

export const light = {
  bg: '#FDFAF4', bg2: '#F5EFE0', panel: '#EFE6D2',
  line: 'rgba(28,21,16,.10)', line2: 'rgba(28,21,16,.20)',
  txt: '#1C1510', mut: '#5A4A3A', dim: '#8A7A64',
  accent: '#7B3A3A', accentSoft: '#5A2828', accentDim: 'rgba(123,58,58,.10)',
  wine: '#7B3A3A', forest: '#2D4A3E', ocean: '#1D3E5A',
  success: '#2D6B4A', danger: '#8C3A3A'
}

export function applyTheme(t) {
  const r = document.documentElement
  r.style.setProperty('--bg', t.bg)
  r.style.setProperty('--bg2', t.bg2)
  r.style.setProperty('--panel', t.panel)
  r.style.setProperty('--line', t.line)
  r.style.setProperty('--line2', t.line2)
  r.style.setProperty('--txt', t.txt)
  r.style.setProperty('--mut', t.mut)
  r.style.setProperty('--dim', t.dim)
  r.style.setProperty('--accent', t.accent)
  r.style.setProperty('--accent-soft', t.accentSoft)
  r.style.setProperty('--accent-dim', t.accentDim)
  r.style.setProperty('--wine', t.wine)
  r.style.setProperty('--forest', t.forest)
  r.style.setProperty('--ocean', t.ocean)
  r.style.setProperty('--success', t.success)
  r.style.setProperty('--danger', t.danger)
}
