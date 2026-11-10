import { createRepo } from './base.repo'

const base = createRepo('transactions')

export const transactionRepo = {
  ...base,

  async getActive() {
    return base.getAllActive()
  },

  async getByDateRange(from, to) {
    return base.filterAll(t =>
      !t.is_deleted && t.date >= from && t.date <= to
    )
  },

  async getByWallet(walletId) {
    return base.filterAll(t =>
      !t.is_deleted && (t.wallet_id === walletId || t.to_wallet_id === walletId)
    )
  }
}