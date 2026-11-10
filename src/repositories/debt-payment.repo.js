import { createRepo } from './base.repo'

const base = createRepo('debt_payments')

export const debtPaymentRepo = {
  ...base,

  async getByDebt(debtId) {
    const rows = await base.whereBy('debt_id', debtId)
    return rows
      .filter(p => !p.is_deleted)
      .sort((a, b) => (b.date > a.date ? 1 : -1))
  }
}