// Lazy SQLite reader — reads only B-tree pages needed via File.slice()
// No WASM, no full-file load. Works on mobile with large DBs.
// Timestamps in Health Connect are stored as nanoseconds (64-bit int).
// We use BigInt for 8-byte integers to preserve precision, then convert ns→ms.

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
    try { cells.push(parseCell(dv, ptr, pageSize)) } catch { /* skip corrupt cell */ }
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
    // 6-byte signed integer — use BigInt
    const b = [0,1,2,3,4,5].map(i => dv.getUint8(offset + i))
    const big = (BigInt(b[0]) << 40n) | (BigInt(b[1]) << 32n) | (BigInt(b[2]) << 24n) | (BigInt(b[3]) << 16n) | (BigInt(b[4]) << 8n) | BigInt(b[5])
    return [big, 6]
  }
  if (serialType === 6) {
    // 8-byte signed integer — MUST use BigInt; timestamps are 64-bit nanoseconds
    const hi = BigInt(dv.getInt32(offset, false))
    const lo = BigInt(dv.getUint32(offset + 4, false))
    return [(hi << 32n) | lo, 8]
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

// Convert a value (BigInt, Number, or string) to milliseconds.
// Health Connect stores timestamps as either:
//   - milliseconds (~1.78e12 for 2026) — most tables
//   - nanoseconds  (~1.78e18 for 2026) — detectable by being > 1e15
function toMs(v) {
  if (v === null || v === undefined) return null
  let n
  if (typeof v === 'bigint') n = v
  else if (typeof v === 'string') { try { n = BigInt(v) } catch { return null } }
  else { n = BigInt(Math.round(v)) }
  if (n <= 0n) return null
  // Nanoseconds: ~1.78e18 — clearly > 1e15
  if (n > 1_000_000_000_000_000n) return Number(n / 1_000_000n)  // ns → ms
  // Milliseconds: ~1.78e12 for 2026 — return as-is
  // (Do NOT add a µs branch — ms timestamps ARE in the 1e12 range)
  return Number(n)
}

// Convert a Number (treating as ns if large) back to ms
function valToMs(v) {
  return toMs(typeof v === 'number' ? BigInt(Math.round(v)) : v)
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

// Parse CREATE TABLE SQL to get ordered column names (excluding INTEGER PRIMARY KEY rowid alias)
function parseColumnNames(sql) {
  if (!sql || typeof sql !== 'string') return []
  const inner = sql.match(/\(([\s\S]+)\)\s*$/)?.[1]
  if (!inner) return []
  const cols = []
  let depth = 0, cur = ''
  for (const ch of inner + ',') {
    if (ch === '(') { depth++; cur += ch }
    else if (ch === ')') { depth--; cur += ch }
    else if (ch === ',' && depth === 0) {
      const trimmed = cur.trim()
      if (trimmed) {
        const name = trimmed.split(/[\s(]/)[0].replace(/["`'[\]]/g, '')
        // Skip constraints and INTEGER PRIMARY KEY (rowid alias — not in values[])
        if (name && !/^(primary|foreign|unique|check|constraint)$/i.test(name)) {
          if (!/integer\s+primary\s+key/i.test(trimmed)) {
            cols.push(name.toLowerCase())
          }
          // If it IS integer primary key, skip it (it's the rowid alias)
        }
      }
      cur = ''
    } else { cur += ch }
  }
  return cols
}

function colIdx(names, name) {
  const i = names.indexOf(name.toLowerCase())
  return i  // -1 if not found
}

// Hardcoded fallback column indices (empirically verified from debug output).
// Health Connect schema has one extra null column at index [1], shifting everything +1
// vs the documented schema. start_time is at [9] not [8].
const FALLBACK_IDX = {
  'steps_record_table':                   { start_time: 9, count: 14 },
  'resting_heart_rate_record_table':      { time: 9, beats_per_minute: 11 },
  'sleep_session_record_table':           { start_time: 9, end_time: 11 },
  'weight_record_table':                  { time: 9, weight: 12 },  // 12 = weight REAL (zone_offset at 11)
  'active_calories_burned_record_table':  { start_time: 9, energy: 13 },
  'hydration_record_table':               { start_time: 9, volume: 13 },
}

// Read sqlite_master (page 1 B-tree) — returns { tableName: { rootPage, sql, cols[] } }
async function getTableInfo(file, pageSize, tableNames) {
  const cells = await traverseBtree(file, 1, pageSize)
  const info = {}
  for (const { values } of cells) {
    if (values[0] === 'table' && tableNames.includes(values[1])) {
      const sql = typeof values[4] === 'string' ? values[4] : null
      info[values[1]] = {
        rootPage: typeof values[3] === 'number' ? values[3] : Number(values[3]),
        sql,
        cols: parseColumnNames(sql)
      }
    }
  }
  return info
}

function dayStart(tsMs) {
  const d = new Date(tsMs); d.setHours(0, 0, 0, 0); return d.getTime()
}

export async function parseHealthConnect(dbFile) {
  const debugLog = []
  try {
    const pageSize = await getPageSize(dbFile)
    debugLog.push({ event: 'page_size', pageSize })

    const needed = [
      'steps_record_table',
      'resting_heart_rate_record_table',
      'sleep_session_record_table',
      'weight_record_table',
      'active_calories_burned_record_table',
      'hydration_record_table'
    ]
    const tableInfo = await getTableInfo(dbFile, pageSize, needed)
    debugLog.push({
      event: 'tables_found',
      tables: Object.entries(tableInfo).map(([n, t]) => ({
        name: n, rootPage: t.rootPage,
        cols: t.cols,
        sqlOk: !!t.sql,
        sqlPreview: t.sql ? t.sql.slice(0, 80) : null
      }))
    })
    debugLog.push({ event: 'tables_missing', missing: needed.filter(n => !tableInfo[n]) })

    const DAY = 86400000
    const todayDs = dayStart(Date.now())

    // Helper: get column index from dynamic schema, fall back to hardcoded map
    function getIdx(tableName, colName, sc) {
      const dynIdx = colIdx(sc, colName)
      if (dynIdx >= 0) return dynIdx
      return FALLBACK_IDX[tableName]?.[colName] ?? -1
    }

    function toNum(v) {
      if (v === null || v === undefined) return null
      if (typeof v === 'bigint') return Number(v)
      if (typeof v === 'number') return v
      return parseFloat(v)
    }

    // ── Steps ──
    let stepsByDay = {}
    const stepsInfo = tableInfo['steps_record_table']
    if (stepsInfo) {
      const cells = await traverseBtree(dbFile, stepsInfo.rootPage, pageSize)
      const sc = stepsInfo.cols
      const tIdx = getIdx('steps_record_table', 'start_time', sc)
      const cIdx = getIdx('steps_record_table', 'count', sc)
      debugLog.push({ event: 'steps', cellCount: cells.length, tIdx, cIdx, firstValues: cells[0]?.values?.slice(0, 16)?.map(v => typeof v === 'bigint' ? v.toString() : v) ?? null })
      for (const { values } of cells) {
        const tMs = tIdx >= 0 ? toMs(values[tIdx]) : null
        const cnt = toNum(cIdx >= 0 ? values[cIdx] : null)
        if (!tMs || !cnt) continue
        const ds = dayStart(tMs)
        stepsByDay[ds] = (stepsByDay[ds] || 0) + cnt
      }
    }

    // ── Heart rate ──
    let heartRate = null, hrTime = 0
    const hrInfo = tableInfo['resting_heart_rate_record_table']
    if (hrInfo) {
      const cells = await traverseBtree(dbFile, hrInfo.rootPage, pageSize)
      const sc = hrInfo.cols
      const tIdx = getIdx('resting_heart_rate_record_table', 'time', sc)
      const bIdx = getIdx('resting_heart_rate_record_table', 'beats_per_minute', sc)
      debugLog.push({ event: 'hr', cellCount: cells.length, tIdx, bIdx, firstValues: cells[0]?.values?.slice(0, 16)?.map(v => typeof v === 'bigint' ? v.toString() : v) ?? null })
      for (const { values } of cells) {
        const tMs = tIdx >= 0 ? toMs(values[tIdx]) : null
        const bpm = toNum(bIdx >= 0 ? values[bIdx] : null)
        if (tMs > hrTime && bpm) { hrTime = tMs; heartRate = Math.round(bpm) }
      }
    }

    // ── Sleep ──
    let sleep = null, sleepTime = 0
    const sleepInfo = tableInfo['sleep_session_record_table']
    if (sleepInfo) {
      const cells = await traverseBtree(dbFile, sleepInfo.rootPage, pageSize)
      const sc = sleepInfo.cols
      const stIdx = getIdx('sleep_session_record_table', 'start_time', sc)
      const etIdx = getIdx('sleep_session_record_table', 'end_time', sc)
      debugLog.push({ event: 'sleep', cellCount: cells.length, stIdx, etIdx, firstValues: cells[0]?.values?.slice(0, 16)?.map(v => typeof v === 'bigint' ? v.toString() : v) ?? null })
      for (const { values } of cells) {
        const startMs = stIdx >= 0 ? toMs(values[stIdx]) : null
        const endMs = etIdx >= 0 ? toMs(values[etIdx]) : null
        if (startMs > sleepTime && endMs && endMs > startMs) {
          sleepTime = startMs
          sleep = ((endMs - startMs) / 3600000).toFixed(1)
        }
      }
    }

    // ── Weight ──
    let weight = null, wTime = 0
    const wInfo = tableInfo['weight_record_table']
    if (wInfo) {
      const cells = await traverseBtree(dbFile, wInfo.rootPage, pageSize)
      const sc = wInfo.cols
      const tIdx = getIdx('weight_record_table', 'time', sc)
      const wIdx = getIdx('weight_record_table', 'weight', sc)
      debugLog.push({ event: 'weight', cellCount: cells.length, tIdx, wIdx, firstValues: cells[0]?.values?.slice(0, 16)?.map(v => typeof v === 'bigint' ? v.toString() : v) ?? null })
      for (const { values } of cells) {
        const tMs = tIdx >= 0 ? toMs(values[tIdx]) : null
        const wN = toNum(wIdx >= 0 ? values[wIdx] : null)
        if (tMs > wTime && wN && wN > 0) { wTime = tMs; weight = (wN / 1000).toFixed(1) }  // stored in grams
      }
    }

    // ── Active calories ──
    let calByDay = {}
    const calInfo = tableInfo['active_calories_burned_record_table']
    if (calInfo) {
      const cells = await traverseBtree(dbFile, calInfo.rootPage, pageSize)
      const sc = calInfo.cols
      const tIdx = getIdx('active_calories_burned_record_table', 'start_time', sc)
      const eIdx = getIdx('active_calories_burned_record_table', 'energy', sc)
      debugLog.push({ event: 'calories', cellCount: cells.length, tIdx, eIdx })
      for (const { values } of cells) {
        const tMs = tIdx >= 0 ? toMs(values[tIdx]) : null
        const eN = toNum(eIdx >= 0 ? values[eIdx] : null)
        if (!tMs || !eN) continue
        const ds = dayStart(tMs)
        calByDay[ds] = (calByDay[ds] || 0) + eN / 4184
      }
    }

    // ── Hydration ──
    let hydByDay = {}
    const hydInfo = tableInfo['hydration_record_table']
    if (hydInfo) {
      const cells = await traverseBtree(dbFile, hydInfo.rootPage, pageSize)
      const sc = hydInfo.cols
      const tIdx = getIdx('hydration_record_table', 'start_time', sc)
      const vIdx = getIdx('hydration_record_table', 'volume', sc)
      debugLog.push({ event: 'hydration', cellCount: cells.length, tIdx, vIdx })
      for (const { values } of cells) {
        const tMs = tIdx >= 0 ? toMs(values[tIdx]) : null
        const vN = toNum(vIdx >= 0 ? values[vIdx] : null)
        if (!tMs || !vN) continue
        const ds = dayStart(tMs)
        hydByDay[ds] = (hydByDay[ds] || 0) + vN
      }
    }

    // Anchor chart to most recent STEPS day specifically — prevents mismatch with
    // other metrics that may have more recent timestamps
    const stepsKeys = Object.keys(stepsByDay).map(Number).sort((a, b) => b - a)
    const stepsAnchorDs = stepsKeys.length ? stepsKeys[0] : todayDs

    // Build last7 anchored to the most recent STEPS date
    const last7 = Array.from({ length: 7 }, (_, i) => ({
      dayStart: stepsAnchorDs - (6 - i) * DAY,
      steps: 0, activeCalories: 0, hydration: 0
    }))
    last7.forEach(b => {
      b.steps = Math.round(stepsByDay[b.dayStart] || 0)
      b.activeCalories = Math.round(calByDay[b.dayStart] || 0)
      b.hydration = parseFloat(hydByDay[b.dayStart] || 0)
    })

    // Steps: always use the most recent step day (avoids timezone-key mismatch with todayDs)
    const steps = stepsKeys.length ? Math.round(stepsByDay[stepsKeys[0]]) : 0

    // Calories / hydration: most recent day
    const calKeys = Object.keys(calByDay).map(Number).sort((a, b) => b - a)
    const hydKeys = Object.keys(hydByDay).map(Number).sort((a, b) => b - a)
    const activeCalories = calKeys.length ? Math.round(calByDay[calKeys[0]]) : 0
    const hydration = hydKeys.length ? parseFloat(hydByDay[hydKeys[0]] || 0).toFixed(2) : '0.00'

    const bmi = weight ? (parseFloat(weight) / (1.70 * 1.70)).toFixed(1) : null

    debugLog.push({ event: 'result', steps, heartRate, sleep, weight, activeCalories, hydration, stepsAnchorDate: new Date(stepsAnchorDs).toISOString().slice(0, 10) })

    return { steps, heartRate, sleep, weight, activeCalories, hydration, bmi, last7, importedAt: Date.now(), debugLog }

  } catch (err) {
    return { error: err.message, debugLog, importedAt: Date.now() }
  }
}
