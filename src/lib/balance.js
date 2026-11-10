/**
 * Hitung saldo aktual per wallet berdasarkan seluruh transaksi.
 * @param {Object} p
 * @param {Array} p.wallets
 * @param {Array} p.transactions
 * @param {Array} p.splits
 * @param {Array} p.debts          - internal debts yang mempengaruhi wallet
 * @param {Array} p.debtPayments
 * @returns {Record<string, number>} map wallet_id -> saldo
 */
export function computeBalances({ wallets, transactions, splits, debts = [], debtPayments = [] }) {
  const map = {}
  for (const w of wallets) {
    if (w.is_deleted) continue
    map[w.id] = Number(w.initial_balance || 0)
  }

  const txById = new Map(transactions.map(t => [t.id, t]))

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

  // Internal debts dari expense split pinjaman
  for (const d of debts) {
    if (d.is_deleted) continue
    if (d.source !== 'internal') continue
    // utang internal: counterpart_wallet_id meminjamkan → kurangi counterpart
    // piutang internal: counterpart_wallet_id berutang → tambah counterpart
    if (d.type === 'utang' && map[d.counterpart_wallet_id] !== undefined) {
      map[d.counterpart_wallet_id] -= Number(d.principal)
      // sisi peminjam sudah terpotong di split expense, jadi tidak dobel
    } else if (d.type === 'piutang' && map[d.counterpart_wallet_id] !== undefined) {
      map[d.counterpart_wallet_id] += Number(d.principal)
    }
  }

  // Pelunasan internal
  for (const p of debtPayments) {
    const debt = debts.find(d => d.id === p.debt_id)
    if (!debt || debt.source !== 'internal' || debt.is_deleted) continue
    if (debt.type === 'utang' && map[p.wallet_id] !== undefined) {
      // pelunasan utang internal → wallet penyetor +balance (mengembalikan ke counterpart)
      map[p.wallet_id] += Number(p.amount)
    } else if (debt.type === 'piutang' && map[p.wallet_id] !== undefined) {
      map[p.wallet_id] -= Number(p.amount)
    }
  }

  return map
}