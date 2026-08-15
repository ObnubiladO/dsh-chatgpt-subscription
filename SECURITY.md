# 安全策略（Security Policy）

## 支持的版本（Supported Versions）

| 版本 | 支持状态 |
|---|---|
| v0.1.x | ✅ 积极维护 |
| 更早版本 | ❌ 不再支持 |

## 报告漏洞（Reporting a Vulnerability）

如果发现安全漏洞，**请不要公开提交 Issue**，请通过以下方式私下报告：

1. 在 GitHub 上创建一个 **Private security advisory**：
   仓库主页 → **Security** 标签页 → **Report a vulnerability**；
2. 或在项目 Issue 中 @ 维护者并说明"有安全事项需私下沟通"，我们会主动联系你。

我们会：
- 在 **48 小时内**确认收到报告；
- 评估严重程度并制定修复计划；
- 修复后发布补丁版本，并在 CHANGELOG 中记录。

## 安全承诺

本项目承诺：

- **令牌不出本机**：OAuth 令牌只存于 `~/.codex/auth.json`（0600）与 DSH 凭据库；不打印、不进日志、不进错误信息、不进 git 历史
- **官方机制**：绑定走 `auth.openai.com` 官方 OAuth（PKCE + state + 127.0.0.1 回调 + 超时清理），不采集密码
- **最小权限**：插件只做绑定/令牌维护/路由注册三件事；解绑保留用户 Codex CLI 登录态
- **零运行时依赖**：除官方 OpenAI 端点外无网络请求，攻击面最小化
