# 工程调研报告（初报）：OpenCode Go / DeepSeek 兼容性

- **执行者**：独立兼容性调研工程师
- **方式**：只读检查；未修改文件

## 初步结论

DSH 客户端与 DSH→pi-ai 均有明确的 reasoning 分流和工具调用转换，不支持“客户端简单把 reasoning 当作普通正文”的结论。现有证据更指向 OpenCode Go 的 DeepSeek OpenAI 兼容网关在“推理 + 工具调用续接”时，对 `reasoning_content` 回放的协议要求或实现不一致。

公开上游已有同类问题与修复讨论（pi #7702 / PR #7701、OpenCode #25000）。完整报告待回传后补充到本项目档案。
