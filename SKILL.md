---
name: buat-proposal
description: Membuat proposal penelitian atau proposal skripsi berbahasa Indonesia (.docx) sesuai pedoman PS Sistem Informasi FMIPA Universitas Riau, lengkap dengan cover, Bab I-III, jadwal, daftar isi otomatis, dan daftar pustaka APA 7 yang referensinya diverifikasi. Pakai saat pengguna meminta membuat, melanjutkan, atau merapikan proposal penelitian/skripsi, atau menyebut buat-proposal.
---

# Buat Proposal (PS Sistem Informasi, FMIPA UNRI)

Skill ini mandiri: skrip pembangun .docx, pemeriksa isi, logo, dan contoh ada di folder ini. Jalankan semua perintah dari folder skill (atau pakai path absolut). Dasar aturan: Pedoman Penyusunan Skripsi PS Sistem Informasi FMIPA UNRI (dokumen 2017) dan sistematika proposal umum. Rangkuman aturan ada di `references/pedoman.md`. Bila pengguna memegang pedoman yang lebih baru atau instruksi dosen, instruksi mereka menang atas semua default di sini.

## Alur kerja

1. **Input.** Tanyakan hanya yang belum diberikan, sekaligus dalam satu pesan: topik atau judul, jenis dokumen, jenis penelitian, cakupan bab, nama dan NIM, dosen, syarat referensi, format khusus. Bila pengguna tidak hadir atau tidak menjawab, pakai default dan sebutkan di awal hasil.
2. **Referensi.** Baca `references/referensi.md`, lalu cari dan verifikasi sumber sebelum menulis isi. Jangan menulis klaim berangka sebelum sumbernya dibuka.
3. **Tulis `content.json`** mengikuti `references/schema.md` (baca sekali; contoh lengkap di `examples/contoh_content.json`). Judul bab dan subbab tanpa nomor; nomor dibuat otomatis.
4. **Bangun:**
   ```bash
   python3 scripts/build.py content.json hasil/Proposal_<Judul>.docx --tabel
   ```
   Urutan otomatis: pemeriksaan isi (berhenti bila ada galat), pembangunan .docx, pengisian daftar isi/tabel/gambar dari hasil render, validasi struktur. `--strict` membuat peringatan ikut menghentikan build. `--preview` merender PNG cover, daftar isi, halaman Bab I, dan halaman terakhir.
5. **Perbaiki** semua galat. Tinjau peringatan dan perbaiki bila benar (em dash, pembuka klise, terlalu banyak angka di latar belakang, entri tanpa link).
6. **Cek visual (hemat).** Andalkan validasi skrip; lihat PNG `--preview` hanya bila pengguna meminta atau ada tanda masalah tata letak. Rumus tampil kosong di render bila LibreOffice tidak punya modul Math; itu keterbatasan tampilan, rumus tersimpan sebagai equation Word.
7. **Serahkan** berkas hasil `build.py` dengan SendUserFile (atau tulis ke folder yang diminta). Ringkasan akhir singkat: hal yang perlu diedit pengguna (nama, NIM, bulan-tahun, data pengusul), tabel status referensi dan sumber yang dibuang beserta alasan, bagian yang tidak sempat diverifikasi, satu langkah lanjut yang masuk akal. Sampaikan bahwa nomor halaman daftar isi dihitung dari render LibreOffice dan di Word bisa dimutakhirkan lewat klik kanan daftar isi > Update Field.

## Pilihan awal

- **Jenis dokumen** (`meta.jenis`): `penelitian` (tugas mata kuliah, cover "PROPOSAL PENELITIAN") atau `skripsi` (cover "PROPOSAL SKRIPSI" plus halaman data pengusul). Bila tidak disebut, tanya; bila tak terjawab, pakai `penelitian`.
- **Jenis penelitian** (`meta.jenis_penelitian`): `kuantitatif`, `kualitatif`, atau `pengembangan` (pengembangan sistem, umum di Sistem Informasi). Menentukan isi Bab II dan III.
- **Cakupan:** Bab I-III lengkap dengan jadwal, atau hanya bab yang diminta. Untuk sebagian bab, isi `bab` hanya dengan bab tersebut; cover, kata pengantar, daftar isi, dan daftar pustaka tetap dibuat. Pemeriksa melewati aturan yang bergantung pada bab yang tidak ada.

