---
name: docx-page-numbers
description: Use when modifying page numbers in .docx files — inserting, removing, or reconfiguring page numbering per section (e.g., Roman numerals for front matter, Arabic for body, no numbers on cover/TOC/declaration). Applies when the user mentions page numbers, 页码, section breaks, or specific numbering formats in Word documents.
---

# DOCX Page Numbering

## Overview

Modify page numbers in existing .docx files by unpacking, editing footer XML and section properties, then repacking. Works for any page numbering scheme: Roman numerals, Arabic digits, mixed formats per section.

## Prerequisites

All scripts are under the docx skill's `scripts/office/` directory. Use Python from `D:\Anaconda3\Anacada\python.exe` on Windows.

```bash
# Unpack
python scripts/office/unpack.py input.docx unpacked/

# Repack (skip validation for encoding issues)
python scripts/office/pack.py unpacked/ output.docx --original input.docx --validate false
```

## Process

### Step 1: Unpack and Map ALL Sections

Unpack the document, then search `document.xml` for `<w:sectPr>` to find all section breaks. Each `<w:sectPr>` inside `<w:pPr>` marks the end of a section; the last `<w:sectPr>` in `<w:body>` is the final section.

Map each section to its footer:
```
Grep: w:footerReference → rId
Grep: rId + footer in word/_rels/document.xml.rels → footer file name
```

List existing footer files (`Glob: footer*.xml`). Note which sections have NO footer reference at all.

Check `<w:pgNumType>` in each section:
- `w:fmt="upperRoman"` → I, II, III
- `w:fmt="decimal"` → 1, 2, 3
- `w:start="N"` → restart numbering at N
- Omit `w:start` → continue from previous section

### Step 2: Identify ALL Content Boundaries — Be Thorough

Search for ALL key headings to understand what content falls in each section:

```
摘  要, Abstract, 目  录, 绪论, 第1章, 声明, 致谢, 参考文献
```

**CRITICAL:** Check for "hidden" pages between the obvious headings — declaration pages (诚信声明书, 声明), blank separator pages, etc. These often sit between the cover and abstract and must be accounted for. If such pages exist, they need their own section with a blank footer.

Map the complete physical page sequence before deciding where section breaks go.

### Step 3: Plan the Target Section Structure

Design the final section layout based on what content needs what numbering:

```
封面           → blank footer
声明/诚信声明   → blank footer (IF present)
中英文摘要      → PAGE footer, upperRoman start=1
目录           → blank footer
正文(绪论/第1章) → PAGE footer, decimal start=1
```

Count how many NEW sections you need vs. existing ones. Note which existing sections need to be split.

### Step 4: Create New Footer Files

For each new section that needs a distinct footer, create a footer XML file:

**Footer with centered page number:**
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
       xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       mc:Ignorable="w14 wp14">
  <w:p>
    <w:pPr>
      <w:pStyle w:val="6"/>   <!-- use the document's footer style ID -->
      <w:jc w:val="center"/>
    </w:pPr>
    <w:r><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
    <w:r><w:fldChar w:fldCharType="separate"/></w:r>
    <w:r><w:t>1</w:t></w:r>   <!-- placeholder, field updates on open -->
    <w:r><w:fldChar w:fldCharType="end"/></w:r>
  </w:p>
</w:ftr>
```

**Blank footer (no page numbers):**
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
       xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       mc:Ignorable="w14 wp14">
  <w:p>
    <w:pPr>
      <w:pStyle w:val="6"/>
      <w:jc w:val="center"/>
    </w:pPr>
  </w:p>
</w:ftr>
```

> **w:pStyle tip:** Look at the document's existing footer to find the correct style ID (commonly `6` or `7`). Match the existing convention.

### Step 5: Register New Files

**In `word/_rels/document.xml.rels`**, add relationship entries:
```xml
<Relationship Id="rId36" Type=".../footer" Target="footer2.xml"/>
<Relationship Id="rId37" Type=".../footer" Target="footer3.xml"/>
```
Use the next available rId number.

**In `[Content_Types].xml`**, add content type entries:
```xml
<Override PartName="/word/footer2.xml" ContentType="...wordprocessingml.footer+xml"/>
```

### Step 6: Insert Section Breaks in document.xml

This is the most delicate step. For each new section boundary, find the exact paragraph that should be the LAST paragraph of the previous section. Then add `<w:sectPr>` inside its `<w:pPr>`.

