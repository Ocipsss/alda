import { createRepo } from './base.repo'

const base = createRepo('wallets')

export const walletRepo = {
  ...base,

  async getActive() {
    return base.getAllActive()
  },

  async getByUser(userId) {
    return base.filterAll(w => w.user_id === userId && !w.is_deleted)
  }
}