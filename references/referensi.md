# Mencari dan memverifikasi referensi

Tujuan: setiap sumber di daftar pustaka benar-benar ada, metadatanya cocok, dan klaim yang ditulis sebatas yang dibaca. Kerjakan sebelum menulis isi.

## Syarat default

Bisa diubah per proposal lewat `meta.ref_config`.

- 10-15 sumber; minimal 70% artikel jurnal atau prosiding; terbit 5 tahun terakhir dari tahun berjalan; minimal 3 berbahasa Indonesia.
- Teori dasar yang memang klasik (mis. Facione 1990) boleh lebih lama bila dicatat di `pengecualian_tahun`.
- Hanya sumber yang disitasi masuk daftar pustaka.
- Tidak boleh: buku pelajaran, catatan kuliah, koran, majalah populer, brosur, kamus, ensiklopedia, skripsi mahasiswa lain. Artikel blog atau laman tanpa penulis hanya untuk fakta resmi dari pengembangnya.

## Cara mencari

1. Bila pengguna memberi DOI, tautan, atau PDF, mulai dari situ.
2. Bila tersedia tool pencarian literatur (mis. konektor Consensus atau OpenAlex), pakai dengan filter akses terbuka dan rentang tahun. Bila tidak, pakai pencarian web lalu buka halaman hasilnya. Di lingkungan dengan daftar domain terbatas, buka hanya URL yang muncul dari hasil pencarian atau dari pengguna.
3. Sumber berbahasa Indonesia: cari lewat Garuda, SINTA, DOAJ, situs OJS jurnal, repositori kampus.
4. Cari beberapa sudut sekaligus: variabel bebas, variabel terikat, metode (sampel, uji instrumen), dan konteks (Indonesia, perguruan tinggi).

## Verifikasi (wajib)

- Buka laman asli (DOI, laman jurnal, DOAJ, Garuda) dan cocokkan penulis, tahun, judul, jurnal, volume, nomor, halaman.
- Baca abstrak (atau teks penuh) sebelum memakai angka atau kesimpulan sebuah studi. Bila hanya abstrak yang terbaca, tulis hanya yang ada di abstrak.
- Angka yang hanya muncul di berita, blog, atau ringkasan tidak dipakai; kutip dari studinya sendiri atau tulis kualitatif ("korelasi negatif yang kuat").
- Perhatikan desain studi (korelasional, laporan diri, sampel kecil, asumsi statistik tidak terpenuhi) dan tulis keterbatasannya, bukan hanya hasilnya.
- Jangan mengarang sumber, DOI, halaman, atau penulis. Jangan membuang sumber hanya karena tanpa DOI selama metadata cocok dan lamannya bisa dibuka.
- Hasil tool pencarian belum valid sebelum metadata dan link dicek ke laman asli; judul yang cocok saja tidak cukup.

## Mencatat

`verifikasi_referensi`: tiap sumber dengan `ref` (awal entri pustaka), `jenis` (`jurnal`, `prosiding`, `laporan`, `buku`, `web`, `regulasi`), `bahasa` (`id`/`en`), `ditemukan_lewat`, `dicek_lewat` (apa yang sebenarnya dibuka, jujur bila hanya sebagian). `sumber_dibuang`: sumber yang tidak dipakai beserta alasannya. `python3 scripts/build.py ... --tabel` mencetak tabel status ini untuk ringkasan akhir.

## Format APA 7 ringkas

- Jurnal: `Penulis, A. B., & Penulis, C. (2024). Judul artikel. *Nama Jurnal*, *12*(3), 45–60. https://doi.org/...`
- Laporan: `Penulis, A. (2025). *Judul laporan* (Seri nomor). Penerbit. https://...`
- Buku: `Penulis, A. (2018). *Judul buku* (edisi). Penerbit.`
- Urut abjad menurut nama penulis pertama; nama Indonesia tanpa nama keluarga diurutkan menurut kata terakhir (kecuali pengguna menentukan lain); gelar dihilangkan; satu link per entri yang benar-benar sudah dibuka.
