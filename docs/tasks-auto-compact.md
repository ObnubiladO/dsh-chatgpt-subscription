# 任务清单：DSH 自动上下文压缩插件

| # | 任务 | 验收标准 | 依赖 |
|---|---|---|---|
| T1 | 创建项目骨架（package.json + cordis.patch.yml + scripts/build.mjs + .gitignore） | `npm run build` 无报错；cordis.patch.yml YAML 语法合法 | - |
| T2 | 编写 src/host.js（空 host，仅导出 apply/inject/name） | ESM import 成功；export default/inject/apply 正确 | T1 |
| T3 | 编写 tests/run-all.mjs（验证配置 schema、阈值范围、modelPolicies 格式） | 全绿；覆盖 thresholdRatio/retainRatio/modelPolicies/auto 字段 | T2 |
| T4 | 构建 lib/ 并提交 | `lib/index.js` 存在且可被 Node ESM import | T3 |
| T5 | 编写 README.md + README.zh-CN.md（安装/配置/卸载/原理说明） | 中英双语；含 `dsh plugin add` 命令；零密钥零路径 | T4 |
| T6 | 编写 CHANGELOG.md + LICENSE (MIT, songoao25) | 版本号 v0.1.0；LICENSE 正确 | T5 |
| T7 | 编写 .github/workflows/ci.yml（build + test） | CI 配置语法正确 | T4 |
| T8 | 安全审计（独立子 Agent） | 零密钥/零个人路径/零敏感数据泄露风险 | T4 |
| T9 | 本地安装验证（dsh plugin add + 重启 DSH + 触发压缩） | 插件加载成功；压缩在 75% 阈值触发 | T8 |
| T10 | 提交到 GitHub + 创建 tag v0.1.0 + Release | 走 KUN exec 通道；Release notes 含变更说明 | T9 |
