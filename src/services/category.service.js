import { uid } from '../db'
import { categoryRepo } from '../repositories'
import { DEFAULT_CATEGORIES } from '../constants/category'

export const categoryService = {
  async list() {
    return categoryRepo.getAll()
  },

  async listActive() {
    return categoryRepo.getActive()
  },

  async listByType(type) {
    return categoryRepo.getByType(type)
  },

  /**
   * Seed kategori default untuk user baru.
   * Return true kalau seeding dilakukan, false kalau sudah ada.
   */
  async seedDefaults(userId) {
    const count = await categoryRepo.countActiveByUser(userId)
    if (count > 0) return false

    const now = new Date().toISOString()
    const rows = DEFAULT_CATEGORIES.map(c => ({
      id: uid(),
      user_id: userId,
      name: c.name,
      type: c.type,
      icon: c.icon,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _pending: true
    }))

    await categoryRepo.bulkPut(rows)
    return true
  },

  async save(payload, userId) {
    const now = new Date().toISOString()
    const existing = payload.id ? await categoryRepo.getById(payload.id) : null

    const record = {
      id: existing?.id ?? uid(),
      user_id: userId,
      name: payload.name?.trim(),
      type: payload.type,
      icon: payload.icon || 'Tag',
      is_deleted: false,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      _pending: true
    }

    await categoryRepo.put(record)
    return record
  },

  async softDelete(id) {
    const existing = await categoryRepo.getById(id)
    if (!existing) return null
    await categoryRepo.softDelete(id)
    return id
  }
}