## Struktur dokumen

**Bagian awal:** cover (halaman i, tanpa nomor tercetak), halaman data pengusul (hanya skripsi), kata pengantar, daftar isi, daftar tabel dan daftar gambar (hanya bila ada). Abstrak, lembar persetujuan, dan pernyataan bebas plagiat tidak dibuat kecuali diminta.

**Cover:** huruf besar tebal Times New Roman 14. Logo `assets/logo_unri.png` (ganti lewat `meta.logo`). Nama dan NIM yang belum diberikan tetap placeholder.

**Kata pengantar:** maksimal dua halaman (pemeriksa memperingatkan di atas 350 kata): syukur, alasan memilih topik tanpa klaim angka, terima kasih kepada dosen, permohonan kritik dan saran. Pakai "penulis", bukan "saya" atau "kami". Penutup dibuat skrip dari `meta.kota`, `meta.bulan_tahun`, `meta.nama`.

**Bab I Pendahuluan** (urutan pedoman): 1.1 Latar Belakang, 1.2 Rumusan Masalah (daftar bernomor), 1.3 Batasan Masalah, 1.4 Tujuan Penelitian (jumlah dan urutan sama dengan rumusan), 1.5 Manfaat Penelitian (Manfaat Teoretis, Manfaat Praktis).

**Bab II Tinjauan Pustaka** (judul bab tidak boleh "Teori Pendukung"):
- Kuantitatif: Landasan Teori (satu sub-subbab per variabel atau konsep), Penelitian Terdahulu (di sini detail studi: sampel, metode, temuan, keterbatasan desain), Kerangka Konseptual (gambar), Hipotesis ($H_0$ dan $H_1$; subbab berjudul memuat kata "Hipotesis" wajib).
- Kualitatif: konsep yang diteliti, penelitian terdahulu, celah yang menuntut eksplorasi. Tanpa hipotesis.
- Pengembangan sistem: teori sistem dan metode pengembangan, perangkat pemodelan (mis. UML), teknologi yang dipakai, penelitian atau sistem sejenis.

**Bab III Metode Penelitian:**
- Kuantitatif: Jenis dan Desain, Tempat dan Waktu, Populasi dan Sampel (teknik sampling, rumus Slovin atau lainnya, bersitasi), Variabel dan Definisi Operasional (tabel), Instrumen dan Pengumpulan Data, Uji Instrumen (validitas, reliabilitas), Teknik Analisis Data (deskriptif, uji asumsi, regresi, uji t, koefisien determinasi, perangkat lunak), Jadwal Penelitian.
- Kualitatif: pendekatan, tempat dan waktu, informan, teknik pengumpulan data, keabsahan data, teknik analisis, jadwal.
- Pengembangan sistem: metode pengembangan dan tahapnya, pengumpulan kebutuhan, perancangan, implementasi, pengujian (mis. black box, UAT/SUS), peralatan perangkat keras dan lunak (pedoman mewajibkan peralatan disebut), tempat dan waktu, jadwal.
- **Jadwal Penelitian** subbab terakhir, berupa tabel per minggu (kolom kegiatan dan minggu; tanda centang memakai "√").

**Bagian akhir:** Daftar Pustaka; Lampiran bila perlu (kuesioner untuk data primer: tawarkan atau buatkan kisi-kisi dan draf pernyataan).

## Format (sudah dipasang skrip; jangan diubah tanpa diminta)

