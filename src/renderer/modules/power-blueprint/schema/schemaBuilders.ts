import type { FieldSchema, NodeSchema, SlotKind } from "./blueprintSchemaTypes";

type NodeOptions = {
  title?: string;
  allowInverted?: boolean;
};

type FieldOptions = {
  required?: boolean;
  defaultValue?: unknown;
};

export function node(type: string, kind: SlotKind, fields: FieldSchema[] = [], options: NodeOptions = {}): NodeSchema {
  return {
    type,
    kind,
    color: colorForKind(kind),
    title: options.title,
    allowInverted: options.allowInverted,
    fields: kind.includes("condition") ? withInverted(fields) : fields
  };
}

export function power(type: string, fields: FieldSchema[] = [], options: NodeOptions = {}) {
  return node(type, "power", fields, options);
}

export function entityAction(type: string, fields: FieldSchema[] = [], options: NodeOptions = {}) {
  return node(type, "entity_action", fields, options);
}

export function bientityAction(type: string, fields: FieldSchema[] = [], options: NodeOptions = {}) {
  return node(type, "bientity_action", fields, options);
}

export function blockAction(type: string, fields: FieldSchema[] = [], options: NodeOptions = {}) {
  return node(type, "block_action", fields, options);
}

export function itemAction(type: string, fields: FieldSchema[] = [], options: NodeOptions = {}) {
  return node(type, "item_action", fields, options);
}

export function entityCondition(type: string, fields: FieldSchema[] = [], options: NodeOptions = {}) {
  return node(type, "entity_condition", fields, { allowInverted: true, ...options });
}

export function bientityCondition(type: string, fields: FieldSchema[] = [], options: NodeOptions = {}) {
  return node(type, "bientity_condition", fields, { allowInverted: true, ...options });
}

export function blockCondition(type: string, fields: FieldSchema[] = [], options: NodeOptions = {}) {
  return node(type, "block_condition", fields, { allowInverted: true, ...options });
}

export function damageCondition(type: string, fields: FieldSchema[] = [], options: NodeOptions = {}) {
  return node(type, "damage_condition", fields, { allowInverted: true, ...options });
}

export function fluidCondition(type: string, fields: FieldSchema[] = [], options: NodeOptions = {}) {
  return node(type, "fluid_condition", fields, { allowInverted: true, ...options });
}

export function itemCondition(type: string, fields: FieldSchema[] = [], options: NodeOptions = {}) {
  return node(type, "item_condition", fields, { allowInverted: true, ...options });
}

export function datatype(type: string, fields: FieldSchema[] = [], options: NodeOptions = {}) {
  return node(type, "datatype", fields, options);
}

export function slot(name: string, slotKind: SlotKind, options: FieldOptions = {}): FieldSchema {
  return { name, valueKind: "slot", slotKind, ...options };
}

export function slotArray(name: string, slotKind: SlotKind, options: FieldOptions = {}): FieldSchema {
  return { name, valueKind: "slot_array", slotKind, multi: true, ...options };
}

export function data(name: string, datatypeName: string, options: FieldOptions = {}): FieldSchema {
  return { name, valueKind: "datatype", datatype: datatypeName, ...options };
}

export function dataArray(name: string, datatypeName: string, options: FieldOptions = {}): FieldSchema {
  return { name, valueKind: "datatype_array", datatype: datatypeName, multi: true, ...options };
}

export function str(name: string, options: FieldOptions = {}): FieldSchema {
  return { name, valueKind: "string", ...options };
}

export function int(name: string, options: FieldOptions = {}): FieldSchema {
  return { name, valueKind: "number", numberKind: "int", ...options };
}

export function float(name: string, options: FieldOptions = {}): FieldSchema {
  return { name, valueKind: "number", numberKind: "float", ...options };
}

export function bool(name: string, options: FieldOptions = {}): FieldSchema {
  return { name, valueKind: "boolean", ...options };
}

export function unknown(name: string, options: FieldOptions = {}): FieldSchema {
  return { name, valueKind: "unknown", ...options };
}

function withInverted(fields: FieldSchema[]) {
  if (fields.some((field) => field.name === "inverted")) return fields;
  return [...fields, bool("inverted", { defaultValue: false })];
}

function colorForKind(kind: SlotKind) {
  if (kind === "power") return "power";
  if (kind === "datatype") return "datatype";
  if (kind.includes("action")) return "action";
  if (kind.includes("condition")) return "condition";
  return "unknown";
}
