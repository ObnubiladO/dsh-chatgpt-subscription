# dsh-chatgpt-subscription v0.1.0

用官方 OAuth 一键绑定 ChatGPT 订阅（Codex）的 DeepSeek Harness (DSH) 插件——绑定后可在 DSH 内直接使用 ChatGPT 模型对话，消耗 ChatGPT Plus/Pro 订阅额度。

## 主要功能

- **官方 OAuth 绑定**：DSH 设置 → 「订阅」页一键授权（PKCE + state 完整安全流，与 Codex CLI/OpenCode 同款官方机制）
- **严格官方模式**：只有设置页官方授权才算绑定；codex CLI 既有登录态不被自动挪用
- **ChatGPT 模型接入 DSH**：绑定后模型切换器出现提供商 **ChatGPT**（如 `gpt-5.6-terra`），选择即对话
- **令牌看护**：JWT 感知自动续期（30 分钟周期），注入 DSH 凭据；失败保留上次正常状态
- **绑定状态页**：已绑定/未绑定、令牌有效期、重新授权/解绑
- **与 [dsh-bottom-info-bar](https://github.com/songoao25/dsh-bottom-info-bar) 配套**：信息栏读取本插件维护的令牌显示 ChatGPT 额度

## 安装

```bash
git clone https://github.com/songoao25/dsh-chatgpt-subscription.git
cd dsh-chatgpt-subscription
./install.sh        # 安装后重启 dsh web
```

## 本次发布包含

- 完整 OAuth 绑定状态机 + 令牌看护 + 路由注册 + RPC（含同源防护）
- 设置侧边栏「订阅」页
- 49 项自动化测试全绿（JWT/过期/绑定标记/auth 读写/PKCE/授权 URL/回调解析/account_id/安全静态）
- 安全审计通过：修复 2 个高危问题（缺失 OAUTH_SCOPE 常量、client React 获取方式）、插件 id 残留
- GitHub 发布规范文件：README 中英双语 / LICENSE(MIT) / CHANGELOG / CI / CONTRIBUTING / SECURITY 等 16 项

## 已知限制

- 真实端到端授权需用户首次绑定 ChatGPT 账号时自然验证（本版本未做真实账号实测）
- 可用模型以套餐为准（如 `gpt-5.3-codex-spark` 需更高计划）
