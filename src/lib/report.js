/**
 * Filter transaksi berdasarkan bulan (YYYY-MM).
 */
export function filterMonth(transactions, year, month) {
  if (!transactions?.length) return []
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return transactions.filter(t => !t.is_deleted && t.date?.startsWith(prefix))
}

/**
 * Compute laporan bulanan lengkap.
 * @param {Object} p
 * @param {Array} p.transactions
 * @param {Array} p.wallets
 * @param {Array} p.categories
 * @param {number} p.year
 * @param {number} p.month - 1..12
 */
export function computeMonthlyReport({ transactions, wallets, categories, year, month }) {
  const monthTx = filterMonth(transactions, year, month)

  let income = 0
  let expense = 0
  let transfer = 0
  let count = 0

  const categoryMap = new Map()
  const walletFlowMap = new Map()

  for (const tx of monthTx) {
    count++
    const amount = Number(tx.amount) || 0

    if (tx.type === 'income') {
      income += amount
      if (tx.category_id) {
        const entry = categoryMap.get(tx.category_id) || {
          id: tx.category_id,
          type: 'income',
          total: 0,
          count: 0
        }
        entry.total += amount
        entry.count++
        categoryMap.set(tx.category_id, entry)
      }
      if (tx.wallet_id) {
        const flow = walletFlowMap.get(tx.wallet_id) || { in: 0, out: 0 }
        flow.in += amount
        walletFlowMap.set(tx.wallet_id, flow)
      }
    } else if (tx.type === 'expense') {
      expense += amount
      if (tx.category_id) {
        const entry = categoryMap.get(tx.category_id) || {
          id: tx.category_id,
          type: 'expense',
          total: 0,
          count: 0
        }
        entry.total += amount
        entry.count++
        categoryMap.set(tx.category_id, entry)
      }
      if (tx.wallet_id) {
        const flow = walletFlowMap.get(tx.wallet_id) || { in: 0, out: 0 }
        flow.out += amount
        walletFlowMap.set(tx.wallet_id, flow)
      }
    } else if (tx.type === 'transfer') {
      transfer += amount
      if (tx.wallet_id) {
        const flow = walletFlowMap.get(tx.wallet_id) || { in: 0, out: 0 }
        flow.out += amount
        walletFlowMap.set(tx.wallet_id, flow)
      }
      if (tx.to_wallet_id) {
        const flow = walletFlowMap.get(tx.to_wallet_id) || { in: 0, out: 0 }
        flow.in += amount
        walletFlowMap.set(tx.to_wallet_id, flow)
      }
    }
  }

  // Enrich kategori dengan nama & ikon
  const catMap = new Map((categories || []).map(c => [c.id, c]))
  const byCategory = [...categoryMap.values()]
    .map(c => ({
      ...c,
      name: catMap.get(c.id)?.name || '—',
      icon: catMap.get(c.id)?.icon || 'Tag'
    }))
    .sort((a, b) => b.total - a.total)

  // Enrich wallet dengan nama & warna
  const walMap = new Map((wallets || []).map(w => [w.id, w]))
  const byWallet = [...walletFlowMap.entries()]
    .map(([id, flow]) => ({
      wallet_id: id,
      name: walMap.get(id)?.name || '—',
      color: walMap.get(id)?.color || '#64748b',
      in: flow.in,
      out: flow.out,
      net: flow.in - flow.out
    }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))

  return {
    year,
    month,
    income,
    expense,
    transfer,
    net: income - expense,
    count,
    byCategory,
    byWallet
  }
}

/**
 * Daftar bulan yang punya data + bulan berjalan.
 * Dikembalikan sorted descending (terbaru dulu).
 */
export function getAvailableMonths(transactions) {
  const set = new Set()
  const now = new Date()
  set.add(`${now.getFullYear()}-${now.getMonth() + 1}`)

  for (const tx of transactions || []) {
    if (tx.is_deleted || !tx.date) continue
    const parts = tx.date.split('-')
    if (parts.length >= 2) {
      set.add(`${Number(parts[0])}-${Number(parts[1])}`)
    }
  }

  return [...set]
    .map(s => {
      const [y, m] = s.split('-').map(Number)
      return { year: y, month: m }
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })
}

/**
 * Label bulan dalam bahasa Indonesia.
 */
export function monthLabel(year, month) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  const idx = Math.max(0, Math.min(11, month - 1))
  return `${months[idx]} ${year}`
}