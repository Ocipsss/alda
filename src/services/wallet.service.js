import { uid } from '../db'
import { walletRepo } from '../repositories'
import { DEFAULT_WALLET } from '../constants/wallet'

export const walletService = {
  async list() {
    return walletRepo.getAll()
  },

  async listActive() {
    return walletRepo.getActive()
  },

  async getById(id) {
    return walletRepo.getById(id)
  },

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
      is_deleted: false,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      _pending: true
    }

    await walletRepo.put(record)
    return record
  },

  async softDelete(id) {
    const existing = await walletRepo.getById(id)
    if (!existing) return null
    await walletRepo.softDelete(id)
    return id
  }
}