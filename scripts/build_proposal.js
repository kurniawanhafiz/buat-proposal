#!/usr/bin/env node
"use strict";
// Membangun proposal .docx dari content.json (skema: references/schema.md).
// Pemakaian: node build_proposal.js content.json keluaran.docx outline.json
// Daftar isi/tabel/gambar ditulis sebagai penanda ([[TOC]], [[LOT]], [[LOF]]) dan diisi oleh finalize.py.

const fs = require("fs");
const path = require("path");
const D = require("docx");
const { parse: parseLatex } = require("./latex_math.js");

// ---------- konstanta format (pedoman PS Sistem Informasi FMIPA UNRI) ----------
const FONT = "Times New Roman";
const PAGE = { width: 11906, height: 16838 };            // A4
const MARGIN = { top: 2268, left: 2268, right: 1701, bottom: 1701, footer: 850, header: 708 }; // 4-4-3-3 cm
const TEXT_W = PAGE.width - MARGIN.left - MARGIN.right;   // 7937 twips
const LINE_DOUBLE = 480, LINE_SINGLE = 240;

const ROMAN = [["M", 1000], ["CM", 900], ["D", 500], ["CD", 400], ["C", 100], ["XC", 90], ["L", 50], ["XL", 40], ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]];
const roman = (n) => { let s = ""; for (const [r, v] of ROMAN) while (n >= v) { s += r; n -= v; } return s; };

// ---------- util ----------
function die(msg) { throw new Error(msg); }
function cm2px(cm) { return Math.round(cm * 37.7953); }

