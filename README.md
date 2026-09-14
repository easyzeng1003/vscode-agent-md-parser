# vscode-agent-md-parser

TypeScript utility to parse **VS Code Custom Agent** `.agent.md` files into a typed config object.

Based on the official documentation:  
[Custom agents in VS Code](https://code.visualstudio.com/docs/agent-customization/custom-agents)

## 安裝 / Installation

```bash
npm install vscode-agent-md-parser
# or
pnpm add vscode-agent-md-parser
```

依賴 `gray-matter` 來解析 YAML frontmatter。

## 使用方式 / Usage

```ts
import { parseAgentMd, type AgentConfig } from 'vscode-agent-md-parser';

const mdContent = `---
description: Generate an implementation plan for new features or refactoring existing code.
name: Planner
tools: ['web/fetch', 'search/codebase', 'search/usages']
model: ['Claude Opus 4.5', 'GPT-5.2']
handoffs:
  - label: Implement Plan
    agent: agent
    prompt: Now implement the plan outlined above.
    send: false
---
# Planning instructions
You are in planning mode. Your task is to generate an implementation plan...
`;

const config: AgentConfig = parseAgentMd(mdContent, {
  filename: 'planner.agent.md',
});

console.log(config);
/*
{
  name: 'Planner',
  description: 'Generate an implementation plan...',
  tools: ['web/fetch', 'search/codebase', 'search/usages'],
  model: ['Claude Opus 4.5', 'GPT-5.2'],
  userInvocable: true,
  disableModelInvocation: false,
  handoffs: [...],
  instructions: '# Planning instructions\n...'
}
*/
```

### Node.js 讀取檔案

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseAgentMd } from 'vscode-agent-md-parser';

export async function loadAgentMd(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8');
  return parseAgentMd(content, { filename: path.basename(filePath) });
}
```

## 支援的 Frontmatter 欄位

| 欄位 (YAML)              | 回傳型別 (camelCase)       | 說明 |
|--------------------------|----------------------------|------|
| `name`                   | `name`                     | Agent 名稱 |
| `description`            | `description`              | 簡短描述 |
| `argument-hint`          | `argumentHint`             | 輸入提示 |
| `tools`                  | `tools`                    | 工具列表 |
| `agents`                 | `agents`                   | 可呼叫的 subagents |
| `model`                  | `model`                    | 模型（字串或優先陣列） |
| `user-invocable`         | `userInvocable`            | 是否出現在下拉選單（預設 true） |
| `disable-model-invocation` | `disableModelInvocation` | 是否禁止被呼叫（預設 false） |
| `target`                 | `target`                   | `vscode` 或 `github-copilot` |
| `mcp-servers`            | `mcpServers`               | MCP servers |
| `handoffs`               | `handoffs`                 | 交接設定 |
| `hooks`                  | `hooks`                    | 生命週期 hooks |

Body 會變成 `instructions`。

同時相容 Claude 格式（`tools` 寫成逗號字串會自動轉成陣列）。

## 產生各 harness 的 agent 檔案

`generateAgentFile` 會把一份 VS Code custom agent（原始 `.agent.md` 字串，或已經由
`parseAgentMd` 解析出的 `AgentConfig`）轉成指定 harness 的對應檔案。

| harness   | 輸出路徑                      | 格式 |
|-----------|-------------------------------|------|
| `copilot` | `<name>.agent.md`             | kebab-case YAML frontmatter + Markdown body |
| `claude`  | `.claude/agents/<name>.md`    | `tools` 為逗號字串、`model` 只取單一值 |
| `codex`   | `AGENTS.md`                   | 純 Markdown，沒有 frontmatter |

```ts
import { generateAgentFile, generateAllAgentFiles } from 'vscode-agent-md-parser';

const file = generateAgentFile(mdContent, {
  harness: 'claude',
  filename: 'planner.agent.md',
});

console.log(file.path);    // '.claude/agents/planner.md'
console.log(file.content); // 完整檔案內容

// 一次產出三種 harness
for (const f of generateAllAgentFiles(mdContent, { filename: 'planner.agent.md' })) {
  console.log(f.harness, f.path);
}
```

名稱會被轉成 kebab-case slug 當檔名；若 frontmatter 沒有 `name`，則從 `filename` 推導。

## 開發 / Development

```bash
npm install
npm test    # typecheck + node:test
npm run build
```

## License

MIT
