import type { AstNode, AstValue, PowerAst } from "./powerAstTypes";
import { RAW_JSON_NODE_TYPE } from "../schema/specialNodeTypes";

export function serializePowerAstToJson(ast: PowerAst): unknown {
  return serializeNode(ast.root);
}

function serializeNode(node: AstNode): Record<string, unknown> {
  const output: Record<string, unknown> = { type: node.type };

  for (const field of node.fields) {
    output[field.name] = serializeFieldValue(field.value, field.schema.valueKind, field.schema.datatype);
  }

  for (const unknownField of node.unknownFields) {
    if (!(unknownField.name in output)) {
      output[unknownField.name] = unknownField.value;
    }
  }

  return output;
}

function serializeFieldValue(value: AstValue, valueKind: string, datatype?: string): unknown {
  if (valueKind === "slot") {
    return isAstNode(value) ? serializeNode(value) : value;
  }

  if (valueKind === "slot_array") {
    return Array.isArray(value) ? value.map((item) => (isAstNode(item) ? serializeNode(item) : item)) : [];
  }

  if (valueKind === "datatype") {
    return serializeDatatype(value, datatype);
  }

  if (valueKind === "datatype_array") {
    return Array.isArray(value) ? value.map((item) => serializeDatatype(item, datatype)) : [];
  }

  return value;
}

function serializeDatatype(value: unknown, datatype?: string): unknown {
  if (!isAstNode(value)) {
    return value;
  }

  if (value.type === RAW_JSON_NODE_TYPE) {
    const rawField = value.fields.find((field) => field.name === "json");
    return rawField ? rawField.value : {};
  }

  if (datatype === "vector") {
    const vector: Record<string, unknown> = {};
    for (const field of value.fields) {
      vector[field.name] = serializeFieldValue(field.value, field.schema.valueKind, field.schema.datatype);
    }
    return vector;
  }

  if (datatype === "particle_effect") {
    const particle: Record<string, unknown> = {};
    for (const field of value.fields) {
      particle[field.name] = serializeFieldValue(field.value, field.schema.valueKind, field.schema.datatype);
    }
    for (const unknownField of value.unknownFields) {
      if (!(unknownField.name in particle)) {
        particle[unknownField.name] = unknownField.value;
      }
    }
    return particle;
  }

  return serializeDatatypeObject(value);
}

function serializeDatatypeObject(node: AstNode): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const field of node.fields) {
    output[field.name] = serializeFieldValue(field.value, field.schema.valueKind, field.schema.datatype);
  }

  for (const unknownField of node.unknownFields) {
    if (unknownField.name !== "type" && !(unknownField.name in output)) {
      output[unknownField.name] = unknownField.value;
    }
  }

  return output;
}

function isAstNode(value: unknown): value is AstNode {
  return value !== null && typeof value === "object" && "id" in value && "fields" in value;
}
