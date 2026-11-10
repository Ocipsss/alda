import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, uid, getMeta, setMeta } from '../db'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { computeBalances } from '../lib/balance'

export const useTransactionStore = defineStore('transaction', () => {
  const transactions = ref([])
  const splits = ref([])
  const debts = ref([])
  const debtPayments = ref([])
  const loading = ref(false)

  const activeTransactions = computed(() =>
    transactions.value
      .filter(t => !t.is_deleted)
      .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : b.updated_at > a.updated_at ? 1 : -1))
  )

  async function loadLocal() {
    loading.value = true
    try {
      const [txs, sps, dbs, dps] = await Promise.all([
        db.transactions.toArray(),
        db.transaction_splits.toArray(),
        db.debts.toArray(),
        db.debt_payments.toArray()
      ])
      transactions.value = txs
      splits.value = sps
      debts.value = dbs
      debtPayments.value = dps
    } finally {
      loading.value = false
    }
  }

  function balances(wallets) {
    return computeBalances({
      wallets,
      transactions: transactions.value,
      splits: splits.value,
      debts: debts.value,
      debtPayments: debtPayments.value
    })
  }

  // ---------- CRUD ----------

  async function createIncome({ amount, date, wallet_id, category_id, note }) {
    const auth = useAuthStore()
    const now = new Date().toISOString()
    const txId = uid()

    const tx = {
      id: txId,
      user_id: auth.user.id,
      type: 'income',
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

    await db.transactions.put(tx)
    await loadLocal()
    syncAll().catch(() => {})
    return tx
  }

  /**
   * Expense dengan dukungan multi-wallet split.
   * @param {Object} p
   * @param {number} p.amount          total pengeluaran
   * @param {string} p.date
   * @param {string} p.category_id
   * @param {string} [p.note]
   * @param {Array<{wallet_id, amount, is_loan}>} p.payments  minimal 1
   */
  async function createExpense({ amount, date, category_id, note, payments }) {
    const auth = useAuthStore()
    const now = new Date().toISOString()
    const txId = uid()
    const primary = payments[0]

    const tx = {
      id: txId,
      user_id: auth.user.id,
      type: 'expense',
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

    payments.forEach(p => {
      splitRows.push({
        id: uid(),
        transaction_id: txId,
        wallet_id: p.wallet_id,
        amount: Number(p.amount),
        is_loan: !!p.is_loan,
        linked_debt_id: p.is_loan ? null : null, // diisi setelah debt dibuat
        created_at: now,
        updated_at: now,
        _pending: true
      })

      if (p.is_loan) {
        // Wallet pembayar tambahan meminjam dari wallet utama
        const debtId = uid()
        debtRows.push({
          id: debtId,
          user_id: auth.user.id,
          type: 'utang', // pembayar meminjam → utang ke primary wallet
          party: primary.wallet_id, // wallet pemberi pinjaman
          source: 'internal',
          principal: Number(p.amount),
          remaining: Number(p.amount),
          counterpart_wallet_id: primary.wallet_id,
          is_deleted: false,
          created_at: now,
          updated_at: now,
          _pending: true
        })
        // link split ke debt
        splitRows[splitRows.length - 1].linked_debt_id = debtId
      }
    })

    await db.transaction('rw', db.transactions, db.transaction_splits, db.debts, async () => {
      await db.transactions.put(tx)
      await db.transaction_splits.bulkPut(splitRows)
      if (debtRows.length) await db.debts.bulkPut(debtRows)
    })

    await loadLocal()
    syncAll().catch(() => {})
    return { tx, splitRows, debtRows }
  }

  async function createTransfer({ amount, date, from_wallet_id, to_wallet_id, note }) {
    const auth = useAuthStore()
    const now = new Date().toISOString()
    const txId = uid()

    const tx = {
      id: txId,
      user_id: auth.user.id,
      type: 'transfer',
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

    await db.transactions.put(tx)
    await loadLocal()
    syncAll().catch(() => {})
    return tx
  }

  async function softDeleteTransaction(id) {
    const tx = await db.transactions.get(id)
    if (!tx) return
    const now = new Date().toISOString()

    await db.transaction('rw', db.transactions, db.transaction_splits, db.debts, async () => {
      await db.transactions.update(id, { is_deleted: true, updated_at: now, _pending: true })

      // Soft-delete splits & linked debts
      const relatedSplits = await db.transaction_splits.where({ transaction_id: id }).toArray()
      for (const s of relatedSplits) {
        await db.transaction_splits.update(s.id, { updated_at: now, _pending: true })
        if (s.linked_debt_id) {
          await db.debts.update(s.linked_debt_id, { is_deleted: true, updated_at: now, _pending: true })
        }
      }
    })

    await loadLocal()
    syncAll().catch(() => {})
  }

  // ---------- SYNC ----------
  async function syncAll() {
    const auth = useAuthStore()
    if (!auth.user || !navigator.onLine) return
    await Promise.all([
      syncTable('transactions'),
      syncTable('transaction_splits'),
      syncTable('debts')
    ])
    await loadLocal()
  }

  async function syncTable(name) {
    const localTable = db[name]
    const pending = await localTable.filter(r => !!r._pending).toArray()
    for (const r of pending) {
      const { _pending, ...row } = r
      const { error } = await supabase.from(name).upsert(row, { onConflict: 'id' })
      if (!error) await localTable.update(r.id, { _pending: false })
    }

    const metaKey = `${name}_sync_at`
    const last = (await getMeta(metaKey)) ?? '1970-01-01T00:00:00Z'
    const { data, error } = await supabase
      .from(name)
      .select('*')
      .gt('updated_at', last)
      .order('updated_at', { ascending: true })

    if (!error && data) {
      for (const remote of data) {
        const local = await localTable.get(remote.id)
        if (!local || new Date(remote.updated_at) >= new Date(local.updated_at)) {
          await localTable.put({ ...remote, _pending: false })
        }
      }
      const newest = data.at(-1)?.updated_at ?? last
      await setMeta(metaKey, newest)
    }
  }

  return {
    transactions, splits, debts, debtPayments, activeTransactions, loading,
    loadLocal, balances, createIncome, createExpense, createTransfer,
    softDeleteTransaction, syncAll
  }
})