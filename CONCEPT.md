# Alda — Konsep Aplikasi & Referensi Fitur

> **Dokumen ini adalah sumber kebenaran (source of truth) untuk definisi produk.**
> Setiap kali ada kebingungan tentang "fitur X itu apa", baca dokumen ini dulu.
> Dokumen ini **melengkapi** `README.md` (panduan developer) dan `ARCHITECTURE.md` (detail teknis).

---

## 1. Visi Produk

Alda adalah aplikasi pencatatan keuangan **offline-first** berbasis PWA untuk:

- **Individu** yang ingin mengelola keuangan pribadi
- **Pelaku usaha mikro** (warung, toko, UMKM) yang mencampur kas usaha & pribadi
- **Pengguna multi-device** yang butuh sinkronisasi HP ↔ tablet ↔ desktop

**Prinsip desain:**
- Cepat — input < 3 detik, tanpa loading
- Offline — tetap jalan tanpa sinyal
- Fleksibel — satu dompet bisa dipakai untuk pribadi & usaha
- Transparan — setiap rupiah bisa dilacak asal-usulnya

---

## 2. Konsep Multi-Wallet

Alda mengasumsikan user punya **banyak "kantong uang"** yang perlu dipisah tapi tetap terlihat totalnya.

**Contoh dompet tipikal:**
- Kas Warung (uang tunai usaha)
- Rekening BCA (uang di bank)
- Dompet Pribadi (uang jajan pribadi)
- E-Wallet (GoPay, OVO)
- Tabungan (uang yang disisihkan)

**Prinsip:**
- Semua dompet dijumlahkan = **total kekayaan likuid**
- Transfer antar dompet **tidak** mengubah total (hanya pindah)
- Setiap dompet punya warna & ikon untuk identifikasi cepat

---

## 3. Fitur Inti

### 3.1 Autentikasi (Supabase)
- Login & register dengan email + password
- Session persisten (tidak perlu login ulang tiap buka)
- Multi-device: login di HP & tablet bersamaan, data tersinkron

### 3.2 Manajemen Dompet
- **CRUD dompet**: nama, saldo awal, warna, ikon
- **Transfer antar dompet**: pindah dana tanpa mengubah total kekayaan
- **Soft delete**: hapus dompet tapi histori tetap aman

### 3.3 Transaksi
- **Income** (pemasukan): nominal, tanggal, dompet, kategori, catatan
- **Expense** (pengeluaran): single-wallet, atau otomatis multi-wallet saat saldo kurang (lihat Bagian 4)
- **Transfer**: pindah dana antar dompet

### 3.4 Kategori
- **Kategori default otomatis**: 13 kategori (5 income, 8 expense) ter-seed saat user baru pertama login
- **UI CRUD** di halaman `/categories`: tambah/edit/hapus kategori dengan icon picker
- Kategori punya: nama, jenis (income/expense), ikon (dari Lucide)
- **Kategori selector** di form transaksi menggunakan modal picker (bukan grid terbuka di form) — konsisten dengan field tanggal/waktu

### 3.5 Utang & Piutang
- **Eksternal**: catat utang ke pihak luar (Budi, Koperasi) atau piutang ke orang lain
- **Internal**: catat pinjaman antar dompet sendiri (kas warung pinjam ke tabungan)
- **Pelunasan**: cicilan atau lunas sekaligus

### 3.6 Sinkronisasi & Offline
- Semua operasi tersimpan lokal dulu (Dexie/IndexedDB)
- Sync ke Supabase cloud saat online
- Multi-device: input di HP → muncul di tablet dalam hitungan detik

---

## 4. FITUR "SPLIT BILL" — DEFINISI FINAL

> ⚠️ **BAGIAN INI SERING SALAH TAFSIR. BACA DENGAN TELITI.**

### 4.1 Definisi

**Split Bill = Split Payment (multi-wallet)**

Artinya: **satu transaksi belanja dibayar menggunakan kombinasi beberapa dompet** — dengan opsi per dompet tambahan:
- **Pinjam** → dompet sekunder berutang ke dompet utama (auto-create utang internal)
- **Bukan Pinjam** → beban dibagi biasa (tidak ada utang)

### 4.2 BUKAN Split Bill

- ❌ Bagi tagihan ke teman/anggota (misal "kamu bayar 100k, saya 100k")
- ❌ Pencatatan siapa yang belum bayar ke kita
- ❌ Auto-convert porsi teman ke piutang
- ❌ Fitur sosial / kolaborasi antar user

