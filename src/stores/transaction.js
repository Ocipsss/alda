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

  const activeDebts = computed(() =>
    debts.value
      .filter(d => !d.is_deleted)
      .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1))
  )

  const utangs = computed(() => activeDebts.value.filter(d => d.type === 'utang'))
  const piutangs = computed(() => activeDebts.value.filter(d => d.type === 'piutang'))

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

  // ---------- TRANSACTIONS ----------

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
        linked_debt_id: null,
        created_at: now,
        updated_at: now,
        _pending: true
      })

      if (p.is_loan && p.wallet_id !== primary.wallet_id) {
        const debtId = uid()
        debtRows.push({
          id: debtId,
          user_id: auth.user.id,
          type: 'utang',
          party: primary.wallet_id,
          source: 'internal',
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

  // ---------- DEBTS ----------

  async function createDebt({
    type, source, party, principal, wallet_id,
    counterpart_wallet_id = null, due_date = null, note = null, date
  }) {
    const auth = useAuthStore()
    const now = new Date().toISOString()
    const debtId = uid()

    const debt = {
      id: debtId,
      user_id: auth.user.id,
      type,
      source,
      party,
      principal: Number(principal),
      remaining: Number(principal),
      counterpart_wallet_id: source === 'internal' ? counterpart_wallet_id : wallet_id,
      note: note || null,
      due_date,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _pending: true
    }

    // Buat transaksi "opening" agar histori tercatat
    const txId = uid()
    const tx = {
      id: txId,
      user_id: auth.user.id,
      type: type === 'utang' ? 'income' : 'expense',
      amount: Number(principal),
      date: date || new Date().toISOString().slice(0, 10),
      wallet_id,
      to_wallet_id: null,
      category_id: null,
      note: (type === 'utang' ? 'Pinjam: ' : 'Piutang: ') + party + (note ? ' — ' + note : ''),
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _pending: true
    }

    await db.transaction('rw', db.debts, db.transactions, async () => {
      await db.debts.put(debt)
      await db.transactions.put(tx)
    })

    await loadLocal()
    syncAll().catch(() => {})
    return { debt, tx }
  }

  async function payDebt({ debt_id, wallet_id, amount, date, note = null }) {
    const auth = useAuthStore()
    const now = new Date().toISOString()
    const debt = await db.debts.get(debt_id)
    if (!debt) throw new Error('Debt tidak ditemukan')

    const payAmount = Math.min(Number(amount), Number(debt.remaining))
    const newRemaining = Number(debt.remaining) - payAmount

    const payment = {
      id: uid(),
      debt_id,
      wallet_id,
      amount: payAmount,
      date: date || new Date().toISOString().slice(0, 10),
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

    await loadLocal()
    syncAll().catch(() => {})
    return payment
  }

  async function softDeleteDebt(debtId) {
    const debt = await db.debts.get(debtId)
    if (!debt) return
    const now = new Date().toISOString()
    await db.debts.update(debtId, { is_deleted: true, updated_at: now, _pending: true })
    await loadLocal()
    syncAll().catch(() => {})
  }

  function paymentsOf(debtId) {
    return debtPayments.value
      .filter(p => p.debt_id === debtId && !p.is_deleted)
      .sort((a, b) => (b.date > a.date ? 1 : -1))
  }

  // ---------- SYNC ----------
  async function syncAll() {
    const auth = useAuthStore()
    if (!auth.user || !navigator.onLine) return
    await Promise.all([
      syncTable('transactions'),
      syncTable('transaction_splits'),
      syncTable('debts'),
      syncTable('debt_payments')
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
    transactions, splits, debts, debtPayments, loading,
    activeTransactions, activeDebts, utangs, piutangs,
    loadLocal, balances,
    createIncome, createExpense, createTransfer, softDeleteTransaction,
    createDebt, payDebt, softDeleteDebt, paymentsOf,
    syncAll
  }
})