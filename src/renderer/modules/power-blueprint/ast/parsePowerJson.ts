import type { AstField, AstNode, AstUnknownField, PowerAst } from "./powerAstTypes";
import type { FieldSchema, SlotKind } from "../schema/blueprintSchemaTypes";
import type { BlueprintSchemaRegistry } from "../schema/registry";

interface ParseContext {
  registry: BlueprintSchemaRegistry;
  nextId: number;
}

export function parsePowerJsonToAst(json: unknown, registry: BlueprintSchemaRegistry): PowerAst {
  const context: ParseContext = { registry, nextId: 1 };
  return {
    root: parseNode(json, "power", context, "root")
  };
}

function parseNode(value: unknown, fallbackKind: SlotKind, context: ParseContext, label?: string): AstNode {
  const record = isRecord(value) ? value : {};
  const type = typeof record.type === "string" ? record.type : label ?? "unknown";
  const schema = context.registry.get(type, fallbackKind);
  const kind = schema?.kind ?? fallbackKind;
  const fields: AstField[] = [];
  const unknownFields = [];
  const knownFieldNames = new Set(["type"]);

  if (type === "origins:multiple") {
    for (const [fieldName, fieldValue] of Object.entries(record)) {
      if (fieldName === "type") continue;
      knownFieldNames.add(fieldName);
      if (isRecord(fieldValue)) {
        const child = parseNode(fieldValue, "power", context, fieldName);
        fields.push({
          name: fieldName,
          value: child,
          schema: { name: fieldName, valueKind: "slot", slotKind: "power", required: true },
          visible: true
        });
      } else {
        unknownFields.push({ name: fieldName, value: fieldValue });
      }
    }
  } else {
    const fieldSchemas = schema?.fields ?? [];
    const sortedEntries = Object.entries(record).filter(([fieldName]) => fieldName !== "type");

    for (const [fieldName, fieldValue] of sortedEntries) {
      const explicitSchema = fieldSchemas.find((field) => field.name === fieldName);
      const inferredSchema = explicitSchema ?? context.registry.inferFieldSchema(kind, fieldName, fieldValue);
      knownFieldNames.add(fieldName);
      if (inferredSchema.valueKind === "unknown" && Array.isArray(fieldValue)) {
        unknownFields.push({ name: fieldName, value: fieldValue });
        continue;
      }
      fields.push({
        name: fieldName,
        value: parseFieldValue(fieldValue, inferredSchema, context),
        schema: inferredSchema,
        visible: true
      });
    }
  }

  for (const [fieldName, fieldValue] of Object.entries(record)) {
    if (!knownFieldNames.has(fieldName)) {
      unknownFields.push({ name: fieldName, value: fieldValue });
    }
  }

  return {
    id: `ast-${context.nextId++}`,
    type,
    kind,
    label,
    fields,
    unknownFields
  };
}

function parseFieldValue(value: unknown, schema: FieldSchema, context: ParseContext) {
  if (schema.valueKind === "slot") {
    return parseNode(value, schema.slotKind ?? "unknown", context);
  }

  if (schema.valueKind === "slot_array") {
    return Array.isArray(value)
      ? value.map((item) => parseNode(item, schema.slotKind ?? "unknown", context))
      : [];
  }

  if (schema.valueKind === "datatype") {
    return parseDatatype(value, schema.datatype ?? "unknown", context);
  }

  if (schema.valueKind === "datatype_array") {
    return Array.isArray(value)
      ? value.map((item) => parseDatatype(item, schema.datatype ?? "unknown", context))
      : [];
  }

  return value as string | number | boolean | null | unknown[];
}

function parseDatatype(value: unknown, datatype: string, context: ParseContext) {
  if (datatype === "particle_effect") {
    return parseParticleEffect(value, context);
  }

  if (datatype === "vector") {
    return parseNode({ type: "vector", ...(isRecord(value) ? value : {}) }, "datatype", context);
  }

  const scalarFieldName = scalarDatatypeFieldName(datatype);
  if (scalarFieldName && !isRecord(value)) {
    return parseNode({ type: datatype, [scalarFieldName]: value }, "datatype", context);
  }

  return parseNode({ type: datatype, ...(isRecord(value) ? value : {}) }, "datatype", context);
}

function parseParticleEffect(value: unknown, context: ParseContext): AstNode {
  const record = typeof value === "string" ? { type: value } : isRecord(value) ? value : {};
  const schema = context.registry.get("particle_effect");
  const fieldSchemas = schema?.fields ?? [];
  const fields: AstField[] = [];
  const unknownFields: AstUnknownField[] = [];
  const knownFieldNames = new Set<string>();

  for (const [fieldName, fieldValue] of Object.entries(record)) {
    const explicitSchema = fieldSchemas.find((field) => field.name === fieldName);
    if (explicitSchema) {
      knownFieldNames.add(fieldName);
      fields.push({
        name: fieldName,
        value: parseFieldValue(fieldValue, explicitSchema, context),
        schema: explicitSchema,
        visible: true
      });
    }
  }

  for (const [fieldName, fieldValue] of Object.entries(record)) {
    if (!knownFieldNames.has(fieldName)) {
      unknownFields.push({ name: fieldName, value: fieldValue });
    }
  }

  return {
    id: `ast-${context.nextId++}`,
    type: "particle_effect",
    kind: "datatype",
    fields,
    unknownFields
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function scalarDatatypeFieldName(datatype: string) {
  if (datatype === "crafting_recipe") return "recipe";
  if (datatype === "default_translatable_text_component") return "translate";
  if (datatype === "ingredient" || datatype === "item_stack") return "item";
  if (datatype === "text") return "text";

  if (
    [
      "action_result",
      "attribute_modifier_operation",
      "attributed_attribute_modifier_operation",
      "comparison",
      "container_type",
      "destruction_type",
      "entity_type_tag_like",
      "fluid_handling",
      "heightmap_type",
      "identifier",
      "inventory_type",
      "item_slot",
      "material",
      "nbt",
      "player_ability",
      "process_mode",
      "shape",
      "shape_type",
      "space",
      "stat"
    ].includes(datatype)
  ) {
    return "value";
  }

  return undefined;
}
