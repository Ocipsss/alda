import { WALLET_COLORS } from '../constants/wallet'

/**
 * Tipe wallet temporer:
 * - debtor   = kita berutang ke pihak ini (uang masuk dulu, harus dibayar)
 * - creditor = pihak ini berutang ke kita (uang keluar dulu, harus ditagih)
 */
export const TEMPORARY_TYPE = {
  DEBTOR: 'debtor',
  CREDITOR: 'creditor'
}

/**
 * Warna default wallet temporer berdasarkan tipe.
 */
export const TEMPORARY_COLORS = {
  [TEMPORARY_TYPE.DEBTOR]: '#f97316',    // oranye = kita berutang
  [TEMPORARY_TYPE.CREDITOR]: '#10b981'   // hijau = dia berutang
}

/**
 * Bangun payload wallet temporer (belum disimpan ke DB).
 *
 * @param {Object} p
 * @param {string} p.name
 * @param {'debtor'|'creditor'} p.type
 * @returns {Object}
 */
export function buildTemporaryWalletPayload({ name, type }) {
  return {
    name: String(name || '').trim(),
    initial_balance: 0,
    color: TEMPORARY_COLORS[type] || WALLET_COLORS[0],
    icon: 'User',
    is_temporary: true,
    temporary_type: type
  }
}

/**
 * Cek apakah wallet adalah wallet temporer.
 */
export function isTemporaryWallet(wallet) {
  return wallet?.is_temporary === true
}

/**
 * Cek apakah wallet adalah wallet real (bukan temporer, tidak dihapus).
 */
export function isRealWallet(wallet) {
  return !!wallet && !wallet.is_temporary && !wallet.is_deleted
}

/**
 * Label untuk wallet temporer.
 * Return null kalau bukan temporer.
 */
export function temporaryLabel(wallet) {
  if (!isTemporaryWallet(wallet)) return null
  if (wallet.temporary_type === TEMPORARY_TYPE.DEBTOR) return 'Kita berutang'
  if (wallet.temporary_type === TEMPORARY_TYPE.CREDITOR) return 'Dia berutang'
  return 'Pihak Luar'
}

/**
 * Filter array wallet untuk hanya yang real.
 */
export function filterRealWallets(wallets) {
  return (wallets || []).filter(isRealWallet)
}

/**
 * Filter array wallet untuk hanya yang temporer.
 */
export function filterTemporaryWallets(wallets) {
  return (wallets || []).filter(w => isTemporaryWallet(w) && !w.is_deleted)
}