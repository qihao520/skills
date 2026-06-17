# Skills

个人 Claude Code 技能集合 🧰

## 已收录技能

| 技能 | 说明 | 触发方式 |
|------|------|----------|
| **eq-chat-advisor** | 高情商聊天军师——分析对话、生成回复、训练话术、制定策略 | "军师" / "怎么回" / "帮我想个回复" |
| **paper-batch-analyzer** | 批量分析PDF论文——自动生成速览表、术语词典、软件清单、方向图谱、选题建议 | "批量分析论文" / "总结团队论文" |

## 安装

```bash
# 安装聊天军师
npx skills add qihao520/skills@eq-chat-advisor

# 安装论文分析器
npx skills add qihao520/skills@paper-batch-analyzer
```

## 使用

安装后直接在对话中说出触发词即可调用对应技能，例如：

- "军师，这句该怎么回？"
- "帮我把这个文件夹里的论文批量分析一下"

## 目录结构

```
skills/
├── eq-chat-advisor/
│   └── SKILL.md              # 高情商聊天军师
├── paper-batch-analyzer/
│   ├── SKILL.md              # 论文批量分析器
│   ├── scripts/
│   │   ├── extract_pdfs.py   # PDF文本提取
│   │   └── analyze_papers.js # 核心分析引擎
│   └── references/
│       └── default_keywords.json  # 可配置关键词分类
└── README.md
```
