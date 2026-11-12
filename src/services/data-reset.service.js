import { db } from '../db'
import { categoryService } from './category.service'

export const dataResetService = {
  /**
   * Hitung jumlah data yang akan dihapus (untuk preview di modal).
   */
  async countData(userId) {
    const [transactions, wallets, debts, debtPayments, categories] = await Promise.all([
      db.transactions.filter(t => !t.is_deleted && t.user_id === userId).count(),
      db.wallets.filter(w => !w.is_deleted && w.user_id === userId).count(),
      db.debts.filter(d => !d.is_deleted && d.user_id === userId).count(),
      db.debt_payments.filter(p => !p.is_deleted).count(),
      db.categories.filter(c => !c.is_deleted && c.user_id === userId).count()
    ])

    return { transactions, wallets, debts, debtPayments, categories }
  },

  /**
   * Reset transaksi: hapus semua transaksi, splits, debts, debt_payments
   * + wallet temporer yang orphan.
   * Wallet real & kategori DIPERTAHANKAN.
   */
  async resetTransactions(userId) {
    const now = new Date().toISOString()

    // 1. Soft delete semua transaksi milik user
    const txs = await db.transactions
      .filter(t => !t.is_deleted && t.user_id === userId)
      .toArray()
    for (const tx of txs) {
      await db.transactions.update(tx.id, {
        is_deleted: true,
        updated_at: now,
        _pending: true
      })
    }

    // 2. Soft delete semua transaction_splits
    const splitIds = new Set(txs.map(t => t.id))
    const splits = await db.transaction_splits.toArray()
    for (const s of splits) {
      if (splitIds.has(s.transaction_id)) {
        await db.transaction_splits.update(s.id, {
          updated_at: now,
          _pending: true
        })
      }
    }

    // 3. Soft delete semua debts
    const debts = await db.debts
      .filter(d => !d.is_deleted && d.user_id === userId)
      .toArray()
    for (const d of debts) {
      await db.debts.update(d.id, {
        is_deleted: true,
        updated_at: now,
        _pending: true
      })
    }

    // 4. Soft delete semua debt_payments terkait
    const debtIds = new Set(debts.map(d => d.id))
    const payments = await db.debt_payments.toArray()
    for (const p of payments) {
      if (debtIds.has(p.debt_id) && !p.is_deleted) {
        await db.debt_payments.update(p.id, {
          is_deleted: true,
          updated_at: now,
          _pending: true
        })
      }
    }

    // 5. Soft delete wallet temporer (karena debt-nya sudah tidak ada)
    const tempWallets = await db.wallets
      .filter(w => !w.is_deleted && w.user_id === userId && w.is_temporary === true)
      .toArray()
    for (const w of tempWallets) {
      await db.wallets.update(w.id, {
        is_deleted: true,
        updated_at: now,
        _pending: true
      })
    }

    return {
      transactions: txs.length,
      debts: debts.length,
      debtPayments: payments.length,
      tempWallets: tempWallets.length
    }
  },

  /**
   * Reset SEMUA data: transaksi + wallet + kategori + seed ulang default.
   */
  async resetAll(userId) {
    const now = new Date().toISOString()

    // 1. Reset transaksi & debt dulu
    await this.resetTransactions(userId)

    // 2. Soft delete semua wallet real (temporer sudah terhapus di resetTransactions)
    const wallets = await db.wallets
      .filter(w => !w.is_deleted && w.user_id === userId)
      .toArray()
    for (const w of wallets) {
      await db.wallets.update(w.id, {
        is_deleted: true,
        updated_at: now,
        _pending: true
      })
    }

    // 3. Soft delete semua kategori
    const categories = await db.categories
      .filter(c => !c.is_deleted && c.user_id === userId)
      .toArray()
    for (const c of categories) {
      await db.categories.update(c.id, {
        is_deleted: true,
        updated_at: now,
        _pending: true
      })
    }

    // 4. Seed ulang 8 kategori default
    await categoryService.seedDefaults(userId)

    return {
      wallets: wallets.length,
      categories: categories.length,
      seeded: true
    }
  }
}