import type { AstField, AstNode, AstValue, PowerAst } from "../ast/powerAstTypes";
import type { FieldSchema } from "../schema/blueprintSchemaTypes";
import type { BlueprintSchemaRegistry } from "../schema/registry";
import type { BlueprintGraph, BlueprintGraphEdge, BlueprintGraphField, BlueprintGraphNode } from "./blueprintGraphTypes";

export function graphToPowerAst(
  graph: BlueprintGraph,
  registry: BlueprintSchemaRegistry,
  baseAst?: PowerAst
): PowerAst {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const baseNodesById = new Map<string, AstNode>();
  if (baseAst) {
    collectAstNodes(baseAst.root, baseNodesById);
  }

  const incomingNodeIds = new Set(graph.edges.map((edge) => edge.target));
  const powerRoots = graph.nodes.filter((node) => node.kind === "power" && !incomingNodeIds.has(node.id));
  if (powerRoots.length === 0) {
    throw new Error("保存失败：蓝图中没有可导出的 power 根节点。");
  }

  assertNoUnreachableNodes(powerRoots, graph);

  const buildContext: BuildContext = {
    registry,
    nodesById,
    edgesBySourceHandle: groupEdgesBySourceHandle(graph.edges),
    baseNodesById,
    buildingNodeIds: new Set()
  };

  if (powerRoots.length === 1) {
    return { root: buildAstNode(powerRoots[0], buildContext) };
  }

  const baseRoot = baseAst?.root.type === "origins:multiple" ? baseAst.root : undefined;
  const powerFieldNames = uniquePowerFieldNames(powerRoots);
  return {
    root: {
      id: baseRoot?.id ?? "ast-root-multiple",
      type: "origins:multiple",
      kind: "power",
      fields: powerRoots.map((node, index) => ({
        name: powerFieldNames[index],
        value: buildAstNode(node, buildContext),
        schema: { name: powerFieldNames[index], valueKind: "slot", slotKind: "power", required: true },
        visible: true
      })),
      unknownFields: baseRoot?.unknownFields ?? []
    }
  };
}

interface BuildContext {
  registry: BlueprintSchemaRegistry;
  nodesById: Map<string, BlueprintGraphNode>;
  edgesBySourceHandle: Map<string, BlueprintGraphEdge[]>;
  baseNodesById: Map<string, AstNode>;
  buildingNodeIds: Set<string>;
}

function buildAstNode(node: BlueprintGraphNode, context: BuildContext): AstNode {
  if (context.buildingNodeIds.has(node.id)) {
    throw new Error(`保存失败：检测到循环连接：${node.title}`);
  }
  context.buildingNodeIds.add(node.id);

  const baseNode = context.baseNodesById.get(node.astNodeId);
  const astNode: AstNode = {
    id: node.astNodeId || node.id,
    type: node.type,
    kind: node.kind,
    label: node.label,
    fields: node.fields
      .map((field) => buildAstField(node, field, baseNode, context))
      .filter((field): field is AstField => Boolean(field)),
    unknownFields: baseNode?.unknownFields ?? []
  };

  context.buildingNodeIds.delete(node.id);
  return astNode;
}

function buildAstField(
  node: BlueprintGraphNode,
  field: BlueprintGraphField,
  baseNode: AstNode | undefined,
  context: BuildContext
): AstField | null {
  const schema = resolveFieldSchema(node, field, context.registry);
  const connectedEdges = context.edgesBySourceHandle.get(field.sourceHandleId) ?? [];
  const baseField = baseNode?.fields.find((candidate) => candidate.name === field.name);
  const value = buildFieldValue(field, schema, connectedEdges, baseField, context);

  if (value === undefined) {
    return null;
  }

  return {
    name: field.name,
    value,
    schema,
    visible: true
  };
}

function buildFieldValue(
  field: BlueprintGraphField,
  schema: FieldSchema,
  connectedEdges: BlueprintGraphEdge[],
  baseField: AstField | undefined,
  context: BuildContext
): AstValue | undefined {
  if (schema.valueKind === "slot" || schema.valueKind === "datatype") {
    const targetNode = context.nodesById.get(connectedEdges[0]?.target ?? "");
    if (targetNode) return buildAstNode(targetNode, context);
    if (schema.required) {
      throw new Error(`保存失败：必填参数 ${field.name} 尚未连接。`);
    }
    return undefined;
  }

  if (schema.valueKind === "slot_array" || schema.valueKind === "datatype_array") {
    if (schema.required && connectedEdges.length === 0) {
      throw new Error(`保存失败：必填数组参数 ${field.name} 尚未连接任何节点。`);
    }
    return connectedEdges
      .map((edge, index) => ({ edge, index }))
      .sort((left, right) => edgeOrder(left.edge, left.index) - edgeOrder(right.edge, right.index))
      .map(({ edge }) => context.nodesById.get(edge.target))
      .filter((targetNode): targetNode is BlueprintGraphNode => Boolean(targetNode))
      .map((targetNode) => buildAstNode(targetNode, context));
  }

  if (!field.inputKind && baseField) {
    return baseField.value;
  }

  return parseScalarDisplayValue(field, field.inputKind ?? scalarInputKind(schema));
}

