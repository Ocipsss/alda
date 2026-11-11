📄 RULES.md

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

---

## 2. Aturan Teknis Alda

### 2.1 Dexie Schema

- ❌ **JANGAN** pakai `db.version(N).stores(...)` — cukup satu blok `db.version(1).stores(...)`
- **Alasan:** masih fase development, belum butuh migrasi versioned
- Kalau butuh tambah/ubah index, edit blok yang sama, bukan tambah `.version(2)`

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
· DEFAULT_CATEGORIES
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

---

3. Aturan Konsep Produk

3.1 Split Bill

Split Bill = Split Payment (multi-wallet), BUKAN bagi tagihan ke teman.

Baca detail lengkap di CONCEPT.md Bagian 4. Jangan salah tafsir lagi.

Kalau ada pertanyaan serupa, baca CONCEPT.md dulu sebelum eksekusi.

3.2 Utang Piutang Eksternal

Fitur bagi tagihan ke orang / tracking siapa bayar masuk ke modul Utang Piutang Eksternal (Fase 4), bukan Split Bill.

3.3 Non-Goals

Alda bukan:

· Aplikasi akuntansi double-entry
· Multi-user kolaborasi
· Fitur sosial (kirim tagihan, notifikasi teman)
· Integrasi bank langsung

Detail di CONCEPT.md Bagian 7.

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

5.2 Kalau Saya (Claude)…

Situasi Yang Saya Lakukan
Tidak yakin dengan konsep Tanya dulu sebelum eksekusi
Butuh keputusan desain Kasih pilihan A/B/C + trade-off
Update file lama Wajib minta file utuh dulu
Ada breaking change Jelaskan dampak sebelum eksekusi
Salah tafsir Akui, minta koreksi, cek CONCEPT.md

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
☐ Dev server jalan tanpa error
☐ Commit semua perubahan (git add . && git commit -m "...")
☐ Push ke GitHub (git push origin main)
☐ Vercel deploy sukses (cek dashboard Vercel)
☐ Update CONCEPT.md kalau ada perubahan roadmap
☐ Update ARCHITECTURE.md kalau ada perubahan arsitektur

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

---

9. Riwayat Revisi

Tanggal Perubahan
2026-11-11 Dokumen dibuat. Mengakomodasi semua aturan yang sudah disepakati sejak Fase 1.

---

© Alda 2026

Terakhir diperbarui: 2026-11-11

```

📁 Struktur Dokumentasi Lengkap

Setelah ini, project punya 4 dokumen di root:

File Isi Prioritas Baca
RULES.md Aturan kerja sama & konvensi teknis 🥇 Paling penting — baca dulu
CONCEPT.md Visi produk & definisi fitur 🥈 Kedua
ARCHITECTURE.md Detail teknis & layer SoC 🥉 Ketiga
README.md Overview singkat & cara install Opsional untuk developer baru

---