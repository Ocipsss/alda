import { createRepo } from './base.repo'

const base = createRepo('transaction_splits')

export const transactionSplitRepo = {
  ...base,

  async getByTransaction(transactionId) {
    return base.whereBy('transaction_id', transactionId)
  },

  async getLoanSplits() {
    return base.filterAll(s => s.is_loan === true)
  },

  async softDeleteByTransaction(transactionId, now = new Date().toISOString()) {
    const rows = await this.getByTransaction(transactionId)
    for (const s of rows) {
      await base.update(s.id, { updated_at: now, _pending: true })
    }
    return rows
  }
}