function imageInfo(buf, file) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { type: "png", w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { type: "jpg", w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  if (buf.toString("ascii", 0, 3) === "GIF") return { type: "gif", w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  die(`Format gambar tidak dikenali (pakai png, jpg, atau gif): ${file}`);
}

// ---------- inline: *miring* dan $rumus$ ----------
function splitUnescaped(text, ch) {
  const parts = []; let cur = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\" && text[i + 1] === ch) { cur += ch; i++; continue; }
    if (text[i] === ch) { parts.push(cur); cur = ""; continue; }
    cur += text[i];
  }
  parts.push(cur);
  return parts;
}

function inline(text, base = {}) {
  const out = [];
  const segs = splitUnescaped(String(text), "$");
  if (segs.length % 2 === 0) die(`Tanda $ tidak berpasangan: ${String(text).slice(0, 60)}`);
  segs.forEach((seg, idx) => {
    if (idx % 2 === 1) { out.push(new D.Math({ children: parseLatex(seg) })); return; }
    const parts = seg.split("*");
    if (parts.length % 2 === 0) die(`Tanda * tidak berpasangan: ${seg.slice(0, 60)}`);
    parts.forEach((p, j) => { if (p) out.push(new D.TextRun(Object.assign({ text: p, italics: j % 2 === 1 }, base))); });
  });
  return out;
}

// ---------- gaya ----------
function buildStyles() {
  const tocTabs = [{ type: D.TabStopType.RIGHT, position: TEXT_W, leader: D.LeaderType.DOT }];
  const para = (id, name, o) => Object.assign({ id, name, basedOn: "Normal", quickFormat: true }, o);
  return {
    default: { document: { run: { font: FONT, size: 24 }, paragraph: { spacing: { line: LINE_SINGLE, lineRule: D.LineRuleType.AUTO } } } },
    paragraphStyles: [
      para("BodyMain", "Body Main", { next: "BodyMain", paragraph: { alignment: D.AlignmentType.JUSTIFIED, spacing: { line: LINE_DOUBLE, lineRule: D.LineRuleType.AUTO, after: 240 } } }),
      para("Heading1", "heading 1", { next: "BodyMain", run: { bold: true, size: 28 }, paragraph: { alignment: D.AlignmentType.CENTER, keepNext: true, pageBreakBefore: true, outlineLevel: 0, spacing: { line: LINE_SINGLE, lineRule: D.LineRuleType.AUTO, before: 0, after: 360 } } }),
      para("Heading2", "heading 2", { next: "BodyMain", run: { bold: true, size: 24 }, paragraph: { keepNext: true, outlineLevel: 1, spacing: { line: LINE_DOUBLE, lineRule: D.LineRuleType.AUTO, before: 120, after: 0 } } }),
      para("Heading3", "heading 3", { next: "BodyMain", run: { bold: true, size: 24 }, paragraph: { keepNext: true, outlineLevel: 2, spacing: { line: LINE_DOUBLE, lineRule: D.LineRuleType.AUTO, before: 0, after: 0 } } }),
      para("JudulBagian", "Judul Bagian", { next: "BodyMain", run: { bold: true, size: 28 }, paragraph: { alignment: D.AlignmentType.CENTER, keepNext: true, pageBreakBefore: true, outlineLevel: 0, spacing: { line: LINE_SINGLE, lineRule: D.LineRuleType.AUTO, before: 0, after: 360 } } }),
      para("SampulTOC", "Sampul TOC", { run: { size: 2, color: "FFFFFF" }, paragraph: { outlineLevel: 0, spacing: { line: LINE_SINGLE, lineRule: D.LineRuleType.AUTO, after: 0 } } }),
      para("ListBody", "List Body", { paragraph: { alignment: D.AlignmentType.JUSTIFIED, spacing: { line: LINE_DOUBLE, lineRule: D.LineRuleType.AUTO, after: 0 } } }),
      para("Kutipan", "Kutipan Blok", { paragraph: { alignment: D.AlignmentType.JUSTIFIED, indent: { left: 720 }, spacing: { line: LINE_SINGLE, lineRule: D.LineRuleType.AUTO, after: 240 } } }),
      para("Kode", "Kode", { run: { font: "Courier New", size: 20 }, paragraph: { spacing: { line: LINE_SINGLE, lineRule: D.LineRuleType.AUTO, after: 0 }, indent: { left: 360 } } }),
      para("Pustaka", "Daftar Pustaka Entri", { paragraph: { alignment: D.AlignmentType.LEFT, indent: { left: 720, hanging: 720 }, spacing: { line: LINE_SINGLE, lineRule: D.LineRuleType.AUTO, after: 240 } } }),
      para("Caption", "caption", { run: { size: 24 }, paragraph: { alignment: D.AlignmentType.CENTER, spacing: { line: LINE_SINGLE, lineRule: D.LineRuleType.AUTO, before: 120, after: 120 } } }),
      para("Sumber", "Sumber", { run: { size: 22 }, paragraph: { alignment: D.AlignmentType.LEFT, spacing: { line: LINE_SINGLE, lineRule: D.LineRuleType.AUTO, after: 240 } } }),
      para("TabelTeks", "Teks Tabel", { run: { size: 22 }, paragraph: { spacing: { line: LINE_SINGLE, lineRule: D.LineRuleType.AUTO, before: 40, after: 40 } } }),
      para("TOC1", "toc 1", { paragraph: { tabStops: tocTabs, spacing: { line: 276, lineRule: D.LineRuleType.AUTO, before: 60, after: 60 } } }),
      para("TOC2", "toc 2", { paragraph: { tabStops: tocTabs, indent: { left: 360 }, spacing: { line: 276, lineRule: D.LineRuleType.AUTO, after: 40 } } }),
      para("TOC3", "toc 3", { paragraph: { tabStops: tocTabs, indent: { left: 720 }, spacing: { line: 276, lineRule: D.LineRuleType.AUTO, after: 40 } } }),
      para("TableofFigures", "table of figures", { paragraph: { tabStops: tocTabs, spacing: { line: 276, lineRule: D.LineRuleType.AUTO, after: 60 } } }),
    ],
  };
}

function buildNumbering() {
  const num = (ref, fmt, text) => ({
    reference: ref,
    levels: [{ level: 0, format: fmt, text, alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
  });
  return { config: [num("num", D.LevelFormat.DECIMAL, "%1."), num("bul", D.LevelFormat.BULLET, "•")] };
}

// ---------- konteks ----------
class Ctx {
  constructor(content, baseDir) {
    this.c = content; this.baseDir = baseDir;
    this.outline = []; this.captions = { Tabel: [], Gambar: [] };
    this.listInstance = 0; this.chapLabel = ""; this.counter = { Tabel: 0, Gambar: 0, Rumus: 0 };
  }
  resetCounters(label) { this.chapLabel = label; this.counter = { Tabel: 0, Gambar: 0, Rumus: 0 }; }
}

// ---------- blok ----------
function para(children, style, extra) {
  return new D.Paragraph(Object.assign({ style, children }, extra || {}));
}

function renderTable(b, ctx) {
  if (!b.headers || !b.rows) die("Blok table butuh headers dan rows.");
  const cols = b.headers.length;
  let widths = b.widths;
  if (!widths) { const w = Math.floor(TEXT_W / cols); widths = Array(cols).fill(w); widths[cols - 1] += TEXT_W - w * cols; }
  if (widths.length !== cols) die(`Tabel "${b.caption}": jumlah widths (${widths.length}) berbeda dari jumlah kolom (${cols}).`);
  const line = { style: D.BorderStyle.SINGLE, size: 4, color: "000000" };
  const borders = { top: line, bottom: line, left: line, right: line };
  const cell = (txt, w, header, ci) => {
    const lines = String(txt).split("\n");
    const center = header || (b.rata_tengah || []).includes(ci);
    return new D.TableCell({
      width: { size: w, type: D.WidthType.DXA }, borders,
      margins: { top: 40, bottom: 40, left: 100, right: 100 },
      verticalAlign: D.VerticalAlign.CENTER,
      shading: header ? { type: D.ShadingType.CLEAR, fill: "D9D9D9", color: "auto" } : undefined,
      children: lines.map((l) => new D.Paragraph({ style: "TabelTeks", alignment: center ? D.AlignmentType.CENTER : D.AlignmentType.LEFT, children: inline(l, header ? { bold: true } : {}) })),
    });
  };
  const rows = [new D.TableRow({ tableHeader: true, cantSplit: true, children: b.headers.map((h, i) => cell(h, widths[i], true, i)) })];
  for (const r of b.rows) {
    if (r.length !== cols) die(`Tabel "${b.caption}": baris dengan ${r.length} sel, seharusnya ${cols}.`);
    rows.push(new D.TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, widths[i], false, i)) }));
  }
  ctx.counter.Tabel++;
  const n = ctx.counter.Tabel;
  const label = `Tabel ${ctx.chapLabel}.${n}.`;
  ctx.captions.Tabel.push({ text: `${label} ${b.caption}` });
  const out = [
    new D.Paragraph({ style: "Caption", keepNext: true, children: [
      new D.TextRun({ text: `Tabel ${ctx.chapLabel}.` }),
      new D.SimpleField(`SEQ Tabel \\r ${n}`, String(n)),
      new D.TextRun({ text: ". " }),
      ...inline(b.caption),
    ] }),
    new D.Table({ width: { size: TEXT_W, type: D.WidthType.DXA }, columnWidths: widths, alignment: D.AlignmentType.CENTER, rows }),
  ];
  if (b.sumber) out.push(new D.Paragraph({ style: "Sumber", spacing: { before: 60, after: 240 }, children: inline(`Sumber: ${b.sumber}`) }));
  else out.push(new D.Paragraph({ spacing: { after: 120 }, children: [] }));
  return out;
}

