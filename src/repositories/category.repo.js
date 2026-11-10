import { createRepo } from './base.repo'

const base = createRepo('categories')

export const categoryRepo = {
  ...base,

  async getActive() {
    return base.getAllActive()
  },

  async getByType(type) {
    return base.filterAll(c => c.type === type && !c.is_deleted)
  },

  async countActiveByUser(userId) {
    const rows = await base.filterAll(c => c.user_id === userId && !c.is_deleted)
    return rows.length
  }
}