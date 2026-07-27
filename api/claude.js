export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key = (process.env.CLAUDE_API_KEY || '').replace(/[^\x20-\x7E]/g, '').trim()
  if (!key) return res.status(500).json({ error: { message: 'API key not configured on server.' } })

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    })
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
}
