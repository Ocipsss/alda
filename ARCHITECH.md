---

📄 ARCHITECTURE.md — Full Update

Berikut full code hasil update. Perubahan besar:

· Struktur folder — tambah Wallets, WalletDetail, WalletDebtInfo, ResetDataModal, data-reset.service, wallet-temporary, wallet-debt, settings/, remove split-bill/
· Constants — 8 kategori default (bukan 13) + temporary wallet constants
· Models — explain wallet-temporary model, debtor/creditor
· Balance — update rumus (debt creation tidak ubah saldo)
· Auth — auth hardening
· Testing — tambah reset & temporary wallet tests
· Section baru — 7.8 Wallet Temporary Model, 13.11 Reset Data

```markdown
# Alda — Architecture & Technical Documentation

> **Dokumen ini menjelaskan detail teknis Alda.**
> Untuk visi produk & definisi fitur, baca `CONCEPT.md`.
> Untuk panduan setup developer, baca `README.md`.

---

## 1. Ringkasan Arsitektur

Alda adalah PWA (Progressive Web App) **offline-first** yang menggabungkan:

- **Vue 3 (Composition API)** — frontend reaktif
- **Pinia** — state management global
- **Dexie.js (IndexedDB)** — database lokal utama
- **Supabase (PostgreSQL + Auth + RLS)** — backend cloud
- **vite-plugin-pwa (Workbox)** — service worker & caching
- **Tailwind CSS v4** + **Lucide Icons** — styling & ikon

**Filosofi:** semua operasi tulis/read di proses **Dexie dulu** (instan), lalu di-sync ke Supabase di background. UI tidak pernah menunggu server.

```text
┌──────────────────────────────────────────────────────────┐
│                    VUE COMPONENTS                         │
│  (views/, components/, modal-driven, one-handed friendly) │
└───────────────────────────┬──────────────────────────────┘
                            │ user action
                            ▼
