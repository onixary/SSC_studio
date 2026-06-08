import type { FieldSchema, NodeSchema, SlotKind } from "./blueprintSchemaTypes";

const ACTION_ARRAY_FIELD_NAMES = new Set(["actions", "entity_actions", "bientity_actions", "block_actions", "item_actions"]);
const CONDITION_ARRAY_FIELD_NAMES = new Set([
  "conditions",
  "entity_conditions",
  "bientity_conditions",
  "block_conditions",
  "item_conditions",
  "damage_conditions",
  "fluid_conditions",
  "biome_conditions"
]);

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
      return { name: fieldName, valueKind: "slot_array", slotKind: inferActionSlotKind(parentKind, fieldName), multi: true };
    }

    if (CONDITION_ARRAY_FIELD_NAMES.has(fieldName)) {
      return { name: fieldName, valueKind: "slot_array", slotKind: inferConditionSlotKind(parentKind, fieldName), multi: true };
    }

    if (fieldName.endsWith("_action") || fieldName === "action") {
      return { name: fieldName, valueKind: "slot", slotKind: inferActionSlotKind(parentKind, fieldName) };
    }

    if (fieldName.endsWith("_condition") || fieldName === "condition") {
      return { name: fieldName, valueKind: "slot", slotKind: inferConditionSlotKind(parentKind, fieldName) };
    }

    if (fieldName === "particle") {
      return { name: fieldName, valueKind: "datatype", datatype: "particle_effect" };
    }

    if (fieldName === "spread" || isVectorLike(value)) {
      return { name: fieldName, valueKind: "datatype", datatype: "vector" };
    }

    const inferredDatatypeArray = inferDatatypeArrayField(fieldName, value);
    if (inferredDatatypeArray) {
      return { name: fieldName, valueKind: "datatype_array", datatype: inferredDatatypeArray, multi: true };
    }

    const inferredDatatype = inferDatatypeField(fieldName, value);
    if (inferredDatatype) {
      return { name: fieldName, valueKind: "datatype", datatype: inferredDatatype };
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

function inferActionSlotKind(parentKind: SlotKind, fieldName: string): SlotKind {
  if (fieldName.includes("bientity")) return "bientity_action";
  if (fieldName.includes("block")) return "block_action";
  if (fieldName.includes("item") || fieldName.includes("held_item")) return "item_action";
  if (parentKind.includes("action")) return parentKind;
  return "entity_action";
}

function inferConditionSlotKind(parentKind: SlotKind, fieldName: string): SlotKind {
  if (fieldName.includes("bientity")) return "bientity_condition";
  if (fieldName.includes("block")) return "block_condition";
  if (fieldName.includes("damage")) return "damage_condition";
  if (fieldName.includes("fluid")) return "fluid_condition";
  if (fieldName.includes("biome")) return "biome_condition";
  if (fieldName.includes("item")) return "item_condition";
  if (parentKind.includes("condition")) return parentKind;
  return "entity_condition";
}

function inferDatatypeField(fieldName: string, value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;

  if (fieldName === "hud_render") return "hud_render";
  if (fieldName === "key") return "key";
  if (fieldName === "food_component") return "food_component";
  if (fieldName === "ingredient") return "ingredient";
  if (fieldName === "effect") return "status_effect_instance";
  if (fieldName === "damage_source" || fieldName === "source") return "damage_source_description";
  if (fieldName === "stack" || fieldName === "result_stack" || fieldName === "return_stack" || fieldName === "totem_stack") {
    return "item_stack";
  }

  if (fieldName === "modifier" || fieldName.endsWith("_modifier")) {
    return "attribute" in value ? "attributed_attribute_modifier" : "modifier";
  }

  return undefined;
}

function inferDatatypeArrayField(fieldName: string, value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;

  if (fieldName === "effects" || fieldName === "status_effects" || fieldName === "totem_status_effects") {
    return "status_effect_instance";
  }
  if (fieldName === "modifiers" || fieldName.endsWith("_modifiers")) {
    return value.some((item) => isRecord(item) && "attribute" in item)
      ? "attributed_attribute_modifier"
      : "modifier";
  }
  if (fieldName === "stacks" || fieldName === "target_item_stack_list") {
    return "item_stack";
  }
  if (fieldName === "texts") {
    return "text";
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isVectorLike(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  return keys.length > 0 && keys.every((key) => ["x", "y", "z"].includes(key));
}
