# Changelog

本项目的版本记录遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.0] - 2026-08-17

> 首个可分发版本：ChatGPT 订阅官方 OAuth 绑定插件。本版本完成从「读本机 codex CLI 登录态」旧桥接方式到「官方 OAuth 授权」的完整迁移（用户拍板废弃旧方式），并修复复制底稿残留的插件 id 与缺失 scope 参数问题。

### Added

- **官方 OAuth 绑定（设置页入口）**：DSH 设置侧边栏新增「订阅」页（紧邻「模型」）；点击「授权登录」→ 浏览器打开 `auth.openai.com` 官方授权页 → 完成授权即绑定
- **PKCE + state 完整安全流**：S256 code challenge、随机 state 校验、本地回调服务仅监听 127.0.0.1、5 分钟超时自动清理；授权码交换令牌（`oauth/token`，authorization_code + code_verifier）
- **严格官方模式（绑定标记唯一事实）**：只有设置页官方授权成功才写入绑定标记（`~/.dsh/dsh-chatgpt-subscription/codex-bind.json`，0600）；codex CLI 既有登录态绝不被自动使用（彻底废弃旧桥接来源）
- **openai-codex 模型路由注册**：provider `openai-codex`（displayName **ChatGPT**，`transport: sse` 绕开不稳定的 WebSocket 通道）写入 DSH 模型目录；绑定后模型切换器出现 ChatGPT 模型（如 `gpt-5.6-terra`）
- **令牌看护（30 分钟周期）**：启动即刷 + 每 30 分钟检查；JWT exp 判定（10 天寿命、45 分钟续期提前量），临近过期用 refresh_token 调官方刷新端点自动续期；续期后原子写回 `~/.codex/auth.json`（0600，保留结构）并注入 DSH 凭据 `OPENAI_CODEX_API_KEY`
- **绑定状态 RPC**：`getCodexBridgeStatus`（绑定态/过期时间/最近同步/错误/路由状态）、`startCodexOAuth`（防并发，端口占用明确报错）、`unbindCodex`（清标记 + 清凭据，保留 auth.json）
- **同源防护**：解绑等修改类 RPC 校验 Origin / Sec-Fetch-Site，跨站请求拒绝
- **测试**：`tests/test-codex-host.js` 36 项断言（JWT 解码/过期判定/绑定标记/auth.json 读写/PKCE/授权 URL/回调解析/安全静态检查），`tests/run-all.mjs` 一键入口，零真实网络、零真实 auth.json
- **安装/卸载脚本**：`install.sh`（一键装到 profile）、`uninstall.sh`（移除插件 + 清理注入的路由与凭据，保留 auth.json）

### Fixed

- **缺失 `OAUTH_SCOPE` 常量**：`buildAuthorizeUrl` 引用了从未定义的 `OAUTH_SCOPE`，会导致点击授权时 `ReferenceError` 卡死；补上 `openid profile email offline_access`（与 pi-ai/Codex CLI 一致，offline_access 用于换 refresh_token）
- **插件 id 残留**：`cordis.patch.yml` 与构建脚本的 client 模块 id 复制自底稿仍为 `dsh-bottom-info-bar`，导致插件挂载/加载错误；统一改为 `dsh-chatgpt-subscription`
- **测试提取器**：纯函数提取时兄弟函数引用（如 `decodeJwtExp` 调 `decodeBase64Url`）无法解析导致测试崩溃；改为「常量 + 纯函数」共享作用域整体求值
- **client 获取 React 方式（安全审计发现）**：原用 `window.React`，DSH 客户端环境无该全局，设置页会崩溃；改为与官方 client 包一致的 `require('react')`（seed 模块提供）

### Security

- 令牌仅存于 `~/.codex/auth.json`（0600）与 DSH 凭据库（0600）；不打印、不进日志、不进错误信息、不进 git 历史
- 解绑不清除 `~/.codex/auth.json`（codex CLI 自己的登录态保留）
- 回调页纯静态 HTML，message 全部 HTML 转义；回调服务仅 127.0.0.1 + state 校验防 CSRF

### Changed

- **废弃旧桥接方式**：不再读取 `~/.codex/auth.json` 作为自动绑定来源；绑定以官方 OAuth 授权为准（用户 2026-08-17 拍板「废弃这个方式，走官方的绑定方案」）
- 提供商显示名统一为 **ChatGPT**（Codex 与 ChatGPT 已合并）
- 本插件与 dsh-bottom-info-bar 职责分离：本插件 = 绑定 + 令牌维护；信息栏 = 只读令牌显示额度

## 版本计划

- `v1.0.0`：稳定运行验证后定版（真实端到端授权 + 对话实测通过后）
