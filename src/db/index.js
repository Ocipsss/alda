import Dexie from 'dexie'

export const db = new Dexie('alda-db')

db.version(1).stores({
  wallets:           'id, user_id, name, is_deleted, updated_at, _pending',
  categories:        'id, user_id, type, is_deleted, updated_at, _pending',
  transactions:      'id, user_id, type, date, wallet_id, category_id, is_deleted, updated_at, _pending',
  transaction_splits:'id, transaction_id, wallet_id, is_loan, _pending',
  debts:             'id, user_id, type, source, is_deleted, updated_at, _pending',
  debt_payments:     'id, debt_id, wallet_id, date, updated_at, _pending',
  split_bills:       'id, transaction_id, updated_at, _pending',
  split_bill_members:'id, split_bill_id, paid_status, _pending',
  sync_meta:         'key'
})

export async function getMeta(key) {
  const row = await db.sync_meta.get(key)
  return row?.value
}

export async function setMeta(key, value) {
  await db.sync_meta.put({ key, value })
}

export function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2)
}