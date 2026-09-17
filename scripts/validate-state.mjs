#!/usr/bin/env node
// 一致性驗證器 — docs/01-state-and-planning.md#一致性驗證器 的參考實作。
// 無第三方依賴，只用 Node 內建模組。
//
// 用法：
//   node scripts/validate-state.mjs [--root DIR]
//   node scripts/validate-state.mjs --shape-only --projects <f> --state <f>
//
// --shape-only 只跑不需要真實 workspace 的規則（純 JSON 結構），用來驗證
// templates/ 底下的範例；需要檔案系統的規則（plan、worktree 目錄、完成文件、
// handoff）會整組跳過。

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_STATUSES = ['not-started', 'in-progress', 'blocked', 'pass'];
const COMPLETED_SHAPE = ['id', 'project', 'name', 'status', 'completion_doc'];
const UNFINISHED = ['not-started', 'in-progress', 'blocked'];
const ACTIVE = ['in-progress', 'blocked']; // 佔用 worktree 額度的狀態
const PLAN_ACTIVE_DIR = 'docs/plans/active/';
const COMPLETED_DIR = 'docs/completed';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) { args._.push(token); continue; }
    const [rawKey, inline] = token.slice(2).split('=', 2);
    const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (inline !== undefined) args[key] = inline;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) { args[key] = argv[i + 1]; i += 1; }
    else args[key] = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log([
    '用法: node scripts/validate-state.mjs [--root DIR] [--shape-only]',
    '                                     [--projects FILE] [--state FILE] [--handoff FILE]',
    '',
    '驗證 docs/01-state-and-planning.md 規則表的 19 條不變式。',
    '失敗時非零結束，每筆診斷格式為 <project>/<id>.<rule>: <message>（寫到 stderr）。'
  ].join('\n'));
  process.exit(0);
}

const root = path.resolve(args.root || '.');
const shapeOnly = Boolean(args.shapeOnly);
const rel = (p) => path.join(root, p);
const toPosix = (p) => String(p).split(path.sep).join('/');

const projectsPath = args.projects ? path.resolve(args.projects) : rel('projects.json');
const statePath = args.state ? path.resolve(args.state) : rel('feature_list.json');
const handoffPath = args.handoff ? path.resolve(args.handoff) : rel('session-handoff.md');

const diagnostics = [];
const report = (project, id, rule, message) =>
  diagnostics.push(`${project ?? '-'}/${id ?? '-'}.${rule}: ${message}`);

function flush() {
  for (const line of diagnostics) process.stderr.write(`${line}\n`);
}

// 以界定符號包住，不能用裸子字串：abc-001 不該誤中 xabc-001
function mentionsId(text, id) {
  const esc = String(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9_-])${esc}([^A-Za-z0-9_-]|$)`).test(text);
}

function walkMarkdown(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

// --- 載入：state.file -------------------------------------------------------

function loadJson(file, label) {
  if (!existsSync(file)) {
    report(null, null, 'state.file', `${label} 讀不到：${toPosix(file)}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    report(null, null, 'state.file', `${label} 不是合法 JSON：${error.message}`);
    return null;
  }
}

const registry = loadJson(projectsPath, 'projects.json');
const state = loadJson(statePath, 'feature_list.json');

if (!registry || !state) {
  flush();
  process.stderr.write(`\n${diagnostics.length} 筆診斷，驗證未通過。\n`);
  process.exit(1);
}

if (!Array.isArray(state.features)) {
  report(null, null, 'state.file', 'feature_list.json 缺少 features 陣列');
  flush();
  process.stderr.write('\n1 筆診斷，驗證未通過。\n');
  process.exit(1);
}

const projectIds = new Set((registry.projects ?? []).map((p) => p.id));
const allowedStatuses = Array.isArray(state.allowed_statuses) ? state.allowed_statuses : DEFAULT_STATUSES;
const features = state.features;

// --- 逐筆工作項 -------------------------------------------------------------

const seenKeys = new Set();
const claimedWorktrees = new Map();
const completionDocs = new Set();

