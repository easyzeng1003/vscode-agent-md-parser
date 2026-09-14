import matter from 'gray-matter';
import { parseAgentMd, type AgentConfig } from './parseAgentMd';

/** 支援輸出的 agent harness */
export type Harness = 'copilot' | 'claude' | 'codex';

export interface GeneratedAgentFile {
  harness: Harness;
  /** 相對於專案根目錄的建議輸出路徑 */
  path: string;
  content: string;
}

export interface GenerateOptions {
  harness: Harness;
  /** 當來源是原始 Markdown 字串時，用來推導預設 name */
  filename?: string;
}

/**
 * 依照指定的 harness，把 VS Code custom agent 轉成對應的 agent 檔案。
 *
 * - `copilot` → `<name>.agent.md`
 * - `claude`  → `.claude/agents/<name>.md`
 * - `codex`   → `AGENTS.md`
 *
 * @param source 原始 `.agent.md` 內容，或已經由 parseAgentMd 解析過的 config
 */
export function generateAgentFile(
  source: string | AgentConfig,
  options: GenerateOptions
): GeneratedAgentFile {
  const config =
    typeof source === 'string'
      ? parseAgentMd(source, { filename: options.filename })
      : source;

  switch (options.harness) {
    case 'copilot':
      return toCopilot(config);
    case 'claude':
      return toClaude(config);
    case 'codex':
      return toCodex(config);
    default:
      throw new Error(`Unsupported harness: ${String(options.harness)}`);
  }
}

/** 一次產出全部 harness 的檔案 */
export function generateAllAgentFiles(
  source: string | AgentConfig,
  options?: { filename?: string }
): GeneratedAgentFile[] {
  const harnesses: Harness[] = ['copilot', 'claude', 'codex'];
  return harnesses.map((harness) =>
    generateAgentFile(source, { harness, filename: options?.filename })
  );
}

/** Copilot / VS Code 原生格式：kebab-case frontmatter + Markdown body */
function toCopilot(config: AgentConfig): GeneratedAgentFile {
  const data: Record<string, unknown> = {};

  if (config.name) data.name = config.name;
  if (config.description) data.description = config.description;
  if (config.argumentHint) data['argument-hint'] = config.argumentHint;
  if (config.tools?.length) data.tools = config.tools;
  if (config.agents) data.agents = config.agents;
  if (config.model) data.model = config.model;
  // 只在偏離預設值時寫出，避免產生無意義的欄位
  if (config.userInvocable === false) data['user-invocable'] = false;
  if (config.disableModelInvocation === true) data['disable-model-invocation'] = true;
  if (config.target) data.target = config.target;
  if (config.mcpServers?.length) data['mcp-servers'] = config.mcpServers;
  if (config.handoffs?.length) data.handoffs = config.handoffs;
  if (config.hooks) data.hooks = config.hooks;

  return {
    harness: 'copilot',
    path: `${slugify(config.name)}.agent.md`,
    content: withFrontmatter(config.instructions, data),
  };
}

/** Claude subagent 格式：tools 是逗號字串、model 只接受單一字串 */
function toClaude(config: AgentConfig): GeneratedAgentFile {
  const slug = slugify(config.name);
  const data: Record<string, unknown> = { name: slug };

  if (config.description) data.description = config.description;
  if (config.tools?.length) data.tools = config.tools.join(', ');
  const model = firstModel(config.model);
  if (model) data.model = model;

  return {
    harness: 'claude',
    path: `.claude/agents/${slug}.md`,
    content: withFrontmatter(config.instructions, data),
  };
}

/** Codex 格式：AGENTS.md 沒有 frontmatter，全部資訊都寫進 Markdown */
function toCodex(config: AgentConfig): GeneratedAgentFile {
  const sections: string[] = [`# ${config.name ?? 'Agent'}`];

  if (config.description) sections.push(config.description);

  const meta: string[] = [];
  const model = firstModel(config.model);
  if (model) meta.push(`- Model: ${model}`);
  if (config.tools?.length) meta.push(`- Tools: ${config.tools.join(', ')}`);
  if (config.agents) {
    meta.push(`- Agents: ${config.agents === '*' ? '*' : config.agents.join(', ')}`);
  }
  if (meta.length) sections.push(meta.join('\n'));

  if (config.instructions) sections.push(config.instructions);

  return {
    harness: 'codex',
    path: 'AGENTS.md',
    content: `${sections.join('\n\n')}\n`,
  };
}

function withFrontmatter(body: string, data: Record<string, unknown>): string {
  const content = body ? `${body}\n` : '';
  if (Object.keys(data).length === 0) return content;
  return matter.stringify(content, data);
}

function firstModel(model: AgentConfig['model']): string | undefined {
  return Array.isArray(model) ? model[0] : model;
}

/** 把 agent 名稱轉成適合當檔名的 kebab-case slug */
function slugify(name: string | undefined): string {
  const slug = (name ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'agent';
}

export default generateAgentFile;