┌──────────────────────────────────────────────────────────┐
│                    PINIA STORES                           │
│  (stores/*.js — state global, computed, actions)          │
└───────────────────────────┬──────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│     SERVICES             │  │     REPOSITORIES         │
│  (business logic,        │  │  (query Dexie, CRUD)     │
│   orchestration,         │  │                          │
│   atomic db.transaction) │  │                          │
└────────────┬─────────────┘  └───────────┬──────────────┘
             │                            │
             └─────────────┬──────────────┘
                           ▼
┌──────────────────────────────────────────────────────────┐
│                    DEXIE.JS (IndexedDB)                   │
│  (transactions, splits, debts, debts_payments, wallets,  │
│   categories, sync_meta)                                  │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                  SYNC ENGINE (background)                 │
│  (lib/sync-engine.js — push pending + pull remote)       │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                    SUPABASE (Cloud)                       │
│  (PostgreSQL + RLS — auth.uid() = user_id)              │
└──────────────────────────────────────────────────────────┘
```

---

2. Struktur Folder

```text
src/
├── App.vue                        # Root — panggil useAutoSync() + BottomNav conditional
├── main.js                        # Bootstrap — guard sebelum router + registerSW
├── style.css                      # Tailwind v4 + tema
│
├── assets/                        # Static assets Vue
│
├── components/                    # UI Components
│   ├── ui/                        # Base UI primitives
│   │   ├── BaseModal.vue          # Bottom-sheet modal
│   │   ├── BaseButton.vue         # Button variants
│   │   ├── ColorPicker.vue        # Palet warna dompet
│   │   ├── IconPicker.vue         # Picker ikon Lucide
│   │   ├── WalletSelect.vue       # Select dompet (filter temporer)
│   │   ├── CategorySelect.vue     # Kategori picker (button + modal)
│   │   └── CategoryPickerModal.vue # Modal grid kategori
│   ├── layout/
│   │   ├── BottomNav.vue          # Bottom navigation (Beranda/Transaksi/Dompet/Setting)
│   │   └── FabMenu.vue            # FAB speed-dial
│   ├── wallet/                    # Wallet-related
│   │   ├── WalletCard.vue
│   │   ├── WalletFormModal.vue
│   │   └── WalletDebtInfo.vue     # Section utang/piutang per wallet
│   ├── category/                  # Category-related
│   │   ├── CategoryItem.vue
│   │   └── CategoryFormModal.vue
│   ├── transaction/               # Transaction-related
│   │   ├── IncomeModal.vue        # + checkbox 'pinjam dari pihak luar'
│   │   ├── ExpenseModal.vue       # Multi-wallet + talangan + checkbox 'piutang'
│   │   ├── TransferModal.vue
│   │   ├── TransactionItem.vue
│   │   ├── TransactionDetailModal.vue
│   │   └── TransactionFilterModal.vue
│   ├── debt/                      # Debt-related
│   │   ├── DebtFormModal.vue      # Mode external / internal
│   │   └── DebtPaymentModal.vue
│   ├── report/                    # Report-related
│   │   ├── MonthPicker.vue
│   │   └── BarChart.vue           # Pure CSS horizontal bar
│   └── settings/                  # Settings-related
│       └── ResetDataModal.vue     # Reset data dengan konfirmasi typed text
│
├── composables/                   # Vue composables
│   └── useAutoSync.js             # Global sync lifecycle + watch auth state
│
├── constants/                     # Domain constants
│   ├── app.js                     # APP_NAME, CURRENCY, LOCALE
│   ├── transaction.js             # TX_TYPE, TX_TYPE_LABEL, TX_TYPE_COLOR
│   ├── debt.js                    # DEBT_TYPE, DEBT_SOURCE, LABELS
│   ├── wallet.js                  # WALLET_COLORS, CURATED_WALLET_ICONS, TEMPORARY_TYPE
│   ├── category.js                # DEFAULT_CATEGORIES (8 kategori)
│   ├── sync.js                    # SYNC_INTERVAL_MS, SYNC_TABLES, dsb
│   └── index.js                   # Barrel export
│
├── db/                            # Dexie setup
│   ├── index.js                   # Schema + helper (getMeta, setMeta, uid)
│   └── seed.js                    # Wrapper seedCategories
│
├── lib/                           # Pure utilities
│   ├── supabase.js                # Supabase client
│   ├── balance.js                 # computeBalances, computeTotalReal
│   ├── format.js                  # formatCurrency, formatDate, formatDateISO
│   ├── sync-engine.js             # Unified sync (push + pull + retry)
│   ├── filter.js                  # Filter & summarize transaksi
│   ├── csv.js                     # Generate & download CSV
│   ├── report.js                  # Monthly report compute
│   ├── wallet-temporary.js        # Helper wallet temporer
│   └── wallet-debt.js             # Query utang/piutang per wallet
│
├── repositories/                  # Data access layer (Dexie only)
│   ├── base.repo.js               # createRepo factory
│   ├── wallet.repo.js
│   ├── category.repo.js
│   ├── transaction.repo.js
│   ├── transaction-split.repo.js
│   ├── debt.repo.js
│   ├── debt-payment.repo.js
│   ├── split-bill.repo.js
│   ├── split-bill-member.repo.js
│   └── index.js                   # Barrel export
│
├── services/                      # Business logic layer
│   ├── wallet.service.js          # save, softDelete, createTemporary, findOrCreateTemporary
│   ├── category.service.js        # save, softDelete, seedDefaults
│   ├── transaction.service.js     # createIncome, createExpense (split loan),
│   │                              #   createIncomeWithBorrower, createExpenseWithBorrower
│   ├── debt.service.js            # create (internal), createWithExternalParty, pay, softDelete
│   ├── data-reset.service.js      # resetTransactions, resetAll, countData
│   └── index.js                   # Barrel export
│
├── stores/                        # Pinia stores
│   ├── auth.js                    # Session, signIn, signUp, signOut, auth hardening
│   ├── wallet.js                  # wallets, realWallets, temporaryWallets
│   ├── category.js                # categories, income/expense split
│   └── transaction.js             # transactions, splits, debts, balances
│
├── router/
│   └── index.js                   # Vue Router + auth guard
│
└── views/                         # Page-level components
    ├── Login.vue                  # + password toggle, error detail
    ├── Dashboard.vue              # Ringkasan, wallet list, recent transactions
    ├── Wallets.vue                # List dompet + Pihak Luar section
    ├── WalletDetail.vue           # Detail per dompet + utang/piutang + transaksi
    ├── Debts.vue                  # Utang/piutang (internal & eksternal)
    ├── Categories.vue             # CRUD kategori
    ├── SplitBills.vue             # History split payment (read-only)
    ├── Transactions.vue           # Full history + filter + export CSV
    ├── Reports.vue                # Laporan bulanan (3 tab)
    └── Settings.vue               # Menu settings + reset data
```

---

3. Layer Arsitektur (Separation of Concerns)

Setiap layer punya tanggung jawab tunggal. Alur pemanggilan selalu satu arah:

```text
View → Store → Service → Repository → Dexie
                ↓
        (atau langsung ke Repo jika query sederhana)
```

3.1 Constants (src/constants/)

Tanggung jawab: Menyimpan nilai statis yang dipakai di banyak tempat.

Contoh:

· TX_TYPE.INCOME = 'income' — dipakai di service, store, component
· WALLET_COLORS — array 16 warna untuk picker
· CURATED_WALLET_ICONS — 46 nama ikon Lucide
· TEMPORARY_TYPE.DEBTOR / CREDITOR — tipe wallet temporer
· TEMPORARY_COLORS — warna wallet temporer (oranye/hijau)
· DEFAULT_CATEGORIES — 8 kategori seed (3 income, 5 expense)
· SYNC_INTERVAL_MS = 30_000 — interval auto-sync

Aturan:

· ✅ Boleh import ke mana saja
· ❌ Tidak boleh import dari layer lain
· ❌ Tidak boleh ada logic/function

3.2 Lib (src/lib/)

Tanggung jawab: Fungsi murni (pure functions) & utility yang tidak terkait state atau database.

File Isi
supabase.js Supabase client singleton
balance.js computeBalances(), computeTotalReal()
format.js formatCurrency(), formatDate(), formatDateISO()
sync-engine.js syncTable(), syncMany(), syncTableWithRetry()
filter.js applyFilter(), summarize(), defaultFilter(), preset date ranges
csv.js generateCSV(), downloadCSV(), exportTransactionsCSV()
report.js computeMonthlyReport(), getAvailableMonths(), monthLabel()
wallet-temporary.js buildTemporaryWalletPayload(), isTemporaryWallet(), isRealWallet(), temporaryLabel()
wallet-debt.js getWalletDebts(), hasActiveDebt()

Aturan:

· ✅ Boleh import constants
· ✅ Boleh import db (untuk sync-engine)
· ❌ Tidak boleh import Pinia store
· ❌ Tidak boleh import component

3.3 Repositories (src/repositories/)

Tanggung jawab: Akses data murni ke Dexie. Tidak ada business logic.

Pola createRepo(tableName) menghasilkan methods standar:

```js
repo.getAll()          // semua row
repo.getAllActive()    // filter !is_deleted
repo.getById(id)       // get satu row
repo.getPending()      // filter _pending === true (untuk sync)
repo.put(row)          // insert/update
repo.bulkPut(rows)
repo.update(id, obj)
repo.softDelete(id)    // set is_deleted = true + _pending
repo.whereBy(idx, val) // Dexie where()
repo.filterAll(fn)     // Dexie filter()
```

Contoh custom method:

· debtRepo.getByType('utang')
· debtPaymentRepo.getByDebt(debtId)
· transactionSplitRepo.getByTransaction(txId)

Aturan:

· ✅ Boleh import Dexie (db) dan constants
· ❌ Tidak boleh import Pinia store
· ❌ Tidak boleh import component
· ❌ Tidak boleh ada db.transaction(...) untuk multi-table (itu di service)

3.4 Services (src/services/)

Tanggung jawab: Business logic, orkestrasi, atomic multi-table operations.

Contoh:

· transactionService.createExpense() — buat transaction + splits + debt internal (atomic via db.transaction), fix arah debt: primary = debtor, talangan = creditor
· transactionService.createIncomeWithBorrower() — income + auto-create wallet temporer + debt utang
· transactionService.createExpenseWithBorrower() — expense + auto-create wallet temporer + debt piutang
· debtService.create() — buat debt internal dengan debtor_wallet_id + creditor_wallet_id eksplisit
· debtService.createWithExternalParty() — auto-create wallet temporer untuk pihak luar
· debtService.pay() — buat debt_payment + update remaining + cleanup wallet temporer kalau lunas
· categoryService.seedDefaults() — cek count + bulkPut 8 kategori
· dataResetService.resetTransactions() — soft delete txs, splits, debts, payments + orphan temp wallets
· dataResetService.resetAll() — resetTransactions + soft delete wallets + categories + re-seed default

Aturan:

· ✅ Boleh import repositories, constants, db (untuk atomic)
· ✅ Boleh dynamic import service lain untuk avoid circular dependency
· ❌ Tidak boleh import Pinia store
· ❌ Tidak boleh import component

3.5 Stores (src/stores/)

Tanggung jawab: State global (Pinia ref), computed properties, actions yang memanggil service/repo + trigger sync.

Pola standar store:

```js
export const useXStore = defineStore('x', () => {
  const items = ref([])
  const loading = ref(false)
  const computedX = computed(() => ...)

  async function loadLocal() {
    items.value = await xRepo.getAll()
  }

  async function create(payload) {
    const result = await xService.create(payload, auth.user.id)
    await loadLocal()
    syncAll().catch(() => {})
    return result
  }

  async function syncAll() {
    await syncMany(['x_table'])
    await loadLocal()
  }

  return { items, loading, computedX, loadLocal, create, syncAll }
})
```

Aturan:

· ✅ Boleh import service, repo, lib, constants, store lain
· ✅ Boleh panggil syncTable/syncMany dari sync-engine
· ❌ Tidak boleh import component

3.6 Composables (src/composables/)

Tanggung jawab: Reusable composition function untuk lifecycle Reactivity.

Composable Fungsi
useAutoSync() Timer sync global + event online/offline + watch auth state (auto-sync saat login)

Cara pakai:

```js
// Di App.vue
const { syncing, syncAll, start, stop } = useAutoSync()
```

Aturan:

· ✅ Boleh import Pinia store (karena dipanggil di setup)
· ✅ Boleh import lib/composable lain
· ❌ Tidak boleh import component

3.7 Components & Views (src/components/, src/views/)

Tanggung jawab: Rendering UI & handling user events. Tidak ada business logic.

Aturan:

· ✅ Boleh import store, composable, constants, lib
· ❌ Tidak boleh query Dexie langsung
· ❌ Tidak boleh buat row manual (harus lewat service/store)

---

4. Skema Database (Dexie + Supabase)

4.1 Tabel

Tabel Deskripsi
wallets Dompet (real & temporer). Field is_temporary & temporary_type untuk pihak luar
categories Kategori income/expense
transactions Header transaksi (income / expense / transfer)
transaction_splits Detail multi-wallet payment per transaksi
debts Utang / piutang (semua internal). Field debtor_wallet_id + creditor_wallet_id eksplisit
debt_payments Riwayat pelunasan
split_bills (Deprecated) Tidak dipakai — Split Bill diimplementasikan di ExpenseModal
split_bill_members (Deprecated) Sama seperti di atas
sync_meta Metadata sync (last_sync_at per tabel)

Catatan: Tabel split_bills & split_bill_members bisa dihapus di masa depan atau dipakai untuk fitur lain. Semua debt sekarang internal (external party di-representasikan sebagai wallet temporer).

4.2 Kolom Standar Sync

Setiap tabel (kecuali sync_meta) memiliki:

Kolom Tipe Fungsi
id uuid Primary key
user_id uuid Foreign key ke auth.users (RLS)
is_deleted boolean Soft delete (default false)
created_at timestamptz Waktu dibuat
updated_at timestamptz Auto-update via trigger
_pending boolean (Dexie only) Flag lokal untuk push ke cloud

Kolom _pending hanya ada di Dexie, tidak ada di Supabase. Saat push, kolom ini dibuang.

4.3 Row Level Security (RLS)

Setiap tabel di Supabase punya policy:

```sql
create policy "nama_policy" on public.nama_tabel
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Efek: User A tidak bisa melihat/mengubah data user B, meskipun tahu UUID-nya.

4.4 Trigger updated_at

Setiap tabel punya trigger otomatis:

```sql
create trigger trg_x_updated before update on public.x
for each row execute function public.set_updated_at();
```

Fungsi set_updated_at() mengeset NEW.updated_at = now(). Efek: setiap UPDATE (dari mana pun, termasuk sync) otomatis update timestamp.

4.5 Wallet Temporary Model

Untuk mendukung pihak eksternal (utang/piutang ke orang luar) dengan model seragam:

· Pihak luar di-representasikan sebagai wallets dengan is_temporary: true
· Wallet temporer punya field temporary_type:
  · debtor — pihak ini berutang ke kita (piutang dari sudut pandang kita)
  · creditor — kita berutang ke pihak ini (utang dari sudut pandang kita)
· Wallet temporer saldo 0 — tidak mempengaruhi total saldo
· Auto-delete saat debt-nya lunas (cleanup logic di debt.service.pay)

Lifecycle:

1. User input pinjaman dari pihak luar (via IncomeModal checkbox atau DebtFormModal)
2. Sistem auto-create wallet temporer (jika belum ada) via findOrCreateTemporary
3. Debt dibuat dengan arah eksplisit: debtor_wallet_id + creditor_wallet_id
4. Saat pelunasan lunas → debt.service._cleanupTemporaryWallets() cek apakah wallet temporer masih punya debt aktif. Kalau tidak → soft delete

---

5. Alur Sinkronisasi Offline-First

5.1 Alur Write (User Action)

```text
1. User tap "Simpan" di modal
2. Component emit → store action
3. Store panggil service/repo
4. Service/repo tulis ke Dexie dengan _pending: true
5. Store loadLocal() → data langsung di UI (<50ms)
6. Store trigger syncAll().catch(() => {}) — fire & forget
```

Kunci: UI update tidak menunggu sync selesai. Kalau offline, data tetap tersimpan lokal.

5.2 Alur Sync Engine

lib/sync-engine.js:

```js
async function syncTable(name) {
  // 1. Guard offline
  if (!navigator.onLine) return { pushed: 0, failed: 0, pulled: 0 }

  // 2. PUSH pending rows
  const pending = await table.filter(r => r._pending).toArray()
  for (const row of pending) {
    const { _pending, ...clean } = row
    const { error } = await supabase.from(name).upsert(clean)
    if (!error) await table.update(row.id, { _pending: false })
  }

  // 3. PULL remote changes sejak last_sync_at
  const last = await getMeta(`${name}_sync_at`)
  const { data } = await supabase.from(name)
    .select('*')
    .gt('updated_at', last)
    .order('updated_at')

  // 4. Last-Write-Wins
  for (const remote of data) {
    const local = await table.get(remote.id)
    if (!local || remote.updated_at >= local.updated_at) {
      await table.put({ ...remote, _pending: false })
    }
  }

  // 5. Update last_sync_at
  await setMeta(`${name}_sync_at`, data.at(-1)?.updated_at)
}
```

5.3 Auto Sync (Global Lifecycle)

composables/useAutoSync.js mengelola:

· Timer: setInterval(syncAll, 30_000) — sync tiap 30 detik
· Event online: saat window emit online, sync langsung
· Watch auth: saat user baru login (auth.isAuthenticated false → true), trigger sync langsung
· Reference counting: timer hanya 1 instance meski dipanggil dari banyak component
· Anti-dobel: kalau sedang sync, skip cycle berikutnya

Dipakai di App.vue:

```js
useAutoSync() // sekali di root
```

Dashboard, Debts, dan view lain cukup akses { syncing, syncAll } dari composable — tanpa timer lokal.

5.4 Konflik

Aturan: Last-Write-Wins (LWW).

Kalau 2 device edit row yang sama:

1. Device A update jam 10:00:00
2. Device B update jam 10:00:05
3. Sync keduanya → Device B menang (updated_at lebih baru)

Keterbatasan: LWW tidak merge field. Kalau A edit name dan B edit color, hasilnya hanya salah satu yang bertahan. Untuk aplikasi keuangan dengan mayoritas operasi append, LWW cukup andal.

5.5 Soft Delete

Kenapa bukan hard delete?

Kalau device A hapus row, device B harus tahu bahwa row itu dihapus. Hard delete tidak bisa disinkronkan.

Solusi: is_deleted = true.

· Row tetap ada di Supabase
· Filter di Dexie & UI: !is_deleted
· Sync: row terkirim seperti biasa, hanya flag yang berubah
· Histori & referensi tidak rusak

---

6. State Management (Pinia)

6.1 Store Pattern

Setiap store menggunakan Setup Store (composition API):

```js
export const useXStore = defineStore('x', () => {
  // State
  const items = ref([])
  const loading = ref(false)

  // Computed
  const activeItems = computed(() => items.value.filter(i => !i.is_deleted))

  // Actions
  async function loadLocal() { /* ... */ }
  async function create(payload) { /* ... */ }

  return { items, loading, activeItems, loadLocal, create }
})
```

6.2 Daftar Store

Store State Actions
auth user, session, ready init, signIn, signUp, signOut
wallet wallets, realWallets, temporaryWallets, loading loadLocal, upsertWallet, softDeleteWallet, createTemporary, findOrCreateTemporary, syncWallets
category categories, loading loadLocal, upsertCategory, softDeleteCategory, syncCategories
transaction transactions, splits, debts, debtPayments, loading loadLocal, balances, createIncome, createExpense, createTransfer, createIncomeWithBorrower, createExpenseWithBorrower, softDeleteTransaction, createDebt, createDebtWithExternalParty, payDebt, softDeleteDebt, paymentsOf, debtsOfWallet, syncAll

6.3 Balance Computation

Saldo dompet tidak disimpan sebagai kolom — dihitung setiap render dari:

```js
function balances(wallets) {
  return computeBalances({
    wallets,
    transactions: transactions.value,
    splits: splits.value,
    debts: debts.value,
    debtPayments: debtPayments.value
  })
}
```

computeBalances() (di lib/balance.js) adalah pure function — input array, output map { wallet_id: saldo }.

Rumus:

```
saldo[wallet] = initial_balance
              + Σ income (wallet_id = wallet)
              - Σ expense (wallet_id = wallet)
              - Σ expense_splits (wallet_id = wallet)
              + Σ transfer_in (to_wallet_id = wallet)
              - Σ transfer_out (wallet_id = wallet)
              ± pelunasan (debtor bayar → debtor turun, creditor naik)
