const USERS_KEY = 'defit_users'
const CURRENT_USER_KEY = 'defit_current_user'
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || [] } catch { return [] }
}

export function saveUser(user) {
  const users = getUsers()
  const idx = users.findIndex(u => u.id === user.id)
  if (idx >= 0) users[idx] = user
  else users.push(user)
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function getCurrentUser() {
  const id = localStorage.getItem(CURRENT_USER_KEY)
  if (!id) return null
  return getUsers().find(u => u.id === id) || null
}

export function setCurrentUser(id) {
  localStorage.setItem(CURRENT_USER_KEY, id)
}

export function clearCurrentUser() {
  localStorage.removeItem(CURRENT_USER_KEY)
}

export function makeUserAdmin(userId) {
  const users = getUsers()
  const u = users.find(u => u.id === userId)
  if (!u) return false
  u.admin = true
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  return true
}

export function isAnyAdminSet() {
  return getUsers().some(u => u.admin === true)
}

export function generateTotpSecret() {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  let result = ''
  let buffer = 0
  let bitsLeft = 0
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bitsLeft += 8
    while (bitsLeft >= 5) {
      bitsLeft -= 5
      result += BASE32_ALPHABET[(buffer >> bitsLeft) & 31]
    }
  }
  if (bitsLeft > 0) {
    result += BASE32_ALPHABET[(buffer << (5 - bitsLeft)) & 31]
  }
  return result
}

function base32Decode(s) {
  const str = s.toUpperCase().replace(/=+$/, '')
  const bytes = []
  let buffer = 0
  let bitsLeft = 0
  for (const ch of str) {
    const val = BASE32_ALPHABET.indexOf(ch)
    if (val < 0) continue
    buffer = (buffer << 5) | val
    bitsLeft += 5
    if (bitsLeft >= 8) {
      bitsLeft -= 8
      bytes.push((buffer >> bitsLeft) & 0xff)
    }
  }
  return new Uint8Array(bytes)
}

export async function verifyTotp(secret, code) {
  const keyBytes = base32Decode(secret)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const nowWindow = Math.floor(Date.now() / 1000 / 30)
  for (const window of [nowWindow - 1, nowWindow, nowWindow + 1]) {
    const msg = new DataView(new ArrayBuffer(8))
    msg.setUint32(4, window, false)
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, msg.buffer)
    const sigBytes = new Uint8Array(sig)
    const offset = sigBytes[19] & 0x0f
    const otp = (
      ((sigBytes[offset] & 0x7f) << 24) |
      (sigBytes[offset + 1] << 16) |
      (sigBytes[offset + 2] << 8) |
      sigBytes[offset + 3]
    ) % 1000000
    if (String(otp).padStart(6, '0') === code) return true
  }
  return false
}
