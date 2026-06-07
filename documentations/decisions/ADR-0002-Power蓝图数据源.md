# ADR-0002: Power 蓝图数据源

## 状态

已接受。

## 背景

`shape-shifter-curse-fabric` 的 `powers/*.json` 混合使用 Origins/Apoli 原生类型和 SSC 自定义类型。

典型结构包括：

- 顶层 power 类型
- 嵌套 entity action
- 嵌套 entity condition
- item condition
- bientity action
- `origins:and` / `origins:multiple` 这类组合结构
- `shape-shifter-curse:charge_action` 这类包含多层 tier 字段的复杂结构

React Flow 的 nodes/edges 很适合表达交互，但不适合作为最终语义数据源。

## 决策

Power 蓝图模块采用以下数据流：

```text
power JSON -> PowerAst -> BlueprintGraph -> 编辑 -> PowerAst -> power JSON
```

其中：

- `PowerAst` 是语义数据源。
- `BlueprintGraph` 是 UI 投影。
- 原始 JSON 的未知字段应尽量保留。
- React Flow 的 nodes/edges 不直接作为持久化格式。

## 理由

- 能避免 UI 画布结构污染 Power JSON 的语义结构。
- 能支持未来切换画布库或调整节点布局。
- 更容易做 roundtrip 测试。
- 更容易保留未知字段和未来新增字段。

## 后果

- 需要实现 JSON/AST/Graph 三者之间的转换层。
- 需要为转换层编写单元测试。
- 需要为不同 slot 类型建立 schema 和端口规则。
