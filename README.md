# buat-proposal

Skill untuk membuat **proposal penelitian atau proposal skripsi** berbahasa Indonesia dalam format `.docx`, mengikuti Pedoman Penyusunan Skripsi PS Sistem Informasi FMIPA Universitas Riau. Dibuat untuk dipakai oleh asisten AI yang mendukung skill (misalnya Claude Code), tetapi skrip pembangunnya juga bisa dijalankan sendiri dari terminal.

> Skill ini tidak resmi dan tidak berafiliasi dengan Universitas Riau. Aturan diringkas dari dokumen pedoman bertahun 2017; cocokkan dengan pedoman terbaru atau instruksi dosen pembimbing sebelum mengumpulkan.

## Yang dihasilkan

- Cover dengan logo UNRI, halaman data pengusul (proposal skripsi), kata pengantar, daftar isi, daftar tabel, daftar gambar.
- Bab I Pendahuluan, Bab II Tinjauan Pustaka, Bab III Metode Penelitian (termasuk jadwal per minggu), daftar pustaka APA 7, lampiran.
- Tiga jenis penelitian: kuantitatif, kualitatif, pengembangan sistem.
- Format sesuai pedoman: A4, margin 4-4-3-3 cm, Times New Roman 12, spasi 2, penomoran halaman Romawi lalu Arab, tabel dan gambar bernomor per bab, rumus sebagai equation Word.
- Daftar isi berupa field Word yang sudah terisi nomor halaman (bisa dimutakhirkan di Word).
- Pemeriksa isi otomatis: sitasi dan daftar pustaka harus saling cocok, daftar pustaka urut abjad, syarat referensi (jumlah, tahun, jurnal, bahasa), jumlah rumusan sama dengan tujuan, hipotesis untuk penelitian kuantitatif, dan peringatan gaya tulis.

## Pasang

Prasyarat: Node.js 18+, Python 3.9+. Opsional tetapi disarankan: LibreOffice dan `poppler-utils` (untuk mengisi nomor halaman daftar isi dan membuat preview).

```bash
git clone <url-repo-ini> buat-proposal
cd buat-proposal
npm install                      # paket docx
pip install -r requirements.txt  # python-docx, lxml
```

**Sebagai skill Claude Code:** salin atau tautkan folder ini ke `~/.claude/skills/buat-proposal/` (atau `.claude/skills/buat-proposal/` di dalam proyek), lalu minta, misalnya, "buat proposal penelitian tentang ..." atau panggil `/buat-proposal`. Untuk platform lain, unggah folder ini sebagai skill sesuai petunjuk platformnya; pastikan `npm install` sudah dijalankan di folder tersebut.

## Pakai sendiri (tanpa asisten AI)

1. Salin `examples/contoh_content.json` dan isi dengan proposal Anda. Format lengkap ada di `references/schema.md`.
2. Bangun:

   ```bash
   python3 scripts/build.py content.json hasil/Proposal.docx --tabel
   ```

   Opsi: `--strict` (peringatan ikut menghentikan build), `--preview` (PNG cover, daftar isi, halaman Bab I, halaman terakhir).
3. Buka di Word. Bila ada rumus atau nomor halaman daftar isi yang bergeser, klik kanan daftar isi lalu pilih *Update Field*.

Contoh hasil jadi: `examples/Contoh_Proposal.docx` (dari `examples/contoh_content.json`).

## Isi repo

```
SKILL.md                 petunjuk untuk asisten AI
scripts/
  build.py               satu perintah: cek -> bangun -> isi daftar isi -> validasi
  check_content.py       pemeriksa isi
  build_proposal.js      pembangun .docx (docx-js)
  latex_math.js          LaTeX -> equation Word
  finalize.py            mengisi daftar isi/tabel/gambar dari render PDF
references/              skema content.json, rangkuman pedoman, cara verifikasi referensi
assets/logo_unri.png     logo cover
examples/                contoh content.json, gambar, dan hasil .docx
```

## Batasan yang perlu diketahui

- Contoh proposal memakai referensi nyata yang sudah dicek, tetapi tujuannya demonstrasi; verifikasi ulang sebelum dipakai untuk tugas sendiri.
- Nomor halaman daftar isi dihitung dari render LibreOffice. LibreOffice tanpa modul Math tidak menampilkan rumus, sehingga halaman yang berisi rumus bisa bergeser satu baris di Word. Perbarui field di Word untuk hasil akhir.
- Nomor bab, subbab, tabel, gambar, dan rumus ditulis oleh skrip (bukan penomoran otomatis Word). Ubah isi lewat `content.json` lalu bangun ulang agar nomor tetap konsisten.
- Pedoman sumber bertahun 2017 dan memiliki format daftar pustaka sendiri; skill memakai APA 7 secara default.

## Lisensi

MIT, hak cipta Kurniawan Hafiz (lihat `LICENSE`). Logo Universitas Riau milik Universitas Riau dan tidak tercakup lisensi tersebut.
