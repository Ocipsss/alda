export const SYNC_INTERVAL_MS = 30_000
export const SYNC_RETRY_LIMIT = 3
export const SYNC_RETRY_DELAY_MS = 2_000
export const LAST_SYNC_INITIAL = '1970-01-01T00:00:00Z'

export const SYNC_TABLES = [
  'transactions',
  'transaction_splits',
  'debts',
  'debt_payments',
  'wallets',
  'categories',
  'split_bills',
  'split_bill_members'
]