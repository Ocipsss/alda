import { db, uid } from '../db'
import { debtRepo, debtPaymentRepo } from '../repositories'
import { DEBT_TYPE } from '../constants/debt'
import { TX_TYPE } from '../constants/transaction'
import { formatDateISO } from '../lib/format'
import { walletService } from './wallet.service'

export const debtService = {
  // ============ READ ============

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

  // ============ CREATE ============

  /**
   * Buat debt internal dengan arah eksplisit (debtor → creditor).
   * Otomatis membuat opening transaction untuk histori.
   *
   * @param {Object} p
   * @param {'utang'|'piutang'} p.type
   * @param {string} p.debtor_wallet_id   - wallet peminjam
   * @param {string} p.creditor_wallet_id - wallet pemberi pinjam
   * @param {number} p.principal
   * @param {string} [p.due_date]
   * @param {string} [p.note]
   * @param {string} [p.date]
   * @param {string} p.userId
   */
  async create(
    {
      type,
      debtor_wallet_id,
      creditor_wallet_id,
      principal,
      due_date = null,
      note = null,
      date
    },
    userId
  ) {
    if (!debtor_wallet_id || !creditor_wallet_id) {
      throw new Error('debtor_wallet_id & creditor_wallet_id wajib diisi')
    }
    if (debtor_wallet_id === creditor_wallet_id) {
      throw new Error('Debtor & creditor tidak boleh sama')
    }

    const now = new Date().toISOString()
    const debtId = uid()

    // Ambil nama pihak untuk party string (backward compatibility)
    const creditor = await walletService.getById(creditor_wallet_id)
    const debtor = await walletService.getById(debtor_wallet_id)
    const party = type === DEBT_TYPE.UTANG
      ? (creditor?.name || 'Dompet')
      : (debtor?.name || 'Dompet')

    const debt = {
      id: debtId,
      user_id: userId,
      type,
      source: 'internal',
      party,
      principal: Number(principal),
      remaining: Number(principal),
      debtor_wallet_id,
      creditor_wallet_id,
      counterpart_wallet_id: type === DEBT_TYPE.UTANG
        ? creditor_wallet_id
        : debtor_wallet_id,
      note: note || null,
      due_date,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _pending: true
    }

    // Opening transaction:
    // - Utang (pinjam): uang masuk ke debtor wallet → income
    // - Piutang (pinjamkan): uang keluar dari creditor wallet → expense
    const txId = uid()
    const tx = {
      id: txId,
      user_id: userId,
      type: type === DEBT_TYPE.UTANG ? TX_TYPE.INCOME : TX_TYPE.EXPENSE,
      amount: Number(principal),
      date: date || formatDateISO(),
      wallet_id: type === DEBT_TYPE.UTANG ? debtor_wallet_id : creditor_wallet_id,
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
   * Catat pinjaman dari PIHAK LUAR (eksternal).
   * Otomatis bikin wallet temporer + debt internal + opening transaction.
   *
   * @param {Object} p
   * @param {string} p.party          - nama pihak luar
   * @param {number} p.principal
   * @param {string} p.wallet_id      - wallet yang terima uang (Cash)
   * @param {'utang'|'piutang'} p.type
   * @param {string} [p.due_date]
   * @param {string} [p.note]
   * @param {string} [p.date]
   * @param {string} p.userId
   */
  async createWithExternalParty(
    {
      party,
      principal,
      wallet_id,
      type,
      due_date = null,
      note = null,
      date
    },
    userId
  ) {
    if (!party?.trim()) throw new Error('Nama pihak wajib diisi')
    if (!wallet_id) throw new Error('Wallet wajib dipilih')

    // Tentukan arah berdasarkan tipe:
    // - Utang (kita pinjam): debtor = wallet temporer (pihak luar), creditor = wallet kita
    // - Piutang (kita pinjamkan): debtor = wallet temporer, creditor = wallet kita
    // Sama-sama wallet temporer sebagai debtor? BUKAN.
    //
    // Koreksi:
    // - Utang → kita berutang ke pihak luar.
    //   debtor = wallet KITA (Cash), creditor = wallet temporer (Andi)
    //   Karena kita yang harus bayar ke Andi
    //
    // - Piutang → pihak luar berutang ke kita.
    //   debtor = wallet temporer (Andi), creditor = wallet KITA (Cash)
    //   Karena Andi yang harus bayar ke kita

    const temporaryType = type === DEBT_TYPE.UTANG
      ? 'creditor'   // Andi = pihak yang akan kita bayar (kita berutang ke dia)
      : 'debtor'     // Andi = pihak yang berutang ke kita

    const tempWallet = await walletService.findOrCreateTemporary({
      name: party,
      type: temporaryType,
      userId
    })

    const debtor_wallet_id = type === DEBT_TYPE.UTANG ? wallet_id : tempWallet.id
    const creditor_wallet_id = type === DEBT_TYPE.UTANG ? tempWallet.id : wallet_id

    return await this.create(
      {
        type,
        debtor_wallet_id,
        creditor_wallet_id,
        principal,
        due_date,
        note,
        date
      },
      userId
    )
  },

  // ============ PAY ============

  /**
   * Catat pelunasan (cicilan / lunas).
   * Setelah update remaining, cek apakah wallet temporer perlu dihapus.
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

    // Cleanup: kalau debt lunas, cek wallet temporer yang terlibat
    if (newRemaining <= 0.01) {
      await this._cleanupTemporaryWallets(debt)
    }

    return payment
  },

  // ============ SOFT DELETE ============

  async softDelete(debtId) {
    const existing = await debtRepo.getById(debtId)
    if (!existing) return null

    await debtRepo.softDelete(debtId)

    // Cleanup wallet temporer setelah debt dihapus
    await this._cleanupTemporaryWallets(existing)

    return debtId
  },

  // ============ CLEANUP HELPER (private) ============

  /**
   * Cek apakah wallet temporer yang terlibat di debt masih punya
   * debt aktif lain. Kalau tidak, hapus.
   */
  async _cleanupTemporaryWallets(debt) {
    const allDebts = await debtRepo.getAll()
    const walletIds = new Set()

    if (debt.debtor_wallet_id) walletIds.add(debt.debtor_wallet_id)
    if (debt.creditor_wallet_id) walletIds.add(debt.creditor_wallet_id)

    for (const walletId of walletIds) {
      try {
        await walletService.deleteTemporaryIfOrphan(walletId, allDebts)
      } catch (e) {
        console.warn('[debtService] cleanup wallet failed:', walletId, e.message)
      }
    }
  }
}