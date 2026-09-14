import assert from 'node:assert/strict';
import { test } from 'node:test';
import matter from 'gray-matter';
import { parseAgentMd } from '../src/parseAgentMd';
import { generateAgentFile, generateAllAgentFiles } from '../src/generateAgentFile';

const SOURCE = `---
name: Planner
description: Generate an implementation plan for new features.
argument-hint: <feature name>
tools: ['web/fetch', 'search/codebase']
model: ['Claude Opus 4.5', 'GPT-5.2']
---
# Planning instructions

You are in planning mode.
`;

test('copilot 輸出 <name>.agent.md 路徑', () => {
  const file = generateAgentFile(SOURCE, { harness: 'copilot' });
  assert.equal(file.path, 'planner.agent.md');
  assert.equal(file.harness, 'copilot');
});

test('copilot 輸出可以被 parseAgentMd 讀回相同的 config', () => {
  const file = generateAgentFile(SOURCE, { harness: 'copilot' });
  const reparsed = parseAgentMd(file.content, { filename: file.path });

  assert.equal(reparsed.name, 'Planner');
  assert.equal(reparsed.description, 'Generate an implementation plan for new features.');
  assert.equal(reparsed.argumentHint, '<feature name>');
  assert.deepEqual(reparsed.tools, ['web/fetch', 'search/codebase']);
  assert.deepEqual(reparsed.model, ['Claude Opus 4.5', 'GPT-5.2']);
  assert.equal(reparsed.instructions, '# Planning instructions\n\nYou are in planning mode.');
});

test('copilot 省略維持預設值的 user-invocable / disable-model-invocation', () => {
  const { content } = generateAgentFile(SOURCE, { harness: 'copilot' });
  assert.ok(!content.includes('user-invocable'));
  assert.ok(!content.includes('disable-model-invocation'));
});

test('copilot 在非預設值時寫出 kebab-case 欄位', () => {
  const source = SOURCE.replace(
    'name: Planner',
    'name: Planner\nuser-invocable: false\ndisable-model-invocation: true'
  );
  const { data } = matter(generateAgentFile(source, { harness: 'copilot' }).content);
  assert.equal(data['user-invocable'], false);
  assert.equal(data['disable-model-invocation'], true);
});

test('claude 輸出 .claude/agents/<name>.md 路徑', () => {
  const file = generateAgentFile(SOURCE, { harness: 'claude' });
  assert.equal(file.path, '.claude/agents/planner.md');
  assert.equal(file.harness, 'claude');
});

test('claude 把 tools 序列化成逗號字串', () => {
  const { data } = matter(generateAgentFile(SOURCE, { harness: 'claude' }).content);
  assert.equal(data.tools, 'web/fetch, search/codebase');
});

test('claude 只保留 model 陣列的第一個項目', () => {
  const { data } = matter(generateAgentFile(SOURCE, { harness: 'claude' }).content);
  assert.equal(data.model, 'Claude Opus 4.5');
});

test('codex 輸出沒有 frontmatter 的 AGENTS.md', () => {
  const file = generateAgentFile(SOURCE, { harness: 'codex' });
  assert.equal(file.path, 'AGENTS.md');
  assert.ok(!file.content.startsWith('---'));
});

test('codex 內容包含名稱標題、描述與 instructions', () => {
  const { content } = generateAgentFile(SOURCE, { harness: 'codex' });
  assert.ok(content.startsWith('# Planner\n'));
  assert.ok(content.includes('Generate an implementation plan for new features.'));
  assert.ok(content.includes('- Tools: web/fetch, search/codebase'));
  assert.ok(content.includes('You are in planning mode.'));
});

test('接受已解析的 AgentConfig 作為來源', () => {
  const config = parseAgentMd(SOURCE);
  const fromConfig = generateAgentFile(config, { harness: 'claude' });
  const fromSource = generateAgentFile(SOURCE, { harness: 'claude' });
  assert.deepEqual(fromConfig, fromSource);
});

test('沒有 name 時從檔名推導，且 generateAllAgentFiles 產出三種 harness', () => {
  const source = '---\ndescription: No name here.\n---\nBody text.\n';
  const files = generateAllAgentFiles(source, { filename: 'Code Reviewer.agent.md' });

  assert.deepEqual(
    files.map((f) => f.path),
    ['code-reviewer.agent.md', '.claude/agents/code-reviewer.md', 'AGENTS.md']
  );
});
