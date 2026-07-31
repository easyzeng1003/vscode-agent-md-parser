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

## License

MIT
