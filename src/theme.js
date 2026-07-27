export const dark = {
  bg: '#0A0A0B', panel: '#141414', border: '#1e1e1e',
  purple: '#A100FF', gold: '#D4AF6A', softPurple: '#C86BFF',
  text: '#f0f0f0', muted: '#999', dim: '#666',
  green: '#4FD1A0', red: '#FF5C7A', blue: '#5C7AFF'
}

export const light = {
  bg: '#FFFFFF', panel: '#F5F5F5', border: '#E5E5E5',
  purple: '#A100FF', gold: '#B8860B', softPurple: '#7B2FBE',
  text: '#0A0A0B', muted: '#555', dim: '#999',
  green: '#0F6E56', red: '#993C1D', blue: '#185FA5'
}

export function applyTheme(t) {
  const r = document.documentElement.style
  Object.entries(t).forEach(([k, v]) => r.setProperty('--' + k, v))
}
