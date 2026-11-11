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

  /**
   * Catat pemasukan biasa (tanpa pihak luar).
   */
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
   * Kalau ada payment dengan is_loan=true (dan bukan wallet utama),
   * otomatis dibuatkan debt internal dengan skema baru
   * (debtor_wallet_id = wallet talangan, creditor_wallet_id = wallet utama).
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
        // Split loan: wallet talangan berutang ke wallet utama
        // debtor = talangan (peminjam), creditor = primary (pemberi pinjam)
        const debtId = uid()
        debtRows.push({
          id: debtId,
          user_id: userId,
          type: DEBT_TYPE.UTANG,
          source: 'internal',
          party: primary.wallet_id,
          principal: Number(p.amount),
          remaining: Number(p.amount),
          debtor_wallet_id: p.wallet_id,
          creditor_wallet_id: primary.wallet_id,
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

  // ============ INCOME / EXPENSE WITH BORROWER (Pihak Luar) ============

  /**
   * Catat pemasukan dengan status PINJAM dari pihak luar.
   * Uang masuk ke wallet utama, tapi statusnya utang ke pihak luar.
   *
   * Contoh: pinjam Rp 100.000 dari Andi, uang masuk ke Cash.
   * - Income Rp 100.000 ke Cash
   * - Debt: debtor = Cash (kita berutang), creditor = wallet temporer Andi
   * - Wallet temporer Andi (type: 'creditor') dibuat otomatis
   *
   * @param {Object} p
   * @param {number} p.amount
   * @param {string} p.date
   * @param {string} p.wallet_id       - wallet penerima uang
   * @param {string} p.category_id
   * @param {string} p.note
   * @param {string} p.party_name      - nama pihak luar (e.g. "Andi")
   * @param {string} [p.due_date]
   * @param {string} p.userId
   */
  async createIncomeWithBorrower(
    { amount, date, wallet_id, category_id, note, party_name, due_date = null },
    userId
  ) {
    const now = new Date().toISOString()
    const txId = uid()
    const debtId = uid()

    // 1. Buat wallet temporer untuk pihak luar (atau reuse yang ada)
    const { walletService } = await import('./wallet.service')
    const tempWallet = await walletService.findOrCreateTemporary({
      name: party_name,
      type: 'creditor', // pihak luar meminjami kita
      userId
    })

    // 2. Buat transaksi income
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

    // 3. Buat debt internal
    // debtor = wallet utama (kita yang harus bayar)
    // creditor = wallet temporer (Andi yang meminjami)
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

  /**
   * Catat pengeluaran dengan status PIUTANG ke pihak luar.
   * Uang keluar dari wallet utama, tapi statusnya piutang ke pihak luar.
   *
   * Contoh: pinjamkan Rp 100.000 ke Andi, uang keluar dari Cash.
   * - Expense Rp 100.000 dari Cash
   * - Debt: debtor = wallet temporer Andi, creditor = Cash
   * - Wallet temporer Andi (type: 'debtor') dibuat otomatis
   *
   * @param {Object} p
   * @param {number} p.amount
   * @param {string} p.date
   * @param {string} p.wallet_id       - wallet sumber dana
   * @param {string} p.category_id
   * @param {string} p.note
   * @param {string} p.party_name      - nama pihak luar (e.g. "Andi")
   * @param {string} [p.due_date]
   * @param {string} p.userId
   */
  async createExpenseWithBorrower(
    { amount, date, wallet_id, category_id, note, party_name, due_date = null },
    userId
  ) {
    const now = new Date().toISOString()
    const txId = uid()
    const debtId = uid()

    // 1. Buat wallet temporer untuk pihak luar
    const { walletService } = await import('./wallet.service')
    const tempWallet = await walletService.findOrCreateTemporary({
      name: party_name,
      type: 'debtor', // pihak luar berutang ke kita
      userId
    })

    // 2. Buat transaksi expense
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

    // 3. Buat debt internal
    // debtor = wallet temporer (Andi yang berutang)
    // creditor = wallet utama (kita yang meminjami)
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

    // Cleanup wallet temporer yang mungkin orphan setelah debt dihapus
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