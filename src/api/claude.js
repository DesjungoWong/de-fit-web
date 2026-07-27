function getKey() {
  return (
    import.meta.env.VITE_CLAUDE_API_KEY ||
    localStorage.getItem('claude_api_key') ||
    ''
  ).replace(/[^\x20-\x7E]/g, '').trim()
}

export async function callClaude(messages, system = '', model = 'claude-haiku-4-5-20251001') {
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
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `API error ${res.status}`)
  return data.content?.[0]?.text || ''
}

export async function estimateFood(imageDataUrl) {
  const base64 = imageDataUrl.split(',')[1]
  const mediaType = imageDataUrl.split(';')[0].split(':')[1]
  return callClaude([{
    role: 'user',
    content: [
      {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 }
      },
      {
        type: 'text',
        text: 'Identify the food(s) in this image. For each item, estimate: name, calories (kcal), protein (g), carbs (g), fat (g), serving size. Return as JSON array only, no markdown: [{"name":"...","calories":0,"protein":0,"carbs":0,"fat":0,"servingSize":"..."}]. Common Singapore hawker foods are likely.'
      }
    ]
  }], '', 'claude-haiku-4-5-20251001')
}

export async function estimateFoodText(description) {
  return callClaude([{
    role: 'user',
    content: `Estimate nutrition for: "${description}". Return JSON array only, no markdown: [{"name":"...","calories":0,"protein":0,"carbs":0,"fat":0,"servingSize":"..."}]. Use HPB Singapore values where applicable.`
  }], '', 'claude-haiku-4-5-20251001')
}

export function hasEnvKey() {
  return !!import.meta.env.VITE_CLAUDE_API_KEY
}
