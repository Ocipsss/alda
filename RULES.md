Update RULES.md — Full

Berikut full code hasil update. Perubahan utama:

· 2.1 Dexie Schema — tambah catatan soal field baru (is_temporary, debtor_wallet_id, dll) tanpa ubah db.version()
· 2.3 Magic Value — tambah TEMPORARY_TYPE, TEMPORARY_COLORS
· 2.9 (baru) Debt Direction Convention — aturan arah debtor_wallet_id / creditor_wallet_id
· 2.10 (baru) Wallet Temporary Rules — kapan pakai wallet temporer
· 3.4 (baru) Wallet Temporer untuk Pihak Luar — konsep model
· 3.5 (baru) Reset Data — aturan reset
· 5.1 Tambahan — aturan dynamic import untuk circular dependency
· 6 Checklist — tambah item verifikasi baru
· 9 Riwayat — tambah Revisi 1 & 2

```markdown
# Alda — Development Rules & Working Agreement

> **Dokumen ini adalah "aturan main" antara developer (kamu) dan AI assistant (Claude).**
> Setiap kali ada sesi baru, baca dokumen ini dulu sebelum mulai kerja.
> Kalau ada konflik antara dokumen ini dan permintaan ad-hoc, **dokumen ini menang** kecuali kamu bilang sebaliknya.

---

## 1. Aturan Inti Kerja Sama

### 1.1 Aturan Emas File (WAJIB)

**File Baru vs File Update — perlakuannya BERBEDA:**

| Jenis | Aturan |
|---|---|
| **File BARU** | Boleh dibuat **banyak sekaligus** dalam 1 respons |
| **File UPDATE** | Harus **satu per satu**. Kamu kirim utuh → saya balikin utuh |
| **Folder BARU** | Boleh dibuat sekaligus dengan file di dalamnya |

**Alasan:** File baru tidak berisiko menimpa kode yang sudah ada. File update berisiko menghilangkan bagian yang tidak sengaja terlewat.

### 1.2 Aturan Konten (WAJIB)

Saat mengirim file update:
- ❌ **JANGAN** menghapus kode yang tidak terkait perubahan
- ❌ **JANGAN** menyederhanakan bagian yang tidak diminta disederhanakan
- ❌ **JANGAN** menambah fitur/refactor yang tidak diminta
- ✅ **KIRIM FULL CODE**, bukan diff/partial
- ✅ **PERTAHANKAN** semua import, function, komentar, dan struktur yang sudah ada
- ✅ **HANYA UBAH** bagian yang menjadi tujuan update
- ✅ Kalau harus hapus sesuatu, **JELASKAN** di ringkasan "Apa yang Berubah"

### 1.3 Aturan Format Respons (WAJIB)

Setiap kali mengirim full code file update, sertakan:
1. **Path file** yang jelas di atas code block
2. **Full code** (bukan partial)
3. **Ringkasan "Apa yang Berubah"** dalam tabel: Sebelum | Sesudah
4. **Checklist verifikasi** langkah demi langkah
5. **Perintah commit** yang bisa langsung copy-paste

Contoh format:

```markdown
## Step X — File #N: `src/path/file.vue`

Berikut full code hasil update:
```vue
[FULL CODE]
```

🔍 Apa yang Berubah

| Bagian | Sebelum | Sesudah |

✅ Verifikasi

1. ...

💾 Commit

```bash
git add ...
git commit -m "..."
```

