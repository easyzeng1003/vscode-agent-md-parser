import matter from 'gray-matter';

export interface AgentHandoff {
  label: string;
  agent: string;
  prompt?: string;
  send?: boolean;
  model?: string;
}

export interface AgentConfig {
  /** Agent 名稱（若未提供會從檔名推導） */
  name?: string;
  description?: string;
  argumentHint?: string;
  tools?: string[];
  /** 可呼叫的 subagents，支援 '*' 或陣列 */
  agents?: string[] | '*';
  model?: string | string[];
  userInvocable: boolean;
  disableModelInvocation: boolean;
  target?: 'vscode' | 'github-copilot';
  mcpServers?: unknown[];
  handoffs?: AgentHandoff[];
  hooks?: Record<string, Array<{ type: string; command?: string; [key: string]: unknown }>>;
  /** Markdown body（agent 指令） */
  instructions: string;
  /** 來源檔案路徑（若有提供） */
  sourceFile?: string;
}

/**
 * 解析 VS Code Custom Agent 的 .agent.md 內容，產生 typed config
 * 根據官方文件：https://code.visualstudio.com/docs/agent-customization/custom-agents
 *
 * @param content 完整的 Markdown 字串
 * @param options.filename 檔名（用來推導預設 name）
 */
export function parseAgentMd(
  content: string,
  options?: { filename?: string }
): AgentConfig {
  const { data, content: body } = matter(content);

  // 把 kebab-case 轉成 camelCase，並套用預設值
  const config: AgentConfig = {
    name: data.name as string | undefined,
    description: data.description as string | undefined,
    argumentHint: (data['argument-hint'] ?? data.argumentHint) as string | undefined,
    tools: normalizeTools(data.tools),
    agents: normalizeAgents(data.agents),
    model: data.model as string | string[] | undefined,
    userInvocable: (data['user-invocable'] ?? data.userInvocable ?? true) as boolean,
    disableModelInvocation: (data['disable-model-invocation'] ?? data.disableModelInvocation ?? false) as boolean,
    target: data.target as 'vscode' | 'github-copilot' | undefined,
    mcpServers: (data['mcp-servers'] ?? data.mcpServers) as unknown[] | undefined,
    handoffs: data.handoffs as AgentHandoff[] | undefined,
    hooks: data.hooks as AgentConfig['hooks'],
    instructions: body.trim(),
    sourceFile: options?.filename,
  };

  // 若沒有 name，從檔名推導
  if (!config.name && options?.filename) {
    config.name = options.filename
      .replace(/\.agent\.md$/i, '')
      .replace(/\.md$/i, '')
      .split(/[/\\]/)
      .pop();
  }

  return config;
}

/** 正規化 tools（支援陣列或 Claude 格式的逗號字串） */
function normalizeTools(tools: unknown): string[] | undefined {
  if (tools == null) return undefined;
  if (Array.isArray(tools)) return tools.map(String);
  if (typeof tools === 'string') {
    return tools.split(',').map((t) => t.trim()).filter(Boolean);
  }
  return undefined;
}

/** 正規化 agents 欄位 */
function normalizeAgents(agents: unknown): string[] | '*' | undefined {
  if (agents == null) return undefined;
  if (agents === '*') return '*';
  if (Array.isArray(agents)) {
    if (agents.includes('*')) return '*';
    return agents.map(String);
  }
  if (typeof agents === 'string') {
    if (agents.trim() === '*') return '*';
    return agents.split(',').map((t) => t.trim()).filter(Boolean);
  }
  return undefined;
}

export default parseAgentMd;