```

⚠️ Catatan kritis: Debt creation tidak mengubah saldo (karena sudah di-handle oleh opening transaction income/expense yang dibuat bersamaan). Hanya pelunasan yang mengubah saldo.

computeTotalReal(balances, wallets) — total saldo wallet real saja (exclude temporer). Dipakai di Dashboard untuk "Total Saldo Aset".

Detail lengkap ada di source lib/balance.js.

---

7. Komponen UI

7.1 Modal System

Semua aksi form pakai <BaseModal>:

```vue
<BaseModal v-model="show" title="Judul">
  <template #default>...</template>
  <template #footer>...</template>
</BaseModal>
```

· Mobile: bottom-sheet (slide up dari bawah)
· Desktop: center dialog
· Teleport ke <body>
· Body scroll lock saat modal terbuka

7.2 Form Modal Pattern

Semua form modal mengikuti pola:

```js
const form = ref(emptyForm())

function emptyForm() {
  return { /* default values, import dari constants */ }
}

watch(() => props.modelValue, (open) => {
  if (open) form.value = emptyForm()
})

async function submit() {
  saving.value = true
  try {
    await store.action(form.value)
    emit('saved')
    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}
```

Kenapa reset setiap open? Supaya data dari edit sebelumnya tidak "bocor" ke create berikutnya.

7.3 Icon & Color Picker

· IconPicker.vue — grid 46 ikon curated + search, ambil dari constants/wallet
· ColorPicker.vue — grid 16 warna, ambil dari constants/wallet

Keduanya di-nest di dalam WalletFormModal & CategoryFormModal untuk pilih visual.

7.4 Category Picker Pattern

Untuk konsistensi form, kategori dipilih via modal picker (bukan grid terbuka):

· CategorySelect.vue — menampilkan tombol ringkas (ikon + nama kategori terpilih + chevron)
· Klik tombol → CategoryPickerModal.vue terbuka
· Modal menampilkan grid 3 kolom ikon + nama kategori
· Klik item → emit select → CategorySelect update v-model → modal tutup

Interface CategorySelect:

```vue
<CategorySelect
  v-model="form.category_id"
  :categories="catStore.expenseCategories"
  label="Kategori"
/>
```

Interface sama seperti versi grid lama — jadi pemanggil tidak perlu diubah saat migrasi.

7.5 ExpenseModal — Split Payment Otomatis

ExpenseModal.vue adalah form pengeluaran dengan fitur split payment otomatis:

Form state:

```js
{
  amount: '',
  date: formatDateISO(),
  category_id: null,
  note: '',
  primary: { wallet_id: null, amount: '' },
  talangan: [],           // [{ wallet_id, amount, is_loan }]
  isReceivable: false,    // checkbox piutang ke pihak luar
  party_name: '',
  due_date: ''
}
```

Alur:

1. User isi amount + pilih dompet utama
2. watch pada [amount, primary.wallet_id] trigger autoBalance()
3. autoBalance():
   · Primary amount = min(total, saldo primary)
   · Kalau total > saldo primary → loop sisa dompet, auto-fill talangan sampai cukup
   · Setiap talangan default is_loan: true
4. Talangan bisa diedit manual (dompet & nominal) atau toggled pinjam
5. Preview saldo before/after ditampilkan
6. Checkbox "Catat sebagai piutang" — kalau dicentang, submit ke createExpenseWithBorrower. Disabled kalau split payment aktif.
7. Submit → panggil txStore.createExpense() atau createExpenseWithBorrower

Karakteristik:

· Talangan hidden kalau saldo cukup (tidak ada section)
· Talangan muncul otomatis kalau saldo kurang
· Kalau masih kurang setelah semua dompet dipakai → warning merah + submit disabled
· Arah debt dari split loan: primary = debtor (peminjam), talangan = creditor (pemberi pinjam). Karena primary yang butuh uang tambahan.

7.6 Filter Pattern (Halaman Transaksi)

Halaman /transactions menggunakan filter aktif sebagai state lokal di view (bukan di store global), supaya filter yang sama tidak bocor ke view lain.

State:

```js
const filter = ref(defaultFilter())  // dari lib/filter.js
const filteredTransactions = computed(() =>
  applyFilter(txStore.activeTransactions, filter.value)
)
const stats = computed(() => summarize(filteredTransactions.value))
```

Modal picker:

· TransactionFilterModal.vue — menerima currentFilter prop, emit apply dengan objek filter baru
· State form lokal, di-reset dari currentFilter saat modal dibuka
· Tombol "Reset" → set defaultFilter()
· Tombol "Terapkan" → emit apply

Default filter: Bulan ini, semua jenis transaksi.

Badge indicator: Kalau ada filter aktif (selain default), tampil dot biru di tombol Filter + banner "Filter aktif".

7.7 Reports Pattern (Laporan Bulanan)

Halaman /reports menampilkan analisis bulanan. Zero chart library — pakai CSS murni.

Tab structure:

· Ringkasan — summary cards + delta % vs bulan lalu
· Kategori — bar chart per kategori (income & expense)
· Dompet — bar chart per dompet (in & out)

Bar chart CSS (BarChart.vue):

```vue
<div class="bg-slate-100 rounded-full h-2 overflow-hidden">
  <div
    class="h-full rounded-full transition-all duration-500 bg-red-500"
    :style="{ width: widthPercent + '%' }"
  />
</div>
```

Karakteristik:

· widthPercent = (item.total / maxValue) * 100
· Minimal 3% supaya bar kecil tetap terlihat
· Sort descending by total
· Support icon kategori (dari LucideIcons)
· Support dot warna dompet
· Kalau item kosong → tampil empty text

Auto-select bulan: Saat onMounted, iterasi getAvailableMonths() dan pilih bulan terbaru yang punya count > 0.

7.8 Wallet Temporary Model (UI)

Halaman /wallets:

· Section "Dompet Saya" — list wallet real (non-temporer)
· Section "Pihak Luar" — list wallet temporer yang punya debt aktif
  · Badge oranye "Kita berutang" — untuk wallet temporer tipe creditor
  · Badge hijau "Dia berutang" — untuk wallet temporer tipe debtor
  · Total remaining dan jumlah debt per wallet
· Tombol "+ Tambah Dompet" (untuk create wallet real)
· Klik wallet → navigate ke /wallets/:id

Halaman /wallets/:id (WalletDetail):

· Card saldo besar dengan warna dompet
· Section "Utang & Piutang" via WalletDebtInfo.vue:
  · List utang (merah): wallet ini berutang ke siapa
  · List piutang (hijau): siapa yang berutang ke wallet ini
  · Tap item → buka DebtPaymentModal untuk pelunasan
· Section "Transaksi Terbaru" — hanya untuk wallet real
· Menu ⋯ → Edit / Hapus dompet

WalletSelect filter:

· Default includeTemporary: false — tidak menampilkan wallet temporer di picker transaksi biasa
· Bisa override includeTemporary: true untuk kasus khusus (belum dipakai saat ini)

---

8. PWA & Service Worker

8.1 Konfigurasi

vite.config.js:

```js
VitePWA({
  registerType: 'autoUpdate',
  manifest: { /* name, icons, theme */ },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: 'NetworkFirst',
        options: { cacheName: 'supabase-api', networkTimeoutSeconds: 5 }
      }
    ]
  }
})
```

8.2 Caching Strategy

Resource Strategy Alasan
App assets (JS/CSS/HTML) Precache Selalu tersedia offline
Supabase API NetworkFirst Data realtime, fallback ke cache jika offline
Ikon & manifest Precache PWA butuh selalu ada

8.3 Registrasi

Di main.js:

```js
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })
```

8.4 Install Prompt

Setelah deploy ke HTTPS (Vercel), browser akan menampilkan ikon Install di address bar. User klik → aplikasi terinstal seperti native app.

---

9. Supabase Setup

9.1 Skema SQL

Full schema ada di dokumentasi setup (fase 1-4 + wallet-temporary). 8 tabel dengan RLS aktif:

· wallets (dengan is_temporary, temporary_type)
· categories
· transactions
· transaction_splits
· debts (dengan debtor_wallet_id, creditor_wallet_id)
· debt_payments
· split_bills (deprecated)
· split_bill_members (deprecated)

9.2 RLS Policy (contoh)

```sql
alter table public.wallets enable row level security;

