import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  transactionRepo,
  transactionSplitRepo,
  debtRepo,
  debtPaymentRepo
} from '../repositories'
import { transactionService, debtService } from '../services'
import { syncMany } from '../lib/sync-engine'
import { useAuthStore } from './auth'
import { computeBalances } from '../lib/balance'

export const useTransactionStore = defineStore('transaction', () => {
  const transactions = ref([])
  const splits = ref([])
  const debts = ref([])
  const debtPayments = ref([])
  const loading = ref(false)

  // ============ COMPUTED ============

  const activeTransactions = computed(() =>
    transactions.value
      .filter(t => !t.is_deleted)
      .sort((a, b) =>
        b.date > a.date ? 1 : b.date < a.date ? -1 : b.updated_at > a.updated_at ? 1 : -1
      )
  )

  const activeDebts = computed(() =>
    debts.value
      .filter(d => !d.is_deleted)
      .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1))
  )

  const utangs = computed(() =>
    activeDebts.value.filter(d => d.type === 'utang')
  )
  const piutangs = computed(() =>
    activeDebts.value.filter(d => d.type === 'piutang')
  )

  // ============ LOAD LOCAL ============

  async function loadLocal() {
    loading.value = true
    try {
      const [txs, sps, dbs, dps] = await Promise.all([
        transactionRepo.getAll(),
        transactionSplitRepo.getAll(),
        debtRepo.getAll(),
        debtPaymentRepo.getAll()
      ])
      transactions.value = txs
      splits.value = sps
      debts.value = dbs
      debtPayments.value = dps
    } finally {
      loading.value = false
    }
  }

  // ============ BALANCES ============

  /**
   * Hitung saldo per wallet. Wrapper ke computeBalances.
   */
  function balances(wallets) {
    return computeBalances({
      wallets,
      transactions: transactions.value,
      splits: splits.value,
      debts: debts.value,
      debtPayments: debtPayments.value
    })
  }

  // ============ TRANSACTIONS ============

  async function createIncome(payload) {
    const auth = useAuthStore()
    const tx = await transactionService.createIncome(payload, auth.user.id)
    await loadLocal()
    syncAll().catch(() => {})
    return tx
  }

  async function createExpense(payload) {
    const auth = useAuthStore()
    const result = await transactionService.createExpense(payload, auth.user.id)
    await loadLocal()
    syncAll().catch(() => {})
    return result
  }

  async function createTransfer(payload) {
    const auth = useAuthStore()
    const tx = await transactionService.createTransfer(payload, auth.user.id)
    await loadLocal()
    syncAll().catch(() => {})
    return tx
  }

  /**
   * Income dengan status PINJAM dari pihak luar.
   * Auto-create wallet temporer + debt.
   */
  async function createIncomeWithBorrower(payload) {
    const auth = useAuthStore()
    const result = await transactionService.createIncomeWithBorrower(
      payload,
      auth.user.id
    )
    await loadLocal()
    syncAll().catch(() => {})
    return result
  }

  /**
   * Expense dengan status PIUTANG ke pihak luar.
   * Auto-create wallet temporer + debt.
   */
  async function createExpenseWithBorrower(payload) {
    const auth = useAuthStore()
    const result = await transactionService.createExpenseWithBorrower(
      payload,
      auth.user.id
    )
    await loadLocal()
    syncAll().catch(() => {})
    return result
  }

  async function softDeleteTransaction(id) {
    const deleted = await transactionService.softDelete(id)
    if (!deleted) return
    await loadLocal()
    syncAll().catch(() => {})
  }

  // ============ DEBTS ============

  /**
   * Buat debt internal (debtor → creditor).
   * Dipakai untuk pinjaman antar wallet internal.
   */
  async function createDebt(payload) {
    const auth = useAuthStore()
    const result = await debtService.create(payload, auth.user.id)
    await loadLocal()
    syncAll().catch(() => {})
    return result
  }

  /**
   * Buat debt dengan pihak luar (auto-create wallet temporer).
   */
  async function createDebtWithExternalParty(payload) {
    const auth = useAuthStore()
    const result = await debtService.createWithExternalParty(
      payload,
      auth.user.id
    )
    await loadLocal()
    syncAll().catch(() => {})
    return result
  }

  async function payDebt(payload) {
    const payment = await debtService.pay(payload)
    await loadLocal()
    syncAll().catch(() => {})
    return payment
  }

  async function softDeleteDebt(debtId) {
    const deleted = await debtService.softDelete(debtId)
    if (!deleted) return
    await loadLocal()
    syncAll().catch(() => {})
  }

  /**
   * Ambil payments untuk debt tertentu.
   */
  function paymentsOf(debtId) {
    return debtPayments.value
      .filter(p => p.debt_id === debtId && !p.is_deleted)
      .sort((a, b) => (b.date > a.date ? 1 : -1))
  }

  // ============ HELPERS ============

  /**
   * Ambil debts untuk wallet tertentu (via debtor/creditor).
   */
  function debtsOfWallet(walletId) {
    return activeDebts.value.filter(
      d =>
        Number(d.remaining) > 0 &&
        (d.debtor_wallet_id === walletId || d.creditor_wallet_id === walletId)
    )
  }

  // ============ SYNC ============

  async function syncAll() {
    const auth = useAuthStore()
    if (!auth.user) return
    await syncMany([
      'transactions',
      'transaction_splits',
      'debts',
      'debt_payments'
    ])
    await loadLocal()
  }

  // ============ RETURN ============

  return {
    // State
    transactions,
    splits,
    debts,
    debtPayments,
    loading,

    // Computed
    activeTransactions,
    activeDebts,
    utangs,
    piutangs,

    // Load
    loadLocal,

    // Balances
    balances,

    // Transactions
    createIncome,
    createExpense,
    createTransfer,
    createIncomeWithBorrower,
    createExpenseWithBorrower,
    softDeleteTransaction,

    // Debts
    createDebt,
    createDebtWithExternalParty,
    payDebt,
    softDeleteDebt,
    paymentsOf,

    // Helpers
    debtsOfWallet,

    // Sync
    syncAll
  }
})