**Case A: Paragraph HAS `<w:pPr>`** — add `<w:sectPr>` before `</w:pPr>`:
```xml
<w:pPr>
  <w:rPr>...</w:rPr>
  <w:sectPr>
    <w:footerReference r:id="rIdXX" w:type="default"/>
    <w:pgNumType w:fmt="upperRoman" w:start="1"/>
    <w:pgSz w:w="11906" w:h="16838"/>
    <w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" w:header="851" w:footer="992" w:gutter="0"/>
    <w:cols w:space="425" w:num="1"/>
    <w:docGrid w:type="lines" w:linePitch="312" w:charSpace="0"/>
  </w:sectPr>
</w:pPr>
```

**Case B: Paragraph has NO `<w:pPr>`** — you must create one:
```xml
<w:p w14:paraId="005F2CE9">
  <w:pPr>                                          <!-- ADD THIS -->
    <w:sectPr>                                     <!-- ADD THIS -->
      <w:footerReference r:id="rId5" w:type="default"/>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" w:header="851" w:footer="992" w:gutter="0"/>
      <w:cols w:space="425" w:num="1"/>
      <w:docGrid w:type="lines" w:linePitch="312" w:charSpace="0"/>
    </w:sectPr>                                    <!-- ADD THIS -->
  </w:pPr>                                         <!-- ADD THIS -->
  <w:r>...</w:r>                                   <!-- existing content preserved -->
</w:p>
```

> Include `pgSz`, `pgMar`, `cols`, `docGrid` in each new sectPr to ensure consistent page layout across sections. Copy values from existing sections.

### Step 7: Configure pgNumType per Section

| Section content | pgNumType |
|---|---|
| Cover, Declaration, TOC (blank footer) | Omit or any format (invisible) |
| Abstracts (visible Roman) | `<w:pgNumType w:fmt="upperRoman" w:start="1"/>` |
| Body (visible Arabic) | `<w:pgNumType w:fmt="decimal" w:start="1"/>` |

### Step 8: Repack

```bash
python scripts/office/pack.py unpacked/ output.docx --original input.docx --validate false
```

If "Permission denied", the output file is open in Word — write to a different filename.

## Common Patterns

### Chinese Academic Thesis (Full)

```
封面           → Section 1: blank footer
诚信声明书      → Section 2: blank footer  ← easily missed!
中英文摘要      → Section 3: PAGE footer, upperRoman start=1
目录           → Section 4: blank footer
正文(绪论/第1章) → Section 5: PAGE footer, decimal start=1
```

### Simple Thesis (no separate declaration page)

```
封面           → Section 1: blank footer
中英文摘要      → Section 2: PAGE footer, upperRoman start=1
目录           → Section 3: blank footer
正文(第1章)     → Section 4: PAGE footer, decimal start=1
```

### All-Arabic From Body

```
封面+目录       → blank footer
正文           → PAGE footer, decimal start=1
```

## Key Files

| File | Purpose |
|------|---------|
| `word/document.xml` | Section breaks, pgNumType, footer references |
| `word/footerN.xml` | Actual footer content (PAGE fields) |
| `word/_rels/document.xml.rels` | Maps rId to footer files |
| `[Content_Types].xml` | Must register new footer files |

## Common Mistakes

- **Missing the declaration page**: Many theses have a 诚信声明书 page between cover and abstract. Check ALL content between the first two section breaks — don't assume it goes straight from cover to abstract.
- **Paragraph has no `w:pPr`**: When inserting a sectPr, check whether the target paragraph already has `w:pPr`. If not, you must create one (Case B above).
- **Forgetting to register new files**: New footer XMLs need entries in BOTH `document.xml.rels` AND `[Content_Types].xml`.
- **Editing without re-reading**: After unpack, always Read files before editing. The unpack step changes file state.
- **Forgetting `w:fmt`**: Without it, numbering defaults to decimal, which may break Roman numeral sequences.
- **Section continues when it should restart**: Adding `w:start="1"` restarts; omitting it continues from the previous section.
- **All content in one section**: Some documents put abstracts, TOC, and body all in one section. You MUST insert section breaks to give each its own page numbering.
- **File locked on repack**: If the output file is open in Word, write to a different filename.
- **pStyle mismatch**: New footer files should use the same `w:pStyle` ID as existing footers. Check an existing footer to find the correct ID (commonly `6` or `7`).