create policy "wallets_all_own" on public.wallets
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Pola sama untuk semua tabel.

9.3 Auth Flow

1. User register → Supabase kirim email konfirmasi
2. User klik link → akun aktif
3. User login → Supabase return JWT session
4. Session disimpan di local storage browser (key alda-auth)
5. Setiap request ke Supabase otomatis bawa JWT
6. RLS baca auth.uid() dari JWT → filter otomatis

Development: matikan "Confirm email" di Supabase Dashboard → user langsung bisa login setelah register.

9.4 Auth Hardening

· Pre-signOut: signIn() memanggil signOut({ scope: 'local' }) dulu untuk clear session corrupt (misal setelah clear site data)
· Auto-recovery: init() mendeteksi getSession() error → force signOut untuk reset state
· Force clear: signOut() selalu reset session = null, user = null di finally block meski Supabase call gagal
· Password toggle: Ikon mata di Login form untuk show/hide password
· Trim email: Input email di-trim sebelum submit (cegah error "invalid credentials" karena spasi tak sengaja)

---

10. Alur Auth

```text
1. main.js bootstrap
   ↓
2. Guard dipasang SEBELUM app.use(router) — agar navigasi awal tervalidasi
   ↓
3. useAuthStore().init() — getSession + onAuthStateChange
   ↓
4. Kalau belum ready → guard await auth.init()
   ↓
5. Kalau route butuh auth & belum login → redirect ke /login
   ↓
6. Login/Register form
   ↓
7. supabase.auth.signInWithPassword / signUp
   ↓
8. Session tersimpan → redirect ke /
```

