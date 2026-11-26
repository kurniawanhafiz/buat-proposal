"use strict";
// Penerjemah LaTeX (subset) ke komponen equation Word (docx-js).
// Mendukung: \frac, \sqrt[n]{}, ^ dan _, \sum (dengan batas), \left( \right), \text, \mathrm,
// \hat, \bar, huruf Yunani, dan simbol umum. Perintah lain menimbulkan galat yang jelas.

const D = require("docx");

const SYM = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", zeta: "ζ", eta: "η",
  theta: "θ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π", rho: "ρ",
  sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓", leq: "≤", le: "≤", geq: "≥", ge: "≥",
  neq: "≠", ne: "≠", approx: "≈", sim: "∼", propto: "∝", infty: "∞", ldots: "…", cdots: "⋯",
  rightarrow: "→", to: "→", leftarrow: "←", Rightarrow: "⇒", Leftrightarrow: "⇔",
  in: "∈", notin: "∉", subset: "⊂", cup: "∪", cap: "∩", forall: "∀", exists: "∃", partial: "∂",
  degree: "°", sqrtsign: "√",
};
const LITERAL = { "%": "%", "_": "_", "{": "{", "}": "}", "$": "$", "#": "#", "&": "&" };
const COMBINING = { hat: "̂", bar: "̄", overline: "̄", tilde: "̃", vec: "⃗" };

class Parser {
  constructor(src) { this.s = src; this.i = 0; }
  eof() { return this.i >= this.s.length; }
  peek() { return this.s[this.i]; }
  ws() { while (!this.eof() && /\s/.test(this.peek())) this.i++; }
  fail(msg) { throw new Error(`LaTeX "${this.s}": ${msg}`); }

  // urutan atom sampai penutup stop ('}' | ']' | 'right') atau akhir teks
  seq(stop) {
    const out = [];
    for (;;) {
      this.ws();
      if (this.eof()) break;
      if (stop === "}" || stop === "]") { if (this.peek() === stop) break; }
      if (stop === "right" && this.s.startsWith("\\right", this.i)) break;
      out.push(...this.atomWithScripts());
    }
    return out;
  }

  atomWithScripts() {
    const base = this.atom();
    let sub = null, sup = null;
    this.ws();
    while (!this.eof() && (this.peek() === "^" || this.peek() === "_")) {
      const t = this.peek();
      this.i++;
      const arg = this.scriptArg();
      if (t === "^") sup = arg; else sub = arg;
      this.ws();
    }
    if (base.sum) {
      return [new D.MathSum({
        children: base.sum.children,
        subScript: sub || base.sum.sub || undefined,
        superScript: sup || base.sum.sup || undefined,
      })];
    }
    const comps = base.comps;
    if (sub && sup) return [new D.MathSubSuperScript({ children: comps, subScript: sub, superScript: sup })];
    if (sup) return [new D.MathSuperScript({ children: comps, superScript: sup })];
    if (sub) return [new D.MathSubScript({ children: comps, subScript: sub })];
    return comps;
  }

  scriptArg() {
    this.ws();
    if (this.eof()) this.fail("^ atau _ tanpa argumen");
    if (this.peek() === "{") return this.group();
    const a = this.atom();
    if (a.sum) this.fail("\\sum tidak boleh menjadi pangkat atau indeks");
    return a.comps;
  }

  group() {
    if (this.peek() !== "{") this.fail("diharapkan {");
    this.i++;
    const out = this.seq("}");
    if (this.peek() !== "}") this.fail("kurung kurawal tidak seimbang");
    this.i++;
    return out;
  }

  rawGroup() {
    this.ws();
    if (this.peek() !== "{") this.fail("diharapkan {");
    let depth = 0, start = this.i + 1;
    for (; this.i < this.s.length; this.i++) {
      const c = this.s[this.i];
      if (c === "{") depth++;
      else if (c === "}") { depth--; if (depth === 0) break; }
    }
    if (depth !== 0) this.fail("kurung kurawal tidak seimbang");
    const txt = this.s.slice(start, this.i);
    this.i++;
    return txt;
  }