Kalau butuh fitur seperti di atas, itu masuk **Utang Piutang Eksternal** (fitur 3.5), **bukan** Split Bill.

### 4.3 Skenario Resmi

#### Skenario A — Split dengan Pinjaman

**Kondisi:**
- Belanja: **Rp 300.000**
- Cash: cuma ada **Rp 130.000**
- Tabungan: ada **Rp 400.000**

**Aksi:**
- Cash dipakai Rp 130.000
- Tabungan dipakai Rp 170.000
- Status Tabungan: **PINJAM** ke Cash

**Efek:**
- Cash −130k, Tabungan −170k
- **Auto-generate utang internal**: Tabungan berutang Rp 170.000 ke Cash
- Muncul di halaman `/debts` sebagai utang internal
- Kalau nanti Tabungan bayar utang → muncul di pelunasan

#### Skenario B — Split Tanpa Pinjaman

**Kondisi:**
- Belanja produktif: **Rp 300.000**
- Cash: **Rp 130.000**
- Tabungan: **Rp 170.000** (sisa)

**Aksi:**
- Cash dipakai Rp 130.000
- Tabungan dipakai Rp 170.000
- Status Tabungan: **BUKAN PINJAM**

**Efek:**
- Cash −130k, Tabungan −170k
- **Tidak ada** debt record
- Total kekayaan bersih berkurang Rp 300.000

### 4.4 Relasi ke Fitur yang Sudah Ada

| Fitur | Sudah Ada di | Keterangan |
|---|---|---|
| Multi-wallet expense | `ExpenseModal.vue` | Basis logic |
| Flag `is_loan` per split | `ExpenseModal.vue` | Flag pinjaman |
| Auto-create internal debt | `transactionService.createExpense` | Kalau `is_loan: true` |
| Lihat & lunasi utang internal | `/debts` | Utang yang terbentuk |

**Artinya:**
- Split Bill **bukan fitur DB baru**
- Split Bill adalah **fitur otomatis di dalam `ExpenseModal`**
- Reuse `transactionService.createExpense()` — tidak ada logic baru di backend

### 4.5 Implementasi UX Split Bill

**Tidak ada modal "Split Payment" terpisah.** Split payment **otomatis muncul** di dalam modal `+ Pengeluaran` saat saldo dompet utama tidak cukup.

**Alur `+ Pengeluaran`:**

1. **Isi total belanja**
2. **Pilih tanggal**
3. **Pilih kategori** (via modal picker)
4. **Pilih dompet utama** → nominal dipakai otomatis = min(total, saldo dompet)
5. **Sistem cek:**
   - **Kalau nominal ≤ saldo** → section "Dompet Talangan" **disembunyikan**
   - **Kalau nominal > saldo** → section "Dompet Talangan" **muncul otomatis**:
     * Sistem auto-suggest dompet penutup dengan saldo memadai
     * Nominal talangan auto-fill = kekurangan
     * Toggle switch **Pinjam** (default ON, bisa OFF)
     * Kalau masih kurang → auto-tambah talangan kedua, ketiga, dst (sampai semua dompet terpakai)
6. **Preview saldo before/after** per dompet
7. **Isi catatan** (opsional)
8. **Simpan**

**Karakteristik UX:**
- Talangan bisa **diedit manual** (dompet maupun nominal) setelah auto-suggest
- Kalau user ubah total belanja atau dompet utama → talangan **auto-recalculate**
- Kalau semua dompet sudah dipakai tapi masih kurang → muncul warning merah + submit disabled

**Halaman `/split-bills` (read-only history):**
- Daftar transaksi yang dibayar **>1 wallet**
- Filter: Semua / Dengan Pinjaman / Tanpa Pinjaman
- Summary: Total Split & Total Pinjaman
- Tap transaksi → buka detail (reuse `TransactionDetailModal`)
- **Tidak ada tombol "Split Baru"** — karena split dibuat dari `+ Pengeluaran` biasa
- Akses via link "Riwayat Split →" di section Riwayat Transaksi Dashboard

---

## 5. Roadmap Fase

| Fase | Fitur | Status |
|---|---|---|
| 1 | Setup: Vue + Vite + Tailwind + PWA + Dexie + Supabase + Base UI | ✅ Selesai |
| 2 | Auth + CRUD Dompet + Icon/Color Picker | ✅ Selesai |
| 3 | Transaksi (Income, Expense multi-wallet, Transfer) + Riwayat | ✅ Selesai |
| 3.5 | CRUD Kategori UI (`/categories`) | ✅ Selesai |
| 4 | Utang/Piutang Eksternal & Internal + Pelunasan | ✅ Selesai |
| Refactor | SoC (constants, lib, repos, services, stores, composables) | ✅ Selesai |
| 5 | Split Bill — **terintegrasi di ExpenseModal** (UX-enhanced, bukan modal terpisah) | ✅ Selesai |
| 6 (rencana) | Filter lanjutan, Laporan bulanan, Export CSV | ⬜ Belum |
| 7 (rencana) | Onboarding & tutorial interaktif | ⬜ Belum |

