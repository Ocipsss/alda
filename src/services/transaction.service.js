import { db, uid } from '../db'
import { transactionRepo, transactionSplitRepo, debtRepo } from '../repositories'
import { TX_TYPE } from '../constants/transaction'
import { DEBT_TYPE, DEBT_SOURCE } from '../constants/debt'

export const transactionService = {
  async list() {
    return transactionRepo.getAll()
  },

  async listActive() {
    return transactionRepo.getActive()
  },

  async getById(id) {
    return transactionRepo.getById(id)
  },

  // ---------- INCOME ----------

  async createIncome({ amount, date, wallet_id, category_id, note }, userId) {
    const now = new Date().toISOString()
    const tx = {
      id: uid(),
      user_id: userId,
      type: TX_TYPE.INCOME,
      amount: Number(amount),
      date,
      wallet_id,
      to_wallet_id: null,
      category_id,
      note: note || null,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _pending: true
    }
    await transactionRepo.put(tx)
    return tx
  },

  // ---------- EXPENSE (multi-wallet) ----------

  /**
   * Buat expense dengan dukungan split ke banyak wallet.
   * Jika ada payment dengan is_loan=true (dan bukan wallet utama),
   * otomatis dibuatkan debt internal yang mencatat pinjaman
   * dari wallet utama.
   *
   * @param {Object} params
   * @param {Array<{wallet_id, amount, is_loan}>} params.payments
   * @param {string} userId
   */
  async createExpense({ amount, date, category_id, note, payments }, userId) {
    const now = new Date().toISOString()
    const txId = uid()
    const primary = payments[0]

    const tx = {
      id: txId,
      user_id: userId,
      type: TX_TYPE.EXPENSE,
      amount: Number(amount),
      date,
      wallet_id: primary.wallet_id,
      to_wallet_id: null,
      category_id,
      note: note || null,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _pending: true
    }

    const splitRows = []
    const debtRows = []

    for (const p of payments) {
      const splitId = uid()
      const split = {
        id: splitId,
        transaction_id: txId,
        wallet_id: p.wallet_id,
        amount: Number(p.amount),
        is_loan: !!p.is_loan,
        linked_debt_id: null,
        created_at: now,
        updated_at: now,
        _pending: true
      }

      if (p.is_loan && p.wallet_id !== primary.wallet_id) {
        const debtId = uid()
        debtRows.push({
          id: debtId,
          user_id: userId,
          type: DEBT_TYPE.UTANG,
          party: primary.wallet_id,
          source: DEBT_SOURCE.INTERNAL,
          principal: Number(p.amount),
          remaining: Number(p.amount),
          counterpart_wallet_id: primary.wallet_id,
          note: 'Pembayaran patungan: ' + (note || ''),
          due_date: null,
          is_deleted: false,
          created_at: now,
          updated_at: now,
          _pending: true
        })
        split.linked_debt_id = debtId
      }

      splitRows.push(split)
    }

    // Atomik: tulis semua tabel sekaligus
    await db.transaction(
      'rw',
      db.transactions,
      db.transaction_splits,
      db.debts,
      async () => {
        await db.transactions.put(tx)
        await db.transaction_splits.bulkPut(splitRows)
        if (debtRows.length) await db.debts.bulkPut(debtRows)
      }
    )

    return { tx, splitRows, debtRows }
  },

  // ---------- TRANSFER ----------

  async createTransfer({ amount, date, from_wallet_id, to_wallet_id, note }, userId) {
    const now = new Date().toISOString()
    const tx = {
      id: uid(),
      user_id: userId,
      type: TX_TYPE.TRANSFER,
      amount: Number(amount),
      date,
      wallet_id: from_wallet_id,
      to_wallet_id,
      category_id: null,
      note: note || null,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _pending: true
    }
    await transactionRepo.put(tx)
    return tx
  },

  // ---------- SOFT DELETE ----------

  async softDelete(txId) {
    const tx = await transactionRepo.getById(txId)
    if (!tx) return null
    const now = new Date().toISOString()

    await db.transaction(
      'rw',
      db.transactions,
      db.transaction_splits,
      db.debts,
      async () => {
        await db.transactions.update(txId, {
          is_deleted: true,
          updated_at: now,
          _pending: true
        })

        const splits = await db.transaction_splits
          .where({ transaction_id: txId })
          .toArray()

        for (const s of splits) {
          await db.transaction_splits.update(s.id, {
            updated_at: now,
            _pending: true
          })
          if (s.linked_debt_id) {
            await db.debts.update(s.linked_debt_id, {
              is_deleted: true,
              updated_at: now,
              _pending: true
            })
          }
        }
      }
    )

    return txId
  }
}