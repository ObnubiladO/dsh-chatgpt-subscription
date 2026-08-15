# 工程审计报告：DSH 跨模型运行可靠性

- **执行者**：独立运行可靠性架构师
- **方式**：只读审计 DSH 0.1.0-rc.6；未修改文件

## 总体结论

DSH 已有错误分类、流空闲超时、取消信号、有限重试、工具日志、上下文压缩事务和部分 UI。  
但它缺少一个由核心统一负责的**执行监督状态机**。当前主要风险是：无界工具循环、空/仅思考输出被当作完成、流与工具取消依赖下游合作、`always` 重试可无限进行、压缩是可选策略而非请求准入保障、token meter 只是估算不是预算执法器。插件能补“看见、提醒、软拦截”，但不能独立保证崩溃恢复、强制终止和副作用 exactly-once。

## 关键源码证据

- agent-loop 无硬上限：`dsh-agent-loop/lib/index.js:477-490, 531-604, 606-664`
- 空/思考输出默认 stop：`dsh-llm/lib/index.js:779-782`；loop 不验证可见正文：`dsh-agent-loop/lib/index.js:642-663`
- 流取消边界：`dsh-llm/lib/index.js:1348-1366`
- 无限重试：`dsh-llm-retry/lib/index.js:129-151`
- 工具超时仅合作式：`dsh-tool-call-timeout-policy/lib/index.js:3-8,115-140`
- 崩溃工具恢复保守 unknown：`dsh-session/lib/index.js:620-724`
- 压缩事务与 surface 替换：`dsh-compaction-basic/lib/index.js:360-489,765-901`；原始日志保留：`dsh-session/lib/index.js:1522-1554`
- token meter 为启发式：`dsh-token-meter/lib/index.js:14-72,444-473,531-562`
- UI 有 Stop/retry/compaction/trajectory，但缺单次 retry 立即执行/单独取消：`dsh-client-ui-conversation/lib/client.js:4919-4980,8198-8285,9687-9689`

## 推荐核心状态机

CREATED → VALIDATING → CONTEXT_ADMISSION → QUEUED → DISPATCHED → WAITING_FIRST_OUTPUT → STREAMING → ASSEMBLING → TOOL_PREPARING → TOOL_RUNNING → VERIFYING_PROGRESS → CHECKPOINTED → COMPLETED；活动状态可进入 CANCELLING/CANCELLED、RETRY_WAIT、FALLBACK_SELECT、PAUSED、FAILED。每次状态转换先持久写入再发起外部调用；COMPLETED 必须经可见正文校验；CANCELLING 起禁止新请求与未开始工具；未知副作用标 `unknown/needs-review`；重启从最近持久状态恢复；所有外部调用使用幂等键。

## 插件可实现 vs 必须核心实现

### 插件可可靠实现
运行状态面板、可靠性 timeline、错误统计；基于 `agent/request-error` 的有限 retry 与备用模型选择；基于 `agent/pre-step` 的软限制（最大步骤、重复工具签名、任务级预算提醒）；基于 session event 的进展观察与告警；调用 `agent.cancel()` 做软取消；声明工具 timeout 并要求工具响应 signal；添加恢复/暂停/换模型/停止 UI；对空回答或仅思考回答做事后诊断与提示；手动触发 idle compaction。

### 仅靠插件无法可靠保证
强制终止卡死模型流；强制终止不响应 abort 的工具；全局不可绕过的步骤/时间/成本上限；持久 attempt 状态机；原子 `tool/call` / `tool/result` 恢复；exactly-once 外部副作用；统一上下文准入；精确成本与配额执法；跨进程/provider 全局断路器；历史日志修复。

## 核心改造优先级

### P0
1. 新增 `hasUserVisibleFinalContent()`，reasoning-only/empty 不得进入 COMPLETED。
2. 为模型流增加首输出、空闲、绝对 deadline，并对 `iterator.next()` 建立可收敛 race。
3. 实施不可绕过的执行预算：最大 step/turn、最大工具调用总数、最大重复工具签名、最大 elapsed time、最大 token/成本 reservation。

### P1
工具 scheduler bounded cancel-drain；已开始工具持久 outcome；全局 retry attempts/elapsed/budget 上限覆盖 `always` policy；provider/model 断路器；幂等键与副作用 reconciliation 接口。

### P2
核心 context admission；compaction summary 自身 deadline/有限 retry/独立 token budget；token 使用标注来源；支持 provider 实际 usage 的预算结算与日/项目额度。

## MVP 方案

Host reliability controller + MVP 状态 UI + 基础上限（每 turn 最大 steps、同工具同参数最大连续调用数、单请求最大时长、单 turn 最大 token 估算、单 run 最大总时长）+ 有限重试（仅 transient，指数退避+jitter，无 always 无限模式）+ 基础断路器（每 provider/model 滑动窗口 open/cooldown/half-open）+ 上下文提示（早期预警、阈值触发压缩、压缩失败不静默继续）。MVP 验收：无输出时有限时间内显示失败或重试；Stop 后不再启动新调用或未开始工具；重复工具达阈值暂停；连续 provider 故障不无限消耗；reasoning-only/empty 不显示为正常完成；所有可靠性 UI 不显示 prompt、token、密钥或敏感工具参数。

## 测试矩阵要点

覆盖正常模型、思考流、仅思考流、空输出、无首 token、流空闲、迟到响应、流取消、工具前/中取消、工具卡死、工具崩溃恢复、重试、重试耗尽、无限 retry 被 cap 阻止、断路器、回退、隐私回退禁止自动切换、死循环暂停、合法循环不误杀、上下文压力、context overflow 先压缩再有限重试、压缩失败明确失败、重启恢复、预算阻止超额、隐私无泄露、并发原子 reservation、插件生命周期无孤儿资源、长稳无泄漏可恢复。

## 最终建议

实施顺序：核心 P0 → 插件 MVP → 核心 P1 → 核心 P2 → 完整系统（幂等副作用、跨进程健康服务、隐私路由、混沌测试）。可靠性不能依赖“让模型再试一次”，应由可持久化、可观测、有预算、可验证、可取消的控制器约束模型和工具。