Multi-device: session per device independen. Login di HP & tablet → keduanya punya session sendiri. Sync data via database (bukan session).

---

11. Environment Variables

.env.local (tidak di-commit):

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

Di Vercel, set sebagai Environment Variables di dashboard.

Jangan pernah commit .env.local — sudah masuk .gitignore.

---

12. Deployment (Vercel)

12.1 Alur Deploy

1. Push ke main branch GitHub
2. Vercel auto-detect → jalankan npm run build
3. Build → output dist/ → deploy ke edge network
4. URL aktif dalam 1-2 menit

12.2 Environment Variables

Di Vercel Dashboard → Settings → Environment Variables:

· VITE_SUPABASE_URL
· VITE_SUPABASE_ANON_KEY

12.3 Cache Invalidation

Kalau update tapi browser masih tampilkan versi lama:

1. registerType: 'autoUpdate' di PWA config → service worker update otomatis
2. Atau hard reload: Ctrl+Shift+R
3. Atau DevTools → Application → Service Workers → Unregister

12.4 Update PWA di HP

Cara yang benar (jangan "clear cache" — bisa korupsi session):

1. Deploy versi baru ke Vercel
2. Buka app Alda → tunggu 5 detik (SW deteksi update)
3. Tutup app (swipe up / tombol back)
4. Buka app lagi → versi baru aktif

