import type { NodeSchema } from "./blueprintSchemaTypes";
import { apoliBuiltinSchemas } from "./apoliBuiltinSchemas";
import { BlueprintSchemaRegistry } from "./registry";
import { datatype, json } from "./schemaBuilders";
import { sscBuiltinSchemas } from "./sscBuiltinSchemas";
import { RAW_JSON_NODE_TYPE } from "./specialNodeTypes";

const rawJsonSchema = datatype(RAW_JSON_NODE_TYPE, [json("json", { required: true, defaultValue: {} })], { title: "Raw Json" });

const schemas: NodeSchema[] = dedupeSchemas([rawJsonSchema, ...apoliBuiltinSchemas, ...sscBuiltinSchemas]);

export function createExampleSchemaRegistry() {
  const registry = new BlueprintSchemaRegistry();
  for (const schema of schemas) {
    registry.register(schema);
  }
  return registry;
}

function dedupeSchemas(input: NodeSchema[]) {
  const seen = new Set<string>();
  const output: NodeSchema[] = [];

  for (const schema of input) {
    const key = `${schema.type}#${schema.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(schema);
  }

  return output;
}
