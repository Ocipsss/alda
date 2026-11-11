import { formatDateISO } from './format'

/**
 * Preset rentang tanggal cepat.
 * @returns {{ dateFrom: string, dateTo: string }}
 */
export function todayRange() {
  const today = formatDateISO()
  return { dateFrom: today, dateTo: today }
}

export function last7DaysRange() {
  const now = new Date()
  const from = new Date(now)
  from.setDate(from.getDate() - 6)
  return { dateFrom: formatDateISO(from), dateTo: formatDateISO(now) }
}

export function last30DaysRange() {
  const now = new Date()
  const from = new Date(now)
  from.setDate(from.getDate() - 29)
  return { dateFrom: formatDateISO(from), dateTo: formatDateISO(now) }
}

export function thisMonthRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { dateFrom: formatDateISO(from), dateTo: formatDateISO(to) }
}

export function lastMonthRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const to = new Date(now.getFullYear(), now.getMonth(), 0)
  return { dateFrom: formatDateISO(from), dateTo: formatDateISO(to) }
}

/**
 * Default filter — bulan ini, semua jenis transaksi.
 */
export function defaultFilter() {
  const { dateFrom, dateTo } = thisMonthRange()
  return {
    dateFrom,
    dateTo,
    types: ['income', 'expense', 'transfer'],
    wallet_id: null,
    category_id: null,
    search: ''
  }
}

/**
 * Terapkan filter ke array transaksi.
 * @param {Array} transactions
 * @param {Object} filter
 * @returns {Array}
 */
export function applyFilter(transactions, filter) {
  if (!filter) return transactions

  const q = (filter.search || '').trim().toLowerCase()
  const types = filter.types || []
  const walletId = filter.wallet_id
  const categoryId = filter.category_id
  const from = filter.dateFrom
  const to = filter.dateTo

  return transactions.filter(tx => {
    if (tx.is_deleted) return false

    // Tanggal
    if (from && tx.date < from) return false
    if (to && tx.date > to) return false

    // Jenis
    if (types.length && !types.includes(tx.type)) return false

    // Dompet (cek wallet_id utama ATAU to_wallet_id untuk transfer)
    if (walletId) {
      const isInvolved = tx.wallet_id === walletId || tx.to_wallet_id === walletId
      if (!isInvolved) return false
    }

    // Kategori
    if (categoryId && tx.category_id !== categoryId) return false

    // Search catatan
    if (q) {
      const note = (tx.note || '').toLowerCase()
      if (!note.includes(q)) return false
    }

    return true
  })
}

/**
 * Hitung summary dari array transaksi.
 * @param {Array} transactions
 * @returns {{ income: number, expense: number, transfer: number, net: number, count: number }}
 */
export function summarize(transactions) {
  let income = 0
  let expense = 0
  let transfer = 0
  let count = 0

  for (const tx of transactions) {
    if (tx.is_deleted) continue
    count++
    const amount = Number(tx.amount) || 0
    if (tx.type === 'income') income += amount
    else if (tx.type === 'expense') expense += amount
    else if (tx.type === 'transfer') transfer += amount
  }

  return {
    income,
    expense,
    transfer,
    net: income - expense,
    count
  }
}