# Skema content.json

Contoh lengkap: `examples/contoh_content.json`. Semua teks memakai Indonesia baku. Di dalam teks: `*miring*` untuk huruf miring, `$...$` untuk rumus sebaris (LaTeX), `\$` untuk tanda dolar biasa. Judul bab dan subbab **tanpa nomor**.

```json
{
  "meta": {
    "jenis": "penelitian",
    "jenis_penelitian": "kuantitatif",
    "judul": "Judul Penelitian",
    "nama": "Nama Mahasiswa",
    "nim": "( NIM )",
    "dosen": "Nama Dosen, M.Kom.",
    "kota": "Pekanbaru",
    "tahun": "2026",
    "bulan_tahun": "November 2026",
    "maks_tabel": 5,
    "ref_config": {
      "jumlah_min": 10, "jumlah_maks": 15,
      "min_indonesia": 3, "min_jurnal_persen": 70,
      "umur_maks_tahun": 5,
      "pengecualian_tahun": ["Facione (1990)"]
    }
  },
  "kata_pengantar": ["paragraf 1", "paragraf 2", "paragraf 3"],
  "bab": [
    { "judul": "Pendahuluan",
      "sections": [
        { "judul": "Latar Belakang", "blocks": [ { "t": "p", "text": "..." } ],
          "subs": [ { "judul": "Sub-subbab", "blocks": [] } ] }
      ] }
  ],
  "lampiran": [ { "judul": "Kisi-Kisi Kuesioner", "blocks": [] } ],
  "daftar_pustaka": ["Penulis, A. (2024). Judul. *Jurnal*, *1*(1), 1–10. https://doi.org/..."],
  "verifikasi_referensi": [
    { "ref": "Penulis, A. (2024)", "jenis": "jurnal", "bahasa": "id",
      "ditemukan_lewat": "pencarian web", "dicek_lewat": "laman OJS jurnal" }
  ],
  "sumber_dibuang": [ { "sumber": "Nama sumber", "alasan": "tidak bisa diverifikasi" } ]
}
```

## meta

| Kunci | Keterangan |
|---|---|
| `jenis` | `penelitian` (default) atau `skripsi`. Skripsi: cover "PROPOSAL SKRIPSI" dan halaman data pengusul (isi lewat `meta.pengusul`: `bidang_ilmu`, `matkul_terkait`, `sks_wajib`, `sks_lulus`, `sks_perlu`, `sks_d`, `ipk`). |
| `jenis_penelitian` | `kuantitatif` (default), `kualitatif`, `pengembangan`. Kuantitatif mewajibkan subbab "Hipotesis". |
| `judul` | Wajib. `\n` memecah baris judul di cover. |
| `nama`, `nim`, `dosen` | Kosong = placeholder. `dosen` tampil di cover ("Dosen Pengampu" atau "Calon Pembimbing"). |
| `prodi`, `fakultas`, `universitas` | Default PS Sistem Informasi, FMIPA, Universitas Riau. String kosong menyembunyikan baris. |
| `kota`, `tahun`, `bulan_tahun` | Untuk cover dan penutup kata pengantar. |
| `logo`, `logo_cm` | Path logo (relatif terhadap content.json) dan lebarnya; default `assets/logo_unri.png`, 5 cm. |
| `cover_size_pt` | Ukuran huruf cover, default 14. |
| `maks_tabel` | Batas jumlah tabel (default 5). |
| `lewati_sitasi` | Daftar teks yang tampak seperti sitasi tetapi bukan (mis. `"Tahun (2024)"`). |
| `ref_config` | Syarat referensi: `jumlah_min`/`jumlah_maks` (atau `jumlah`), `tahun_min` atau `umur_maks_tahun`, `min_indonesia`, `min_jurnal_persen`, `pengecualian_tahun` (daftar "Nama (tahun)"). |

## Blok isi (`blocks`)

| `t` | Bidang | Catatan |
|---|---|---|
| `p` | `text` | Paragraf. |
| `quote` | `text` | Kutipan langsung 4 baris atau lebih (blok, spasi 1). |
| `list` | `items` | Daftar bernomor 1., 2., ... |
| `ul` | `items` | Daftar berpoin. |
| `table` | `caption`, `headers`, `rows`, opsional `widths` (jumlah 7937), `rata_tengah` (indeks kolom), `sumber` | Keterangan di atas tabel, nomor per bab. `\n` dalam sel memecah paragraf. |
| `image` | `path`, `caption`, opsional `alt`, `width_cm` (12), `max_height_cm` (9), `sumber` | png, jpg, atau gif; keterangan di bawah gambar. |
| `equation` | `latex` (string atau array string), opsional `nomor` (true) | Nomor `(bab.urut)` di kanan. Array = beberapa baris; nomor di baris terakhir. |
| `code` | `text` atau `lines` | Monospasi 10 pt, spasi 1. |

## LaTeX yang didukung

`\frac{a}{b}`, `\sqrt{x}`, `\sqrt[n]{x}`, pangkat `^` dan indeks `_`, `\sum_{i=1}^{n}`, `\left( ... \right)` dan `\left[ ... \right]`, `\text{...}`, `\mathrm{...}`, `\hat{Y}`, `\bar{X}`, huruf Yunani (`\alpha` ... `\omega`, `\Sigma`, `\Delta`, dst.), `\times`, `\cdot`, `\pm`, `\leq`, `\geq`, `\neq`, `\approx`, `\infty`, `\ldots`, `\rightarrow`. Perintah lain, `&`, dan `\\` menghasilkan galat yang jelas; pecah rumus panjang menjadi beberapa blok.

## Penomoran otomatis

Bab: BAB I, II, ... Subbab: 1.1, 1.1.1. Tabel dan gambar: `Tabel 3.1`, `Gambar 2.1`; di lampiran `Tabel L1.1`. Rumus bernomor: `(3.1)`. Nomor ini tertulis oleh skrip, jadi menyisipkan blok di tengah otomatis menggeser nomor berikutnya saat dibangun ulang.