A4, margin atas 4, kiri 4, kanan 3, bawah 3 cm. Times New Roman 12, spasi 2 untuk isi; spasi 1 untuk kutipan blok, keterangan, tabel, dan daftar pustaka. Paragraf rata kiri-kanan tanpa baris pertama menjorok, antarparagraf satu spasi kosong. Judul bab huruf besar tebal 14 tengah ("BAB I" lalu judul), bab baru di halaman baru; subbab tebal 12 rata kiri bernomor 1.1 dan 1.1.1. Nomor halaman kanan bawah: cover i tanpa nomor tercetak, bagian awal Romawi kecil, Bab I sampai Daftar Pustaka angka Arab mulai 1, lampiran Romawi. Tabel dan gambar dinomori per bab ("Tabel 3.1", "Gambar 2.1", lampiran "Tabel L1.1"); keterangan tabel di atas, keterangan gambar di bawah, "Sumber:" di bawahnya. Rumus memakai equation Word (`$...$` sebaris, blok `equation` bernomor). Batas tabel `meta.maks_tabel` (default 5): pakai tabel hanya untuk data yang memang tabular (definisi operasional, jadwal, perbandingan penelitian terdahulu), bukan untuk hal yang cukup satu kalimat. Format lain (spasi 1,5, margin lain) lewat konstanta di bagian atas `scripts/build_proposal.js` untuk dokumen itu saja.

## Gaya menulis

- Indonesia baku, ilmiah, mengalir. Hindari "saya" dan "kami" (kecuali kata pengantar), em dash, pembuka klise ("Dalam era ..."), kata gemar AI (krusial, esensial, komprehensif, holistik), daftar tiga yang dipaksakan, penutup satu kalimat yang menggurui, dan label tebal di dalam paragraf. Variasikan panjang dan awal kalimat.
- **Latar belakang** berbentuk corong: fenomena dengan satu atau dua data kunci bersitasi, pentingnya variabel atau masalah, risiko atau masalah yang ditemukan, hasil penelitian terdahulu yang belum seragam atau celahnya, lalu kebutuhan penelitian di konteks pengguna dan kalimat judul. Maksimal 2-3 angka statistik; rincian sampel dan nilai statistik studi lain pindah ke Bab II.
- **Rumusan masalah** satu per pertanyaan; "apakah berpengaruh" dan "seberapa besar pengaruh" digabung. Tujuan memakai kata kerja sepadan ("Mengetahui", "Menganalisis"). Hipotesis sejalan dengan rumusan inferensial.
- Klaim sebatas yang benar-benar dibaca dari sumber. Sebut keterbatasan desain studi bila relevan (korelasional, laporan diri, sampel kecil, asumsi tidak terpenuhi). Tafsiran sendiri ditulis sebagai pendapat penulis. Parafrase dengan kata sendiri; kutipan langsung hanya bila perlu dan pendek.
- **Sitasi:** Penulis (2023), (Penulis, 2023); dua penulis dengan "dan" atau "&"; tiga atau lebih "dkk." (Indonesia) atau "et al." Sitasi boleh di Bab I, II, dan III (mis. rumus Slovin, instrumen), tidak di jadwal atau batasan yang murni keputusan peneliti. Sitasi harus punya entri pustaka dan sebaliknya (pemeriksa menghentikan build bila tidak).

## Referensi

Aturan lengkap di `references/referensi.md`. Ringkasnya: default 10-15 sumber, minimal 70% jurnal, 5 tahun terakhir, minimal 3 berbahasa Indonesia (ubah lewat `meta.ref_config`); pengecualian tahun untuk teori dasar dicatat di `pengecualian_tahun`; sumber yang dilarang pedoman (buku pelajaran, catatan kuliah, koran, majalah populer, kamus, ensiklopedia, skripsi mahasiswa lain) dibuang; setiap sumber dibuka di laman aslinya dan metadata serta temuan dicocokkan sebelum dipakai; jangan mengarang sumber, DOI, halaman, atau penulis; angka yang hanya muncul di berita atau ringkasan tidak dipakai. Catat di `verifikasi_referensi` dan `sumber_dibuang`.

## Hal yang sering salah

- Menjejalkan angka studi ke Latar Belakang; pindahkan ke Bab II.
- Menaruh nomor di judul bab atau subbab (dobel dengan nomor otomatis).
- Jumlah rumusan dan tujuan berbeda; hipotesis tanpa rumusan yang sepadan.
- Menulis klaim dari berita atau ringkasan tentang sebuah studi tanpa membuka studinya.
- Mengubah format default tanpa diminta; menyerahkan berkas mentah (`mentah.docx`) alih-alih hasil `build.py`.