Atau, kalau masalah persist: uninstall & reinstall PWA dari home screen. Data akan balik setelah login (sync dari Supabase).

---

13. Testing Checklist

Sebelum deploy, verifikasi:

13.1 Auth

☐ Register berhasil
☐ Login berhasil (dengan email & password benar)
☐ Password visibility toggle bekerja (Eye/EyeOff)
☐ Session persist setelah refresh
☐ Logout berhasil
☐ Route /debts redirect ke /login kalau belum auth
☐ Setelah clear site data → buka app redirect ke /login (bukan dashboard kosong)
☐ Setelah clear site data → login berhasil (pre-signOut clear corrupt state)

13.2 Wallet

☐ Tambah dompet → muncul
☐ Edit dompet → update
☐ Hapus dompet → hilang dari list (soft delete)
☐ Saldo gabungan = jumlah saldo semua dompet real aktif

13.3 Wallet Temporary

☐ Pinjam dari pihak luar (IncomeModal checkbox) → wallet temporer dibuat
☐ Wallet temporer muncul di section "Pihak Luar" di /wallets
☐ Badge "Kita berutang" (oranye) / "Dia berutang" (hijau) benar
☐ Klik wallet temporer → detail dengan utang/piutang
☐ Lunasi debt → wallet temporer auto-hilang dari list
☐ Wallet temporer tidak muncul di WalletSelect (picker transaksi)

