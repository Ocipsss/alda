import { DEBT_TYPE } from '../constants/debt'

/**
 * Query utang/piutang terkait wallet tertentu.
 *
 * Setelah migration, semua debt punya:
 * - debtor_wallet_id: wallet peminjam
 * - creditor_wallet_id: wallet pemberi pinjam
 *
 * Contoh:
 * - Kita pinjam dari Andi 100k:
 *   debtor_wallet_id = Andi (kita berutang)
 *   creditor_wallet_id = Cash (kita yang terima uang)
 *
 * - Kita pinjamkan ke Andi 100k:
 *   debtor_wallet_id = Andi (dia berutang)
 *   creditor_wallet_id = Cash (kita sumber dana)
 *
 * @param {string} walletId
 * @param {{ debts: Array, wallets: Array }} data
 * @returns {{ utang: Array, piutang: Array, totalUtang: number, totalPiutang: number }}
 */
export function getWalletDebts(walletId, { debts = [], wallets = [] }) {
  const empty = { utang: [], piutang: [], totalUtang: 0, totalPiutang: 0 }
  if (!walletId) return empty

  const walletMap = new Map(wallets.map(w => [w.id, w]))

  const utang = []    // Wallet ini adalah DEBTOR (dia berutang ke pihak lain)
  const piutang = []  // Wallet ini adalah CREDITOR (pihak lain berutang ke dia)

  for (const d of debts) {
    if (d.is_deleted) continue
    if (Number(d.remaining) <= 0) continue

    const debtorId = d.debtor_wallet_id
    const creditorId = d.creditor_wallet_id
    if (!debtorId || !creditorId) continue

    if (debtorId === walletId) {
      // Wallet ini peminjam → utang ke creditor
      const creditor = walletMap.get(creditorId)
      utang.push({
        debt: d,
        counterpartId: creditorId,
        label: creditor?.name || 'Dompet',
        color: creditor?.color,
        icon: creditor?.icon,
        isTemporary: creditor?.is_temporary || false,
        type: DEBT_TYPE.UTANG,
        amount: Number(d.remaining),
        principal: Number(d.principal)
      })
    } else if (creditorId === walletId) {
      // Wallet ini pemberi pinjam → piutang dari debtor
      const debtor = walletMap.get(debtorId)
      piutang.push({
        debt: d,
        counterpartId: debtorId,
        label: debtor?.name || 'Dompet',
        color: debtor?.color,
        icon: debtor?.icon,
        isTemporary: debtor?.is_temporary || false,
        type: DEBT_TYPE.PIUTANG,
        amount: Number(d.remaining),
        principal: Number(d.principal)
      })
    }
  }

  // Sort dari nominal terbesar
  utang.sort((a, b) => b.amount - a.amount)
  piutang.sort((a, b) => b.amount - a.amount)

  const totalUtang = utang.reduce((s, i) => s + i.amount, 0)
  const totalPiutang = piutang.reduce((s, i) => s + i.amount, 0)

  return { utang, piutang, totalUtang, totalPiutang }
}

/**
 * Cek apakah wallet temporer punya debt aktif lain.
 * Dipakai untuk cleanup: hanya hapus wallet kalau tidak ada debt aktif.
 */
export function hasActiveDebt(walletId, debts = []) {
  return debts.some(d =>
    !d.is_deleted &&
    Number(d.remaining) > 0 &&
    (d.debtor_wallet_id === walletId || d.creditor_wallet_id === walletId)
  )
}