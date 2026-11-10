import { createRepo } from './base.repo'

const base = createRepo('debts')

export const debtRepo = {
  ...base,

  async getActive() {
    return base.getAllActive()
  },

  async getByType(type) {
    return base.filterAll(d => d.type === type && !d.is_deleted)
  },

  async getBySource(source) {
    return base.filterAll(d => d.source === source && !d.is_deleted)
  },

  async decrementRemaining(id, amount, now = new Date().toISOString()) {
    const debt = await base.getById(id)
    if (!debt) return null
    const newRemaining = Math.max(0, Number(debt.remaining) - Number(amount))
    await base.update(id, {
      remaining: newRemaining,
      updated_at: now,
      _pending: true
    })
    return newRemaining
  }
}