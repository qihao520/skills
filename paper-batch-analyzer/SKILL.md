---
name: paper-batch-analyzer
description: >
  Batch analyze academic papers in a folder, automatically generating paper overview tables,
  terminology dictionaries, software tool inventories, research direction maps,
  and cross-disciplinary paper topic suggestions. Use this skill whenever the user
  mentions "批量分析论文", "论文太多看不过来", "总结团队论文", "分析文献",
  "literature review", "batch paper analysis", provides a folder path containing PDFs,
  or expresses that they have many papers to read and need summaries or research direction suggestions.
---

# Paper Batch Analyzer

Batch process a folder of academic papers (PDFs) and generate comprehensive analysis reports.

## Workflow

Follow these steps in order:

### Step 1: Confirm Input

Ask the user for:
- **Folder path** containing the PDF files
- **Output directory** (default: current working directory)
- **Research domain** (optional, e.g., "矿井瓦斯抽采", "CFD仿真") — if not provided, auto-detect from content

### Step 2: Extract PDF Text

Run the PDF extraction script:

```bash
python scripts/extract_pdfs.py "<pdf_folder_path>" "<output_json_path>" --max-chars 8000 --max-pages 15
```

This produces a JSON file with `{ "filename": { "title": "...", "text": "..." } }`.

- If there are more than 30 PDFs, split into batches of ~25 and produce multiple JSON files.
- `--max-chars` controls max chars per paper (default 8000).
- `--max-pages` controls max pages to read per paper (default 15).

**Dependency:** `pip install pdfplumber` if not already installed.

### Step 3: Analyze Papers

Run the analysis script:

```bash
node scripts/analyze_papers.js "<json_files_glob>" "<output_dir>" "<domain_config>"
```

Where `<domain_config>` is an optional path to a JSON file defining keyword categories. If omitted, uses `references/default_keywords.json`.

**Dependency:** Node.js (any recent version).

### Step 4: Report Results

The script generates 5 files:

| File | Description |
|------|-------------|
| `论文速览表.md` + `.csv` | All papers: title, author, direction, software |
| `术语词典.md` | High-frequency terms, definitions, cross-domain analogies |
| `软件工具清单.md` | Software/tools mentioned, priority learning roadmap |
| `研究方向图谱.md` | Research direction distribution, core researchers, author network |
| `论文方向建议.md` | Potential paper topics based on the user's background |

Present a summary to the user highlighting:
- Total papers and research direction breakdown
- Top 3 software tools to learn
- Top 2-3 recommended paper directions

## Customization

### Adjusting Keyword Categories

The keyword categories in `references/default_keywords.json` define how papers are classified. To adapt for a different research domain:

1. Copy `references/default_keywords.json` to a new file
2. Edit the categories and keywords to match the target domain
3. Pass the custom config path to `analyze_papers.js`

### Adjusting Software Detection

Edit the `softwarePatterns` array in `scripts/analyze_papers.js` to add/remove software tools relevant to the domain.

## Notes

- The skill works best with Chinese academic papers (title format: "标题_作者名")
- For English papers, author extraction from filename may not work — adjust `extract_pdfs.py` to parse author from PDF metadata
- Text extraction quality depends on the PDF format (scanned PDFs will produce no text)
- Suggested batch size: ~25 papers per JSON file for optimal processing speed