> **Catatan:** Fase 5 awalnya direncanakan sebagai modal terpisah (`SplitBillFormModal`), tapi setelah UX review, diputuskan untuk **melebur ke `ExpenseModal`** sebagai fitur otomatis saat saldo kurang. Modal `SplitBillFormModal` dihapus. Halaman `/split-bills` tetap ada sebagai **riwayat read-only**.

---

## 6. Arsitektur Teknis (Ringkas)

Detail lengkap di `ARCHITECTURE.md`. Ringkasnya:

- **Frontend:** Vue 3 + Vite + Tailwind v4 + Lucide Icons
- **State:** Pinia
- **Local DB:** Dexie.js (IndexedDB)
- **Cloud:** Supabase (PostgreSQL + Auth + RLS)
- **PWA:** vite-plugin-pwa (Workbox)
- **Deploy:** Vercel (auto-deploy dari GitHub)

**Pola offline-first:**
User Action → Store → Dexie (instan) → [background] Sync Engine → Supabase

**Sync:**
- Push: `_pending: true` di Dexie → push ke Supabase
- Pull: `updated_at > last_sync` → tarik dari Supabase
- Konflik: Last-Write-Wins

---

## 7. Batasan & Non-Goals

**Bukan tujuan Alda:**
- ❌ Aplikasi akuntansi double-entry lengkap
- ❌ Multi-user kolaborasi (2 orang input ke buku yang sama)
- ❌ Fitur sosial (bagi tagihan ke teman lewat app, kirim notifikasi, dll)
- ❌ Integrasi bank langsung (rekening otomatis tarik data)
- ❌ Investasi / saham / crypto tracking

**Fitur yang mungkin nanti (tapi belum sekarang):**
- Import CSV dari bank / e-wallet
- Laporan & grafik keuangan
- Multi-currency
- Budget & alert

---

## 8. Glosarium

| Istilah | Definisi |
|---|---|
| **Dompet** | Kantong uang (kas warung, rekening, e-wallet, tabungan) |
| **Saldo Awal** | Saldo dompet saat pertama kali dibuat |
| **Split Payment** | Satu transaksi dibayar >1 dompet |
| **Split Bill** | **= Split Payment** (lihat Bagian 4) |
| **Dompet Utama** | Dompet yang dipakai duluan |
| **Dompet Talangan** | Dompet yang menutup kekurangan (muncul otomatis saat saldo kurang) |
| **Pinjaman Internal** | Utang antar dompet milik user sendiri |
| **Utang Eksternal** | Utang ke pihak luar (orang / koperasi) |
| **Piutang Eksternal** | Uang orang lain yang ada di kita (harus ditagih) |
| **Soft Delete** | Hapus data tapi ditandai `is_deleted: true` (untuk sync) |
| **Last-Write-Wins** | Aturan konflik sync: yang terakhir `updated_at` menang |
| **Seed Default** | Isi otomatis (misal 13 kategori) saat user baru login |

---

## 9. Kontak & Repositori

- **Repo:** `github.com/Ocipsss/alda`
- **Live:** `alda-xxx.vercel.app` *(ganti dengan URL Vercel)*
- **Developer:** *(isi nama)*

---

## 10. Riwayat Revisi

| Tanggal | Perubahan |
|---|---|
| 2026-11-11 | Dokumen dibuat. Mendefinisikan Split Bill secara final (split payment multi-wallet, BUKAN bagi tagihan ke teman). |
| 2026-11-11 | Revisi 1: Tambah 3.4 (Kategori), sisipkan Fase 3.5 di roadmap. |
| 2026-11-11 | **Revisi 2:** Fase 3.5 & 5 selesai. UX Split Bill berubah — tidak lagi modal terpisah, tapi fitur otomatis di `ExpenseModal`. `SplitBillFormModal` dihapus. Halaman `/split-bills` jadi riwayat read-only. Kategori selector jadi modal picker. Update 4.5 (alur UX baru), Section 5 (status roadmap), Section 8 (glosarium: Dompet Utama, Dompet Talangan). |

---

**© Alda 2026**