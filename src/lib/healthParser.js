// Lazy SQLite reader — reads only B-tree pages needed via File.slice()
// No WASM, no full-file load. Works on mobile with large DBs.

const PAGE_HEADER_OFFSET = 100

async function readBytes(file, offset, length) {
  const slice = file.slice(offset, offset + length)
  return new DataView(await slice.arrayBuffer())
}

function u16(dv, o) { return dv.getUint16(o, false) }
function u32(dv, o) { return dv.getUint32(o, false) }

async function getPageSize(file) {
  const dv = await readBytes(file, 16, 2)
  const ps = u16(dv, 0)
  return ps === 1 ? 65536 : ps
}

async function readPage(file, pageNum, pageSize) {
  const offset = (pageNum - 1) * pageSize
  return readBytes(file, offset, pageSize)
}

function parseLeafCells(dv, pageNum, pageSize) {
  const isFirstPage = pageNum === 1
  const btreeHeaderOffset = isFirstPage ? PAGE_HEADER_OFFSET : 0
  const pageType = dv.getUint8(btreeHeaderOffset)
  if (pageType !== 13) return []

  const cellCount = u16(dv, btreeHeaderOffset + 3)
  const cellPtrOffset = btreeHeaderOffset + 8
  const cells = []

  for (let i = 0; i < cellCount; i++) {
    const ptr = u16(dv, cellPtrOffset + i * 2)
    if (ptr === 0 || ptr >= pageSize) continue
    try { cells.push(parseCell(dv, ptr, pageSize)) } catch { /* skip */ }
  }
  return cells
}

function parseCell(dv, offset, pageSize) {
  let pos = offset
  const [, n1] = readVarint(dv, pos); pos += n1
  const [rowid, n2] = readVarint(dv, pos); pos += n2
  const headerStart = pos
  const [headerLen, n3] = readVarint(dv, headerStart); pos += n3
  const headerEnd = headerStart + headerLen

  const serials = []
  while (pos < headerEnd) {
    const [s, n] = readVarint(dv, pos); pos += n
    serials.push(s)
  }

  const values = []
  for (const s of serials) {
    const [val, size] = readSerial(dv, pos, s)
    values.push(val)
    pos += size
  }
  return { rowid, values }
}

function readVarint(dv, offset) {
  let result = 0n, shift = 0n, i = 0
  while (i < 9) {
    const byte = dv.getUint8(offset + i); i++
    if (i < 9) {
      result |= BigInt(byte & 0x7f) << shift; shift += 7n
      if (!(byte & 0x80)) break
    } else {
      result |= BigInt(byte) << shift
    }
  }
  return [Number(result), i]
}

function readSerial(dv, offset, serialType) {
  if (serialType === 0) return [null, 0]
  if (serialType === 1) return [dv.getInt8(offset), 1]
  if (serialType === 2) return [dv.getInt16(offset, false), 2]
  if (serialType === 3) return [dv.getUint8(offset) * 65536 + dv.getUint16(offset + 1, false), 3]
  if (serialType === 4) return [dv.getInt32(offset, false), 4]
  if (serialType === 5) {
    const hi = dv.getInt32(offset, false)
    const lo = dv.getUint32(offset + 4, false)
    return [hi * 4294967296 + lo, 6]
  }
  if (serialType === 6) {
    const hi = dv.getInt32(offset, false)
    const lo = dv.getUint32(offset + 4, false)
    return [hi * 4294967296 + lo, 8]
  }
  if (serialType === 7) return [dv.getFloat64(offset, false), 8]
  if (serialType === 8) return [0, 0]
  if (serialType === 9) return [1, 0]
  if (serialType >= 12 && serialType % 2 === 0) { return [null, (serialType - 12) / 2] }
  if (serialType >= 13 && serialType % 2 === 1) {
    const len = (serialType - 13) / 2
    try {
      const bytes = new Uint8Array(dv.buffer, dv.byteOffset + offset, len)
      return [new TextDecoder().decode(bytes), len]
    } catch { return [null, len] }
  }
  return [null, 0]
}

async function getTableRootPages(file, pageSize, tableNames) {
  // sqlite_master lives at page 1; for large DBs it spans multiple pages
  // so we must traverse the full B-tree, not just read page 1 as a leaf
  const cells = await traverseBtree(file, 1, pageSize)
  const roots = {}
  for (const { values } of cells) {
    if (values[0] === 'table' && tableNames.includes(values[1])) {
      roots[values[1]] = values[3]
    }
  }
  return roots
}

async function traverseBtree(file, pageNum, pageSize) {
  const cells = []
  const stack = [pageNum]
  const visited = new Set()
  while (stack.length) {
    const pn = stack.pop()
    if (visited.has(pn) || pn <= 0) continue
    visited.add(pn)
    const dv = await readPage(file, pn, pageSize)
    const btreeOff = pn === 1 ? PAGE_HEADER_OFFSET : 0
    const pageType = dv.getUint8(btreeOff)
    if (pageType === 13) {
      cells.push(...parseLeafCells(dv, pn, pageSize))
    } else if (pageType === 5) {
      const rightmost = u32(dv, btreeOff + 8)
      const cellCount = u16(dv, btreeOff + 3)
      const cellPtrBase = btreeOff + 12
      for (let i = 0; i < cellCount; i++) {
        const ptr = u16(dv, cellPtrBase + i * 2)
        if (ptr > 0 && ptr < pageSize) {
          const childPage = u32(dv, ptr)
          if (childPage > 0) stack.push(childPage)
        }
      }
      if (rightmost > 0) stack.push(rightmost)
    }
  }
  return cells
}

