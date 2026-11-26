#!/usr/bin/env python3
"""Mengisi Daftar Isi, Daftar Tabel, dan Daftar Gambar pada docx hasil build_proposal.js.

Penanda [[TOC]], [[LOT]], [[LOF]] diganti field TOC Word yang sudah berisi hasil
(teks + nomor halaman), jadi tetap bisa diperbarui di Word lewat klik kanan > Update Field.
Nomor halaman dihitung dari render PDF (LibreOffice). Tanpa LibreOffice, daftar diisi
tanpa nomor dan dokumen ditandai agar Word memperbarui field saat dibuka.

Pemakaian: finalize.py masuk.docx outline.json keluar.docx
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

from lxml import etree

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W}
XML_SPACE = "{http://www.w3.org/XML/1998/namespace}space"


def q(tag):
    return "{%s}%s" % (W, tag)


def roman(n):
    out = ""
    for r, v in [("m", 1000), ("cm", 900), ("d", 500), ("cd", 400), ("c", 100), ("xc", 90), ("l", 50),
                 ("xl", 40), ("x", 10), ("ix", 9), ("v", 5), ("iv", 4), ("i", 1)]:
        while n >= v:
            out += r
            n -= v
    return out


# ---------- XML ----------
def run_text(text):
    r = etree.Element(q("r"))
    t = etree.SubElement(r, q("t"))
    t.set(XML_SPACE, "preserve")
    t.text = text
    return r


def run_fld(kind):
    r = etree.Element(q("r"))
    f = etree.SubElement(r, q("fldChar"))
    f.set(q("fldCharType"), kind)
    return r


def run_instr(text):
    r = etree.Element(q("r"))
    i = etree.SubElement(r, q("instrText"))
    i.set(XML_SPACE, "preserve")
    i.text = text
    return r


def run_tab():
    r = etree.Element(q("r"))
    etree.SubElement(r, q("tab"))
    return r


def make_entries(entries, instr, style_for):
    """entries: list of (text, level, page_label). Mengembalikan daftar w:p dengan satu field TOC utuh."""
    paras = []
    for idx, (text, level, page) in enumerate(entries):
        p = etree.Element(q("p"))
        ppr = etree.SubElement(p, q("pPr"))
        ps = etree.SubElement(ppr, q("pStyle"))
        ps.set(q("val"), style_for(level))
        if idx == 0:
            p.append(run_fld("begin"))
            p.append(run_instr(instr))
            p.append(run_fld("separate"))
        p.append(run_text(text))
        p.append(run_tab())
        p.append(run_text(page))
        if idx == len(entries) - 1:
            p.append(run_fld("end"))
        paras.append(p)
    return paras


def para_text(p):
    return "".join(t.text or "" for t in p.iter(q("t")))


def replace_marker(body, marker, new_paras):
    for p in body.iter(q("p")):
        if para_text(p).strip() == marker:
            parent = p.getparent()
            pos = parent.index(p)
            parent.remove(p)
            for k, np_ in enumerate(new_paras):
                parent.insert(pos + k, np_)
            return True
    return False


# ---------- docx ----------
def read_zip(path):
    with zipfile.ZipFile(path) as z:
        return [(i, z.read(i.filename)) for i in z.infolist()]


def write_zip(path, items):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for info, data in items:
            z.writestr(info.filename, data)


def inject(src_items, outline, pages, mark_update):
    """Kembalikan items baru dengan daftar terisi. pages: dict kunci -> label halaman (str)."""
    items = []
    for info, data in src_items:
        if info.filename == "word/document.xml":
            root = etree.fromstring(data)
            body = root.find(q("body"))
            entries = [("HALAMAN SAMPUL", 1, pages.get(("e", -1), "i"))]
            for i, e in enumerate(outline["entries"]):
                entries.append((e["text"], e["level"], pages.get(("e", i), "")))
            replace_marker(body, "[[TOC]]", make_entries(entries, ' TOC \\o "1-3" \\h \\z \\u ', lambda lv: "TOC%d" % min(max(lv, 1), 3)))
            for key, marker, label in (("Tabel", "[[LOT]]", "Tabel"), ("Gambar", "[[LOF]]", "Gambar")):
                caps = outline["captions"].get(key, [])
                if caps:
                    ents = [(c["text"], 1, pages.get(("c", key, i), "")) for i, c in enumerate(caps)]
                    replace_marker(body, marker, make_entries(ents, ' TOC \\h \\z \\c "%s" ' % label, lambda lv: "TableofFigures"))
            data = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)
        elif info.filename == "word/settings.xml" and mark_update:
            root = etree.fromstring(data)
            if root.find(q("updateFields")) is None:
                u = etree.Element(q("updateFields"))
                u.set(q("val"), "true")
                root.append(u)
            data = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)
        items.append((info, data))
    return items


# ---------- render ----------
def have_soffice():
    return shutil.which("soffice") is not None and shutil.which("pdftotext") is not None


def render_pages(docx_path):
    """Kembalikan list teks per halaman PDF."""
    tmp = tempfile.mkdtemp(prefix="bp_render_")
    try:
        prof = "file://" + os.path.join(tmp, "profile")
        subprocess.run(["soffice", "-env:UserInstallation=" + prof, "--headless", "--convert-to", "pdf", "--outdir", tmp, docx_path],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
        pdf = os.path.join(tmp, os.path.splitext(os.path.basename(docx_path))[0] + ".pdf")
        out = subprocess.run(["pdftotext", "-layout", pdf, "-"], check=True, capture_output=True, text=True).stdout
        pages = out.split("\f")
        if pages and not pages[-1].strip():
            pages.pop()
        return pages
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def norm(s):
    return re.sub(r"\s+", " ", s).strip()


def locate(outline, pages_txt):
    """Hitung label halaman untuk tiap entri. Mengembalikan (dict, catatan)."""
    notes = []
    lines = [[l.strip() for l in p.splitlines() if l.strip()] for p in pages_txt]
    joined = [norm(p) for p in pages_txt]
    n = len(pages_txt)

    first_bab = next((i for i, e in enumerate(outline["entries"]) if e["kind"] == "main"), None)
    main_start = None
    if first_bab is not None:
        key = " ".join(outline["entries"][first_bab]["text"].split()[:2])   # "BAB I"
        for p in range(1, n):
            if key in lines[p]:     # judul bab selalu satu baris sendiri; entri daftar isi memuat titik penuntun
                main_start = p
                break
    res = {("e", -1): "i"}
    last = 1
    lamp_start = None
    for i, e in enumerate(outline["entries"]):
        txt = e["text"]
        found = None
        if e["kind"] == "front":
            for p in range(last, (main_start if main_start is not None else n)):
                if txt in lines[p]:
                    found = p
                    break
            if found is not None:
                res[("e", i)] = roman(found + 1)
                last = found
        elif e["kind"] == "main" and main_start is not None:
            for p in range(max(last, main_start), n):
                if txt in joined[p]:
                    found = p
                    break
            if found is not None:
                res[("e", i)] = str(found - main_start + 1)
                last = found
        elif e["kind"] == "lampiran":
            for p in range(max(last, main_start or 0), n):
                if txt in joined[p]:
                    found = p
                    break
            if found is not None:
                if lamp_start is None:
                    lamp_start = found
                res[("e", i)] = roman(found - lamp_start + 1)
                last = found
        if found is None:
            notes.append("halaman tidak ditemukan: " + txt)
    for key in ("Tabel", "Gambar"):
        lastc = main_start or 0
        for i, c in enumerate(outline["captions"].get(key, [])):
            probe = norm(c["text"])[:40]
            found = None
            for p in range(lastc, n):
                if probe in joined[p]:
                    found = p
                    break
            if found is not None and main_start is not None:
                is_lamp = lamp_start is not None and found >= lamp_start
                res[("c", key, i)] = roman(found - lamp_start + 1) if is_lamp else str(found - main_start + 1)
                lastc = found
            else:
                notes.append("halaman tidak ditemukan: " + c["text"][:50])
    return res, notes


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    src, outline_file, dst = sys.argv[1:4]
    outline = json.load(open(outline_file, encoding="utf8"))
    items = read_zip(src)

    if not have_soffice():
        write_zip(dst, inject(items, outline, {}, True))
        print("PERINGATAN: LibreOffice/pdftotext tidak ada. Daftar isi diisi tanpa nomor halaman; "
              "buka di Word lalu klik kanan daftar isi > Update Field.")
        return

    pages = {}
    prev = None
    notes = []
    for attempt in range(3):
        tmp = tempfile.mkdtemp(prefix="bp_pass_")
        try:
            probe = os.path.join(tmp, "probe.docx")
            write_zip(probe, inject(items, outline, pages, False))
            txt = render_pages(probe)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
        new_pages, notes = locate(outline, txt)
        if new_pages == pages or new_pages == prev:
            pages = new_pages
            break
        prev, pages = pages, new_pages
    write_zip(dst, inject(items, outline, pages, False))
    for n_ in notes:
        print("PERINGATAN:", n_)
    print("Daftar isi terisi (%d entri, %d halaman render)." % (len(outline["entries"]) + 1, len(txt)))


if __name__ == "__main__":
    main()