```

### 1.4 Aturan Konfirmasi

- **Kalau ada asumsi ambigu**, tanya dulu sebelum eksekusi. Jangan menebak.
- **Kalau ada keputusan desain** (bukan teknis), tampilkan pilihan A/B/C dengan trade-off, minta user pilih.
- **Kalau ada risiko breaking change**, jelaskan dampaknya sebelum eksekusi.

### 1.5 Aturan File Baru & Kosong

**WAJIB verifikasi** setelah membuat file baru via terminal:
- File berukuran > 100 bytes (bukan kosong)
- File berisi `<script>` + `<template>` (untuk file .vue)
- Bisa di-import tanpa error

**Kalau error "file kosong" atau "at least one script/template required":**
- Rewrite file dengan heredoc `cat > file << 'EOF'`
- Restart dev server (`rm -rf node_modules/.vite && npm run dev`)
- Verifikasi ukuran file lagi

---

## 2. Aturan Teknis Alda

### 2.1 Dexie Schema

- ❌ **JANGAN** pakai `db.version(N).stores(...)` — cukup satu blok `db.version(1).stores(...)`
- **Alasan:** masih fase development, belum butuh migrasi versioned
- Kalau butuh tambah/ubah index, edit blok yang sama, bukan tambah `.version(2)`
- **Field baru yang tidak butuh index** (misal `is_temporary`, `debtor_wallet_id`, `creditor_wallet_id`) — **tidak perlu ubah schema Dexie** sama sekali, karena Dexie hanya butuh deklarasi field yang di-index
- Field baru otomatis tersimpan & tersinkron karena tetap masuk di row JSON

### 2.2 Separation of Concerns (SoC)

Ikuti layer arsitektur yang sudah dibangun (lihat `ARCHITECTURE.md` Bagian 3):

| Layer | Tanggung Jawab | Batasan |
|---|---|---|
| `constants/` | Nilai statis | Tidak boleh ada logic |
| `lib/` | Fungsi murni | Tidak boleh import store/component |
| `repositories/` | Query Dexie murni | Tidak boleh ada business logic |
| `services/` | Business logic & atomic ops | Boleh `db.transaction(...)` |
| `stores/` | State global (Pinia) | Tidak boleh query Dexie langsung |
| `composables/` | Lifecycle Reactivity | Boleh panggil store |
| `components/` `views/` | UI rendering | Tidak boleh ada business logic |

**Alur pemanggilan satu arah:**
```text
View → Store → Service → Repository → Dexie → [Sync Engine] → Supabase
```

Circular Dependency Handling:

· Kalau 2 service saling import (contoh: transaction.service ↔ debt.service), pakai dynamic import:
  ```js
  const { debtService } = await import('./debt.service')
  ```
· JANGAN static import circular — akan bikin module error
· Alternatif lebih baik (future): extract helper ke lib/ untuk avoid circular

2.3 Magic Value

JANGAN tulis magic string/number langsung di component/store. Selalu pakai constants:

```js
// ❌ JANGAN
if (tx.type === 'income') ...

// ✅ HARUS
import { TX_TYPE } from '../constants/transaction'
if (tx.type === TX_TYPE.INCOME) ...
```

Yang sudah ada di constants/:

· TX_TYPE.INCOME / EXPENSE / TRANSFER
· DEBT_TYPE.UTANG / PIUTANG
· DEBT_SOURCE.EXTERNAL / INTERNAL
· WALLET_COLORS, CURATED_WALLET_ICONS, DEFAULT_WALLET
· TEMPORARY_TYPE.DEBTOR / CREDITOR, TEMPORARY_COLORS, DEFAULT_TEMPORARY_WALLET
· DEFAULT_CATEGORIES (8 kategori — 3 income, 5 expense)
· SYNC_INTERVAL_MS, SYNC_TABLES, LAST_SYNC_INITIAL
· CURRENCY, CURRENCY_LOCALE, DATE_LOCALE

2.4 Formatter & Utility

JANGAN tulis Intl.NumberFormat atau toLocaleDateString langsung di component:

```js
// ❌ JANGAN
new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR'
}).format(value)

// ✅ HARUS
import { formatCurrency, formatDate, formatDateISO } from '../lib/format'
formatCurrency(value)
```

Alasan: konsistensi format di seluruh aplikasi, dan memudahkan ganti locale/currency di masa depan.

2.5 Sync

· Semua operasi write → Dexie dulu → UI update → sync di background
· Sync pakai syncTable() atau syncMany() dari lib/sync-engine.js
· JANGAN tulis ulang logic push/pull di store baru
· Auto sync global sudah ada di useAutoSync() (dipanggil di App.vue)
· Auto sync juga trigger saat user login (watch auth.isAuthenticated di composable)

2.6 Soft Delete

· Semua delete → is_deleted: true, bukan .delete() (hard)
· Query untuk UI → filter !is_deleted
· Query untuk sync → tetap ambil semua (termasuk yang deleted)
· Alasan: agar sync antar-device konsisten (lihat ARCHITECTURE.md Bagian 5.5)

2.7 Form Modal Pattern

Semua form modal mengikuti pola:

```js
const form = ref(emptyForm())