function dayStart(tsMs) {
  const d = new Date(tsMs); d.setHours(0, 0, 0, 0); return d.getTime()
}

export async function parseHealthConnect(dbFile) {
  const debugLog = []
  try {
  const pageSize = await getPageSize(dbFile)

  const needed = [
    'steps_record_table',
    'resting_heart_rate_record_table',
    'sleep_session_record_table',
    'weight_record_table',
    'active_calories_burned_record_table',
    'hydration_record_table'
  ]
  const roots = await getTableRootPages(dbFile, pageSize, needed)

  // Debug: log which tables were found
  debugLog.push({ event: 'tables_found', roots: Object.entries(roots).map(([name, rootPage]) => ({ name, rootPage })) })
  debugLog.push({ event: 'tables_missing', missing: needed.filter(n => !roots[n]) })

  const DAY = 86400000
  const now = Date.now()
  const todayDs = dayStart(now)

  // Build 7-day buckets
  const last7 = Array.from({ length: 7 }, (_, i) => ({
    dayStart: todayDs - (6 - i) * DAY,
    steps: 0, activeCalories: 0, hydration: 0
  }))
  const bucketMap = {}
  last7.forEach(b => { bucketMap[b.dayStart] = b })

  // ── Steps ──
  // Schema: row_id(rowid), uuid[0], last_modified_time[1], client_record_id[2],
  //   client_record_version[3], device_info_id[4], app_info_id[5], recording_method[6],
  //   dedupe_hash[7], start_time[8], start_zone_offset[9], end_time[10],
  //   end_zone_offset[11], local_date[12], count[13]
  let stepsByDay = {}
  if (roots['steps_record_table']) {
    const cells = await traverseBtree(dbFile, roots['steps_record_table'], pageSize)
    debugLog.push({ event: 'steps_cells', count: cells.length, firstCell: cells[0]?.values ?? null })
    for (const { values } of cells) {
      const t = values[8]; const count = values[13]
      if (!t || !count) continue
      const ds = dayStart(t)
      stepsByDay[ds] = (stepsByDay[ds] || 0) + count
      if (bucketMap[ds]) bucketMap[ds].steps += count
    }
  }

  // ── Heart rate ──
  let heartRate = null, hrTime = 0
  if (roots['resting_heart_rate_record_table']) {
    const cells = await traverseBtree(dbFile, roots['resting_heart_rate_record_table'], pageSize)
    debugLog.push({ event: 'hr_cells', count: cells.length, firstCell: cells[0]?.values ?? null })
    for (const { values } of cells) {
      const t = values[8]; const bpm = values[13]
      if (t > hrTime && bpm) { hrTime = t; heartRate = bpm }
    }
  }

  // ── Sleep ──
  let sleep = null, sleepTime = 0
  if (roots['sleep_session_record_table']) {
    const cells = await traverseBtree(dbFile, roots['sleep_session_record_table'], pageSize)
    debugLog.push({ event: 'sleep_cells', count: cells.length, firstCell: cells[0]?.values ?? null })
    for (const { values } of cells) {
      const start = values[8]; const end = values[10]
      if (start > sleepTime && end) {
        sleepTime = start; sleep = ((end - start) / 3600000).toFixed(1)
      }
    }
  }

  // ── Weight ──
  let weight = null, wTime = 0
  if (roots['weight_record_table']) {
    const cells = await traverseBtree(dbFile, roots['weight_record_table'], pageSize)
    debugLog.push({ event: 'weight_cells', count: cells.length, firstCell: cells[0]?.values ?? null })
    for (const { values } of cells) {
      const t = values[8]; const w = values[13]
      if (t > wTime && w) { wTime = t; weight = parseFloat(w).toFixed(1) }
    }
  }

  // ── Active calories ──
  let calByDay = {}
  if (roots['active_calories_burned_record_table']) {
    const cells = await traverseBtree(dbFile, roots['active_calories_burned_record_table'], pageSize)
    for (const { values } of cells) {
      const t = values[8]; const energy = values[13]
      if (!t || !energy) continue
      const ds = dayStart(t)
      calByDay[ds] = (calByDay[ds] || 0) + energy / 4184
      if (bucketMap[ds]) bucketMap[ds].activeCalories += energy / 4184
    }
  }

  // ── Hydration ──
  let hydByDay = {}
  if (roots['hydration_record_table']) {
    const cells = await traverseBtree(dbFile, roots['hydration_record_table'], pageSize)
    for (const { values } of cells) {
      const t = values[8]; const vol = values[13]
      if (!t || !vol) continue
      const ds = dayStart(t)
      hydByDay[ds] = (hydByDay[ds] || 0) + vol
      if (bucketMap[ds]) bucketMap[ds].hydration += vol
    }
  }

  // Pick today's data, or fall back to most recent available day
  function bestDay(byDay) {
    if (byDay[todayDs]) return byDay[todayDs]
    const days = Object.keys(byDay).map(Number).sort((a, b) => b - a)
    return days.length ? byDay[days[0]] : 0
  }

  const steps = Math.round(bestDay(stepsByDay))
  const activeCalories = Math.round(bestDay(calByDay))
  const hydration = parseFloat(bestDay(hydByDay) || 0).toFixed(2)

  // Compute BMI if we have weight (assume height from settings or default 170cm)
  const bmi = weight ? (parseFloat(weight) / (1.70 * 1.70)).toFixed(1) : null

  return {
    steps,
    heartRate,
    sleep,
    weight,
    activeCalories,
    hydration,
    bmi,
    last7,          // [{dayStart, steps, activeCalories, hydration}] — last 7 days
    importedAt: Date.now(),
    debugLog
  }
  } catch (err) {
    return { error: err.message, debugLog }
  }
}
