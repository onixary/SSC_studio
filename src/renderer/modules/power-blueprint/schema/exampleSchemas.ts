import type { NodeSchema } from "./blueprintSchemaTypes";
import { BlueprintSchemaRegistry } from "./registry";

const schemas: NodeSchema[] = [
  {
    type: "origins:multiple",
    kind: "power",
    color: "power",
    fields: []
  },
  {
    type: "shape-shifter-curse:action_on_sprinting_to_sneaking",
    kind: "power",
    color: "power",
    fields: [
      { name: "entity_action", valueKind: "slot", slotKind: "entity_action", required: true },
      { name: "entity_condition", valueKind: "slot", slotKind: "entity_condition" }
    ]
  },
  {
    type: "shape-shifter-curse:falling_protection",
    kind: "power",
    color: "power",
    fields: [{ name: "fall_distance", valueKind: "number", numberKind: "float", defaultValue: 6 }]
  },
  {
    type: "origins:and",
    kind: "entity_action",
    color: "action",
    title: "And Action",
    fields: [
      { name: "actions", valueKind: "slot_array", slotKind: "entity_action", multi: true, required: true }
    ]
  },
  {
    type: "origins:and",
    kind: "entity_condition",
    color: "condition",
    title: "And Condition",
    allowInverted: true,
    fields: [
      { name: "conditions", valueKind: "slot_array", slotKind: "entity_condition", multi: true, required: true },
      { name: "inverted", valueKind: "boolean", defaultValue: false }
    ]
  },
  {
    type: "origins:add_velocity",
    kind: "entity_action",
    color: "action",
    fields: [
      { name: "x", valueKind: "number", numberKind: "float", defaultValue: 0 },
      { name: "y", valueKind: "number", numberKind: "float", defaultValue: 0 },
      { name: "z", valueKind: "number", numberKind: "float", defaultValue: 0 },
      { name: "space", valueKind: "string", defaultValue: "world" }
    ]
  },
  {
    type: "origins:play_sound",
    kind: "entity_action",
    color: "action",
    fields: [
      { name: "sound", valueKind: "string", required: true },
      { name: "volume", valueKind: "number", numberKind: "float", defaultValue: 1 },
      { name: "pitch", valueKind: "number", numberKind: "float", defaultValue: 1 }
    ]
  },
  {
    type: "shape-shifter-curse:explosion_damage_entity",
    kind: "entity_action",
    color: "action",
    fields: [
      { name: "power", valueKind: "number", numberKind: "float", required: true },
      { name: "explosion_damage_entity", valueKind: "boolean", defaultValue: true },
      { name: "entity_condition", valueKind: "slot", slotKind: "entity_condition" },
      { name: "entity_action", valueKind: "slot", slotKind: "entity_action" }
    ]
  },
  {
    type: "origins:gain_air",
    kind: "entity_action",
    color: "action",
    fields: [{ name: "value", valueKind: "number", numberKind: "int", required: true }]
  },
  {
    type: "origins:spawn_particles",
    kind: "entity_action",
    color: "action",
    fields: [
      { name: "particle", valueKind: "datatype", datatype: "particle_effect", required: true },
      { name: "count", valueKind: "number", numberKind: "int", defaultValue: 1 },
      { name: "speed", valueKind: "number", numberKind: "float", defaultValue: 0 },
      { name: "force", valueKind: "boolean", defaultValue: false },
      { name: "spread", valueKind: "datatype", datatype: "vector" }
    ]
  },
  {
    type: "origins:target_condition",
    kind: "entity_condition",
    color: "condition",
    allowInverted: true,
    fields: [
      { name: "condition", valueKind: "slot", slotKind: "entity_condition", required: true },
      { name: "inverted", valueKind: "boolean", defaultValue: false }
    ]
  },
  {
    type: "origins:in_tag",
    kind: "entity_condition",
    color: "condition",
    allowInverted: true,
    fields: [
      { name: "tag", valueKind: "string", required: true },
      { name: "inverted", valueKind: "boolean", defaultValue: false }
    ]
  },
  {
    type: "origins:owner",
    kind: "entity_condition",
    color: "condition",
    allowInverted: true,
    fields: [{ name: "inverted", valueKind: "boolean", defaultValue: false }]
  },
  {
    type: "origins:on_block",
    kind: "entity_condition",
    color: "condition",
    allowInverted: true,
    fields: [{ name: "inverted", valueKind: "boolean", defaultValue: false }]
  },
  {
    type: "origins:air",
    kind: "entity_condition",
    color: "condition",
    allowInverted: true,
    fields: [
      { name: "comparison", valueKind: "string", required: true },
      { name: "compare_to", valueKind: "number", numberKind: "int", required: true },
      { name: "inverted", valueKind: "boolean", defaultValue: false }
    ]
  },
  {
    type: "vector",
    kind: "datatype",
    color: "datatype",
    title: "Vector",
    fields: [
      { name: "x", valueKind: "number", numberKind: "float", defaultValue: 0 },
      { name: "y", valueKind: "number", numberKind: "float", defaultValue: 0 },
      { name: "z", valueKind: "number", numberKind: "float", defaultValue: 0 }
    ]
  },
  {
    type: "particle_effect",
    kind: "datatype",
    color: "datatype",
    title: "Particle Effect",
    fields: [
      { name: "type", valueKind: "string", required: true },
      { name: "params", valueKind: "string" }
    ]
  }
];

export function createExampleSchemaRegistry() {
  const registry = new BlueprintSchemaRegistry();
  for (const schema of schemas) {
    registry.register(schema);
  }
  return registry;
}
