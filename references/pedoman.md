# Rangkuman aturan penulisan proposal

Sumber: Pedoman Penyusunan Skripsi Program Studi Sistem Informasi FMIPA Universitas Riau ([PDF di situs prodi](https://is3.cloudhost.id/cms-unri/ilkom.fmipa.unri.ac.id/2025/Files_2025_pedoman-skripsi-prodi-sistem-informasi_1750740708_685a2ee4cb0ba.pdf), dokumen bertahun 2017) dan sistematika proposal skripsi umum ([UPI YAI](https://dosen.upi-yai.ac.id/v5/dokumen/materi/050065/110_20241010045104_Sistematika%20Umum%20Penulisan%20Proposal%20Skripsi.pdf)). Rangkuman ini dibuat dari pembacaan otomatis dokumen tersebut. Bila prodi atau dosen memberi pedoman yang lebih baru, ikuti itu dan ubah konstanta di `scripts/build_proposal.js`.

## Isi proposal menurut pedoman prodi

Sampul "Proposal Skripsi", halaman data pengusul, lalu isi: latar belakang, perumusan masalah, batasan masalah, tujuan, manfaat, tinjauan pustaka, metode penelitian, tempat dan jadwal penelitian per minggu, daftar pustaka. Skill ini menyusunnya menjadi Bab I Pendahuluan (latar belakang sampai manfaat), Bab II Tinjauan Pustaka, dan Bab III Metode Penelitian (termasuk tempat, waktu, dan jadwal).

## Sistematika umum yang dipakai sebagai pelengkap

- Bab I: latar belakang yang menampilkan masalah sebagai celah penelitian dengan data dan fakta, rumusan, tujuan, manfaat.
- Bab II: teori pendukung, kerangka konseptual, pengembangan hipotesis.
- Bab III: desain, populasi dan sampel, instrumen, pengumpulan data, teknik analisis.
- Pelengkap: jadwal, daftar pustaka, lampiran (kuesioner bila data primer). Panjang kisaran 20-25 halaman; rujukan banyak berupa jurnal 5 tahun terakhir.

## Format fisik (default skill)

| Hal | Aturan |
|---|---|
| Kertas | A4 |
| Margin | atas 4 cm, kiri 4 cm, kanan 3 cm, bawah 3 cm |
| Huruf | Times New Roman 12; cover dan judul bab 14 tebal huruf besar |
| Spasi | 2 untuk isi; 1 untuk kutipan blok, keterangan tabel/gambar, daftar pustaka |
| Paragraf | rata kiri-kanan, tanpa baris pertama menjorok, antarparagraf satu spasi kosong |
| Subbab | tebal, nomor 1.1 dan 1.1.1 |
| Nomor halaman | kanan bawah; bagian awal Romawi kecil, Bab I dst. Arab mulai 1, lampiran Romawi |
| Tabel/gambar | nomor per bab (Tabel 3.1, Gambar 2.1); judul tabel di atas, judul gambar di bawah |
| Kata ganti | hindari "saya/kami"; boleh di kata pengantar |

## Aturan isi yang diterapkan pemeriksa

- Judul Bab II tidak boleh "Teori Pendukung".
- Rujukan tidak boleh buku pelajaran, catatan kuliah, surat kabar, brosur, majalah populer, kamus, ensiklopedia, dan skripsi mahasiswa lain.
- Peralatan (perangkat keras dan lunak) disebut pada penelitian pengembangan sistem.
- Daftar pustaka hanya memuat sumber yang disitasi; sitasi tanpa entri atau entri tanpa sitasi adalah galat.

## Ketidakpastian yang perlu dicek pengguna

- Pedoman sumber bertahun 2017 dan memuat urutan bagian yang tidak konsisten antar halaman; skill memilih urutan yang paling lazim.
- Pedoman memiliki format daftar pustaka sendiri; skill memakai APA 7 secara default (permintaan pengguna atau dosen bisa mengubahnya).
- Margin, spasi, dan gaya paragraf bisa berbeda per dosen pembimbing.
