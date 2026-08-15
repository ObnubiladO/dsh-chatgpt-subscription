# 工程调研报告：DSH × OpenCode Go DeepSeek 兼容性

- **执行者**：独立兼容性调研工程师
- **方式**：只读检查；未修改文件、未发送真实请求、未读取密钥或对话正文

## 已证实事实

1. DSH 通过 `opencode-go` 路由访问 DeepSeek V4，中间经过 OpenCode Go 的 OpenAI 兼容网关 `/zen/go/v1`，并非直连 DeepSeek 官方 API。
2. pi-ai 内置目录明确声明该组合需要 `thinkingFormat: "deepseek"` 与“后续请求必须回传 `reasoning_content`”，且已有专门字段名修补逻辑。
3. DSH 客户端与 pi-ai→DSH 转换均把推理作为独立 `reasoning` 块处理，并有专用 Think 展示组件；“把思考当正文”不是客户端主嫌疑。
4. 官方 DeepSeek 适配器只读取标准 `reasoning_content`，因此直连官方 API 时不会触发同类回放问题。
5. 公开上游记录（pi #7702 / PR #7701、OpenCode #25000）已确认该类网关在“thinking + tool call + 下一回合”链路上存在 reasoning 回放不稳定风险。

## 根因置信度排序

| 排名 | 可能根因 | 置信度 |
|---:|---|---:|
| 1 | OpenCode Go 网关未稳定保留/接受工具回合中的 `reasoning_content` | 高 |
| 2 | 网关将推理塞入普通 `content`，导致下游显示为正文 | 中 |
| 3 | 同一会话中字段形态不一致（`reasoning` / `reasoning_content` / `content`） | 中高 |
| 4 | 高推理档本身慢，思考期无有效流输出 | 中 |
| 5 | pi-ai 0.82.1 尚未覆盖网关最新行为 | 中 |
| 6 | DSH 客户端渲染错误 | 很低 |

## 去敏诊断采集要点

仅记录元数据：时间、模型、轮次、chunk 时序、字段是否存在与长度、HTTP 状态、finish reason、请求 ID、assistant 历史是否包含非空 `reasoning_content`。禁止记录 prompt、系统提示、工具参数、工具返回、Authorization、Cookie、API Key 或任何正文内容。

## 分层修复方向

1. **网关层**：统一推理字段、保证工具回合完整回放、错误可识别。
2. **适配层**：为 `opencode-go + DeepSeek` 增加版本化 compat、回放前校验、去敏诊断事件。
3. **客户端层**：仅增强可观测性，不猜测或重写上游输出。
4. **用户侧短期规避**：涉及工具调用/命令执行/连续任务优先用 DeepSeek 官方 API；纯文本任务可用 OpenCode Go DeepSeek；稳定工作可用千问等已验证模型。

## 防回归测试矩阵

至少覆盖：基础协议、thinking、工具调用、关键组合（thinking → tool call → tool result → 下一轮）、长链路（连续工具调用、上下文增长、模型切换）。重点断言下一轮 assistant 历史包含预期 `reasoning_content`，且不发生静默断流或将推理误作正文。
