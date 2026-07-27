const getKey = () =>
  import.meta.env.VITE_CLAUDE_API_KEY ||
  localStorage.getItem('defit_api_key') || ''

export async function callClaude(messages, system = '', model = 'claude-haiku-4-5') {
  const key = getKey()
  if (!key) throw new Error('No API key set. Add one in Settings.')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-allow-browser': 'true'
    },
    body: JSON.stringify({ model, max_tokens: 512, system, messages })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${res.status}`)
  }
  const data = await res.json()
  return data?.content?.[0]?.text || ''
}

export async function estimateFood(description, imageBase64 = null) {
  const system = 'You are a nutrition estimator for Singapore/regional food. Respond ONLY with compact JSON, no markdown: {"name":"...","kcal":number,"protein":number,"carbs":number,"fat":number,"confidence":"low|medium|high"}'
  const content = []
  if (imageBase64) {
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } })
  }
  content.push({ type: 'text', text: description || 'Estimate the meal in this photo.' })
  const raw = await callClaude([{ role: 'user', content }], system)
  try { return JSON.parse(raw) } catch { return null }
}

export function hasEnvKey() {
  return !!import.meta.env.VITE_CLAUDE_API_KEY
}
