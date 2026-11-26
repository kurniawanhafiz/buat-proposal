#!/usr/bin/env python3
"""Pemeriksa content.json proposal (dijalankan otomatis oleh build.py).

Galat menghentikan build; peringatan hanya dilaporkan (atau ikut menghentikan dengan --strict).
Pemakaian: check_content.py content.json [--tabel] [--strict]
"""
import argparse
import datetime
import json
import os
import re
import sys
import unicodedata

BLOCK_TYPES = {"p", "quote", "list", "ul", "table", "image", "equation", "code"}
JENIS_DILARANG = {"skripsi", "buku_ajar", "catatan_kuliah", "berita", "majalah", "ensiklopedia", "kamus", "brosur", "blog"}
JENIS_JURNAL = {"jurnal", "prosiding"}
KATA_AI = ["krusial", "esensial", "komprehensif", "holistik", "menggarisbawahi", "tak terelakkan", "lanskap"]
PEMBUKA_KLISE = [r"^dalam era\b", r"^di era\b", r"^di zaman\b", r"^pada era\b", r"^seiring (dengan )?(berkembangnya|perkembangan)\b"]
STOP_ID = {"yang", "dan", "di", "dari", "terhadap", "pada", "untuk", "dengan", "pengaruh", "analisis", "penggunaan", "sebagai", "dalam", "antara", "tentang"}

errors, warnings = [], []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9 ]", "", s)


def inline_checks(text, where):
    if text.count("*") % 2:
        err(f"{where}: tanda * tidak berpasangan: {text[:50]!r}")
    dollars = len(re.findall(r"(?<!\\)\$", text))
    if dollars % 2:
        err(f"{where}: tanda $ tidak berpasangan: {text[:50]!r}")
    if "—" in text:
        warn(f"{where}: ada em dash (—); ganti dengan koma, titik, atau tanda kurung.")
    if "**" in text:
        warn(f"{where}: huruf tebal ** di dalam teks tidak didukung.")


def latex_checks(src, where):
    if not src.strip():
        err(f"{where}: rumus kosong.")
        return
    if src.count("{") != src.count("}"):
        err(f"{where}: kurung kurawal rumus tidak seimbang: {src[:50]!r}")
    if "&" in src.replace("\\&", ""):
        err(f"{where}: tanda & (perataan) tidak didukung; pecah menjadi beberapa baris/blok.")
    if "\\\\" in src:
        err(f"{where}: \\\\ tidak didukung; beri latex berupa array string.")


def block_texts(b):
    t = b.get("t")
    if t in ("p", "quote"):
        yield b.get("text", "")
    elif t in ("list", "ul"):
        yield from b.get("items", [])
    elif t == "table":
        yield b.get("caption", "")
        yield b.get("sumber", "") or ""
        for h in b.get("headers", []):
            yield h
        for r in b.get("rows", []):
            yield from r
    elif t == "image":
        yield b.get("caption", "")
        yield b.get("sumber", "") or ""


def walk_sections(content):
    """yield (bab_index, bab, section, sub|None, path) untuk tiap unit teks."""
    for bi, bab in enumerate(content.get("bab", [])):
        for si, s in enumerate(bab.get("sections", [])):
            yield bi, bab, s, None, f"Bab {bi + 1} / {s.get('judul', '?')}"
            for u in s.get("subs", []):
                yield bi, bab, s, u, f"Bab {bi + 1} / {s.get('judul', '?')} / {u.get('judul', '?')}"


def check_blocks(blocks, where, base_dir, counters):
    for k, b in enumerate(blocks or []):
        w = f"{where} blok {k + 1}"
        t = b.get("t")
        if t not in BLOCK_TYPES:
            err(f"{w}: tipe blok tidak dikenal: {t!r}")
            continue
        if t in ("p", "quote") and not str(b.get("text", "")).strip():
            err(f"{w}: teks kosong.")
        if t in ("list", "ul") and not b.get("items"):
            err(f"{w}: daftar tanpa items.")
        if t == "table":
            counters["tabel"] += 1
            if not b.get("caption"):
                err(f"{w}: tabel tanpa caption.")
            cols = len(b.get("headers", []))
            if not cols or not b.get("rows"):
                err(f"{w}: tabel butuh headers dan rows.")
            for r in b.get("rows", []):
                if len(r) != cols:
                    err(f"{w}: baris tabel dengan {len(r)} sel, seharusnya {cols}.")
                    break
            if b.get("widths") and sum(b["widths"]) != 7937:
                warn(f"{w}: jumlah widths {sum(b['widths'])} bukan 7937 (lebar teks); tabel akan disesuaikan Word.")
        if t == "image":
            counters["gambar"] += 1
            if not b.get("caption"):
                err(f"{w}: gambar tanpa caption.")
            p = os.path.join(base_dir, b.get("path", ""))
            if not b.get("path") or not os.path.isfile(p):
                err(f"{w}: file gambar tidak ada: {b.get('path')!r}")
        if t == "equation":
            lines = b["latex"] if isinstance(b.get("latex"), list) else [b.get("latex", "")]
            for ln in lines:
                latex_checks(str(ln), w)
        if t == "code" and not (b.get("text") or b.get("lines")):
            err(f"{w}: blok code kosong.")
        for tx in block_texts(b):
            inline_checks(str(tx), w)


