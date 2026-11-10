import { db, uid } from '../db'
import { debtRepo, debtPaymentRepo, transactionRepo } from '../repositories'
import { DEBT_TYPE, DEBT_SOURCE } from '../constants/debt'
import { TX_TYPE } from '../constants/transaction'
import { formatDateISO } from '../lib/format'

export const debtService = {
  async list() {
    return debtRepo.getAll()
  },

  async listActive() {
    return debtRepo.getActive()
  },

  async listByType(type) {
    return debtRepo.getByType(type)
  },

  async getById(id) {
    return debtRepo.getById(id)
  },

  async listPayments(debtId) {
    return debtPaymentRepo.getByDebt(debtId)
  },

  /**
   * Buat catatan pinjaman baru (eksternal / internal).
   * Otomatis membuat transaksi "opening" agar histori tetap tercatat.
   */
  async create(
    { type, source, party, principal, wallet_id, counterpart_wallet_id = null, due_date = null, note = null, date },
    userId
  ) {
    const now = new Date().toISOString()
    const debtId = uid()

    const debt = {
      id: debtId,
      user_id: userId,
      type,
      source,
      party,
      principal: Number(principal),
      remaining: Number(principal),
      counterpart_wallet_id: source === DEBT_SOURCE.INTERNAL ? counterpart_wallet_id : wallet_id,
      note: note || null,
      due_date,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _pending: true
    }

    const txId = uid()
    const tx = {
      id: txId,
      user_id: userId,
      type: type === DEBT_TYPE.UTANG ? TX_TYPE.INCOME : TX_TYPE.EXPENSE,
      amount: Number(principal),
      date: date || formatDateISO(),
      wallet_id,
      to_wallet_id: null,
      category_id: null,
      note:
        (type === DEBT_TYPE.UTANG ? 'Pinjam: ' : 'Piutang: ') +
        party +
        (note ? ' — ' + note : ''),
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _pending: true
    }

    await db.transaction('rw', db.debts, db.transactions, async () => {
      await db.debts.put(debt)
      await db.transactions.put(tx)
    })

    return { debt, tx }
  },

  /**
   * Catat pelunasan (cicilan / lunas).
   * @param {Object} params
   * @param {string} params.debt_id
   * @param {string} params.wallet_id
   * @param {number} params.amount
   * @param {string} [params.date]
   * @param {string} [params.note]
   */
  async pay({ debt_id, wallet_id, amount, date, note = null }) {
    const now = new Date().toISOString()
    const debt = await debtRepo.getById(debt_id)
    if (!debt) throw new Error('Debt tidak ditemukan')

    const payAmount = Math.min(Number(amount), Number(debt.remaining))
    const newRemaining = Number(debt.remaining) - payAmount

    const payment = {
      id: uid(),
      debt_id,
      wallet_id,
      amount: payAmount,
      date: date || formatDateISO(),
      note: note || null,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _pending: true
    }

    await db.transaction('rw', db.debt_payments, db.debts, async () => {
      await db.debt_payments.put(payment)
      await db.debts.update(debt_id, {
        remaining: newRemaining,
        updated_at: now,
        _pending: true
      })
    })

    return payment
  },

  async softDelete(debtId) {
    const existing = await debtRepo.getById(debtId)
    if (!existing) return null
    await debtRepo.softDelete(debtId)
    return debtId
  }
}