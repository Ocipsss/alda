import { db, getMeta, setMeta } from '../db'
import { supabase } from './supabase'
import { LAST_SYNC_INITIAL, SYNC_RETRY_LIMIT, SYNC_RETRY_DELAY_MS } from '../constants/sync'

/**
 * Bersihkan flag internal sebelum kirim ke Supabase.
 * Flag yang dibuang: _pending (flag lokal saja).
 */
function stripLocalFlags(row) {
  const { _pending, ...clean } = row
  return clean
}

/**
 * Push semua row yang punya _pending = true di tabel tertentu.
 * @returns {Promise<{ pushed: number, failed: number }>}
 */
async function pushPending(tableName) {
  const localTable = db[tableName]
  if (!localTable) return { pushed: 0, failed: 0 }

  const pending = await localTable.filter(r => !!r._pending).toArray()
  if (!pending.length) return { pushed: 0, failed: 0 }

  let pushed = 0
  let failed = 0

  for (const row of pending) {
    const clean = stripLocalFlags(row)
    const { error } = await supabase
      .from(tableName)
      .upsert(clean, { onConflict: 'id' })

    if (!error) {
      await localTable.update(row.id, { _pending: false })
      pushed++
    } else {
      failed++
      console.warn(`[sync-engine] push ${tableName}/${row.id} failed:`, error.message)
    }
  }

  return { pushed, failed }
}

/**
 * Pull data terbaru dari Supabase (updated_at > last_sync_at).
 * Terapkan aturan Last-Write-Wins.
 * @returns {Promise<{ pulled: number }>}
 */
async function pullRemote(tableName) {
  const localTable = db[tableName]
  if (!localTable) return { pulled: 0 }

  const metaKey = `${tableName}_sync_at`
  const last = (await getMeta(metaKey)) ?? LAST_SYNC_INITIAL

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .gt('updated_at', last)
    .order('updated_at', { ascending: true })

  if (error) {
    console.warn(`[sync-engine] pull ${tableName} failed:`, error.message)
    return { pulled: 0 }
  }

  if (!data?.length) return { pulled: 0 }

  let pulled = 0
  for (const remote of data) {
    const local = await localTable.get(remote.id)
    const remoteTime = new Date(remote.updated_at).getTime()
    const localTime = local ? new Date(local.updated_at).getTime() : 0

    if (!local || remoteTime >= localTime) {
      await localTable.put({ ...remote, _pending: false })
      pulled++
    }
  }

  const newest = data.at(-1)?.updated_at ?? last
  await setMeta(metaKey, newest)

  return { pulled }
}

/**
 * Sync satu tabel: push dulu (agar perubahan lokal tidak tertimpa), lalu pull.
 * @param {string} tableName
 * @returns {Promise<{ pushed: number, failed: number, pulled: number }>}
 */
export async function syncTable(tableName) {
  if (!navigator.onLine) {
    return { pushed: 0, failed: 0, pulled: 0 }
  }

  const pushResult = await pushPending(tableName)
  const pullResult = await pullRemote(tableName)

  return { ...pushResult, ...pullResult }
}

/**
 * Sync banyak tabel secara paralel.
 * @param {string[]} tables
 * @returns {Promise<Record<string, { pushed, failed, pulled }>>}
 */
export async function syncMany(tables) {
  if (!navigator.onLine) return {}

  const results = await Promise.all(
    tables.map(async (name) => [name, await syncTable(name)])
  )
  return Object.fromEntries(results)
}

/**
 * Sync satu tabel dengan retry otomatis (backoff linear).
 * @param {string} tableName
 * @param {number} [maxAttempts]
 */
export async function syncTableWithRetry(tableName, maxAttempts = SYNC_RETRY_LIMIT) {
  let attempt = 0
  let lastError = null

  while (attempt < maxAttempts) {
    try {
      return await syncTable(tableName)
    } catch (err) {
      lastError = err
      attempt++
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, SYNC_RETRY_DELAY_MS * attempt))
      }
    }
  }

  console.warn(`[sync-engine] ${tableName} retry exhausted:`, lastError?.message)
  return { pushed: 0, failed: 0, pulled: 0 }
}