import { formatDateISO } from './format'
import { TX_TYPE_LABEL } from '../constants/transaction'

const HEADER = [
  'Tanggal',
  'Jenis',
  'Kategori',
  'Dompet',
  'Nominal',
  'Catatan',
  'Dompet Tujuan'
]

/**
 * Escape satu cell CSV.
 * Bungkus dengan kutip jika ada koma, kutip ganda, atau newline.
 */
function escapeCell(val) {
  if (val == null) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

/**
 * Bangun baris data dari array transaksi + lookup wallet & kategori.
 */
function buildRows({ transactions, wallets, categories }) {
  const walletMap = new Map(wallets.map(w => [w.id, w.name]))
  const categoryMap = new Map(categories.map(c => [c.id, c.name]))

  return transactions.map(tx => [
    tx.date,
    TX_TYPE_LABEL[tx.type] || tx.type,
    categoryMap.get(tx.category_id) || '',
    walletMap.get(tx.wallet_id) || '',
    Number(tx.amount) || 0,
    tx.note || '',
    walletMap.get(tx.to_wallet_id) || ''
  ])
}

/**
 * Generate string CSV dari array transaksi.
 * @returns {string}
 */
export function generateCSV({ transactions, wallets, categories }) {
  const rows = [HEADER, ...buildRows({ transactions, wallets, categories })]
  return rows.map(row => row.map(escapeCell).join(',')).join('\r\n')
}

/**
 * Trigger download file di browser.
 */
export function downloadCSV(filename, content) {
  // BOM UTF-8 agar Excel bisa baca karakter Indonesia (é, ñ, dll)
  const bom = '\uFEFF'
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Export transaksi yang diberikan ke file CSV.
 * @param {Object} p
 * @param {Array} p.transactions
 * @param {Array} p.wallets
 * @param {Array} p.categories
 * @returns {{ ok: boolean, reason?: string, filename?: string, count?: number }}
 */
export function exportTransactionsCSV({ transactions, wallets, categories }) {
  if (!transactions || !transactions.length) {
    return { ok: false, reason: 'empty' }
  }

  const csv = generateCSV({ transactions, wallets, categories })
  const filename = `alda-transaksi-${formatDateISO()}.csv`
  downloadCSV(filename, csv)

  return { ok: true, filename, count: transactions.length }
}