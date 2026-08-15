# 主流 Agent 自动上下文压缩调研报告

> 日期：2026-08-18  
> 目的：为 DSH 自动压缩插件提供触发阈值、保留策略与失败降级的设计依据

## 1. OpenAI Codex CLI

| 项目 | 值 |
|---|---|
| 默认触发阈值 | **80%** context window（早期版本），v0.100.0+ 硬上限 90%，用户可配置但不可超过 90% |
| 保留最近历史 | 默认保留最新 ~2,500 tokens（约最近 N 条消息）；可通过 `body_after_prefix` 配置 |
| 摘要模型 | 默认使用当前对话同一模型；支持配置独立 summarization model |
| 失败降级 | 摘要失败保留原历史，记录警告；不无限重试；连续失败后停止自动压缩 |
| 按路由配置 | 支持 per-model threshold override（PR #29255） |
| 关键源码/文档 | [Codex CLI Compaction Architecture](https://codex.danielvaughan.com/2026/03/31/codex-cli-context-compaction-architecture/)、[PR #29255](https://github.com/openai/codex/pull/29255)、[Issue #4106](https://github.com/openai/codex/issues/4106) |

### 关键发现
- Codex CLI 的 80% 默认值是行业基准；DSH 现有 `dsh-compaction-basic` 也采用 80%，与之一致。
- 但 Codex 对大窗口模型（如 GPT-5.5 1M）曾出现 catalog mismatch 导致实际容量远小于声明值，使 80% 阈值失效（[Issue #19409](https://github.com/openai/codex/issues/19409)）。**DSH 插件必须校验 adapter 返回的真实 contextWindow，而非仅依赖目录声明。**
- v0.100.0 引入 90% 硬上限引发社区争议（[Issue #11805](https://github.com/openai/codex/issues/11805)），说明用户对阈值可调性有强需求。

## 2. Claude Code

| 项目 | 值 |
|---|---|
| 默认触发阈值 | **~80–83%** context window（社区实测 + Issue #31806 确认） |
| 保留最近历史 | 保留最近 3 条 assistant 消息 + 所有 tool results；Microcompact 模式更激进 |
| 摘要模型 | 使用当前模型；不支持跨模型摘要 |
| 失败降级 | 摘要失败保留原历史；PreCompact hook 可拦截 |
| 按路由配置 | 环境变量 `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 可调整，但不能超过默认上限（[Issue #31806](https://github.com/anthropics/claude-code/issues/31806)） |
| 关键源码/文档 | [auto-compact-deep-dive.md](https://github.com/johnzfitch/claude-wiki/blob/master/02-Claude-Code-CLI/auto-compact-deep-dive.md)、[Issue #28728](https://github.com/anthropics/claude-code/issues/28728) |

### 关键发现
- Claude Code 的 ~83% 与 Codex 的 80% 高度接近，验证了 80% 作为行业默认值的合理性。
- 社区强烈要求阈值可配置且可高于默认值（[Issue #46695](https://github.com/anthropics/claude-code/issues/46695)、[Issue #66475](https://github.com/anthropics/claude-code/issues/66475)）。

## 3. KUN (KunAgent/Kun) — 源码级核验（2026-08-18）

| 项目 | 值 |
|---|---|
| 默认触发阈值 | 已识别模型：软阈值 = 窗口 **75%**、硬阈值 = **85%**（源码安全封顶）；未匹配模型兜底 192k / 217.6k token |
| 保留最近历史 | 按历史项数而非比例：普通 **4** 项、加急 **2** 项、强制 **1** 项；工具调用/结果成组保护 |
| 摘要模型 | 默认当前对话同一模型；可配置 `summaryModel` / `summaryProviderId`；设计意图不自动换小模型 |
| 失败降级 | 摘要超时（15s）/报错/空文本/账号不匹配时，自动改用**本地启发式摘要**，压缩继续完成 |
| 按路由配置 | 按模型档案支持 `softRatio`/`hardRatio`；无“同一模型按路由分别配置”的公开字段 |
| 关键源码 | [model-context-profile.ts](https://github.com/KunAgent/Kun/blob/master/kun/src/loop/model-context-profile.ts)、[context-compactor.ts](https://github.com/KunAgent/Kun/blob/master/kun/src/loop/context-compactor.ts)、[compaction-summary.ts](https://github.com/KunAgent/Kun/blob/master/kun/src/loop/compaction-summary.ts)、[history-compaction-service.ts](https://github.com/KunAgent/Kun/blob/master/kun/src/loop/history-compaction-service.ts) |

### 关键发现
- **KUN 的软阈值 75% 与 DSH 插件设计值一致**，这是跨产品共识。
- KUN 的启发式摘要兜底值得借鉴：模型摘要失败不阻塞压缩流程。DSH 现有实现无本地兜底（失败保留原历史），本插件保持 DSH 现状（安全优先），后续版本可评估加入。

## 4. ChatGPT Codex CLI — 源码级核验（2026-08-18）

| 项目 | 值 |
|---|---|
| 默认触发阈值 | 模型上下文窗口 × **90%**（配置值同样封顶 90%）；未知模型兜底档案 272k 窗口 → 244,800 token |
| 保留最近历史 | V2 远程压缩：最多保留 **64,000 token**，从最新消息倒序挑选，超出预算截断 |
| 摘要模型 | 使用当前会话/模型对应的远程压缩接口；无公开“单独指定摘要模型”配置 |
| 失败降级 | 特定模型错误时用当前模型重试一次；仍失败返回压缩错误，**无本地启发式兜底** |
| 按路由配置 | 全局 `model_context_window` / `model_auto_compact_token_limit` / `_scope`（total / body_after_prefix）；无按路由分别配置阈值的公开结构 |
| 关键源码 | [openai_models.rs](https://github.com/openai/codex/blob/main/codex-rs/protocol/src/openai_models.rs)、[context_window.rs](https://github.com/openai/codex/blob/main/codex-rs/core/src/session/context_window.rs)、[compact_remote_v2.rs](https://github.com/openai/codex/blob/main/codex-rs/core/src/compact_remote_v2.rs)、[compact_model_fallback.rs](https://github.com/openai/codex/blob/main/codex-rs/core/src/compact_model_fallback.rs) |

### 关键发现
- Codex 的 90% 阈值引发社区争议（[Issue #11805](https://github.com/openai/codex/issues/11805)），说明高阈值体验差；**本插件采用 75% 更稳妥**。
- Codex 的 `body_after_prefix` 计数作用域与保留预算思想值得后续版本参考。

## 5. DSH 现有实现（dsh-compaction-basic）

| 项目 | 值 |
|---|---|
| 默认触发阈值 | **80%** (`thresholdRatio = 0.8`) |
| 保留最近历史 | **16%** context window (`retainRatio = 0.16`) |
| 摘要模型 | 默认当前路由模型；支持 `summarizationProvider` / `summarizationModel` 覆盖 |
| 失败降级 | 摘要失败保留原 surface；连续失败抛错但被 agent-loop catch 并 warn |
| 按路由配置 | 支持 `modelPolicies` 数组精确匹配 provider/model |
| 关键源码 | `dsh-compaction-basic/lib/index.js:13-15,56-75,83-98` |

## 6. 对 DSH 插件的设计建议

| 设计点 | 建议值 | 依据 |
|---|---|---|
| 默认触发阈值 | **75%** | KUN 源码软阈值即 75%（跨产品共识）；Codex 90% 社区争议大；75% 为大窗口模型预留安全余量 |
| 保留最近历史 | **20%** context window | DSH 现有 16% 之上小幅提升，确保工具调用链完整；KUN 按 4 项保留、Codex 按 64k token，比例法对 DSH 最直接 |
| 摘要模型 | 默认同路由；允许显式覆盖 | 与 Codex/Claude Code/KUN 一致；KV cache 友好 |
| 失败降级 | 最多重试 1 次；失败后保留原历史 + 明确提示；同一会话连续 2 次失败后暂停自动压缩 | DSH 现有行为安全优先；KUN 的本地启发式兜底留作后续版本 |
| 按路由配置 | 必须支持 | DSH modelPolicies 原生支持；OpenCode Go DeepSeek 等大窗口路由需要更低阈值（65%） |
| contextWindow 校验 | 必须以 adapter resolveModel 返回值为准，目录声明仅作 fallback | Codex Issue #19409 教训 |
