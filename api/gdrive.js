export default async function handler(req, res) {
  const { fileId } = req.query
  if (!fileId) return res.status(400).json({ error: 'fileId required' })
  // Download from Google Drive public URL
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`
  try {
    const r = await fetch(url, { redirect: 'follow' })
    if (!r.ok) return res.status(502).json({ error: `Drive returned ${r.status}` })
    const contentType = r.headers.get('content-type') || ''
    if (!contentType.includes('zip') && !contentType.includes('octet')) {
      return res.status(400).json({ error: 'File is not a zip. Make sure the file is shared publicly.' })
    }
    // Stream the zip back to client
    const buf = await r.arrayBuffer()
    res.setHeader('Content-Type', 'application/zip')
    res.send(Buffer.from(buf))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