  run(text, opts) { return new D.MathRun(opts ? Object.assign({ text }, opts) : text); }

  atom() {
    const c = this.peek();
    if (c === "{") return { comps: this.group() };
    if (c === "&") this.fail("tanda & (perataan) tidak didukung; pecah menjadi beberapa blok equation");
    if (c !== "\\") { this.i++; return { comps: [this.run(c)] }; }
    // perintah
    this.i++;
    if (this.eof()) this.fail("backslash di akhir");
    const first = this.peek();
    if (!/[A-Za-z]/.test(first)) {
      this.i++;
      if (first === "\\") this.fail("\\\\ (baris baru) tidak didukung; pecah menjadi beberapa blok equation");
      if (first === "," || first === ";" || first === "!" || first === ":") return { comps: [] };
      if (first === " ") return { comps: [this.run("  ", { normalText: true })] };
      if (LITERAL[first]) return { comps: [this.run(LITERAL[first])] };
      this.fail(`perintah \\${first} tidak didukung`);
    }
    let name = "";
    while (!this.eof() && /[A-Za-z]/.test(this.peek())) name += this.s[this.i++];

    if (name === "frac" || name === "dfrac") {
      this.ws(); const n = this.group(); this.ws(); const d = this.group();
      return { comps: [new D.MathFraction({ numerator: n, denominator: d })] };
    }
    if (name === "sqrt") {
      this.ws();
      let degree;
      if (this.peek() === "[") {
        this.i++;
        degree = this.seq("]");
        if (this.peek() !== "]") this.fail("kurung siku tidak seimbang");
        this.i++;
      }
      this.ws();
      const body = this.peek() === "{" ? this.group() : this.atom().comps;
      return { comps: [new D.MathRadical(degree ? { children: body, degree } : { children: body })] };
    }
    if (name === "text" || name === "mathrm" || name === "operatorname") {
      return { comps: [this.run(this.rawGroup(), { normalText: true })] };
    }
    if (COMBINING[name]) {
      this.ws();
      const raw = this.peek() === "{" ? this.rawGroup() : this.s[this.i++];
      const txt = Array.from(raw).map((ch) => (/\s/.test(ch) ? ch : ch + COMBINING[name])).join("");
      return { comps: [this.run(txt)] };
    }
    if (name === "sum") {
      this.ws();
      let sub = null, sup = null;
      while (!this.eof() && (this.peek() === "^" || this.peek() === "_")) {
        const t = this.peek(); this.i++;
        const arg = this.scriptArg();
        if (t === "^") sup = arg; else sub = arg;
        this.ws();
      }
      const body = this.eof() ? [this.run("")] : this.atomWithScripts();
      return { sum: { children: body, sub, sup } };
    }
    if (name === "left") {
      this.ws();
      const l = this.s[this.i++];
      const inner = this.seq("right");
      if (!this.s.startsWith("\\right", this.i)) this.fail("\\left tanpa \\right");
      this.i += 6;
      this.ws();
      const r = this.s[this.i++];
      if (l === "(" && r === ")") return { comps: [new D.MathRoundBrackets({ children: inner })] };
      if (l === "[" && r === "]") return { comps: [new D.MathSquareBrackets({ children: inner })] };
      return { comps: [this.run(l === "." ? "" : l), ...inner, this.run(r === "." ? "" : r)] };
    }
    if (name === "quad" || name === "qquad") return { comps: [this.run("   ", { normalText: true })] };
    if (SYM[name]) return { comps: [this.run(SYM[name])] };
    this.fail(`perintah \\${name} tidak didukung`);
  }
}

function parse(src) {
  const p = new Parser(src);
  const out = p.seq(null);
  if (!p.eof()) p.fail("sisa teks yang tidak terbaca");
  if (out.length === 0) p.fail("rumus kosong");
  return out;
}

module.exports = { parse };
