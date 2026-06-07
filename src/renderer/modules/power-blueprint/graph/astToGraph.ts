import type { AstField, AstNode, AstValue, PowerAst } from "../ast/powerAstTypes";
import type { BlueprintSchemaRegistry } from "../schema/registry";
import type { SlotKind } from "../schema/blueprintSchemaTypes";
import type { BlueprintGraph, BlueprintGraphEdge, BlueprintGraphField, BlueprintGraphNode } from "./blueprintGraphTypes";

const NODE_X_STEP = 510;
const NODE_Y_STEP = 234;
const START_X = 80;
const START_Y = 80;

export function astToBlueprintGraph(ast: PowerAst, registry: BlueprintSchemaRegistry): BlueprintGraph {
  const nodes: BlueprintGraphNode[] = [];
  const edges: BlueprintGraphEdge[] = [];
  const rowsByDepth = new Map<number, number>();

  function visit(node: AstNode, depth: number) {
    const row = rowsByDepth.get(depth) ?? 0;
    rowsByDepth.set(depth, row + 1);

    const graphNodeId = node.id;
    const schema = registry.get(node.type, node.kind);
    const nodeColor = colorForSlotKind(node.kind);
    nodes.push({
      id: graphNodeId,
      astNodeId: node.id,
      type: node.type,
      kind: node.kind,
      title: node.label ?? schema?.title ?? readableTypeName(node.type),
      label: node.label,
      color: nodeColor,
      position: {
        x: START_X + depth * NODE_X_STEP,
        y: START_Y + row * NODE_Y_STEP
      },
      fields: node.fields.map((field) => toGraphField(graphNodeId, field, nodeColor))
    });

    for (const field of node.fields) {
      const edgeColor = colorForField(field, nodeColor);
      if (field.schema.valueKind === "slot" || field.schema.valueKind === "datatype") {
        if (isAstNode(field.value)) {
          visit(field.value, depth + 1);
          edges.push(createEdge(graphNodeId, field.value.id, field.name, edgeColor));
        }
      }

      if (field.schema.valueKind === "slot_array" && Array.isArray(field.value)) {
        field.value.forEach((item, index) => {
          if (!isAstNode(item)) return;
          visit(item, depth + 1);
          edges.push(createEdge(graphNodeId, item.id, field.name, edgeColor, index));
        });
      }
    }
  }

  if (ast.root.type === "origins:multiple") {
    for (const field of ast.root.fields) {
      if (isAstNode(field.value) && field.schema.slotKind === "power") {
        visit(field.value, 0);
      }
    }
  } else {
    visit(ast.root, 0);
  }
  return { nodes, edges };
}

function toGraphField(nodeId: string, field: AstField, nodeColor: string): BlueprintGraphField {
  const connected =
    (isAstNode(field.value) && (field.schema.valueKind === "slot" || field.schema.valueKind === "datatype")) ||
    (Array.isArray(field.value) && field.schema.valueKind === "slot_array" && field.value.some(isAstNode));

  return {
    name: field.name,
    valueKind: field.schema.valueKind,
    displayValue: displayValue(field.value, field.schema.valueKind),
    connected,
    color: colorForField(field, nodeColor),
    inputKind: inputKindForField(field.schema),
    sourceHandleId: sourceHandleId(nodeId, field.name)
  };
}

function inputKindForField(schema: AstField["schema"]): BlueprintGraphField["inputKind"] {
  if (schema.valueKind === "number") return schema.numberKind ?? "float";
  if (schema.valueKind === "string" || schema.valueKind === "enum") return "string";
  if (schema.valueKind === "boolean") return "boolean";
  return undefined;
}

function colorForField(field: AstField, nodeColor: string) {
  if (field.schema.valueKind === "slot" || field.schema.valueKind === "slot_array") {
    return colorForSlotKind(field.schema.slotKind ?? "unknown");
  }

  if (field.schema.valueKind === "datatype") {
    return "datatype";
  }

  return "scalar";
}

function colorForSlotKind(kind: SlotKind) {
  if (kind === "power") return "power";
  if (kind === "datatype") return "datatype";
  if (kind.includes("action")) return "action";
  if (kind.includes("condition")) return "condition";
  return "unknown";
}

function createEdge(source: string, target: string, fieldName: string, color: string, order?: number): BlueprintGraphEdge {
  return {
    id: order === undefined ? `${source}:${fieldName}->${target}` : `${source}:${fieldName}:${order}->${target}`,
    source,
    target,
    sourceHandle: sourceHandleId(source, fieldName),
    targetHandle: targetHandleId(target),
    fieldName,
    color,
    order
  };
}

export function sourceHandleId(nodeId: string, fieldName: string) {
  return `${nodeId}:out:${fieldName}`;
}

export function targetHandleId(nodeId: string) {
  return `${nodeId}:in`;
}

function displayValue(value: AstValue, valueKind: string) {
  if (valueKind === "slot_array" && Array.isArray(value)) {
    return `Array[${value.length}]`;
  }

  if (isAstNode(value)) {
    return readableTypeName(value.type);
  }

  if (Array.isArray(value)) {
    return `Array[${value.length}]`;
  }

  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "object") {
    return "{...}";
  }

  return String(value);
}

function readableTypeName(type: string) {
  const parts = type.split(":");
  return parts[parts.length - 1].replaceAll("_", " ");
}

function isAstNode(value: unknown): value is AstNode {
  return value !== null && typeof value === "object" && "id" in value && "fields" in value;
}