function renderImage(b, ctx) {
  if (!b.path) die("Blok image butuh path.");
  const file = path.resolve(ctx.baseDir, b.path);
  if (!fs.existsSync(file)) die(`File gambar tidak ada: ${b.path}`);
  const data = fs.readFileSync(file);
  const info = imageInfo(data, b.path);
  let wcm = b.width_cm || 12, hcm = wcm * info.h / info.w;
  const maxH = b.max_height_cm || 9;
  if (hcm > maxH) { hcm = maxH; wcm = hcm * info.w / info.h; }
  ctx.counter.Gambar++;
  const n = ctx.counter.Gambar;
  ctx.captions.Gambar.push({ text: `Gambar ${ctx.chapLabel}.${n}. ${b.caption}` });
  const out = [
    new D.Paragraph({ alignment: D.AlignmentType.CENTER, keepNext: true, spacing: { line: LINE_SINGLE, lineRule: D.LineRuleType.AUTO, before: 120, after: 60 }, children: [
      new D.ImageRun({ type: info.type, data, transformation: { width: cm2px(wcm), height: cm2px(hcm) }, altText: { title: b.caption || "Gambar", description: b.alt || b.caption || "Gambar", name: path.basename(file) } }),
    ] }),
    new D.Paragraph({ style: "Caption", keepNext: !!b.sumber, children: [
      new D.TextRun({ text: `Gambar ${ctx.chapLabel}.` }),
      new D.SimpleField(`SEQ Gambar \\r ${n}`, String(n)),
      new D.TextRun({ text: ". " }),
      ...inline(b.caption),
    ] }),
  ];
  if (b.sumber) out.push(new D.Paragraph({ style: "Sumber", spacing: { before: 0, after: 240 }, children: inline(`Sumber: ${b.sumber}`) }));
  return out;
}

