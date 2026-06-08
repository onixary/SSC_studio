import type { NodeSchema } from "./blueprintSchemaTypes";
import { apoliBuiltinSchemas } from "./apoliBuiltinSchemas";
import { BlueprintSchemaRegistry } from "./registry";
import { sscBuiltinSchemas } from "./sscBuiltinSchemas";

const schemas: NodeSchema[] = dedupeSchemas([...apoliBuiltinSchemas, ...sscBuiltinSchemas]);

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
