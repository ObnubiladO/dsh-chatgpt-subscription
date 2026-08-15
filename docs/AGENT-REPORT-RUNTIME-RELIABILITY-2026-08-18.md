# 工程审计报告：DSH 跨模型运行可靠性

- **执行者**：独立运行可靠性架构师
- **方式**：只读审计 DSH 0.1.0-rc.6；未修改文件

## 已有保护

- reasoning/text 已按类型区分；
- 每次流读取有 300 秒无数据看护；
- 请求可取消；
- 请求失败有持久化重试；
- 上下文压力与明确超限有自动压缩。

## 已确认缺口

1. 没有全局执行监督状态机；
2. 没有总时限、单步时限、步骤数或成本预算；
3. 没有可靠的“是否仍在有效进展”语义；
4. 没有跨服务商的熔断保护；
5. agent-loop 对无限工具循环没有硬上限；
6. 非合作式卡住的工具可能绕过现有超时包装；
7. 调度器内部异常可能保留 `tool/call` 却没有合成 `tool/result`，影响后续恢复。

## 交付形态判断

独立插件可先交付：运行遥测与看板、请求错误重试/降级、请求前保护、合作式工具超时包装、界面状态层。

必须由 DSH 核心配合或修复：挂死流/非合作式工具的强制终止、原子恢复、完整执行监督状态机、循环与预算的可靠硬限制。

## 关键源码证据

- agent-loop：`lib/index.js` 612–664、117–289
- LLM：`dsh-llm/lib/index.js` 1322–1405
- 工具超时：`dsh-tool-call-timeout-policy/lib/index.js` 3–8、115–140
- 重试：`dsh-llm-retry/lib/index.js` 84–161
- 自动压缩：`dsh-compaction-basic/lib/index.js` 775–828、855–901
- 流适配：`dsh-llm-deepseek/lib/index.js` 527–568、`dsh-llm-pi-ai/lib/index.js` 808–872
- 计量/界面：`dsh-token-meter/lib/index.js` 444–594、`dsh-client-ui-conversation/lib/client.js` 7237–7467、9687–9689