function emptyForm() {
  return { /* default values, import dari constants */ }
}

watch(() => props.modelValue, (open) => {
  if (open) form.value = emptyForm()  // reset setiap open
})
```

Wajib reset setiap modal dibuka — supaya data dari edit sebelumnya tidak bocor ke create berikutnya.

2.8 Tanggal

JANGAN pakai new Date().toISOString().slice(0, 10) — itu UTC.

HARUS pakai formatDateISO() dari lib/format.js — itu local timezone.

Alasan: user di WIB buka aplikasi jam 00:00-07:00 → tanggal UTC bisa 1 hari lebih awal.

2.9 Debt Direction Convention (WAJIB)

Setiap debt record WAJIB punya arah eksplisit:

· debtor_wallet_id — wallet peminjam (yang berutang)
· creditor_wallet_id — wallet pemberi pinjam (yang dipinjami)

Aturan arah:

Tipe Debt debtor_wallet_id creditor_wallet_id
Utang internal (kita pinjam dari wallet lain) Wallet kita (penerima uang) Wallet lawan (pemberi)
Piutang internal (kita pinjamkan ke wallet lain) Wallet lawan (penerima uang) Wallet kita (pemberi)
Utang eksternal (pinjam dari pihak luar) Wallet kita (penerima uang) Wallet temporer pihak luar
Piutang eksternal (pinjamkan ke pihak luar) Wallet temporer pihak luar Wallet kita (pemberi)

Split Loan Convention:

· Primary wallet = peminjam (debtor), karena yang butuh uang tambahan
· Talangan wallet = pemberi pinjam (creditor), karena yang bantu
· JANGAN terbalik: talangan bukan peminjam, primary bukan pemberi

Konsistensi:

· Debt creation TIDAK mengubah saldo (sudah di-handle opening transaction)
· Hanya pelunasan yang mengubah saldo: debtor bayar → debtor turun, creditor naik

2.10 Wallet Temporer (Pihak Luar)

WAJIB pakai wallet temporer untuk semua pihak luar (Andi, Budi, Koperasi):

· Buat via walletService.findOrCreateTemporary({ name, type, userId })
· type: 'debtor' — pihak ini berutang ke kita (piutang dari sudut pandang kita)
· type: 'creditor' — kita berutang ke pihak ini (utang dari sudut pandang kita)

Aturan:

· ❌ JANGAN simpan nama pihak luar sebagai string (debt.party) saja
· ✅ WAJIB buat wallet temporer + link via debtor_wallet_id/creditor_wallet_id
· Field party tetap diisi (untuk backward compat), tapi source of truth = wallet temporer
· Wallet temporer tidak muncul di WalletSelect (filter is_temporary)
· Wallet temporer auto-hilang saat debt lunas (via debtService._cleanupTemporaryWallets)
· Wallet temporer saldo 0 — tidak mempengaruhi total aset Dashboard

UI Display:

· Section "Pihak Luar" di /wallets
· Badge "Kita berutang" (oranye) / "Dia berutang" (hijau)
· Klik → detail wallet dengan list utang/piutang

2.11 Pelunasan Debt

Setiap pelunasan WAJIB mengikuti aturan:

· p.wallet_id = wallet yang memproses transfer
· Kalau wallet_id === debtor_wallet_id:
  · Debtor turun, creditor naik (kalau creditor real)
  · Creditor temporer: skip perubahan (saldo temporer tetap 0)
· Kalau wallet_id === creditor_wallet_id:
  · Creditor naik (uang masuk), debtor turun (kalau debtor real)
  · Debtor temporer: skip perubahan
· JANGAN terbalik arahnya

Setelah pelunasan lunas (remaining <= 0.01), WAJIB trigger cleanup:

```js
await debtService._cleanupTemporaryWallets(debt)
```

2.12 Reset Data

Reset Data WAJIB menggunakan soft delete (bukan hard delete), supaya sync antar-device konsisten:

· Reset Transaksi → soft delete transactions, transaction_splits, debts, debt_payments + orphan wallet temporer
· Reset Semua → reset transaksi + soft delete wallets + categories + re-seed 8 default

WAJIB trigger sync setelah reset:

```js
walletStore.syncWallets().catch(() => {})
catStore.syncCategories().catch(() => {})
txStore.syncAll().catch(() => {})
```

WAJIB pakai konfirmasi typed text:

· Reset Transaksi → user ketik "HAPUS"
· Reset Semua → user ketik "RESET SEMUA"

JANGAN bikin reset button tanpa konfirmasi typed text — rawan salah pencet.

---

3. Aturan Konsep Produk

3.1 Split Bill

Split Bill = Split Payment (multi-wallet), BUKAN bagi tagihan ke teman.

Baca detail lengkap di CONCEPT.md Bagian 4. Jangan salah tafsir lagi.

Kalau ada pertanyaan serupa, baca CONCEPT.md dulu sebelum eksekusi.

3.2 Utang Piutang Eksternal

Fitur bagi tagihan ke orang / tracking siapa bayar masuk ke modul Utang Piutang Eksternal (model wallet temporer), bukan Split Bill.

3.3 Non-Goals

Alda bukan:

· Aplikasi akuntansi double-entry
· Multi-user kolaborasi
· Fitur sosial (kirim tagihan, notifikasi teman)
· Integrasi bank langsung

Detail di CONCEPT.md Bagian 7.

3.4 Wallet Temporer untuk Pihak Luar

Semua pihak luar (Andi, Budi, Koperasi) direpresentasikan sebagai wallet temporer.

Alasan:

· Model seragam — semua debt internal dengan arah eksplisit
· Query simpel — pakai debtor_wallet_id + creditor_wallet_id
· UI intuitif — pihak luar muncul di /wallets dengan badge jelas
· Auto-cleanup — hilang otomatis saat debt lunas

Baca CONCEPT.md Bagian 3.5 & ARCHITECTURE.md Bagian 4.5 untuk detail.

3.5 Reset Data

2 mode reset:

1. Reset Transaksi — hapus transaksi & pinjaman, wallet + kategori tetap
2. Reset Semua — hapus semua, mulai fresh (seed ulang 8 kategori)

Keduanya pakai soft delete + konfirmasi typed text.

Baca CONCEPT.md Bagian 3.8 untuk detail.

---

4. Aturan Git & Commit

4.1 Commit Messages

Format: Conventional Commits sederhana:

```
<type>(<scope>): <subject>
```

Type: feat, fix, refactor, docs, chore, style, perf, test

Contoh:

· feat(fase-5): add split bill form modal
· fix(auth): resolve session persist bug
· fix(split-loan): correct debt direction (primary = debtor)
· refactor(store): migrate wallet store to service layer
· docs: add ARCHITECTURE.md
· chore: update dependencies

4.2 Commit Granularity

· Satu commit = satu concern/logical change
· Kalau update banyak file untuk satu fitur, boleh gabung 1 commit
· Kalau update banyak file untuk beberapa step berbeda, pisah commit
· Selalu cek git status sebelum commit untuk memastikan file mana yang masuk

4.3 JANGAN Commit

· ❌ .env.local atau .env apapun yang berisi secret
· ❌ node_modules/
· ❌ dist/
· ❌ File yang tidak sengaja ter-generate (.DS_Store, *.log)

.gitignore sudah mengatur ini, tapi tetap verifikasi sebelum commit.

---

5. Aturan Komunikasi

5.1 Kalau Kamu (Developer)…

Situasi Yang Saya Lakukan
Kirim file utuh Saya balikin full code update + ringkasan perubahan
Bilang "lanjut" Saya lanjut berdasarkan file yang pernah kamu kirim sebelumnya
Bilang "gas fitur X" Saya buat file-file baru untuk fitur X (boleh banyak sekaligus)
Lapor error Saya analisis & kirim perbaikan
Tanya konsep Saya baca CONCEPT.md dulu, baru jawab
Bilang "pakai rekomendasi" Saya ambil rekomendasi saya sendiri dan eksekusi

5.2 Kalau Saya (Claude)…

Situasi Yang Saya Lakukan
Tidak yakin dengan konsep Tanya dulu sebelum eksekusi
Butuh keputusan desain Kasih pilihan A/B/C + trade-off
Update file lama Wajib minta file utuh dulu
Ada breaking change Jelaskan dampak sebelum eksekusi
Salah tafsir Akui, minta koreksi, cek CONCEPT.md
Bug dari logika lama Trace dengan angka konkret, jelaskan step-by-step, kirim fix lengkap

---

6. Checklist Sebelum Mulai Kerja

Setiap sesi baru, pastikan:

☐ Sudah baca RULES.md (dokumen ini)
☐ Sudah baca CONCEPT.md (definisi fitur)
☐ Sudah baca ARCHITECTURE.md (layer & pola)
☐ Sudah git status — working tree clean atau ada yang perlu di-commit dulu
☐ Sudah npm run dev — aplikasi jalan tanpa error
☐ Sudah tahu fase sekarang (lihat roadmap di CONCEPT.md Bagian 5)

---

7. Checklist Setelah Selesai Sesi

Sebelum tutup sesi:

☐ Semua file ter-update tersimpan
☐ Verifikasi file baru tidak kosong (wc -l <file> atau stat)
☐ Dev server jalan tanpa error
☐ Commit semua perubahan (git add . && git commit -m "...")
☐ Push ke GitHub (git push origin main)
☐ Vercel deploy sukses (cek dashboard Vercel)
☐ Update CONCEPT.md kalau ada perubahan roadmap/fitur
☐ Update ARCHITECTURE.md kalau ada perubahan arsitektur
☐ Update RULES.md kalau ada aturan baru

---

8. Contoh Skenario & Respons

Skenario 1: "Saya mau update 3 file: a.vue, b.vue, c.vue"

Salah:

"Saya kirim ke-3 file update sekaligus: [kode a] [kode b] [kode c]"

Benar:

"Kirim file a.vue dulu ya, saya update satu per satu. Setelah a.vue OK, baru b.vue."

Skenario 2: "Buatkan fitur baru X"

Benar:

"Oke, saya buat file-file baru untuk fitur X:

1. components/x/XFormModal.vue (baru)
2. views/X.vue (baru)
3. services/x.service.js (baru)

Setelah itu, 2 file lama akan di-update satu per satu (router + dashboard)."

Skenario 3: "Ini error: [paste error]"

Benar:

"Error ini karena [penjelasan]. Perbaikan: [solusi]. Kalau mau, kirim utuh file [X] agar saya balikin versi fix-nya."

Skenario 4: "File tidak muncul / error 'At least one script/template'"

Benar:

"File [X] kosong. Timpa ulang dengan heredoc:

```bash
cat > src/path/file.vue << 'VUE_EOF'
[kode lengkap]
VUE_EOF
```

Lalu restart dev server: rm -rf node_modules/.vite && npm run dev"

Skenario 5: "Bug saldo aneh setelah pelunasan"

Benar:

"Mari saya trace dengan angka konkret:

· Setup: D1=100k, D2=50k, expense D2 70k (D2=primary, D1=talangan 20k loan)
· Setelah expense: D1=80k, D2=0 ✅
· Setelah income D2 50k: D2=50k ✅
· Setelah pelunasan 20k dari D2: [trace logic step by step]

Root cause: [jelaskan]. Fix: [kirim file fix]."

---

9. Riwayat Revisi

Tanggal Perubahan
2026-11-11 Dokumen dibuat. Mengakomodasi semua aturan yang sudah disepakati sejak Fase 1.
2026-11-12 Revisi 1: Tambah 1.5 (Aturan File Baru & Kosong), 2.9 (Debt Direction), 2.10 (Wallet Temporer), 2.11 (Pelunasan Debt), 2.12 (Reset Data). Update 2.1 (Dexie field baru tanpa ubah schema), 2.2 (circular dependency), 2.3 (constants baru). Tambah Section 3.4 & 3.5. Update checklist & skenario error.

---

© Alda 2026

Terakhir diperbarui: 2026-11-12

```