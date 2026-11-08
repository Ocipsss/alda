import Dexie from 'dexie'

export const db = new Dexie('alda-db')

db.version(1).stores({
  wallets:           'id, user_id, name, is_deleted, updated_at',
  categories:        'id, user_id, type, is_deleted, updated_at',
  transactions:      'id, user_id, type, date, wallet_id, category_id, is_deleted, updated_at',
  transaction_splits:'id, transaction_id, wallet_id, is_loan',
  debts:             'id, user_id, type, source, is_deleted, updated_at',
  debt_payments:     'id, debt_id, wallet_id, date, updated_at',
  split_bills:       'id, transaction_id, updated_at',
  split_bill_members:'id, split_bill_id, paid_status',
  sync_meta:         'key' // last_sync_at, dll
})

/* Helper meta sync */
export async function getMeta(key) {
  const row = await db.sync_meta.get(key)
  return row?.value
}

export async function setMeta(key, value) {
  await db.sync_meta.put({ key, value })
}

/* Helper ID generator (uuid v4 fallback) */
export function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2)
}