# ---------- sitasi ----------
NARR = re.compile(r"([A-ZÀ-Ý][\w'’\-]+(?:\s+(?:dan|&)\s+[A-ZÀ-Ý][\w'’\-]+|\s+dkk\.|\s+et al\.)?)\s+\((\d{4}[a-z]?)\)")
PAREN = re.compile(r"\(([^()]*?\d{4}[a-z]?[^()]*)\)")
PART = re.compile(r"^(.*?),\s*(\d{4}[a-z]?)$")


def extract_citations(text):
    cites = []
    for m in NARR.finditer(text):
        cites.append((m.group(1), m.group(2)))
    for g in PAREN.finditer(text):
        for part in g.group(1).split(";"):
            pm = PART.match(part.strip())
            if pm:
                cites.append((pm.group(1).strip(), pm.group(2)))
    return cites


def first_author_word(name):
    name = re.sub(r"^(lihat|misalnya|mis\.|cf\.|seperti dalam)\s+", "", name.strip(), flags=re.I)
    return norm(name.split()[0]) if name.split() else ""


def entry_info(entry):
    m = re.search(r"\((\d{4}[a-z]?)(?:,[^)]*)?\)|\((n\.d\.)\)", entry)
    year = (m.group(1) or "") if m else ""
    author = entry[: m.start()] if m else entry.split(".")[0]
    return norm(author), year


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("content")
    ap.add_argument("--tabel", action="store_true")
    ap.add_argument("--strict", action="store_true")
    a = ap.parse_args()
    base_dir = os.path.dirname(os.path.abspath(a.content))
    try:
        c = json.load(open(a.content, encoding="utf8"))
    except Exception as e:  # noqa: BLE001
        print(f"GALAT: content.json tidak bisa dibaca: {e}")
        sys.exit(1)

    m = c.get("meta") or {}
    for k in ("judul",):
        if not m.get(k):
            err(f"meta.{k} wajib diisi.")
    if m.get("jenis", "penelitian") not in ("penelitian", "skripsi"):
        err("meta.jenis harus 'penelitian' atau 'skripsi'.")
    jp = m.get("jenis_penelitian", "kuantitatif")
    if jp not in ("kuantitatif", "kualitatif", "pengembangan"):
        err("meta.jenis_penelitian harus 'kuantitatif', 'kualitatif', atau 'pengembangan'.")
    year_now = datetime.date.today().year

    # kata pengantar
    kp = c.get("kata_pengantar") or []
    if not kp:
        err("kata_pengantar kosong.")
    words = sum(len(str(p).split()) for p in kp)
    if words > 350:
        warn(f"kata_pengantar {words} kata; pedoman membatasi dua halaman (sekitar 350 kata pada spasi 2).")
    for p in kp:
        inline_checks(str(p), "kata_pengantar")

    # bab
    babs = c.get("bab") or []
    if not babs:
        err("bab kosong.")
    counters = {"tabel": 0, "gambar": 0}
    cite_texts = []   # (where, text) untuk bagian yang boleh bersitasi
    latar_text = ""
    roles = {"rumusan": None, "tujuan": None, "hipotesis": False, "jadwal": False, "populasi": False}
    for bi, bab in enumerate(babs):
        if not bab.get("judul"):
            err(f"Bab {bi + 1}: judul kosong.")
        if re.match(r"^\s*(bab\s+[ivx]+|\d+(\.\d+)*[.\s])", str(bab.get("judul", "")), re.I):
            err(f"Bab {bi + 1}: judul tidak boleh memuat nomor ('{bab.get('judul')}'); nomor dibuat otomatis.")
        if re.search(r"teori pendukung", str(bab.get("judul", "")), re.I):
            err(f"Bab {bi + 1}: pedoman melarang judul 'Teori Pendukung'; pakai 'Tinjauan Pustaka'.")
        if not bab.get("sections"):
            err(f"Bab {bi + 1}: tanpa sections.")
    for bi, bab, s, u, where in walk_sections(c):
        unit = u if u is not None else s
        ttl = str(unit.get("judul", ""))
        if re.match(r"^\s*\d+(\.\d+)*[.\s]", ttl):
            err(f"{where}: judul subbab tidak boleh memuat nomor.")
        if not ttl.strip():
            err(f"{where}: judul subbab kosong.")
        check_blocks(unit.get("blocks"), where, base_dir, counters)
        low = norm(ttl)
        if u is None:
            if "rumusan masalah" in low:
                roles["rumusan"] = next((b for b in s.get("blocks", []) if b.get("t") == "list"), None)
            if re.search(r"\btujuan\b", low):
                roles["tujuan"] = next((b for b in s.get("blocks", []) if b.get("t") == "list"), None)
        if "hipotesis" in low:
            roles["hipotesis"] = True
        if "jadwal" in low:
            roles["jadwal"] = True
        if "populasi" in low:
            roles["populasi"] = True
        for b in unit.get("blocks", []) or []:
            for tx in block_texts(b):
                cite_texts.append((where, str(tx)))
                if "latar belakang" in low:
                    latar_text += " " + str(tx)
        # pembuka klise dan gaya
        for b in unit.get("blocks", []) or []:
            if b.get("t") == "p":
                tx = str(b.get("text", ""))
                for pat in PEMBUKA_KLISE:
                    if re.search(pat, tx.strip(), re.I):
                        warn(f"{where}: pembuka klise: {tx[:40]!r}")
                for kata in KATA_AI:
                    if re.search(r"\b" + re.escape(kata) + r"\b", tx, re.I):
                        warn(f"{where}: kata yang sering terkesan AI: '{kata}'.")
                if re.search(r"\b(saya|kami)\b", tx, re.I):
                    warn(f"{where}: kata 'saya/kami' dihindari di luar kata pengantar (pedoman).")
    for l in c.get("lampiran", []) or []:
        check_blocks(l.get("blocks"), f"Lampiran {l.get('judul', '?')}", base_dir, counters)

    maks_tabel = m.get("maks_tabel", 5)
    if counters["tabel"] > maks_tabel:
        err(f"Ada {counters['tabel']} tabel, melebihi meta.maks_tabel={maks_tabel}. Ubah tabel kecil menjadi kalimat.")

    # rumusan vs tujuan
    if roles["rumusan"] is not None and roles["tujuan"] is not None:
        nr, nt = len(roles["rumusan"].get("items", [])), len(roles["tujuan"].get("items", []))
        if nr != nt:
            err(f"Jumlah rumusan masalah ({nr}) berbeda dari jumlah tujuan ({nt}).")
    else:
        warn("Subbab 'Rumusan Masalah' atau 'Tujuan' berisi daftar bernomor tidak ditemukan; pemeriksaan kesesuaian dilewati.")
    if jp == "kuantitatif" and len(babs) >= 2 and not roles["hipotesis"]:
        err("Penelitian kuantitatif membutuhkan subbab 'Hipotesis' (biasanya di Bab II).")
    if len(babs) >= 3 and not roles["jadwal"]:
        warn("Tidak ada subbab 'Jadwal Penelitian' (pedoman mewajibkan jadwal).")
    if jp == "kuantitatif" and len(babs) >= 3 and not roles["populasi"]:
        warn("Bab III kuantitatif biasanya memuat subbab 'Populasi dan Sampel'.")

    # terlalu banyak angka di latar belakang
    nums = (len(re.findall(r"\d+(?:[.,]\d+)?\s?%", latar_text))
            + len(re.findall(r"\b[rR]²?\s?=\s?[−\-]?\d", latar_text))
            + len(re.findall(r"\d[\d.,]*\s+(?:mahasiswa|responden|partisipan|siswa|orang|sitasi|peserta)", latar_text)))
    if nums > 4:
        warn(f"Latar belakang memuat {nums} angka statistik; sisakan 2-3 data kunci dan pindahkan rincian studi ke Bab II.")

    # ---------- referensi ----------
    pustaka = c.get("daftar_pustaka") or []
    ver = c.get("verifikasi_referensi") or []
    cfg = m.get("ref_config") or {}
    if not pustaka:
        err("daftar_pustaka kosong.")
    infos = [entry_info(e) for e in pustaka]
    for i, e in enumerate(pustaka):
        inline_checks(str(e), f"daftar_pustaka[{i}]")
        if not re.search(r"https?://", e):
            warn(f"daftar_pustaka[{i}] tanpa link/DOI: {e[:50]!r}")
    # urutan abjad
    keys = [norm(str(e).split("(")[0]) for e in pustaka]
    for i in range(len(keys) - 1):
        if keys[i] > keys[i + 1]:
            err(f"daftar_pustaka tidak urut abjad: {pustaka[i][:30]!r} sebelum {pustaka[i + 1][:30]!r}")
    if len(set(keys)) != len(keys) and len(set(zip(keys, [i[1] for i in infos]))) != len(keys):
        warn("Ada entri pustaka dengan penulis dan tahun sama; beri akhiran a, b pada tahun bila memang berbeda karya.")

    skip = set(m.get("lewati_sitasi", []))
    cited = set()
    for where, tx in cite_texts:
        for name, yr in extract_citations(tx):
            if f"{name} ({yr})" in skip or name in skip:
                continue
            fw = first_author_word(name)
            hit = [i for i, (au, y) in enumerate(infos) if y == yr and au.startswith(fw)]
            if not hit:
                err(f"{where}: sitasi '{name} ({yr})' tidak punya entri di daftar pustaka.")
            else:
                cited.add(hit[0])
    for i, e in enumerate(pustaka):
        if i not in cited:
            err(f"daftar_pustaka[{i}] tidak disitasi di isi: {e[:50]!r}")

    # verifikasi dan syarat
    def find_ver(entry):
        for v in ver:
            if entry.startswith(v.get("ref", "\0")):
                return v
        return None

    rows = []
    n_jurnal = n_id = 0
    tahun_min = cfg.get("tahun_min", year_now - cfg.get("umur_maks_tahun", 5))
    pengecualian = set(cfg.get("pengecualian_tahun", []))
    for i, e in enumerate(pustaka):
        au, yr = infos[i]
        v = find_ver(e)
        if v is None:
            warn(f"daftar_pustaka[{i}] tidak ada di verifikasi_referensi: {e[:40]!r}")
        jenis = (v or {}).get("jenis", "")
        bahasa = (v or {}).get("bahasa", "")
        if not bahasa:
            title_words = set(norm(e).split())
            bahasa = "id" if len(title_words & STOP_ID) >= 2 else "en"
        if jenis in JENIS_DILARANG:
            err(f"daftar_pustaka[{i}] berjenis '{jenis}', dilarang diacu oleh pedoman: {e[:40]!r}")
        if jenis in JENIS_JURNAL:
            n_jurnal += 1
        if bahasa == "id":
            n_id += 1
        ym = re.match(r"(\d{4})", yr or "")
        if ym and int(ym.group(1)) < tahun_min:
            first = au.split()[0] if au.split() else ""
            if not any(norm(x.split("(")[0]).startswith(first) and x.rstrip(")").endswith(ym.group(1)) for x in pengecualian):
                err(f"daftar_pustaka[{i}] terbit {ym.group(1)}, lebih lama dari tahun_min {tahun_min}; tambahkan ke ref_config.pengecualian_tahun bila memang teori dasar.")
        rows.append((e.split(".")[0][:28], yr or "-", jenis or "-", bahasa, (v or {}).get("dicek_lewat", "-")))
    n = len(pustaka)
    jmin, jmax = cfg.get("jumlah_min", 10), cfg.get("jumlah_maks", 15)
    if "jumlah" in cfg:
        jmin = jmax = cfg["jumlah"]
    if n < jmin or n > jmax:
        err(f"Jumlah referensi {n}, di luar syarat {jmin}-{jmax}.")
    min_id = cfg.get("min_indonesia", 3)
    if n_id < min_id:
        err(f"Referensi berbahasa Indonesia {n_id}, kurang dari {min_id}.")
    pj = cfg.get("min_jurnal_persen", 70)
    if n and ver and (100 * n_jurnal / n) < pj:
        err(f"Artikel jurnal {n_jurnal}/{n} ({100 * n_jurnal // n}%), kurang dari {pj}%. Isi 'jenis' di verifikasi_referensi atau tambah jurnal.")
    if not ver:
        warn("verifikasi_referensi kosong; syarat jurnal dan bahasa tidak bisa dipastikan.")

    if a.tabel:
        print(f"{'Referensi':30} {'Tahun':6} {'Jenis':10} {'Bhs':4} Dicek lewat")
        for r in rows:
            print(f"{r[0]:30} {r[1]:6} {r[2]:10} {r[3]:4} {r[4]}")
        print(f"Total {n} | jurnal {n_jurnal} | Indonesia {n_id} | tahun_min {tahun_min}")
        for s in c.get("sumber_dibuang", []) or []:
            print(f"Dibuang: {s.get('sumber')} ({s.get('alasan')})")
        print()

    for w in dict.fromkeys(warnings):
        print("PERINGATAN:", w)
    for e in dict.fromkeys(errors):
        print("GALAT:", e)
    if errors or (a.strict and warnings):
        print(f"\n{len(errors)} galat, {len(warnings)} peringatan.")
        sys.exit(1)
    print(f"Isi lolos pemeriksaan ({len(warnings)} peringatan).")


if __name__ == "__main__":
    main()