for (const f of features) {
  const project = f.project;
  const id = f.id;

  // state.known-status
  if (!allowedStatuses.includes(f.status)) {
    report(project, id, 'state.known-status',
      `status「${f.status}」不在允許值 ${allowedStatuses.join('／')} 之內`);
  }

  // state.unique-key
  const key = `${project}/${id}`;
  if (seenKeys.has(key)) report(project, id, 'state.unique-key', '(project, id) 與另一筆重複');
  else seenKeys.add(key);

  const isPass = f.status === 'pass';
  const isActive = ACTIVE.includes(f.status);
  const isUnfinished = UNFINISHED.includes(f.status);

  if (isPass) {
    // state.completed-shape
    const keys = Object.keys(f);
    const missing = COMPLETED_SHAPE.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !COMPLETED_SHAPE.includes(k));
    if (missing.length || extra.length) {
      const parts = [];
      if (missing.length) parts.push(`缺 ${missing.join('、')}`);
      if (extra.length) parts.push(`多 ${extra.join('、')}`);
      report(project, id, 'state.completed-shape', `pass 必須剛好五欄，${parts.join('；')}`);
    }

    // state.completion-doc
    const doc = f.completion_doc;
    if (!doc || typeof doc !== 'string' || !doc.trim()) {
      report(project, id, 'state.completion-doc', 'pass 的 completion_doc 為空');
    } else {
      completionDocs.add(toPosix(doc));
      if (!shapeOnly && !existsSync(rel(doc))) {
        report(project, id, 'state.completion-doc', `completion_doc 指向的檔案不存在：${toPosix(doc)}`);
      }
    }

    // state.worktree-pass
    if (f.worktrees !== undefined) {
      report(project, id, 'state.worktree-pass', 'pass 仍帶 worktrees，收尾時必須先移除');
    }
  }

  if (isActive) {
    // state.next-action
    if (!f.next_action || !String(f.next_action).trim()) {
      report(project, id, 'state.next-action', `${f.status} 缺 next_action`);
    }

    // state.worktree-required
    if (!Array.isArray(f.worktrees) || f.worktrees.length === 0) {
      report(project, id, 'state.worktree-required',
        `${f.status} 沒有 worktrees（in-progress 與 blocked 共用同一份額度）`);
    }
  }

  // state.blocked-fields
  if (f.status === 'blocked') {
    for (const field of ['blocked_reason', 'resume_condition']) {
      if (!f[field] || !String(f[field]).trim()) {
        report(project, id, 'state.blocked-fields', `blocked 缺 ${field}`);
      }
    }
  }

  // state.plan / state.plan-status
  if (f.plan) {
    const plan = toPosix(f.plan);
    if (!shapeOnly && !existsSync(rel(plan))) {
      report(project, id, 'state.plan', `plan 指向的檔案不存在：${plan}`);
    }
    if (isUnfinished && !plan.startsWith(PLAN_ACTIVE_DIR)) {
      report(project, id, 'state.plan-status',
        `未完成工作項的 plan 必須在 ${PLAN_ACTIVE_DIR} 底下，實為 ${plan}`);
    }
  }

  // worktree 逐棵
  for (const w of Array.isArray(f.worktrees) ? f.worktrees : []) {
    const dir = toPosix(w.dir ?? '');

    // state.worktree-claimed
    if (claimedWorktrees.has(dir)) {
      report(project, id, 'state.worktree-claimed',
        `worktree「${dir}」已被 ${claimedWorktrees.get(dir)} 認領`);
    } else {
      claimedWorktrees.set(dir, `${project}/${id}`);
    }

    // state.worktree-dir
    if (!shapeOnly && dir && !existsSync(rel(dir))) {
      report(project, id, 'state.worktree-dir', `宣告的 worktree 目錄不存在：${dir}`);
    }

    // state.worktree-branch
    const expected = `feature/${id}`;
    if (w.branch !== expected) {
      report(project, id, 'state.worktree-branch', `分支名必須是 ${expected}，實為 ${w.branch}`);
    }

    // state.worktree-project
    if (!projectIds.has(w.project)) {
      report(project, id, 'state.worktree-project', `worktree 的 project「${w.project}」不在名冊之內`);
    }
  }
}

// --- state.completion-doc-orphan --------------------------------------------

if (!shapeOnly) {
  const base = rel(COMPLETED_DIR);
  if (existsSync(base)) {
    for (const file of walkMarkdown(base)) {
      const relPath = toPosix(path.relative(root, file));
      // docs/completed/progress/ 是過程紀錄，不是完成文件
      if (relPath.startsWith(`${COMPLETED_DIR}/progress/`)) continue;
      if (completionDocs.has(relPath)) continue;
      const parts = relPath.slice(`${COMPLETED_DIR}/`.length).split('/');
      const orphanProject = parts.length > 1 ? parts[0] : 'root';
      const orphanId = parts[parts.length - 1].replace(/\.md$/, '');
      report(orphanProject, orphanId, 'state.completion-doc-orphan', `${relPath} 沒有被任何 pass 指向`);
    }
  }
}

// --- handoff ----------------------------------------------------------------

if (!shapeOnly) {
  if (!existsSync(handoffPath)) {
    report(null, null, 'handoff.file', `交接檔不存在：${toPosix(handoffPath)}`);
  } else {
    const text = readFileSync(handoffPath, 'utf8');

    // handoff.completed
    for (const f of features) {
      if (f.status === 'pass' && mentionsId(text, f.id)) {
        report(f.project, f.id, 'handoff.completed', '交接檔提到已 pass 的工作項');
      }
    }

    // handoff.current
    const active = features.filter((f) => ACTIVE.includes(f.status));
    if (active.length && !active.some((f) => mentionsId(text, f.id))) {
      report(null, null, 'handoff.current',
        `有 ${active.length} 筆 in-progress／blocked 工作項，但交接檔一個都沒提到`);
    }
  }
}

// --- 輸出 -------------------------------------------------------------------

flush();

if (diagnostics.length) {
  process.stderr.write(`\n${diagnostics.length} 筆診斷，驗證未通過。\n`);
  process.exit(1);
}

const scope = shapeOnly ? '結構規則（--shape-only，跳過需要 workspace 的規則）' : '全部 19 條規則';
console.log(`驗證通過：${features.length} 筆工作項，${scope}。`);
