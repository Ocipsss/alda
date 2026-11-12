import { db, uid } from '../db'
import { transactionRepo } from '../repositories'
import { TX_TYPE } from '../constants/transaction'
import { DEBT_TYPE } from '../constants/debt'

export const transactionService = {
  // ============ READ ============

  async list() {
    return transactionRepo.getAll()
  },

  async listActive() {
    return transactionRepo.getActive()
  },

  async getById(id) {
    return transactionRepo.getById(id)
  },

  // ============ INCOME ============

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

  // ============ EXPENSE (multi-wallet + split loan) ============

  /**
   * Buat expense dengan dukungan split ke banyak wallet.
   *
   * Konvensi split loan:
   * - Wallet primary = wallet utama yang dipakai duluan
   * - Wallet talangan (is_loan=true) = wallet tambahan yang dipinjam
   * - PRIMARY yang meminjam dari talangan (karena primary butuh uang tambahan)
   * - Debt: debtor = primary (peminjam), creditor = talangan (pemberi pinjam)
   *
   * Contoh: expense 70k, primary D2 (saldo 50k), talangan D1 (20k, loan)
   * - D2 -= 50k, D1 -= 20k
   * - Debt: debtor = D2, creditor = D1, principal = 20k
   * - Artinya: D2 berutang 20k ke D1
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
        // ✅ FIX: PRIMARY yang berutang ke TALANGAN
        // primary = wallet utama (peminjam, karena butuh uang tambahan)
        // talangan = wallet tambahan (pemberi pinjam)
        const debtId = uid()
        debtRows.push({
          id: debtId,
          user_id: userId,
          type: DEBT_TYPE.UTANG,
          source: 'internal',
          party: p.wallet_id,                        // talangan = pihak yang dipinjami
          principal: Number(p.amount),
          remaining: Number(p.amount),
          debtor_wallet_id: primary.wallet_id,        // ← PRIMARY (peminjam)
          creditor_wallet_id: p.wallet_id,            // ← TALANGAN (pemberi)
          counterpart_wallet_id: p.wallet_id,
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

  // ============ TRANSFER ============

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

  // ============ INCOME WITH BORROWER (Pihak Luar) ============

  async createIncomeWithBorrower(
    { amount, date, wallet_id, category_id, note, party_name, due_date = null },
    userId
  ) {
    const now = new Date().toISOString()
    const txId = uid()
    const debtId = uid()

    const { walletService } = await import('./wallet.service')
    const tempWallet = await walletService.findOrCreateTemporary({
      name: party_name,
      type: 'creditor',
      userId
    })

    const tx = {
      id: txId,
      user_id: userId,
      type: TX_TYPE.INCOME,
      amount: Number(amount),
      date,
      wallet_id,
      to_wallet_id: null,
      category_id,
      note: note || `Pinjam: ${party_name}`,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _pending: true
    }

    // Kita pinjam dari Andi → kita (wallet_id) berutang ke Andi (tempWallet)
    // debtor = wallet kita (Cash), creditor = Andi temporer
    const debt = {
      id: debtId,
      user_id: userId,
      type: DEBT_TYPE.UTANG,
      source: 'internal',
      party: party_name,
      principal: Number(amount),
      remaining: Number(amount),
      debtor_wallet_id: wallet_id,
      creditor_wallet_id: tempWallet.id,
      counterpart_wallet_id: tempWallet.id,
      note: note || null,
      due_date,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _pending: true
    }

    await db.transaction(
      'rw',
      db.transactions,
      db.debts,
      async () => {
        await db.transactions.put(tx)
        await db.debts.put(debt)
      }
    )

    return { tx, debt, tempWallet }
  },

  // ============ EXPENSE WITH BORROWER (Pihak Luar) ============

  async createExpenseWithBorrower(
    { amount, date, wallet_id, category_id, note, party_name, due_date = null },
    userId
  ) {
    const now = new Date().toISOString()
    const txId = uid()
    const debtId = uid()

    const { walletService } = await import('./wallet.service')
    const tempWallet = await walletService.findOrCreateTemporary({
      name: party_name,
      type: 'debtor',
      userId
    })

    const tx = {
      id: txId,
      user_id: userId,
      type: TX_TYPE.EXPENSE,
      amount: Number(amount),
      date,
      wallet_id,
      to_wallet_id: null,
      category_id,
      note: note || `Piutang: ${party_name}`,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _pending: true
    }

    // Kita pinjamkan ke Andi → Andi (tempWallet) berutang ke kita (wallet_id)
    // debtor = Andi temporer, creditor = wallet kita (Cash)
    const debt = {
      id: debtId,
      user_id: userId,
      type: DEBT_TYPE.PIUTANG,
      source: 'internal',
      party: party_name,
      principal: Number(amount),
      remaining: Number(amount),
      debtor_wallet_id: tempWallet.id,
      creditor_wallet_id: wallet_id,
      counterpart_wallet_id: tempWallet.id,
      note: note || null,
      due_date,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _pending: true
    }

    await db.transaction(
      'rw',
      db.transactions,
      db.debts,
      async () => {
        await db.transactions.put(tx)
        await db.debts.put(debt)
      }
    )

    return { tx, debt, tempWallet }
  },

  // ============ SOFT DELETE ============

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

    const { debtService } = await import('./debt.service')
    const relatedDebts = await db.debts
      .filter(d => d.is_deleted && d.updated_at === now)
      .toArray()
    for (const d of relatedDebts) {
      try {
        await debtService._cleanupTemporaryWallets(d)
      } catch (e) {
        console.warn('[transactionService] cleanup failed:', e.message)
      }
    }

    return txId
  }
}