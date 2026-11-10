import { createRepo } from './base.repo'

const base = createRepo('split_bill_members')

export const splitBillMemberRepo = {
  ...base,

  async getBySplitBill(splitBillId) {
    return base.whereBy('split_bill_id', splitBillId)
  },

  async getUnpaidBySplitBill(splitBillId) {
    const rows = await base.whereBy('split_bill_id', splitBillId)
    return rows.filter(m => !m.paid_status)
  },

  async markPaid(id, now = new Date().toISOString()) {
    return base.update(id, {
      paid_status: true,
      updated_at: now,
      _pending: true
    })
  }
}