# AGENTS.md

## 项目定位

SSC_studio 是为 Minecraft Java 模组项目 `shape-shifter-curse-fabric` 制作的本地开发者编辑器。

项目目标是降低复杂模组配置的维护成本，重点包括：

- 形态 Power 蓝图
- 形态贴图配置
- mask 处理
- 后续数据包/资源包生成流程

本仓库应优先服务现有模组数据结构，不以开发通用可视化编辑器为目标。

## 必读文档

进行非平凡修改前，必须先阅读：

- `documentations/仓库上下文.md`
- `documentations/规划索引.md`
- 相关模块的 `documentations/modules/<module-name>/上下文.md`
- 相关 ADR：`documentations/decisions/`

## 文档结构

- `documentations/仓库上下文.md`：全局项目状态、模块列表、约束、当前阶段、验证状态。
- `documentations/规划索引.md`：模块、决策和主要规划文档索引。
- `documentations/decisions/`：架构决策记录。
- `documentations/modules/<module-name>/`：模块级上下文、需求、架构、数据模型和进度。

每个主要模块至少应包含：

- `上下文.md`
- `需求.md`
- `架构.md`
- `进度.md`

如果模块涉及复杂持久化数据，还应包含：

- `数据模型.md`

## 文档更新规则

以下变化必须更新相关文档：

- 模块边界变化
- 架构变化
- 数据模型变化
- 模块之间的公开接口变化
- 文件或项目结构变化
- 验证、构建、运行方式变化
- 重要实现进度变化

小型 UI 调整、局部 bugfix、纯机械重构不强制更新全局上下文，除非它们改变行为或项目结构。

新增模块时，必须：

1. 在 `documentations/modules/` 下创建模块目录。
2. 创建模块 `上下文.md`。
3. 更新 `documentations/规划索引.md`。
4. 更新 `documentations/仓库上下文.md`。

## 工程规则

- 优先遵循目标模组现有数据结构和命名。
- 保证 JSON roundtrip 稳定，编辑器不得静默丢弃未知字段。
- 源 JSON/AST 是语义数据源，可视化 graph 只是交互投影。
- 尽量避免把业务逻辑写进 React 组件。
- 文件访问、schema registry、AST 转换、校验、graph 转换应拆成独立模块。
- 应用代码默认使用 TypeScript。
- 复杂转换逻辑必须配套聚焦的单元测试。

## 目标模组仓库边界

目标模组仓库预期路径：

`F:\MC Modding\Projects\shape-shifter-curse-fabric`

除非用户明确要求，不要修改目标模组仓库中的文件。

调研或读取模组数据时，优先关注：

- `src/main/resources/data/shape-shifter-curse/powers`
- `src/main/resources/data/shape-shifter-curse/origins`
- `src/main/java/net/onixary/shapeShifterCurseFabric/additional_power`

## Power 蓝图规则

- Power JSON 必须先表示为稳定 AST，再投影到可视化 graph。
- React Flow nodes/edges 不得作为最终持久化格式。
- 编辑器应尽量保留未知字段。
- 校验应由 schema 驱动。
- 必须区分 power、entity action、entity condition、item condition、bientity action 等 slot 类型。
- 现有 Power JSON 应作为 roundtrip 测试 fixtures。

## 文件安全

- 写入操作必须限制在用户选择的 workspace/project root 内。
- 写入生成 JSON 前，应优先提供 diff 或保留原始内容。
- 不要批量格式化目标模组仓库，除非用户明确要求。
- 不要删除用户文件，除非用户明确要求。

## 验证要求

Power 蓝图相关修改至少应验证：

- JSON 能成功解析。
- JSON -> AST -> graph -> AST -> JSON 保持语义结构。
- 代表性的现有 power 文件能够打开。

前端相关修改至少应验证：

- 应用能本地启动。
- 关键视图不出现空白屏。
- 常见交互能在浏览器或 Electron 窗口中工作。

如果无法运行验证，最终回复中必须说明原因。