13.4 Category

☐ User baru dapat 8 kategori default (3 income, 5 expense)
☐ Tambah kategori → muncul di list
☐ Edit kategori → update
☐ Hapus kategori → hilang dari list
☐ Kategori baru langsung tersedia di CategorySelect

13.5 Transaction

☐ Income → saldo naik
☐ Expense single-wallet → saldo turun
☐ Expense multi-wallet (saldo kurang) → talangan auto-muncul
☐ Expense multi-wallet + loan ON → debt dibuat dengan arah primary = debtor, talangan = creditor
☐ Pelunasan debt split loan → saldo kembali sesuai (D1=100k, D2=30k di skenario uji)
☐ Transfer → saldo pindah
☐ Hapus transaksi → saldo kembali

13.6 Debt

☐ Catat utang eksternal → wallet temporer dibuat, saldo naik
☐ Catat piutang eksternal → wallet temporer dibuat, saldo turun
☐ Catat utang internal (antar wallet real) → saldo pindah
☐ Pelunasan cicilan → sisa berkurang
☐ Pelunasan lunas → status Lunas + wallet temporer cleanup
☐ Tab Utang / Piutang menampilkan badge "internal" / "eksternal"
☐ Rename wallet → nama di debt list ikut berubah (lookup real-time)

13.7 Split Payment

