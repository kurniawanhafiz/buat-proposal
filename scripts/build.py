#!/usr/bin/env python3
"""Satu perintah untuk seluruh alur: cek isi -> bangun docx -> isi daftar isi -> validasi.

Pemakaian:
  python3 scripts/build.py content.json hasil/Proposal_Judul.docx [--tabel] [--strict] [--preview]

  --tabel     cetak tabel status referensi
  --strict    peringatan ikut menghentikan build
  --preview   render PNG cover, daftar isi, halaman Bab I, dan halaman terakhir (perlu LibreOffice + pdftoppm)
"""
import argparse
import glob
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile

from lxml import etree

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def run(cmd, **kw):
    return subprocess.run(cmd, **kw)


def validate(path):
    problems = []
    with zipfile.ZipFile(path) as z:
        bad = z.testzip()
        if bad:
            problems.append(f"zip rusak: {bad}")
        for n in z.namelist():
            if n.endswith(".xml") or n.endswith(".rels"):
                try:
                    etree.fromstring(z.read(n))
                except etree.XMLSyntaxError as e:
                    problems.append(f"XML tidak valid {n}: {e}")
        doc = z.read("word/document.xml").decode("utf8")
        for marker in ("[[TOC]]", "[[LOT]]", "[[LOF]]"):
            if marker in doc:
                problems.append(f"penanda {marker} belum terisi")
        if doc.count("<w:sectPr") < 3:
            problems.append("jumlah section kurang dari 3 (cover, bagian awal, isi)")
    try:
        import docx  # noqa: PLC0415
        docx.Document(path)
    except Exception as e:  # noqa: BLE001
        problems.append(f"python-docx gagal membuka: {e}")
    return problems


def preview(docx_path, outdir):
    if not (shutil.which("soffice") and shutil.which("pdftoppm") and shutil.which("pdftotext")):
        print("PERINGATAN: --preview butuh soffice, pdftoppm, pdftotext; dilewati.")
        return
    tmp = tempfile.mkdtemp(prefix="bp_prev_")
    try:
        prof = "file://" + os.path.join(tmp, "profile")
        run(["soffice", "-env:UserInstallation=" + prof, "--headless", "--convert-to", "pdf", "--outdir", tmp, docx_path],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        pdf = os.path.join(tmp, os.path.splitext(os.path.basename(docx_path))[0] + ".pdf")
        txt = run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True).stdout.split("\f")
        total = len([t for t in txt if t.strip()])
        bab1 = next((i + 1 for i, t in enumerate(txt) if any(l.strip() == "BAB I" for l in t.splitlines())), 2)
        toc = next((i + 1 for i, t in enumerate(txt) if any(l.strip() == "DAFTAR ISI" for l in t.splitlines())), 2)
        picks = sorted({1, toc, bab1, total})
        os.makedirs(outdir, exist_ok=True)
        for p in picks:
            run(["pdftoppm", "-png", "-r", "70", "-f", str(p), "-l", str(p), pdf, os.path.join(outdir, f"hal{p:02d}")], check=True)
        print(f"Preview ({len(picks)} halaman dari {total}) di {outdir}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("content")
    ap.add_argument("out")
    ap.add_argument("--tabel", action="store_true")
    ap.add_argument("--strict", action="store_true")
    ap.add_argument("--preview", action="store_true")
    a = ap.parse_args()
    out = a.out if a.out.lower().endswith(".docx") else a.out + ".docx"
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)

    cmd = [sys.executable, "-I", os.path.join(HERE, "check_content.py"), a.content]
    if a.tabel:
        cmd.append("--tabel")
    if a.strict:
        cmd.append("--strict")
    if run(cmd).returncode != 0:
        sys.exit("Build dihentikan: perbaiki galat di atas.")

    if not shutil.which("node"):
        sys.exit("GALAT: Node.js tidak ditemukan (butuh Node 18+).")
    tmp = tempfile.mkdtemp(prefix="bp_build_")
    try:
        raw, outline = os.path.join(tmp, "mentah.docx"), os.path.join(tmp, "outline.json")
        r = run(["node", os.path.join(HERE, "build_proposal.js"), os.path.abspath(a.content), raw, outline], cwd=ROOT)
        if r.returncode != 0:
            sys.exit("Build dihentikan: lihat pesan GALAT build di atas. Bila 'Cannot find module docx', jalankan: npm install")
        r = run([sys.executable, "-I", os.path.join(HERE, "finalize.py"), raw, outline, out])
        if r.returncode != 0:
            sys.exit("Build dihentikan: finalize gagal.")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    problems = validate(out)
    for p in problems:
        print("GALAT validasi:", p)
    if problems:
        sys.exit(1)
    print(f"Selesai: {out}")
    if a.preview:
        preview(out, os.path.splitext(out)[0] + "_preview")


if __name__ == "__main__":
    main()
