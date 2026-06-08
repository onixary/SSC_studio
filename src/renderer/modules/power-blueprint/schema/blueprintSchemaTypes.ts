export type SlotKind =
  | "power"
  | "entity_action"
  | "entity_condition"
  | "item_action"
  | "item_condition"
  | "bientity_action"
  | "bientity_condition"
  | "block_action"
  | "block_condition"
  | "damage_condition"
  | "fluid_condition"
  | "biome_condition"
  | "datatype"
  | "unknown";

export type FieldValueKind =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "slot"
  | "slot_array"
  | "datatype"
  | "datatype_array"
  | "unknown";

export interface FieldSchema {
  name: string;
  valueKind: FieldValueKind;
  required?: boolean;
  defaultValue?: unknown;
  slotKind?: SlotKind;
  datatype?: string;
  multi?: boolean;
  numberKind?: "int" | "float";
}

export interface NodeSchema {
  type: string;
  kind: SlotKind;
  color: string;
  title?: string;
  allowInverted?: boolean;
  fields: FieldSchema[];
}