function renderEquation(b, ctx) {
  const lines = Array.isArray(b.latex) ? b.latex : [b.latex];
  if (!lines.length || lines.some((l) => !String(l).trim())) die("Blok equation: latex kosong.");
  return lines.map((l, idx) => {
    const last = idx === lines.length - 1;
    const math = new D.Math({ children: parseLatex(String(l)) });
    const spacing = { line: 360, lineRule: D.LineRuleType.AUTO, before: 60, after: last ? 240 : 60 };
    if (b.nomor && last) {
      ctx.counter.Rumus++;
      return new D.Paragraph({
        spacing, tabStops: [{ type: D.TabStopType.CENTER, position: Math.round(TEXT_W / 2) }, { type: D.TabStopType.RIGHT, position: TEXT_W }],
        children: [new D.TextRun({ children: [new D.Tab()] }), math, new D.TextRun({ children: [new D.Tab(), `(${ctx.chapLabel}.${ctx.counter.Rumus})`] })],
      });
    }
    return new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing, children: [math] });
  });
}

function renderBlocks(blocks, ctx, bodyStyle = "BodyMain") {
  const out = [];
  for (const b of blocks || []) {
    switch (b.t) {
      case "p": out.push(para(inline(b.text), bodyStyle)); break;
      case "quote": out.push(para(inline(b.text), "Kutipan")); break;
      case "list":
      case "ul": {
        const inst = ++ctx.listInstance;
        const items = b.items || [];
        items.forEach((it, i) => out.push(new D.Paragraph({
          style: "ListBody", children: inline(it),
          numbering: { reference: b.t === "list" ? "num" : "bul", level: 0, instance: inst },
          spacing: { line: LINE_DOUBLE, lineRule: D.LineRuleType.AUTO, after: i === items.length - 1 ? 240 : 0 },
        })));
        break;
      }
      case "table": out.push(...renderTable(b, ctx)); break;
      case "image": out.push(...renderImage(b, ctx)); break;
      case "equation": out.push(...renderEquation(b, ctx)); break;
      case "code": {
        const lines = Array.isArray(b.lines) ? b.lines : String(b.text || "").split("\n");
        lines.forEach((l, i) => out.push(new D.Paragraph({ style: "Kode", spacing: { line: LINE_SINGLE, lineRule: D.LineRuleType.AUTO, after: i === lines.length - 1 ? 240 : 0 }, children: [new D.TextRun({ text: l || " ", font: "Courier New", size: 20 })] })));
        break;
      }
      default: die(`Tipe blok tidak dikenal: ${b.t}`);
    }
  }
  return out;
}

