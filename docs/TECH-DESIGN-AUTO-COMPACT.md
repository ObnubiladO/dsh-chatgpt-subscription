# 技术设计：DSH 自动上下文压缩插件

## 方案概述

做一个独立的 DSH 静态 bundle 插件 `dsh-auto-compact`，它**不替代**现有 `dsh-compaction-basic`，而是以**更合理的默认阈值 + 按路由预设策略**来增强自动压缩体验。插件通过 Cordis 的 `compaction` realm 注入配置，在标准模式和虚拟产品团队模式下均可工作。

大白话：DSH 已经有自动整理历史的能力，只是默认门槛太高（80%），对大窗口模型不够友好。这个插件把门槛调到 75%，并为常见模型设好推荐值，让用户不用手动配置就能获得更好的体验。

## 技术选型

| 选项 | 选择 | 理由 |
|---|---|---|
| 实现形态 | 静态 bundle 插件 | 与 dsh-chatgpt-subscription 一致；可 `dsh plugin add` 安装；无需重启即可生效（client 改动刷新页面，host 改动需重启） |
| 压缩引擎 | 复用 `dsh-compaction-basic` | 已有完整的事务、摘要、重试、安全降级机制；重写风险高且无收益 |
| 配置注入方式 | 通过 `agent.cordis.yml` 的 compaction group config | 官方预设已用此方式；插件可提供自己的 preset patch 或用户手动 merge |
| 语言 | Plain JavaScript (ESM) | DSH 插件规范；无 TypeScript/JSX 转换 |

## 目录结构

```
dsh-auto-compact/
├── package.json              # name=dsh-auto-compact, dsh.bundle.patch
├── cordis.patch.yml          # compaction-basic config override
├── src/
│   └── host.js               # 空 host（仅配置注入，无运行时逻辑）
├── lib/
│   └── index.js              # 构建产物（已提交）
├── scripts/
│   └── build.mjs             # src/ → lib/
├── tests/
│   └── run-all.mjs           # 配置验证测试
├── README.md / README.zh-CN.md
├── CHANGELOG.md
├── LICENSE (MIT, songoao25)
└── .github/workflows/ci.yml
```

## 核心配置（cordis.patch.yml）

```yaml
- id: compaction
  name: cordis:group
  group: true
  isolate:
    compaction: true
    toolResultPruner: true
  config:
    - id: compaction-basic
      name: '@deepseek-ai/dsh-compaction-basic'
      config:
        thresholdRatio: 0.75
        retainRatio: 0.20
        maxTokens: 8192
        compactionRetries: 1
        maxOverflowRetries: 1
        auto: true
        modelPolicies:
          - provider: openai-codex
            model: gpt-5.6-terra
            thresholdRatio: 0.70
            retainRatio: 0.20
          - provider: openai-codex
            model: gpt-5.6-luna
            thresholdRatio: 0.70
            retainRatio: 0.20
          - provider: openai-codex
            model: gpt-5.6-sol
            thresholdRatio: 0.70
            retainRatio: 0.20
          - provider: opencode-go
            model: deepseek-v4-pro
            thresholdRatio: 0.65
            retainRatio: 0.20
          - provider: opencode-go
            model: deepseek-v4-flash
            thresholdRatio: 0.65
            retainRatio: 0.20
    - id: command-compact
      name: '@deepseek-ai/dsh-command-compact'
    - id: tool-result-pruner
      name: '@deepseek-ai/dsh-compaction-tool-result-pruner'
      config:
        thresholdChars: 8192
        headChars: 4096
        tailChars: 1024
```

## 风险与对策

| 风险 | 对策 |
|---|---|
| 与现有 compaction-basic 配置冲突 | 插件文档明确说明：若用户已自定义 compaction 配置，需手动 merge；插件提供的是"推荐默认值"而非强制覆盖 |
| contextWindow 目录声明不准确导致阈值失效 | 依赖 adapter resolveModel 返回的真实值（compaction-basic 已实现）；文档提醒用户为大窗口模型设置 modelOverrides |
| 摘要失败阻塞 pre-step | compaction-basic 已有 catch + warn；插件不改变此行为 |
| 用户不理解如何安装/启用 | README 提供一键安装命令 + 配置说明 + 卸载方式 |

## 验收标准

- [ ] `npm run build` 成功生成 `lib/index.js`
- [ ] `node tests/run-all.mjs` 全绿
- [ ] `cordis.patch.yml` 语法正确，可被 DSH profile 加载
- [ ] README 中英双语，含安装/配置/卸载说明
- [ ] 零密钥、零个人路径、author=songoao25
