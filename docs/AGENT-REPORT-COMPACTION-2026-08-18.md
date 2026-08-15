# 工程调研报告：DSH 自动上下文压缩

- **执行者**：独立技术调研工程师
- **方式**：只读核验本机 DSH 0.1.0-rc.6 与 ChatGPT 订阅插件
- **结论**：DSH 已有自动压缩能力，问题不属于 `dsh-chatgpt-subscription`。

## 已核验事实

1. `dsh-compaction-basic` 默认在上下文达到 80% 时，于 `agent/pre-step` 执行压缩；模型明确返回 `CONTEXT_WINDOW_EXCEEDED` 时会压缩并重试一次。
2. 虚拟产品团队预设已加载 `dsh-compaction-basic`、`dsh-command-compact` 与工具结果裁剪器。
3. ChatGPT / Codex 模型通过 `dsh-llm-pi-ai` 提供上下文容量；GPT-5.6 系列容量为 272,000。
4. ChatGPT 订阅插件只负责 OAuth、凭据和 `openai-codex` 路由，既不能也不应承担会话压缩。
5. 当前机制无法中断一条尚未结束、也未明确报告超限的持续思考回复；这是需要补强的缺口。

## 关键源码位置

- `node_modules/@deepseek-ai/dsh-compaction-basic/lib/index.js`：压缩配置、`agent/pre-step`、超限恢复、摘要与事务提交。
- `node_modules/@deepseek-ai/dsh-agent-loop/lib/index.js`：请求前步骤、请求错误与重试循环。
- `node_modules/@deepseek-ai/dsh-token-meter/lib/index.js`：上下文计量与界面投影。
- `node_modules/@deepseek-ai/dsh-llm-pi-ai/lib/index.js`：模型容量和供应商停止原因归一化。

## 建议

将后续工作扩大为“模型运行可靠性”评估：不仅补上下文压缩的长回复恢复，还要排查不同模型/路由对 reasoning、流式输出、工具调用、任务状态和超时错误的兼容性。核心能力应放 DSH 通用层；如需插件，则做一层独立的运行看护与诊断界面，而非修改 ChatGPT OAuth 插件。

## 安全边界

- 摘要默认在同一模型/服务商内完成；跨服务商必须明确确认。
- 原始会话记录不可静默删除。
- 不得在摘要、日志或界面泄露 token、认证头或模型私有 reasoning。