// ---------- bagian dokumen ----------
function judulBagian(text, ctx, kind, extraBreak) {
  ctx.outline.push({ text, level: 1, kind });
  const children = [new D.TextRun({ text })];
  if (extraBreak) children.push(new D.TextRun({ text: extraBreak, break: 1 }));
  return new D.Paragraph({ style: "JudulBagian", children });
}

function buildCover(m, ctx) {
  const size = (m.cover_size_pt || 14) * 2;
  const line = (t, o) => new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: Object.assign({ line: 300, lineRule: D.LineRuleType.AUTO, after: 0 }, o && o.spacing), children: [new D.TextRun({ text: t, bold: true, size })] });
  const jenis = m.jenis === "skripsi" ? "PROPOSAL SKRIPSI" : "PROPOSAL PENELITIAN";
  const kids = [
    new D.Paragraph({ style: "SampulTOC", children: [new D.TextRun({ text: "HALAMAN SAMPUL" })] }),
    line(jenis, { spacing: { after: 240 } }),
  ];
  String(m.judul).toUpperCase().split("\n").forEach((t, i, a) => kids.push(line(t, { spacing: { after: i === a.length - 1 ? 720 : 0 } })));
  // logo
  let logoPath = m.logo ? path.resolve(ctx.baseDir, m.logo) : path.resolve(__dirname, "../assets/logo_unri.png");
  if (fs.existsSync(logoPath)) {
    const data = fs.readFileSync(logoPath); const info = imageInfo(data, logoPath);
    const wcm = m.logo_cm || 5;
    kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 720 }, children: [
      new D.ImageRun({ type: info.type, data, transformation: { width: cm2px(wcm), height: cm2px(wcm * info.h / info.w) }, altText: { title: "Logo Universitas Riau", description: "Logo Universitas Riau", name: "logo" } }),
    ] }));
  } else kids.push(line("[Logo Universitas Riau]", { spacing: { after: 480 } }));
  kids.push(line("Disusun oleh:", { spacing: { after: 120 } }));
  kids.push(line(String(m.nama || "( NAMA )").toUpperCase()));
  kids.push(line(`NIM: ${m.nim || "( NIM )"}`, { spacing: { after: m.dosen ? 240 : 1200 } }));
  if (m.dosen) kids.push(line(`${m.jenis === "skripsi" ? "Calon Pembimbing" : "Dosen Pengampu"}: ${m.dosen}`, { spacing: { after: 1200 } }));
  const balanced = (t) => {
    t = String(t).toUpperCase();
    if (t.length <= 34) return [t];
    const w = t.split(" "); let best = 0, diff = 1e9;
    for (let i = 1; i < w.length; i++) { const d = Math.abs(w.slice(0, i).join(" ").length - w.slice(i).join(" ").length); if (d < diff) { diff = d; best = i; } }
    return [w.slice(0, best).join(" "), w.slice(best).join(" ")];
  };
  [m.prodi, m.fakultas, m.universitas, m.kota || "Pekanbaru", m.tahun].filter(Boolean).forEach((t) => balanced(t).forEach((l) => kids.push(line(l, { spacing: { after: 60 } }))));
  return kids;
}

