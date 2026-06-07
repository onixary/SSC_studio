import type { FieldSchema, SlotKind } from "../schema/blueprintSchemaTypes";

export type AstValue =
  | string
  | number
  | boolean
  | null
  | AstNode
  | AstNode[]
  | AstScalarRecord
  | unknown[];

export interface AstScalarRecord {
  [key: string]: unknown;
}

export interface AstField {
  name: string;
  value: AstValue;
  schema: FieldSchema;
  visible: boolean;
}

export interface AstUnknownField {
  name: string;
  value: unknown;
}

export interface AstNode {
  id: string;
  type: string;
  kind: SlotKind;
  label?: string;
  fields: AstField[];
  unknownFields: AstUnknownField[];
}

export interface PowerAst {
  root: AstNode;
}
