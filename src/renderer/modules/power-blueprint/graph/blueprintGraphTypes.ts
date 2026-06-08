import type { FieldValueKind, SlotKind } from "../schema/blueprintSchemaTypes";
import type { FieldSchema } from "../schema/blueprintSchemaTypes";

export interface BlueprintGraph {
  nodes: BlueprintGraphNode[];
  edges: BlueprintGraphEdge[];
}

export interface BlueprintGraphNode {
  id: string;
  astNodeId: string;
  type: string;
  kind: SlotKind;
  title: string;
  label?: string;
  color: string;
  position: {
    x: number;
    y: number;
  };
  fields: BlueprintGraphField[];
}

export interface BlueprintGraphField {
  name: string;
  schema: FieldSchema;
  valueKind: FieldValueKind;
  displayValue: string;
  connected: boolean;
  color: string;
  inputKind?: "int" | "float" | "string" | "boolean";
  sourceHandleId: string;
}

export interface BlueprintGraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  fieldName: string;
  color: string;
  order?: number;
}