function buildPengusul(m, ctx) {
  const p = m.pengusul || {};
  const dots = "........";
  const rows = [
    ["Judul Skripsi", m.judul], ["Bidang Ilmu", p.bidang_ilmu || dots], ["Mata Kuliah Terkait", p.matkul_terkait || dots],
    ["Nama", m.nama || "( NAMA )"], ["NIM", m.nim || "( NIM )"],
    ["SKS Wajib yang Telah Diselesaikan", p.sks_wajib || dots], ["SKS Lulus", p.sks_lulus || dots],
    ["SKS yang Masih Diperlukan", p.sks_perlu || dots], ["SKS Bernilai D", p.sks_d || dots], ["IPK Terakhir", p.ipk || dots],
  ];
  const none = { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const nb = { top: none, bottom: none, left: none, right: none };
  const W = [3400, 300, TEXT_W - 3700];
  const mk = (t, w) => new D.TableCell({ width: { size: w, type: D.WidthType.DXA }, borders: nb, margins: { top: 60, bottom: 60, left: 40, right: 40 }, children: [new D.Paragraph({ style: "TabelTeks", children: inline(String(t), { size: 24 }) })] });
  return [
    judulBagian("HALAMAN DATA PENGUSUL", ctx, "front"),
    new D.Table({ width: { size: TEXT_W, type: D.WidthType.DXA }, columnWidths: W, borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
      rows: rows.map(([k, v]) => new D.TableRow({ children: [mk(k, W[0]), mk(":", W[1]), mk(v, W[2])] })) }),
  ];
}

function buildKataPengantar(c, m, ctx) {
  const paras = c.kata_pengantar || [];
  const out = [judulBagian("KATA PENGANTAR", ctx, "front")];
  paras.forEach((t) => out.push(para(inline(t), "BodyMain", { indent: { firstLine: 0 } })));
  const sign = { indent: { left: 4536 }, spacing: { line: LINE_SINGLE, lineRule: D.LineRuleType.AUTO, after: 0 } };
  out.push(new D.Paragraph(Object.assign({ children: [new D.TextRun(`${m.kota || "Pekanbaru"}, ${m.bulan_tahun || "( Bulan Tahun )"}`)] }, sign, { spacing: { line: LINE_SINGLE, lineRule: D.LineRuleType.AUTO, before: 240, after: 0 } })));
  out.push(new D.Paragraph(Object.assign({ children: [new D.TextRun("Penulis")] }, sign)));
  out.push(new D.Paragraph({ indent: { left: 4536 }, spacing: { line: LINE_SINGLE, lineRule: D.LineRuleType.AUTO, before: 960, after: 0 }, children: [new D.TextRun(m.nama || "( Nama )")] }));
  return out;
}

function listPlaceholder(title, marker, ctx) {
  return [judulBagian(title, ctx, "front"), new D.Paragraph({ children: [new D.TextRun(marker)] })];
}

function countBlocks(content, t) {
  let n = 0;
  const walk = (blocks) => (blocks || []).forEach((b) => { if (b.t === t) n++; });
  for (const bab of content.bab || []) for (const s of bab.sections || []) { walk(s.blocks); for (const u of s.subs || []) walk(u.blocks); }
  for (const l of content.lampiran || []) walk(l.blocks);
  return n;
}

function buildBab(bab, bi, ctx) {
  const out = [];
  const num = bi + 1;
  ctx.resetCounters(String(num));
  const title = String(bab.judul).toUpperCase();
  ctx.outline.push({ text: `BAB ${roman(num)} ${title}`, level: 1, kind: "main" });
  out.push(new D.Paragraph({ style: "Heading1", children: [new D.TextRun({ text: `BAB ${roman(num)}` }), new D.TextRun({ text: title, break: 1 })] }));
  (bab.sections || []).forEach((s, si) => {
    const t2 = `${num}.${si + 1} ${s.judul}`;
    ctx.outline.push({ text: t2, level: 2, kind: "main" });
    out.push(new D.Paragraph({ style: "Heading2", children: [new D.TextRun(t2)] }));
    out.push(...renderBlocks(s.blocks, ctx, "BodyMain"));
    (s.subs || []).forEach((u, ui) => {
      const t3 = `${num}.${si + 1}.${ui + 1} ${u.judul}`;
      ctx.outline.push({ text: t3, level: 3, kind: "main" });
      out.push(new D.Paragraph({ style: "Heading3", children: [new D.TextRun(t3)] }));
      out.push(...renderBlocks(u.blocks, ctx, "BodyMain"));
    });
  });
  return out;
}

function buildPustaka(c, ctx) {
  ctx.outline.push({ text: "DAFTAR PUSTAKA", level: 1, kind: "main" });
  const out = [new D.Paragraph({ style: "JudulBagian", children: [new D.TextRun("DAFTAR PUSTAKA")] })];
  (c.daftar_pustaka || []).forEach((e) => out.push(new D.Paragraph({ style: "Pustaka", children: inline(e) })));
  return out;
}

function buildLampiran(c, ctx) {
  const out = [];
  (c.lampiran || []).forEach((l, i) => {
    ctx.resetCounters(`L${i + 1}`);
    const head = `LAMPIRAN ${i + 1}`;
    ctx.outline.push({ text: `${head} ${String(l.judul).toUpperCase()}`, level: 1, kind: "lampiran" });
    out.push(new D.Paragraph({ style: "JudulBagian", children: [new D.TextRun(head), new D.TextRun({ text: String(l.judul).toUpperCase(), break: 1 })] }));
    out.push(...renderBlocks(l.blocks, ctx, "BodyMain"));
  });
  return out;
}

function footer() {
  return new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [new D.TextRun({ children: [D.PageNumber.CURRENT] })] })] });
}

