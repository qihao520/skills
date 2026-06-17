#!/usr/bin/env node
/**
 * Paper Batch Analyzer - Core Analysis Script
 *
 * Usage:
 *   node analyze_papers.js <json_glob_or_file> <output_dir> [keywords_config.json]
 *
 * Input:
 *   One or more JSON files from extract_pdfs.py, format:
 *   { "filename.pdf": { "title": "...", "text": "..." } }
 *
 * Output (5 files):
 *   论文速览表.md + .csv  - Paper overview table
 *   术语词典.md           - Terminology dictionary
 *   软件工具清单.md        - Software tools inventory
 *   研究方向图谱.md         - Research direction map
 *   论文方向建议.md         - Paper topic suggestions
 */

const fs = require('fs');
const path = require('path');

// ==================== ARGS ====================
const jsonInput = process.argv[2];
const outputDir = process.argv[3] || '.';
const configPath = process.argv[4];

if (!jsonInput) {
  console.error('Usage: node analyze_papers.js <json_files> <output_dir> [config]');
  console.error('  json_files: path to JSON file, or glob pattern like "batch*.json"');
  process.exit(1);
}

// ==================== LOAD CONFIG ====================
let config;
if (configPath && fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} else {
  // Try default config
  const defaultConfig = path.join(__dirname, '..', 'references', 'default_keywords.json');
  if (fs.existsSync(defaultConfig)) {
    config = JSON.parse(fs.readFileSync(defaultConfig, 'utf-8'));
  } else {
    // Fallback: use embedded minimal config
    config = {
      categories: {},
      software_patterns: [],
      interdisciplinary_analogies: [],
    };
  }
}

const keywordCategories = config.categories || {};
const softwarePatterns = config.software_patterns || [];
const analogies = config.interdisciplinary_analogies || [];

// ==================== LOAD PAPERS ====================
// Support both single file and glob-like patterns
const fs_glob = require('fs');
let jsonFiles = [];
if (jsonInput.includes('*')) {
  // Simple glob: batch*.json
  const dir = path.dirname(jsonInput) || '.';
  const pattern = path.basename(jsonInput).replace(/\*/g, '.*');
  const regex = new RegExp('^' + pattern + '$');
  jsonFiles = fs.readdirSync(dir).filter(f => regex.test(f)).map(f => path.join(dir, f));
} else {
  jsonFiles = [jsonInput];
}

const allPapers = [];
jsonFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.warn(`Warning: File not found: ${file}`);
    return;
  }
  const batch = JSON.parse(fs.readFileSync(file, 'utf-8'));
  Object.entries(batch).forEach(([filename, paper]) => {
    allPapers.push({
      filename,
      title: paper.title || filename.replace(/\.pdf$/i, ''),
      text: paper.text || '',
    });
  });
});

console.log(`Loaded ${allPapers.length} papers from ${jsonFiles.length} file(s)`);

// ==================== ANALYSIS ====================
const paperAnalysis = allPapers.map(paper => {
  const { title, text } = paper;
  const combined = title + ' ' + text.substring(0, 3000);

  // Extract author (Chinese format: "标题_作者名")
  let author = '';
  const titleParts = title.split('_');
  if (titleParts.length >= 2) {
    author = titleParts[titleParts.length - 1].replace(/[（(].*[）)]/g, '').trim();
  }
  const cleanTitle = titleParts.length >= 2 ? titleParts.slice(0, -1).join('_') : title;

  // Classify research directions
  const directionScores = {};
  Object.entries(keywordCategories).forEach(([dir, keywords]) => {
    const score = keywords.filter(kw => combined.includes(kw)).length;
    if (score > 0) directionScores[dir] = score;
  });
  const sortedDirs = Object.entries(directionScores).sort((a, b) => b[1] - a[1]);
  const primaryDir = sortedDirs.length > 0 ? sortedDirs[0][0] : '未分类';

  // Detect software
  const software = [];
  softwarePatterns.forEach(sp => {
    if (sp.patterns.some(p => combined.toLowerCase().includes(p.toLowerCase()))) {
      software.push(sp.name);
    }
  });

  // Extract key terms
  const keyTerms = [];
  const allKeywords = [...new Set(Object.values(keywordCategories).flat())];
  allKeywords.forEach(kw => {
    if (combined.includes(kw) && !keyTerms.includes(kw)) {
      keyTerms.push(kw);
    }
  });

  return {
    title: cleanTitle,
    author,
    primaryDirection: primaryDir,
    allDirections: sortedDirs.map(d => d[0]),
    software,
    keyTerms: keyTerms.slice(0, 10),
    textLength: text.length,
  };
});

