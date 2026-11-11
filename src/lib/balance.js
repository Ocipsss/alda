/**
 * Hitung saldo aktual per wallet berdasarkan seluruh transaksi.
 *
 * Konvensi setelah migration wallet-temporary:
 * - Semua debt = source 'internal'
 * - debtor_wallet_id = wallet peminjam
 * - creditor_wallet_id = wallet pemberi pinjam
 *
 * Logika saldo:
 * - Initial balance
 * - + income (wallet_id)
 * - - expense (wallet_id atau splits)
 * - + transfer in / - transfer out
 *
 * Debt TIDAK mempengaruhi saldo wallet (karena wallet temporer saldo = 0,
 * dan wallet real yang terlibat sudah tercatat via opening transaction).
 *
 * Pelunasan debt:
 * - Bayar utang (debtor bayar ke creditor): debtor wallet berkurang
 * - Terima piutang (debtor bayar ke creditor): creditor wallet bertambah
 *
 * @param {Object} p
 * @param {Array} p.wallets
 * @param {Array} p.transactions
 * @param {Array} p.splits
 * @param {Array} p.debts
 * @param {Array} p.debtPayments
 * @returns {Record<string, number>} map wallet_id -> saldo
 */
export function computeBalances({
  wallets,
  transactions,
  splits,
  debts = [],
  debtPayments = []
}) {
  const map = {}

  // Init: semua wallet (real & temporer) dengan initial_balance
  for (const w of wallets) {
    if (w.is_deleted) continue
    map[w.id] = Number(w.initial_balance || 0)
  }

  // ============ TRANSACTIONS ============

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

  // ============ DEBT PAYMENTS ============
  //
  // Catatan: Debt creation TIDAK mengubah saldo wallet lagi.
  // Karena debt dibuat bersamaan dengan opening transaction
  // (income/expense) yang sudah mempengaruhi saldo.
  //
  // Hanya pelunasan yang mengubah saldo, karena saat pelunasan
  // kita buat debt_payment (transfer uang dari debtor ke creditor).

  for (const p of debtPayments) {
    if (p.is_deleted) continue

    const debt = debts.find(d => d.id === p.debt_id)
    if (!debt || debt.is_deleted) continue

    // Pelunasan selalu: debtor bayar ke creditor
    // Wallet penyetor = debtor_wallet_id
    // Wallet penerima = creditor_wallet_id
    //
    // Tapi `p.wallet_id` adalah wallet penyetor aktual (bisa = debtor_wallet_id)
    // Kalau debtor adalah wallet temporer, tidak bisa jadi penyetor.
    //
    // Konvensi pelunasan:
    // - Kalau debtor adalah wallet real → p.wallet_id = debtor (bayar)
    //   → debtor saldo berkurang, creditor saldo bertambah
    // - Kalau debtor adalah wallet temporer (misal pihak luar berutang) →
    //   p.wallet_id = wallet real penerima (kita terima uang)
    //   → wallet kita saldo bertambah, debtor temporer tidak berubah (0)

    const paymentWalletId = p.wallet_id
    if (map[paymentWalletId] === undefined) continue

    // Arah: siapa yang bayar
    const isDebtorPaying = p.wallet_id === debt.debtor_wallet_id
    const isCreditorReceiving = p.wallet_id === debt.creditor_wallet_id

    if (isDebtorPaying) {
      // Debtor bayar → saldo debtor turun
      // Creditor terima → tapi kalau creditor wallet temporer, tidak ada perubahan
      // (karena wallet temporer tidak menampung saldo)
      map[paymentWalletId] -= Number(p.amount)
      if (map[debt.creditor_wallet_id] !== undefined) {
        map[debt.creditor_wallet_id] += Number(p.amount)
      }
    } else if (isCreditorReceiving) {
      // Kasus ini terjadi kalau wallet temporer = debtor,
      // dan wallet real = creditor yang terima uang dari pihak luar
      map[paymentWalletId] += Number(p.amount)
      if (map[debt.debtor_wallet_id] !== undefined) {
        map[debt.debtor_wallet_id] -= Number(p.amount)
      }
    }
    // Kalau p.wallet_id bukan debtor & bukan creditor → skip (data anomali)
  }

  return map
}

/**
 * Hitung total saldo dari wallet REAL saja (exclude wallet temporer).
 *
 * @param {Record<string, number>} balances - hasil dari computeBalances
 * @param {Array} wallets
 * @returns {number}
 */
export function computeTotalReal(balances, wallets) {
  let total = 0
  for (const w of wallets) {
    if (w.is_deleted) continue
    if (w.is_temporary) continue
    total += Number(balances[w.id] || 0)
  }
  return total
}

/**
 * Hitung total saldo semua wallet (real + temporer).
 * Berguna untuk keperluan debugging atau audit.
 */
export function computeTotalAll(balances) {
  return Object.values(balances).reduce((s, v) => s + Number(v || 0), 0)
}