function main() {
  const [, , inFile, outFile, outlineFile] = process.argv;
  if (!inFile || !outFile) die("Pemakaian: node build_proposal.js content.json keluaran.docx [outline.json]");
  const content = JSON.parse(fs.readFileSync(inFile, "utf8"));
  const m = content.meta || die("content.json tanpa meta.");
  if (!m.judul) die("meta.judul wajib diisi.");
  m.universitas = m.universitas || "Universitas Riau";
  m.prodi = m.prodi === undefined ? "Program Studi Sistem Informasi" : m.prodi;
  m.fakultas = m.fakultas === undefined ? "Fakultas Matematika dan Ilmu Pengetahuan Alam" : m.fakultas;
  m.tahun = m.tahun || new Date().getFullYear();
  const ctx = new Ctx(content, path.dirname(path.resolve(inFile)));

  const hasLot = countBlocks(content, "table") > 0, hasLof = countBlocks(content, "image") > 0;

  const cover = buildCover(m, ctx);
  const front = [];
  if (m.jenis === "skripsi") front.push(...buildPengusul(m, ctx));
  front.push(...buildKataPengantar(content, m, ctx));
  front.push(...listPlaceholder("DAFTAR ISI", "[[TOC]]", ctx));
  if (hasLot) front.push(...listPlaceholder("DAFTAR TABEL", "[[LOT]]", ctx));
  if (hasLof) front.push(...listPlaceholder("DAFTAR GAMBAR", "[[LOF]]", ctx));

  const main_ = [];
  (content.bab || []).forEach((b, i) => main_.push(...buildBab(b, i, ctx)));
  main_.push(...buildPustaka(content, ctx));
  const lamp = buildLampiran(content, ctx);

  const pageBase = { size: { width: PAGE.width, height: PAGE.height }, margin: MARGIN };
  const sections = [
    { properties: { page: pageBase }, children: cover },
    { properties: { page: Object.assign({}, pageBase, { pageNumbers: { start: 2, formatType: D.NumberFormat.LOWER_ROMAN } }) }, footers: { default: footer() }, children: front },
    { properties: { page: Object.assign({}, pageBase, { pageNumbers: { start: 1, formatType: D.NumberFormat.DECIMAL } }) }, footers: { default: footer() }, children: main_ },
  ];
  if (lamp.length) sections.push({ properties: { page: Object.assign({}, pageBase, { pageNumbers: { start: 1, formatType: D.NumberFormat.LOWER_ROMAN } }) }, footers: { default: footer() }, children: lamp });

  const doc = new D.Document({
    creator: m.nama || "Penulis", title: m.judul, description: "Proposal dibangun dengan skill buat-proposal",
    styles: buildStyles(), numbering: buildNumbering(), sections,
  });
  D.Packer.toBuffer(doc).then((buf) => {
    fs.writeFileSync(outFile, buf);
    if (outlineFile) fs.writeFileSync(outlineFile, JSON.stringify({ entries: ctx.outline, captions: ctx.captions, has_lot: hasLot, has_lof: hasLof, has_lampiran: lamp.length > 0 }, null, 2));
  });
}

try { main(); } catch (e) { console.error("GALAT build: " + e.message); process.exit(2); }
