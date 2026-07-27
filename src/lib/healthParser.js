// Lazy SQLite reader — reads only B-tree pages needed via File.slice()
// No WASM, no full-file load. Works on mobile with large DBs.

const PAGE_HEADER_OFFSET = 100  // first page has 100-byte file header before the B-tree header

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

// Read a single SQLite page (1-indexed)
async function readPage(file, pageNum, pageSize) {
  const offset = (pageNum - 1) * pageSize
  const dv = await readBytes(file, offset, pageSize)
  return dv
}

// Parse a leaf table B-tree page, extract all cell payloads
function parseLeafCells(dv, pageNum, pageSize) {
  const isFirstPage = pageNum === 1
  const btreeHeaderOffset = isFirstPage ? PAGE_HEADER_OFFSET : 0
  const pageType = dv.getUint8(btreeHeaderOffset)
  if (pageType !== 13) return []  // 13 = leaf table page

  const cellCount = u16(dv, btreeHeaderOffset + 3)
  const cellPtrOffset = btreeHeaderOffset + 8
  const cells = []

  for (let i = 0; i < cellCount; i++) {
    const ptr = u16(dv, cellPtrOffset + i * 2)
    if (ptr === 0 || ptr >= pageSize) continue
    try {
      cells.push(parseCell(dv, ptr, pageSize))
    } catch { /* skip corrupt cell */ }
  }
  return cells
}

// Parse a single table leaf cell, return array of column values
function parseCell(dv, offset, pageSize) {
  let pos = offset
  const [payloadLen, n1] = readVarint(dv, pos); pos += n1
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
    const byte = dv.getUint8(offset + i)
    i++
    if (i < 9) {
      result |= BigInt(byte & 0x7f) << shift
      shift += 7n
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
  if (serialType >= 12 && serialType % 2 === 0) {
    const len = (serialType - 12) / 2
    return [null, len]  // BLOB
  }
  if (serialType >= 13 && serialType % 2 === 1) {
    const len = (serialType - 13) / 2
    try {
      const bytes = new Uint8Array(dv.buffer, dv.byteOffset + offset, len)
      return [new TextDecoder().decode(bytes), len]
    } catch { return [null, len] }
  }
  return [null, 0]
}

// Read sqlite_master (page 1) to find root page numbers for named tables
async function getTableRootPages(file, pageSize, tableNames) {
  const page1 = await readPage(file, 1, pageSize)
  const cells = parseLeafCells(page1, 1, pageSize)
  const roots = {}
  for (const { values } of cells) {
    // sqlite_master: type, name, tbl_name, rootpage, sql
    if (values[0] === 'table' && tableNames.includes(values[1])) {
      roots[values[1]] = values[3]
    }
  }
  return roots
}

// Traverse an entire B-tree (interior + leaf pages), return all leaf cells
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
      // Interior table page — collect child pointers
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

// Main entry: given a SQLite File, return health metrics
export async function parseHealthConnect(dbFile) {
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

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayMs = today.getTime()
  const tomorrowMs = todayMs + 86400000

  // steps: col indices — start_time=11, count=14 (from schema)
  // resting_hr: time=8, beats_per_minute=13
  // sleep: start_time=8, end_time=10
  // weight: time=8, weight=13
  // active_cal: start_time=8, energy=13
  // hydration: start_time=8, volume=13

  let steps = 0
  if (roots['steps_record_table']) {
    const cells = await traverseBtree(dbFile, roots['steps_record_table'], pageSize)
    for (const { values } of cells) {
      const startTime = values[8]
      const count = values[13]
      if (startTime >= todayMs && startTime < tomorrowMs && count) {
        steps += count
      }
    }
  }

  let heartRate = null
  if (roots['resting_heart_rate_record_table']) {
    const cells = await traverseBtree(dbFile, roots['resting_heart_rate_record_table'], pageSize)
    let latestTime = 0
    for (const { values } of cells) {
      const time = values[8]
      const bpm = values[13]
      if (time > latestTime && bpm) { latestTime = time; heartRate = bpm }
    }
  }

  let sleep = null
  if (roots['sleep_session_record_table']) {
    const cells = await traverseBtree(dbFile, roots['sleep_session_record_table'], pageSize)
    let latestStart = 0
    for (const { values } of cells) {
      const startTime = values[8]
      const endTime = values[10]
      if (startTime > latestStart && endTime) {
        latestStart = startTime
        sleep = ((endTime - startTime) / 3600000).toFixed(1)
      }
    }
  }

  let weight = null
  if (roots['weight_record_table']) {
    const cells = await traverseBtree(dbFile, roots['weight_record_table'], pageSize)
    let latestTime = 0
    for (const { values } of cells) {
      const time = values[8]
      const w = values[13]
      if (time > latestTime && w) { latestTime = time; weight = parseFloat(w).toFixed(1) }
    }
  }

  let activeCalories = 0
  if (roots['active_calories_burned_record_table']) {
    const cells = await traverseBtree(dbFile, roots['active_calories_burned_record_table'], pageSize)
    for (const { values } of cells) {
      const startTime = values[8]
      const energy = values[13]
      if (startTime >= todayMs && startTime < tomorrowMs && energy) {
        activeCalories += energy / 4184  // joules to kcal
      }
    }
    activeCalories = Math.round(activeCalories)
  }

  let hydration = 0
  if (roots['hydration_record_table']) {
    const cells = await traverseBtree(dbFile, roots['hydration_record_table'], pageSize)
    for (const { values } of cells) {
      const startTime = values[8]
      const vol = values[13]
      if (startTime >= todayMs && startTime < tomorrowMs && vol) {
        hydration += vol
      }
    }
    hydration = parseFloat(hydration).toFixed(2)
  }

  return { steps: Math.round(steps), heartRate, sleep, weight, activeCalories, hydration }
}
