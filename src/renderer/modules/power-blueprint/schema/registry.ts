import type { FieldSchema, NodeSchema, SlotKind } from "./blueprintSchemaTypes";

const ACTION_ARRAY_FIELD_NAMES = new Set(["actions"]);
const CONDITION_ARRAY_FIELD_NAMES = new Set(["conditions"]);

export class BlueprintSchemaRegistry {
  private readonly schemas = new Map<string, NodeSchema>();
  private readonly contextualSchemas = new Map<string, NodeSchema>();
  private readonly datatypeSchemas = new Map<string, NodeSchema>();
  private readonly schemaList: NodeSchema[] = [];

  register(schema: NodeSchema) {
    this.schemaList.push(schema);
    if (schema.kind === "datatype") {
      this.datatypeSchemas.set(schema.type, schema);
    } else {
      this.contextualSchemas.set(contextualSchemaKey(schema.type, schema.kind), schema);
      if (!this.schemas.has(schema.type)) {
        this.schemas.set(schema.type, schema);
      }
    }
  }

  get(type: string | undefined, kind?: SlotKind): NodeSchema | undefined {
    if (!type) return undefined;
    if (kind) {
      const contextualSchema = this.contextualSchemas.get(contextualSchemaKey(type, kind));
      if (contextualSchema) return contextualSchema;
    }
    return this.schemas.get(type) ?? this.datatypeSchemas.get(type);
  }

  list(): NodeSchema[] {
    return [...this.schemaList];
  }

  inferFieldSchema(parentKind: SlotKind, fieldName: string, value: unknown): FieldSchema {
    if (fieldName === "type") {
      return { name: fieldName, valueKind: "string" };
    }

    if (fieldName === "inverted" && parentKind.includes("condition")) {
      return { name: fieldName, valueKind: "boolean", defaultValue: false };
    }

    if (ACTION_ARRAY_FIELD_NAMES.has(fieldName)) {
      return { name: fieldName, valueKind: "slot_array", slotKind: "entity_action", multi: true };
    }

    if (CONDITION_ARRAY_FIELD_NAMES.has(fieldName)) {
      return { name: fieldName, valueKind: "slot_array", slotKind: "entity_condition", multi: true };
    }

    if (fieldName.endsWith("_action") || fieldName === "action") {
      return { name: fieldName, valueKind: "slot", slotKind: "entity_action" };
    }

    if (fieldName.endsWith("_condition") || fieldName === "condition") {
      return { name: fieldName, valueKind: "slot", slotKind: "entity_condition" };
    }

    if (fieldName === "particle") {
      return { name: fieldName, valueKind: "datatype", datatype: "particle_effect" };
    }

    if (fieldName === "spread" || isVectorLike(value)) {
      return { name: fieldName, valueKind: "datatype", datatype: "vector" };
    }

    if (typeof value === "string") {
      return { name: fieldName, valueKind: "string" };
    }
    if (typeof value === "number") {
      return { name: fieldName, valueKind: "number", numberKind: Number.isInteger(value) ? "int" : "float" };
    }
    if (typeof value === "boolean") {
      return { name: fieldName, valueKind: "boolean" };
    }

    return { name: fieldName, valueKind: "unknown" };
  }
}

function contextualSchemaKey(type: string, kind: SlotKind) {
  return `${type}#${kind}`;
}

function isVectorLike(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  return keys.length > 0 && keys.every((key) => ["x", "y", "z"].includes(key));
}
