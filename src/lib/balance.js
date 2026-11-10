/**
 * Hitung saldo aktual per wallet berdasarkan seluruh transaksi.
 * @param {Object} p
 * @param {Array} p.wallets
 * @param {Array} p.transactions
 * @param {Array} p.splits
 * @param {Array} p.debts          - internal & external debts
 * @param {Array} p.debtPayments
 * @returns {Record<string, number>} map wallet_id -> saldo
 */
export function computeBalances({ wallets, transactions, splits, debts = [], debtPayments = [] }) {
  const map = {}
  for (const w of wallets) {
    if (w.is_deleted) continue
    map[w.id] = Number(w.initial_balance || 0)
  }

  for (const t of transactions) {
    if (t.is_deleted) continue

    if (t.type === 'income') {
      if (map[t.wallet_id] !== undefined) {
        map[t.wallet_id] += Number(t.amount)
      }
    } else if (t.type === 'expense') {
      const relatedSplits = splits.filter(s => s.transaction_id === t.id)
      if (relatedSplits.length) {
        for (const s of relatedSplits) {
          if (map[s.wallet_id] !== undefined) {
            map[s.wallet_id] -= Number(s.amount)
          }
        }
      } else if (map[t.wallet_id] !== undefined) {
        map[t.wallet_id] -= Number(t.amount)
      }
    } else if (t.type === 'transfer') {
      if (map[t.wallet_id] !== undefined) map[t.wallet_id] -= Number(t.amount)
      if (map[t.to_wallet_id] !== undefined) map[t.to_wallet_id] += Number(t.amount)
    }
  }

  // Debts: internal + external
  for (const d of debts) {
    if (d.is_deleted) continue

    if (d.source === 'internal') {
      // utang internal: counterpart (pemberi pinjam) berkurang
      // piutang internal: counterpart (peminjam) bertambah
      if (d.type === 'utang' && map[d.counterpart_wallet_id] !== undefined) {
        map[d.counterpart_wallet_id] -= Number(d.principal)
      } else if (d.type === 'piutang' && map[d.counterpart_wallet_id] !== undefined) {
        map[d.counterpart_wallet_id] += Number(d.principal)
      }
    } else {
      // External debts
      // utang eksternal: dapat uang → saldo naik
      // piutang eksternal: beri uang → saldo turun
      if (d.type === 'utang' && d.counterpart_wallet_id && map[d.counterpart_wallet_id] !== undefined) {
        map[d.counterpart_wallet_id] += Number(d.principal)
      } else if (d.type === 'piutang' && d.counterpart_wallet_id && map[d.counterpart_wallet_id] !== undefined) {
        map[d.counterpart_wallet_id] -= Number(d.principal)
      }
    }
  }

  // Pelunasan
  for (const p of debtPayments) {
    if (p.is_deleted) continue
    const debt = debts.find(d => d.id === p.debt_id)
    if (!debt || debt.is_deleted) continue

    if (debt.source === 'internal') {
      if (debt.type === 'utang' && map[p.wallet_id] !== undefined) {
        map[p.wallet_id] += Number(p.amount)
      } else if (debt.type === 'piutang' && map[p.wallet_id] !== undefined) {
        map[p.wallet_id] -= Number(p.amount)
      }
    } else {
      // utang eksternal dibayar → saldo turun
      // piutang eksternal diterima → saldo naik
      if (debt.type === 'utang' && map[p.wallet_id] !== undefined) {
        map[p.wallet_id] -= Number(p.amount)
      } else if (debt.type === 'piutang' && map[p.wallet_id] !== undefined) {
        map[p.wallet_id] += Number(p.amount)
      }
    }
  }

  return map
}