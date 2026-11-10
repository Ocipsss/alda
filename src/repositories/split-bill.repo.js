import { createRepo } from './base.repo'

const base = createRepo('split_bills')

export const splitBillRepo = {
  ...base,

  async getActive() {
    return base.getAllActive()
  },

  async getByTransaction(transactionId) {
    return base.filterAll(s => s.transaction_id === transactionId && !s.is_deleted)
  }
}