// ==================== OUTPUTS ====================
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// ----- 论文速览表 -----
console.log('Generating: 论文速览表');
let md = `# 📄 论文速览表\n\n`;
md += `> 共 ${allPapers.length} 篇 | 生成日期：${new Date().toLocaleDateString('zh-CN')}\n\n`;
md += `| 序号 | 论文标题 | 作者 | 研究方向 | 软件工具 |\n`;
md += `|------|----------|------|----------|----------|\n`;
let csv = `序号,论文标题,作者,研究方向,软件工具\n`;

paperAnalysis.forEach((p, i) => {
  const shortTitle = p.title.length > 55 ? p.title.substring(0, 52) + '...' : p.title;
  md += `| ${i + 1} | ${shortTitle} | ${p.author || '-'} | ${p.primaryDirection} | ${p.software.join('、') || '-'} |\n`;
  csv += `"${i + 1}","${p.title}","${p.author || '-'}","${p.primaryDirection}","${p.software.join('、')}"\n`;
});

// Direction stats
const dirStats = {};
paperAnalysis.forEach(p => {
  dirStats[p.primaryDirection] = (dirStats[p.primaryDirection] || 0) + 1;
});
md += `\n---\n\n## 📊 研究方向分布\n\n`;
md += `| 方向 | 论文数 | 占比 |\n|------|--------|------|\n`;
Object.entries(dirStats).sort((a, b) => b[1] - a[1]).forEach(([dir, count]) => {
  md += `| ${dir} | ${count} | ${(count / paperAnalysis.length * 100).toFixed(1)}% |\n`;
});

fs.writeFileSync(path.join(outputDir, '论文速览表.md'), md, 'utf-8');
fs.writeFileSync(path.join(outputDir, '论文速览表.csv'), csv, 'utf-8');

// ----- 术语词典 -----
console.log('Generating: 术语词典');
const termFreq = {};
paperAnalysis.forEach(p => p.keyTerms.forEach(t => { termFreq[t] = (termFreq[t] || 0) + 1; }));
const sortedTerms = Object.entries(termFreq).sort((a, b) => b[1] - a[1]);

let termMD = `# 🔑 核心术语词典\n\n> 基于 ${allPapers.length} 篇论文提取\n\n## 高频术语\n\n`;
termMD += `| 排名 | 术语 | 出现论文数 |\n|------|------|-----------|\n`;
sortedTerms.slice(0, 50).forEach(([term, freq], i) => {
  termMD += `| ${i + 1} | **${term}** | ${freq} |\n`;
});

// Cross-domain analogies
if (analogies.length > 0) {
  termMD += `\n## 跨学科类比\n\n`;
  termMD += `| 术语 | 解释 | 计算机/技术类比 |\n|------|------|-----------------|\n`;
  analogies.forEach(a => {
    termMD += `| **${a.term}** | ${a.explanation} | ${a.cs_analogy} |\n`;
  });
}

fs.writeFileSync(path.join(outputDir, '术语词典.md'), termMD, 'utf-8');

// ----- 软件工具清单 -----
console.log('Generating: 软件工具清单');
const softFreq = {};
paperAnalysis.forEach(p => p.software.forEach(s => { softFreq[s] = (softFreq[s] || 0) + 1; }));

let softMD = `# 🛠️ 软件工具清单\n\n> 基于 ${allPapers.length} 篇论文提取\n\n`;
softMD += `| 软件 | 提及论文数 |\n|------|-----------|\n`;
Object.entries(softFreq).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
  softMD += `| **${name}** | ${count} |\n`;
});

// Full-text search for deeper results
softMD += `\n## 全文本搜索补充\n\n`;
const allText = allPapers.map(p => p.text).join(' ');
softwarePatterns.forEach(sp => {
  sp.patterns.forEach(pattern => {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const matches = allText.match(regex);
    if (matches && matches.length > 5) {
      softMD += `- **${sp.name}**: ${matches.length} 次提及\n`;
    }
  });
});

fs.writeFileSync(path.join(outputDir, '软件工具清单.md'), softMD, 'utf-8');