function resolveFieldSchema(
  node: BlueprintGraphNode,
  field: BlueprintGraphField,
  registry: BlueprintSchemaRegistry
): FieldSchema {
  const schema = registry.get(node.type, node.kind);
  return schema?.fields.find((candidate) => candidate.name === field.name) ?? field.schema;
}

function parseScalarDisplayValue(
  field: BlueprintGraphField,
  inputKind: BlueprintGraphField["inputKind"]
): AstValue {
  const displayValue = field.displayValue;
  if (inputKind === "boolean") {
    const normalized = displayValue.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    throw new Error(`保存失败：参数 ${field.name} 不是合法 boolean。`);
  }

  if (inputKind === "json") {
    try {
      return JSON.parse(displayValue) as AstValue;
    } catch {
      throw new Error(`保存失败：参数 ${field.name} 不是合法 JSON。`);
    }
  }

  if (inputKind === "int") {
    if (!/^-?\d+$/.test(displayValue.trim())) {
      throw new Error(`保存失败：参数 ${field.name} 不是合法整数。`);
    }
    return Number.parseInt(displayValue, 10);
  }

  if (inputKind === "float") {
    if (!/^-?(?:\d+|\d+\.\d+|\.\d+)$/.test(displayValue.trim())) {
      throw new Error(`保存失败：参数 ${field.name} 不是合法浮点数。`);
    }
    return Number.parseFloat(displayValue);
  }

  if (displayValue === "null") {
    return null;
  }

  return displayValue;
}

function scalarInputKind(schema: FieldSchema): BlueprintGraphField["inputKind"] {
  if (schema.valueKind === "number") return schema.numberKind ?? "float";
  if (schema.valueKind === "boolean") return "boolean";
  if (schema.valueKind === "json") return "json";
  if (schema.valueKind === "string" || schema.valueKind === "enum") return "string";
  return undefined;
}

function edgeOrder(edge: BlueprintGraphEdge, fallbackIndex: number) {
  return typeof edge.order === "number" ? edge.order : fallbackIndex;
}

function groupEdgesBySourceHandle(edges: BlueprintGraphEdge[]) {
  const groups = new Map<string, BlueprintGraphEdge[]>();
  for (const edge of edges) {
    const existing = groups.get(edge.sourceHandle) ?? [];
    existing.push(edge);
    groups.set(edge.sourceHandle, existing);
  }
  return groups;
}

function collectAstNodes(node: AstNode, output: Map<string, AstNode>) {
  output.set(node.id, node);
  for (const field of node.fields) {
    if (isAstNode(field.value)) {
      collectAstNodes(field.value, output);
    } else if (Array.isArray(field.value)) {
      for (const item of field.value) {
        if (isAstNode(item)) {
          collectAstNodes(item, output);
        }
      }
    }
  }
}

function assertNoUnreachableNodes(roots: BlueprintGraphNode[], graph: BlueprintGraph) {
  const outgoing = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const targets = outgoing.get(edge.source) ?? [];
    targets.push(edge.target);
    outgoing.set(edge.source, targets);
  }

  const reachable = new Set<string>();
  const queue = roots.map((node) => node.id);
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (reachable.has(nodeId)) continue;
    reachable.add(nodeId);
    queue.push(...(outgoing.get(nodeId) ?? []));
  }

  const unreachable = graph.nodes.find((node) => !reachable.has(node.id));
  if (unreachable) {
    throw new Error(`保存失败：存在未连接到 power 根节点的节点：${unreachable.title}`);
  }
}

function uniquePowerFieldNames(roots: BlueprintGraphNode[]) {
  const usedNames = new Set<string>();
  return roots.map((node, index) => {
    const baseName = sanitizePowerFieldName(node.label && node.label !== "root" ? node.label : node.title) || `power_${index + 1}`;
    if (!usedNames.has(baseName)) {
      usedNames.add(baseName);
      return baseName;
    }

    let suffix = 2;
    while (usedNames.has(`${baseName}_${suffix}`)) {
      suffix += 1;
    }
    const name = `${baseName}_${suffix}`;
    usedNames.add(name);
    return name;
  });
}

function sanitizePowerFieldName(value: string | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isAstNode(value: unknown): value is AstNode {
  return value !== null && typeof value === "object" && "id" in value && "fields" in value;
}
