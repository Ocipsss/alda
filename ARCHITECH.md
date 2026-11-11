📄 ARCHITECTURE.md — Update + Restore Formatting

File yang kamu kirim memiliki beberapa formatting yang rusak (kemungkinan copy-paste dari viewer yang tidak render markdown). Saya restore formatnya plus update konten: tambah CategoryPickerModal, CategoryItem, CategoryFormModal, Categories.vue, SplitBills.vue; hapus folder split-bill/; tambah subsection "Category Picker Pattern".

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
│   categories, split_bills, split_bill_members, sync_meta)│
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
├── App.vue                        # Root — panggil useAutoSync()
├── main.js                        # Bootstrap — mount + auth init + registerSW
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
│   │   ├── WalletSelect.vue       # Select dompet
│   │   ├── CategorySelect.vue     # Kategori picker (button + modal)
│   │   └── CategoryPickerModal.vue # Modal grid kategori
│   ├── layout/
│   │   └── FabMenu.vue            # FAB speed-dial
│   ├── wallet/                    # Wallet-related
│   │   ├── WalletCard.vue
│   │   └── WalletFormModal.vue
│   ├── category/                  # Category-related
│   │   ├── CategoryItem.vue
│   │   └── CategoryFormModal.vue
│   ├── transaction/               # Transaction-related
│   │   ├── IncomeModal.vue
│   │   ├── ExpenseModal.vue       # Multi-wallet + auto-talangan + loan flag
│   │   ├── TransferModal.vue
│   │   ├── TransactionItem.vue
│   │   └── TransactionDetailModal.vue
│   └── debt/                      # Debt-related
│       ├── DebtFormModal.vue
│       └── DebtPaymentModal.vue
│
├── composables/                   # Vue composables
│   └── useAutoSync.js             # Global sync lifecycle
│
├── constants/                     # Domain constants
│   ├── app.js                     # APP_NAME, CURRENCY, LOCALE
│   ├── transaction.js             # TX_TYPE, TX_TYPE_LABEL, TX_TYPE_COLOR
│   ├── debt.js                    # DEBT_TYPE, DEBT_SOURCE, LABELS
│   ├── wallet.js                  # WALLET_COLORS, CURATED_WALLET_ICONS
│   ├── category.js                # DEFAULT_CATEGORIES
│   ├── sync.js                    # SYNC_INTERVAL_MS, SYNC_TABLES, dsb
│   └── index.js                   # Barrel export
│
├── db/                            # Dexie setup
│   ├── index.js                   # Schema + helper (getMeta, setMeta, uid)
│   └── seed.js                    # Wrapper seedCategories
│
├── lib/                           # Pure utilities
│   ├── supabase.js                # Supabase client
│   ├── balance.js                 # computeBalances (pure function)
│   ├── format.js                  # formatCurrency, formatDate, formatDateISO
│   └── sync-engine.js             # Unified sync (push + pull + retry)
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
│   ├── wallet.service.js          # save, softDelete
│   ├── category.service.js        # save, softDelete, seedDefaults
│   ├── transaction.service.js     # createIncome, createExpense (multi-wallet + loan),
│   │                              #   createTransfer, softDelete
│   ├── debt.service.js            # create, pay, softDelete
│   └── index.js                   # Barrel export
│
├── stores/                        # Pinia stores
│   ├── auth.js                    # Session, signIn, signUp, signOut
│   ├── wallet.js                  # wallets, loadLocal, upsert, sync
│   ├── category.js                # categories, income/expense split
│   └── transaction.js             # transactions, splits, debts, balances
│
├── router/
│   └── index.js                   # Vue Router + auth guard
│
└── views/                         # Page-level components
    ├── Login.vue
    ├── Dashboard.vue
    ├── Debts.vue
    ├── Categories.vue
    └── SplitBills.vue
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
· DEFAULT_CATEGORIES — 13 kategori seed
· SYNC_INTERVAL_MS = 30_000 — interval auto-sync

Aturan:

· ✅ Boleh import ke mana saja
· ❌ Tidak boleh import dari layer lain
· ❌ Tidak boleh ada logic/function

3.2 Lib (src/lib/)

Tanggung jawab: Fungsi murni (pure functions) & utility yang tidak terkait state atau database.

File Isi
supabase.js Supabase client singleton
balance.js computeBalances() — hitung saldo per wallet dari transaksi
format.js formatCurrency(), formatDate(), formatDateISO()
sync-engine.js syncTable(), syncMany(), syncTableWithRetry()

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

· transactionService.createExpense() — buat transaction + splits + debt internal (atomic via db.transaction)
· debtService.pay() — buat debt_payment + update remaining (atomic)
· categoryService.seedDefaults() — cek count + bulkPut 13 kategori

Aturan:

· ✅ Boleh import repositories, constants, db (untuk atomic)
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
useAutoSync() Timer sync global + event online/offline, pakai reference counting

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
wallets Dompet (kas, rekening, e-wallet, tabungan)
categories Kategori income/expense
transactions Header transaksi (income / expense / transfer)
transaction_splits Detail multi-wallet payment per transaksi
debts Utang / piutang (eksternal & internal)
debt_payments Riwayat pelunasan
split_bills (Persiapan, belum dipakai) Header split bill
split_bill_members (Persiapan, belum dipakai) Anggota split
sync_meta Metadata sync (last_sync_at per tabel)

Catatan: Tabel split_bills & split_bill_members dibuat saat Fase 2 sebagai persiapan, tapi tidak dipakai karena Split Bill akhirnya diimplementasikan sebagai fitur otomatis di ExpenseModal (bukan modul DB terpisah). Bisa dihapus di masa depan atau dipakai untuk fitur lain.

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

Keterbatasan: LWW tidak merge field. Kalau A edit name dan B edit color, hasilnya hanya salah satu yang bertahan. Untuk aplikasi keuangan dengan mayoritas operasi append (bukan edit field bersamaan), LWW cukup andal.

5.5 Soft Delete

Kenapa bukan hard delete?

Kalau device A hapus row, device B harus tahu bahwa row itu dihapus. Hard delete tidak bisa disinkronkan (row hilang di A, tapi masih ada di B).

Solusi: is_deleted = true.

· Row tetap ada di Supabase
· Filter di Dexie & UI: !is_deleted
· Sync: row terkirim seperti biasa, hanya flag yang berubah
· Histori & referensi tidak rusak (misal debt yang sudah dihapus, pelunasan tetap valid)

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
wallet wallets, loading loadLocal, upsertWallet, softDeleteWallet, syncWallets
category categories, loading loadLocal, upsertCategory, softDeleteCategory, syncCategories
transaction transactions, splits, debts, debtPayments, loading loadLocal, balances, createIncome, createExpense, createTransfer, softDeleteTransaction, createDebt, payDebt, softDeleteDebt, paymentsOf, syncAll

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
              + debt_eksternal_utang (counterpart_wallet_id = wallet)
              - debt_eksternal_piutang (counterpart_wallet_id = wallet)
              ± pelunasan (sesuai tipe debt)
              ± debt_internal (sesuai arah)