// ----- 研究方向图谱 -----
console.log('Generating: 研究方向图谱');
let dirMD = `# 🗺️ 研究方向图谱\n\n> 基于 ${allPapers.length} 篇论文分析\n\n`;
dirMD += `## 方向全景\n\n`;
Object.entries(dirStats).sort((a, b) => b[1] - a[1]).forEach(([dir, count], i) => {
  const bar = '█'.repeat(Math.round(count / paperAnalysis.length * 40));
  dirMD += `**${dir}**: ${bar} ${count}篇 (${(count / paperAnalysis.length * 100).toFixed(1)}%)\n\n`;
});

// Per direction
Object.entries(keywordCategories).forEach(([dir, keywords]) => {
  const dirPapers = paperAnalysis.filter(p => p.primaryDirection === dir);
  if (dirPapers.length === 0) return;
  dirMD += `## ${dir}（${dirPapers.length}篇）\n\n`;
  dirMD += `**核心关键词**: ${keywords.join('、')}\n\n`;
  const authors = {};
  dirPapers.forEach(p => { if (p.author) authors[p.author] = (authors[p.author] || 0) + 1; });
  const topAuthors = Object.entries(authors).sort((a, b) => b[1] - a[1]).slice(0, 5);
  dirMD += `**主要作者**: ${topAuthors.map(([a, c]) => `${a}(${c}篇)`).join('、')}\n\n`;
  dirMD += `**代表论文**:\n`;
  dirPapers.slice(0, 5).forEach(p => dirMD += `- ${p.title}\n`);
  dirMD += '\n';
});

// Author rankings
const allAuthors = {};
paperAnalysis.forEach(p => { if (p.author) allAuthors[p.author] = (allAuthors[p.author] || 0) + 1; });
dirMD += `## 核心研究人员\n\n| 排名 | 姓名 | 论文数 |\n|------|------|--------|\n`;
Object.entries(allAuthors).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([name, count], i) => {
  dirMD += `| ${i + 1} | **${name}** | ${count} |\n`;
});

fs.writeFileSync(path.join(outputDir, '研究方向图谱.md'), dirMD, 'utf-8');

// ----- 论文方向建议 -----
console.log('Generating: 论文方向建议');
const topDir = Object.entries(dirStats).sort((a, b) => b[1] - a[1])[0];
const topDirName = topDir ? topDir[0] : '该领域';

let sugMD = `# 💡 可发论文方向建议\n\n> 基于 ${allPapers.length} 篇论文分析\n\n`;
sugMD += `## 团队研究概况\n\n`;
sugMD += `- 核心方向：**${topDirName}**（${topDir ? topDir[1] : 0}篇，${topDir ? (topDir[1] / paperAnalysis.length * 100).toFixed(1) : 0}%）\n`;
sugMD += `- 活跃作者：${Object.entries(allAuthors).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => `${n}(${c}篇)`).join('、')}\n\n`;

sugMD += `## 潜在方向\n\n`;
sugMD += `基于论文内容的交叉分析，建议从以下角度寻找创新点：\n\n`;
sugMD += `1. **数据驱动方向**：利用机器学习/深度学习对团队实验数据进行建模预测（如参数优化、质量评估）\n`;
sugMD += `2. **系统平台方向**：将团队研究成果转化为Web可视化平台/监测预警系统\n`;
sugMD += `3. **自动化工具方向**：开发脚本/工具提升团队仿真后处理、数据分析效率\n`;
sugMD += `4. **交叉创新方向**：引入其他领域的新方法（如数字孪生、迁移学习）解决传统矿业问题\n`;
sugMD += `5. **综述方向**：基于团队论文撰写系统性文献综述\n\n`;

sugMD += `> ⚠️ 以上仅为数据分析建议，最终选题请与导师充分沟通。\n`;

fs.writeFileSync(path.join(outputDir, '论文方向建议.md'), sugMD, 'utf-8');

// ===================== SUMMARY =====================
console.log(`\n✅ Analysis complete! ${allPapers.length} papers processed.`);
console.log(`   Output directory: ${outputDir}`);
console.log(`   Files generated:`);
console.log(`     - 论文速览表.md + .csv`);
console.log(`     - 术语词典.md`);
console.log(`     - 软件工具清单.md`);
console.log(`     - 研究方向图谱.md`);
console.log(`     - 论文方向建议.md`);
