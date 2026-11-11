import { uid } from '../db'
import { walletRepo } from '../repositories'
import {
  DEFAULT_WALLET,
  DEFAULT_TEMPORARY_WALLET,
  TEMPORARY_TYPE,
  TEMPORARY_COLORS
} from '../constants/wallet'

export const walletService = {
  // ============ READ ============

  async list() {
    return walletRepo.getAll()
  },

  async listActive() {
    return walletRepo.getActive()
  },

  async getById(id) {
    return walletRepo.getById(id)
  },

  async listReal() {
    const all = await walletRepo.getActive()
    return all.filter(w => !w.is_temporary)
  },

  async listTemporary() {
    const all = await walletRepo.getActive()
    return all.filter(w => w.is_temporary === true)
  },

  // ============ SAVE (REAL WALLET) ============

  async save(payload, userId) {
    const now = new Date().toISOString()
    const existing = payload.id ? await walletRepo.getById(payload.id) : null

    const record = {
      id: existing?.id ?? uid(),
      user_id: userId,
      name: payload.name?.trim() || DEFAULT_WALLET.name,
      initial_balance: Number(payload.initial_balance ?? DEFAULT_WALLET.initial_balance),
      color: payload.color || DEFAULT_WALLET.color,
      icon: payload.icon || DEFAULT_WALLET.icon,
      is_temporary: false,
      temporary_type: null,
      is_deleted: false,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      _pending: true
    }

    await walletRepo.put(record)
    return record
  },

  // ============ SOFT DELETE ============

  async softDelete(id) {
    const existing = await walletRepo.getById(id)
    if (!existing) return null
    await walletRepo.softDelete(id)
    return id
  },

  // ============ TEMPORARY WALLET (Pihak Luar) ============

  /**
   * Bikin wallet temporer baru (selalu baru, tidak reuse).
   * Untuk reuse, pakai findOrCreateTemporary.
   *
   * @param {Object} p
   * @param {string} p.name
   * @param {'debtor'|'creditor'} p.type
   * @param {string} p.userId
   */
  async createTemporary({ name, type, userId }) {
    const trimmedName = String(name || '').trim()
    if (!trimmedName) {
      throw new Error('Nama pihak wajib diisi')
    }
    if (type !== TEMPORARY_TYPE.DEBTOR && type !== TEMPORARY_TYPE.CREDITOR) {
      throw new Error('Tipe wallet temporer tidak valid')
    }

    const now = new Date().toISOString()
    const record = {
      id: uid(),
      user_id: userId,
      name: trimmedName,
      initial_balance: 0,
      color: TEMPORARY_COLORS[type] || DEFAULT_TEMPORARY_WALLET.color,
      icon: 'User',
      is_temporary: true,
      temporary_type: type,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _pending: true
    }

    await walletRepo.put(record)
    return record
  },

  /**
   * Cari wallet temporer dengan nama & tipe yang sama.
   * Kalau ada, return yang lama (reuse). Kalau tidak ada, bikin baru.
   *
   * @param {Object} p
   * @param {string} p.name
   * @param {'debtor'|'creditor'} p.type
   * @param {string} p.userId
   */
  async findOrCreateTemporary({ name, type, userId }) {
    const trimmedName = String(name || '').trim()
    if (!trimmedName) {
      throw new Error('Nama pihak wajib diisi')
    }

    const allTemporary = await walletRepo.getActive()
    const existing = allTemporary.find(
      w =>
        w.is_temporary === true &&
        !w.is_deleted &&
        w.user_id === userId &&
        w.temporary_type === type &&
        w.name.toLowerCase() === trimmedName.toLowerCase()
    )

    if (existing) return existing

    return await this.createTemporary({ name: trimmedName, type, userId })
  },

  /**
   * Hapus wallet temporer kalau tidak ada debt aktif yang mengacu padanya.
   * Dipanggil setelah debt lunas / soft delete / edit.
   *
   * @param {string} walletId
   * @param {Array} debts - array of debt records (Dexie)
   * @returns {Promise<boolean>} true kalau wallet dihapus
   */
  async deleteTemporaryIfOrphan(walletId, debts = []) {
    if (!walletId) return false

    const wallet = await walletRepo.getById(walletId)
    if (!wallet) return false
    if (!wallet.is_temporary) return false
    if (wallet.is_deleted) return false

    // Cek apakah masih ada debt aktif yang mengacu pada wallet ini
    const hasActive = debts.some(
      d =>
        !d.is_deleted &&
        Number(d.remaining) > 0 &&
        (d.debtor_wallet_id === walletId || d.creditor_wallet_id === walletId)
    )

    if (hasActive) return false

    // Soft delete wallet karena tidak ada debt aktif
    await walletRepo.softDelete(walletId)
    return true
  }
}