```

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

Interface sama seperti versi grid lama — jadi pemanggil (IncomeModal, ExpenseModal) tidak perlu diubah saat migrasi.

7.5 ExpenseModal — Split Payment Otomatis

ExpenseModal.vue adalah form pengeluaran dengan fitur split payment otomatis:

Form state:

```js
{
  amount: '',                    // total belanja
  date: formatDateISO(),
  category_id: null,
  note: '',
  primary: { wallet_id: null, amount: '' },  // dompet utama
  talangan: []                   // [{ wallet_id, amount, is_loan }]
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
6. Submit → panggil txStore.createExpense() dengan payments = [primary, ...talangan]

Karakteristik:

· Talangan hidden kalau saldo cukup (tidak ada section)
· Talangan muncul otomatis kalau saldo kurang
· Kalau masih kurang setelah semua dompet dipakai → warning merah + submit disabled
· Reuse transactionService.createExpense() (logic backend sama dengan Fase 3)

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

Full schema ada di dokumentasi setup (fase 1-4). 8 tabel dengan RLS aktif:

· wallets
· categories
· transactions
· transaction_splits
· debts
· debt_payments
· split_bills (persiapan, belum dipakai)
· split_bill_members (persiapan, belum dipakai)

9.2 RLS Policy (contoh)

```sql
alter table public.wallets enable row level security;

create policy "wallets_all_own" on public.wallets
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Pola sama untuk semua tabel. Detail per-tabel ada di SQL setup.

9.3 Auth Flow

1. User register → Supabase kirim email konfirmasi
2. User klik link → akun aktif
3. User login → Supabase return JWT session
4. Session disimpan di local storage browser (key alda-auth)
5. Setiap request ke Supabase otomatis bawa JWT
6. RLS baca auth.uid() dari JWT → filter otomatis

Development: matikan "Confirm email" di Supabase Dashboard → user langsung bisa login setelah register.

---

10. Alur Auth

```text
1. main.js bootstrap
   ↓
2. useAuthStore().init()
   ↓
3. supabase.auth.getSession() — cek session tersimpan
   ↓
4. Router guard — kalau belum auth, redirect ke /login
   ↓
5. Login/Register modal
   ↓
6. supabase.auth.signInWithPassword / signUp
   ↓
7. Session tersimpan, redirect ke /
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

---

13. Testing Checklist

Sebelum deploy, verifikasi:

13.1 Auth

☐ Register berhasil
☐ Login berhasil
☐ Session persist setelah refresh
☐ Logout berhasil
☐ Route /debts redirect ke /login kalau belum auth

13.2 Wallet

☐ Tambah dompet → muncul
☐ Edit dompet → update
☐ Hapus dompet → hilang dari list (soft delete)
☐ Saldo gabungan = jumlah saldo semua dompet aktif

13.3 Category

☐ Tambah kategori → muncul di list
☐ Edit kategori → update
☐ Hapus kategori → hilang dari list
☐ Kategori baru langsung tersedia di CategorySelect

13.4 Transaction

☐ Income → saldo naik
☐ Expense single-wallet → saldo turun
☐ Expense multi-wallet (saldo kurang) → talangan auto-muncul
☐ Expense multi-wallet + loan ON → saldo terpotong + debt internal
☐ Expense multi-wallet + loan OFF → saldo terpotong, tidak ada debt
☐ Transfer → saldo pindah
☐ Hapus transaksi → saldo kembali

13.5 Debt

☐ Catat utang eksternal → saldo naik, muncul di tab Utang
☐ Catat piutang eksternal → saldo turun, muncul di tab Piutang
☐ Catat utang internal → saldo pindah antar dompet
☐ Pelunasan cicilan → sisa berkurang
☐ Pelunasan lunas → status Lunas

13.6 Split Payment

☐ Split dengan saldo cukup → section talangan tersembunyi
☐ Split dengan saldo kurang → section talangan muncul otomatis
☐ Toggle pinjam ON/OFF → behavior berbeda (debt vs tidak)
☐ Multi-talangan muncul saat masih kurang
☐ Semua dompet terpakai masih kurang → warning + submit disabled
☐ Buka /split-bills → history tampil (read-only)

13.7 Sync & Offline

☐ Offline → tambah data → tetap sukses (Dexie)
☐ Online → data ter-sync ke Supabase dalam 30 detik
☐ Multi-device → login di 2 browser → data sinkron
☐ Soft delete → row di Supabase masih ada dengan is_deleted: true

13.8 PWA

☐ Tombol Install muncul di Chrome
☐ Aplikasi bisa dibuka offline
☐ Update otomatis (registerType: autoUpdate)

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
2026-11-11 Dokumen dibuat. Mencakup arsitektur lengkap pasca-refactor SoC (constants, lib, repos, services, stores, composables).
2026-11-11 Revisi 1: Restore formatting markdown yang rusak. Update struktur folder: tambah CategoryPickerModal.vue, components/category/, views/Categories.vue, views/SplitBills.vue; hapus folder components/split-bill/. Tambah subsection 7.4 (Category Picker Pattern) & 7.5 (ExpenseModal Split Payment Otomatis). Update testing checklist.

---

© Alda 2026

```

---

## 🔍 Ringkasan Perubahan

### `CONCEPT.md`
| Bagian | Perubahan |
|---|---|
| 3.4 Kategori | Update: UI CRUD sudah ada di `/categories`, selector pakai modal picker |
| 3.5 Utang & Piutang | Penomoran geser (dari 3.5 → tetap 3.5, dari 3.6) |
| 4.4 Relasi | Update: "Fase 5" → "Split Bill" (bukan fase, sudah terintegrasi) |
| **4.5 UX Split Bill** | **Rewrite total** — dari "Wizard terpisah" ke "Alur `+ Pengeluaran` dengan talangan otomatis" |
| 5 Roadmap | Fase 3.5 & 5 → ✅ Selesai; tambah catatan UX revamp |
| 8 Glosarium | Tambah: Dompet Utama, Dompet Talangan |
| 10 Riwayat | Tambah Revisi 2 |

### `ARCHITECTURE.md`
| Bagian | Perubahan |
|---|---|
| **Formatting** | **Restore markdown yang rusak** (code blocks, headers, tables) |
| 2 Struktur Folder | Tambah: `CategoryPickerModal.vue`, `components/category/`, `views/Categories.vue`, `views/SplitBills.vue`; **hapus** `components/split-bill/` |
| 4.1 Tabel | Tambah catatan: `split_bills`/`split_bill_members` belum dipakai |
| 7.3 Icon & Color Picker | Tambah: di-nest juga di `CategoryFormModal` |
| **7.4 Category Picker Pattern** | **Subsection BARU** |
| **7.5 ExpenseModal Split Payment** | **Subsection BARU** |
| 13 Testing | Tambah 13.3 Category, 13.6 Split Payment; renumber |
| 15 Riwayat | Tambah Revisi 1 |

---

## 💾 Commit

```bash
git add CONCEPT.md ARCHITECTURE.md
git commit -m "docs: update CONCEPT and ARCHITECTURE for post-Fase-5 UX revamp

CONCEPT.md:
- Mark Fase 3.5 & 5 as complete
- Rewrite section 4.5 (Split Bill UX is now inside ExpenseModal, not a separate modal)
- Update section 3.4 (Category CRUD UI exists at /categories)
- Add glossary terms: Dompet Utama, Dompet Talangan
- Add revision history entry

ARCHITECTURE.md:
- Restore markdown formatting (broken code blocks, headers, tables)
- Update folder structure (add CategoryPickerModal, components/category/,
  views/Categories.vue, views/SplitBills.vue; remove components/split-bill/)
- Add subsection 7.4 (Category Picker Pattern)
- Add subsection 7.5 (ExpenseModal Split Payment Auto-Talangan)
- Update testing checklist (13.3 Category, 13.6 Split Payment)
- Add revision history entry"
git push origin main
```

---