☐ Split dengan saldo cukup → section talangan tersembunyi
☐ Split dengan saldo kurang → section talangan muncul otomatis
☐ Toggle pinjam ON/OFF → behavior berbeda (debt vs tidak)
☐ Multi-talangan muncul saat masih kurang
☐ Semua dompet terpakai masih kurang → warning + submit disabled
☐ Checkbox "Catat sebagai piutang" disabled saat split payment aktif
☐ Buka /split-bills → history tampil (read-only)

13.8 Filter & Export CSV

☐ Buka /transactions → default filter bulan ini
☐ Quick range (Hari ini, 7 hari, 30 hari, Bulan ini, Bulan lalu) → tanggal auto-isi
☐ Multi-select jenis (income/expense/transfer) → filter bekerja
☐ Filter dompet & kategori → filter bekerja
☐ Search catatan → filter bekerja
☐ Badge dot muncul saat filter aktif
☐ Tombol Download → file .csv ter-download
☐ CSV berisi transaksi sesuai filter aktif
☐ Toast feedback muncul setelah export

13.9 Reports

☐ Buka /reports → default bulan ini / terbaru
☐ Tab Ringkasan: card Pemasukan/Pengeluaran/Net + delta %
☐ Tab Kategori: bar chart per kategori
☐ Tab Dompet: bar chart per dompet
☐ Ganti bulan → semua tab update
☐ Bulan kosong → empty state
☐ Bar kecil tetap terlihat (min 3%)

13.10 Reset Data

☐ Settings → "Reset Transaksi" → input "HAPUS" → reset
  · Transaksi, utang, pelunasan dihapus
  · Wallet + kategori dipertahankan
  · Saldo dompet kembali ke initial_balance
☐ Settings → "Reset Semua Data" → input "RESET SEMUA" → reset
  · Semua data dihapus (transaksi, wallet, kategori)
  · 8 kategori default di-seed ulang
  · Dashboard kosong, total saldo Rp 0
☐ Tombol reset disabled sampai text typed correctly
☐ Toast hijau muncul setelah reset
☐ Sync ke Supabase setelah reset

13.11 Sync & Offline

☐ Offline → tambah data → tetap sukses (Dexie)
☐ Online → data ter-sync ke Supabase dalam 30 detik
☐ Multi-device → login di 2 browser → data sinkron
☐ Soft delete → row di Supabase masih ada dengan is_deleted: true
☐ Auto-sync saat login (watch auth.isAuthenticated)

13.12 PWA

☐ Tombol Install muncul di Chrome
☐ Aplikasi bisa dibuka offline
☐ Update otomatis (registerType: autoUpdate)
☐ Uninstall & reinstall → data balik setelah login

---

14. Referensi

· Visi produk & definisi fitur: CONCEPT.md
· Panduan developer: README.md
· Supabase docs: https://supabase.com/docs
· Dexie docs: https://dexie.org
· Vue 3 docs: https://vuejs.org
· Tailwind v4 docs: https://tailwindcss.com
· vite-plugin-pwa: https://vite-pwa-org.netlify.app

---

15. Riwayat Revisi

Tanggal Perubahan
2026-11-11 Dokumen dibuat. Mencakup arsitektur lengkap pasca-refactor SoC.
2026-11-11 Revisi 1: Restore formatting markdown. Tambah CategoryPickerModal, components/category/, views/Categories.vue, views/SplitBills.vue. Hapus folder split-bill/. Subsection 7.4 & 7.5. Update testing.
2026-11-11 Revisi 2: Fase 6 (Filter, Export CSV, Reports). Subsection 7.6 & 7.7. Auth hardening. PWA update flow.
2026-11-12 Revisi 3: Wallet Temporary Model + Reset Data. Tambah: BottomNav, Wallets.vue, WalletDetail.vue, WalletDebtInfo.vue, ResetDataModal.vue, data-reset.service.js, wallet-temporary.js, wallet-debt.js, settings/. Subsection 4.5 (Wallet Temporary Model), 7.8 (Wallet Temporary UI). Update 6.2 (store actions baru), 6.3 (rumus balance + catatan debt creation), 13.3 (Wallet Temporary), 13.10 (Reset Data). Renumber 13.11 & 13.12. Update struktur folder. Update testing checklist lengkap.

---

© Alda 2026

```

---

## ✅ Setelah Timpa File

1. Timpa `ARCHITECTURE.md` dengan kode di atas
2. Verifikasi:
   ```bash
   wc -l ARCHITECTURE.md
   # Harus > 900 baris
```

---
