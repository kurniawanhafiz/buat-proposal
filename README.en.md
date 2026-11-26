# buat-proposal

A skill that builds an **Indonesian research proposal or thesis proposal** as a `.docx` file following the Thesis Writing Guidelines of the Information Systems Study Program, Faculty of Mathematics and Natural Sciences, Universitas Riau (UNRI). It is meant for AI assistants that support skills (for example Claude Code), but the build scripts also run on their own from a terminal.

> Unofficial and not affiliated with Universitas Riau. The rules are summarized from a 2017 guideline document; check them against the latest guideline or your supervisor's instructions before submitting.

## What it produces

- Cover with the UNRI logo, applicant data page (thesis proposal), preface, table of contents, list of tables, list of figures.
- Chapter I Introduction, Chapter II Literature Review, Chapter III Research Method (including a weekly schedule), APA 7 reference list, appendices.
- Three research types: quantitative, qualitative, system development.
- Guideline formatting: A4, 4-4-3-3 cm margins, Times New Roman 12, double spacing, Roman then Arabic page numbers, per-chapter table/figure numbering, formulas as native Word equations.
- Table of contents as Word fields already filled with page numbers (refreshable in Word).
- Automatic content checks: citations and references must match both ways, alphabetical references, reference requirements (count, year, journal share, language), equal number of research questions and objectives, hypotheses for quantitative studies, and writing-style warnings.

Content (text, headings, references) is written in Indonesian.

## Install

Requirements: Node.js 18+, Python 3.9+. Optional but recommended: LibreOffice and `poppler-utils` (to fill TOC page numbers and render previews).

```bash
git clone <this-repo-url> buat-proposal
cd buat-proposal
npm install                      # docx package
pip install -r requirements.txt  # python-docx, lxml
```

**As a Claude Code skill:** copy or symlink this folder to `~/.claude/skills/buat-proposal/` (or `.claude/skills/buat-proposal/` inside a project), then ask for a proposal or call `/buat-proposal`. On other platforms, upload the folder as a skill following the platform's instructions; run `npm install` in the folder first.

## Standalone use

1. Copy `examples/contoh_content.json` and fill in your proposal. The full format is in `references/schema.md`.
2. Build:

   ```bash
   python3 scripts/build.py content.json hasil/Proposal.docx --tabel
   ```

   Options: `--strict` (warnings also stop the build), `--preview` (PNGs of the cover, TOC, first page of Chapter I, and last page).
3. Open in Word. If formulas or TOC page numbers look off, right-click the TOC and choose *Update Field*.

A finished sample is in `examples/Contoh_Proposal.docx` (built from `examples/contoh_content.json`).

## Repository layout

```
SKILL.md                 instructions for the AI assistant
scripts/                 build.py, check_content.py, build_proposal.js, latex_math.js, finalize.py
references/              content.json schema, guideline summary, reference-verification rules
assets/logo_unri.png     cover logo
examples/                sample content.json, figure, and built .docx
```

## Known limitations

- The sample proposal uses real, checked references but is for demonstration only; re-verify before reusing for your own work.
- TOC page numbers are computed from a LibreOffice render. LibreOffice without the Math module does not draw formulas, so pages containing formulas can shift by a line in Word. Update fields in Word for the final result.
- Chapter, section, table, figure, and equation numbers are written by the script (not Word auto-numbering). Edit `content.json` and rebuild to keep numbering consistent.
- The source guideline dates from 2017 and has its own reference format; the skill defaults to APA 7.

## License

MIT, copyright Kurniawan Hafiz (see `LICENSE`). The Universitas Riau logo belongs to Universitas Riau and is not covered by that license.
