import type { NodeSchema, SlotKind } from "./blueprintSchemaTypes";
import {
  bientityAction,
  bientityCondition,
  blockAction,
  blockCondition,
  bool,
  damageCondition,
  data,
  dataArray,
  datatype,
  entityAction,
  entityCondition,
  float,
  fluidCondition,
  int,
  itemAction,
  itemCondition,
  node,
  power,
  slot,
  slotArray,
  str
} from "./schemaBuilders";

const actionKinds: SlotKind[] = ["entity_action", "bientity_action", "block_action", "item_action"];
const conditionKinds: SlotKind[] = [
  "entity_condition",
  "bientity_condition",
  "block_condition",
  "damage_condition",
  "fluid_condition",
  "item_condition"
];

export const apoliBuiltinSchemas: NodeSchema[] = [
  datatype("action_result", [str("value", { required: true })], { title: "Action Result" }),
  datatype("attribute_modifier_operation", [str("value", { required: true })], { title: "Attribute Modifier Operation" }),
  datatype("vector", [float("x", { defaultValue: 0 }), float("y", { defaultValue: 0 }), float("z", { defaultValue: 0 })], {
    title: "Vector"
  }),
  datatype("particle_effect", [str("type", { required: true }), str("params")], { title: "Particle Effect" }),
  datatype("attribute_modifier", [
    str("operation", { required: true }),
    float("value", { required: true }),
    str("name", { defaultValue: "Unnamed EntityAttributeModifier" })
  ], { title: "Attribute Modifier" }),
  datatype("attributed_attribute_modifier", [
    str("attribute", { required: true }),
    str("operation", { required: true }),
    float("value", { required: true }),
    str("name", { defaultValue: "Unnamed EntityAttributeModifier" })
  ], { title: "Attributed Attribute Modifier" }),
  datatype("modifier", [
    str("operation", { required: true }),
    float("value", { required: true }),
    str("resource"),
    dataArray("modifier", "modifier")
  ], { title: "Modifier" }),
  datatype("attributed_attribute_modifier_operation", [str("value", { required: true })], { title: "Attributed Attribute Modifier Operation" }),
  datatype("comparison", [str("value", { required: true })], { title: "Comparison" }),
  datatype("container_type", [str("value", { required: true })], { title: "Container Type" }),
  datatype("crafting_recipe", [str("recipe", { required: true })], { title: "Crafting Recipe" }),
  datatype("damage_source", [
    str("name", { required: true }),
    bool("bypasses_armor", { defaultValue: false }),
    bool("fire", { defaultValue: false }),
    bool("unblockable", { defaultValue: false }),
    bool("magic", { defaultValue: false }),
    bool("out_of_world", { defaultValue: false }),
    bool("projectile", { defaultValue: false }),
    bool("explosive", { defaultValue: false })
  ], { title: "Damage Source (DEPRECATED)" }),
  datatype("damage_source_description", [
    str("name", { required: true }),
    bool("bypasses_armor", { defaultValue: false }),
    bool("fire", { defaultValue: false }),
    bool("unblockable", { defaultValue: false }),
    bool("magic", { defaultValue: false }),
    bool("out_of_world", { defaultValue: false }),
    bool("projectile", { defaultValue: false }),
    bool("explosive", { defaultValue: false })
  ], { title: "Damage Source Description" }),
  datatype("default_translatable_text_component", [
    str("text"),
    str("translate"),
    str("fallback")
  ], { title: "Default Translatable Text Component" }),
  datatype("destruction_type", [str("value", { required: true })], { title: "Destruction Type" }),
  datatype("entity_type_tag_like", [str("value", { required: true })], { title: "Entity Type Tag-like" }),
  datatype("fluid_handling", [str("value", { required: true })], { title: "Fluid Handling" }),
  datatype("food_component", [
    int("hunger", { required: true }),
    float("saturation", { required: true }),
    bool("meat", { defaultValue: false }),
    bool("always_edible", { defaultValue: false }),
    bool("snack", { defaultValue: false })
  ], { title: "Food Component" }),
  datatype("heightmap_type", [str("value", { required: true })], { title: "Heightmap Type" }),
  datatype("hud_render", [
    bool("should_render", { defaultValue: true }),
    int("bar_index", { defaultValue: 0 }),
    int("icon_index", { defaultValue: 0 }),
    str("sprite_location", { defaultValue: "origins:textures/gui/resource_bar.png" }),
    slot("condition", "entity_condition"),
    bool("inverted", { defaultValue: false }),
    int("order", { defaultValue: 0 })
  ], { title: "HUD Render" }),
  datatype("identifier", [str("value", { required: true })], { title: "Identifier" }),
  datatype("item_stack", [
    str("item", { required: true }),
    int("amount", { defaultValue: 1 }),
    str("tag")
  ], { title: "Item Stack" }),
  datatype("ingredient", [
    str("item"),
    str("tag")
  ], { title: "Ingredient" }),
  datatype("inventory_type", [str("value", { required: true })], { title: "Inventory Type" }),
  datatype("item_slot", [str("value", { required: true })], { title: "Item Slot" }),
  datatype("material", [str("value", { required: true })], { title: "Material" }),
  datatype("nbt", [str("value", { required: true })], { title: "NBT" }),
  datatype("player_ability", [str("value", { required: true })], { title: "Player Ability" }),
  datatype("positioned_item_stack", [
    str("item", { required: true }),
    int("amount", { defaultValue: 1 }),
    str("tag"),
    int("slot")
  ], { title: "Positioned Item Stack" }),
  datatype("process_mode", [str("value", { required: true })], { title: "Process Mode" }),
  datatype("shape_type", [str("value", { required: true })], { title: "Shape Type" }),
  datatype("shape", [str("value", { required: true })], { title: "Shape" }),
  datatype("space", [str("value", { required: true })], { title: "Space" }),
  datatype("stat", [str("value", { required: true })], { title: "Stat" }),
  datatype("key", [str("key", { required: true }), bool("continuous", { defaultValue: false })], { title: "Key" }),
  datatype("status_effect_instance", [
    str("effect", { required: true }),
    int("duration", { defaultValue: 100 }),
    int("amplifier", { defaultValue: 0 }),
    bool("ambient", { defaultValue: false }),
    bool("show_particles", { defaultValue: true }),
    bool("show_icon", { defaultValue: true })
  ], { title: "Status Effect Instance" }),
  datatype("text", [
    str("text"),
    str("translate"),
    str("fallback"),
    str("color"),
    bool("bold"),
    bool("italic"),
    bool("underlined"),
    bool("strikethrough"),
    bool("obfuscated")
  ], { title: "Text Component" }),

  power("origins:multiple"),
  power("origins:simple"),
  power("origins:cooldown", [int("cooldown", { required: true }), data("hud_render", "hud_render")]),
  power("origins:resource", [
    int("min"),
    int("max"),
    int("start_value"),
    int("min_action", { defaultValue: 0 }),
    int("max_action", { defaultValue: 0 }),
    data("hud_render", "hud_render")
  ], { title: "Resource Power" }),
  power("origins:conditioned_attribute", [
    slot("condition", "entity_condition", { required: true }),
    data("modifier", "attributed_attribute_modifier"),
    int("tick_rate", { defaultValue: 20 })
  ]),
  power("origins:attribute", [data("modifier", "attributed_attribute_modifier"), dataArray("modifiers", "attributed_attribute_modifier")]),
  power("origins:entity_group", [str("group", { required: true }), int("priority", { defaultValue: 0 }), slot("condition", "entity_condition")], {
    title: "Entity Group Power"
  }),
  power("origins:action_over_time", [
    slot("entity_action", "entity_action", { required: true }),
    slot("rising_action", "entity_action"),
    slot("falling_action", "entity_action"),
    slot("condition", "entity_condition"),
    int("interval", { required: true })
  ]),
  power("origins:active_self", [
    slot("entity_action", "entity_action", { required: true }),
    slot("condition", "entity_condition"),
    slot("entity_condition", "entity_condition"),
    int("cooldown", { defaultValue: 1 }),
    data("hud_render", "hud_render"),
    data("key", "key")
  ]),
  power("origins:action_on_hit", [
    slot("bientity_action", "bientity_action", { required: true }),
    slot("bientity_condition", "bientity_condition"),
    slot("damage_condition", "damage_condition"),
    int("cooldown")
  ]),
  power("origins:action_when_hit", [
    slot("bientity_action", "bientity_action", { required: true }),
    slot("damage_condition", "damage_condition"),
    int("cooldown")
  ]),
  power("origins:self_action_on_hit", [
    slot("entity_action", "entity_action", { required: true }),
    slot("target_condition", "entity_condition"),
    slot("damage_condition", "damage_condition"),
    slot("condition", "entity_condition"),
    int("cooldown")
  ]),
  power("origins:self_action_when_hit", [
    slot("entity_action", "entity_action", { required: true }),
    slot("condition", "entity_condition"),
    slot("damage_condition", "damage_condition"),
    int("cooldown")
  ]),
  power("origins:action_on_item_use", [
    slot("item_condition", "item_condition", { required: true }),
    slot("entity_action", "entity_action", { required: true }),
    slot("item_action", "item_action"),
    slot("condition", "entity_condition"),
    str("trigger"),
    bool("hidden")
  ]),
  power("origins:action_on_entity_use", [
    slot("bientity_action", "bientity_action", { required: true }),
    slot("bientity_condition", "bientity_condition"),
    slot("item_condition", "item_condition"),
    slot("held_item_action", "item_action"),
    str("hands")
  ]),
  power("origins:modify_food", [
    slot("item_condition", "item_condition"),
    data("food_modifier", "modifier"),
    dataArray("food_modifiers", "modifier"),
    data("saturation_modifier", "modifier"),
    dataArray("saturation_modifiers", "modifier"),
    bool("prevent_effects")
  ]),
  power("origins:modify_damage_dealt", [
    data("modifier", "modifier"),
    dataArray("modifiers", "modifier"),
    slot("condition", "entity_condition"),
    slot("bientity_condition", "bientity_condition"),
    slot("damage_condition", "damage_condition")
  ]),
  power("origins:modify_damage_taken", [
    data("modifier", "modifier"),
    dataArray("modifiers", "modifier"),
    slot("condition", "entity_condition"),
    slot("damage_condition", "damage_condition")
  ]),
  power("origins:modify_projectile_damage", [
    data("modifier", "modifier"),
    dataArray("modifiers", "modifier"),
    slot("condition", "entity_condition"),
    slot("damage_condition", "damage_condition"),
    slot("target_action", "bientity_action"),
    slot("self_action", "entity_action")
  ]),
  power("origins:modify_break_speed", [
    data("modifier", "modifier"),
    dataArray("modifiers", "modifier"),
    data("delta_modifier", "modifier"),
    dataArray("delta_modifiers", "modifier"),
    data("hardness_modifier", "modifier"),
    dataArray("hardness_modifiers", "modifier"),
    slot("condition", "entity_condition"),
    slot("block_condition", "block_condition")
  ]),
  power("origins:modify_jump", [
    data("modifier", "modifier"),
    dataArray("modifiers", "modifier"),
    slot("condition", "entity_condition"),
    slot("entity_action", "entity_action")
  ]),
  power("origins:night_vision", [float("strength", { defaultValue: 1 }), slot("condition", "entity_condition")]),
  power("origins:effect_immunity", [str("effect"), dataArray("effects", "identifier")]),
  power("origins:prevent_item_use", [slot("item_condition", "item_condition")]),
  power("origins:restrict_armor", [
    slot("head", "item_condition"),
    slot("chest", "item_condition"),
    slot("legs", "item_condition"),
    slot("feet", "item_condition")
  ]),
  power("origins:entity_glow", [
    slot("entity_condition", "entity_condition"),
    slot("bientity_condition", "bientity_condition"),
    bool("use_teams", { defaultValue: false }),
    float("red", { defaultValue: 1 }),
    float("green", { defaultValue: 1 }),
    float("blue", { defaultValue: 1 })
  ]),
  power("origins:climbing", [slot("condition", "entity_condition"), slot("hold_condition", "entity_condition")]),

  ...actionKinds.flatMap((kind) => metaActionSchemas(kind)),
  ...conditionKinds.flatMap((kind) => metaConditionSchemas(kind)),

  entityAction("origins:add_velocity", [
    float("x", { defaultValue: 0 }),
    float("y", { defaultValue: 0 }),
    float("z", { defaultValue: 0 }),
    str("space", { defaultValue: "world" }),
    bool("client", { defaultValue: true }),
    bool("server", { defaultValue: true }),
    bool("set", { defaultValue: false })
  ], { title: "Entity Add Velocity" }),
  entityAction("origins:play_sound", [str("sound", { required: true }), float("volume", { defaultValue: 1 }), float("pitch", { defaultValue: 1 })]),
  entityAction("origins:execute_command", [str("command", { required: true })], { title: "Entity Execute Command" }),
  entityAction("origins:apply_effect", [data("effect", "status_effect_instance"), dataArray("effects", "status_effect_instance")]),
  entityAction("origins:clear_effect", [str("effect")]),
  entityAction("origins:damage", [
    float("amount", { required: true }),
    data("source", "damage_source_description"),
    str("damage_type"),
    data("modifier", "modifier"),
    dataArray("modifiers", "modifier")
  ], {
    title: "Entity Damage Action"
  }),
  entityAction("origins:give", [data("stack", "item_stack", { required: true })]),
  entityAction("origins:gain_air", [int("value", { required: true })]),
  entityAction("origins:heal", [float("amount", { required: true })]),
  entityAction("origins:feed", [int("food", { required: true }), float("saturation", { required: true })]),
  entityAction("origins:exhaust", [float("amount", { required: true })]),
  entityAction("origins:set_on_fire", [int("duration", { required: true })]),
  entityAction("origins:trigger_cooldown", [str("power", { required: true })]),
  entityAction("origins:change_resource", [str("resource", { required: true }), int("change", { required: true }), str("operation", { defaultValue: "add" })]),
  entityAction("origins:set_resource", [str("resource", { required: true }), int("value", { required: true })]),
  entityAction("origins:spawn_particles", [
    data("particle", "particle_effect", { required: true }),
    slot("bientity_condition", "bientity_condition"),
    int("count", { defaultValue: 1 }),
    float("speed", { defaultValue: 0 }),
    bool("force", { defaultValue: false }),
    data("spread", "vector", { defaultValue: { x: 0.5, y: 0.5, z: 0.5 } }),
    float("offset_x", { defaultValue: 0 }),
    float("offset_y", { defaultValue: 0.5 }),
    float("offset_z", { defaultValue: 0 })
  ]),

  bientityAction("origins:actor_action", [slot("action", "entity_action", { required: true })]),
  bientityAction("origins:target_action", [slot("action", "entity_action", { required: true })]),
  bientityAction("origins:damage", [
    float("amount", { required: true }),
    data("source", "damage_source_description"),
    str("damage_type"),
    data("modifier", "modifier"),
    dataArray("modifiers", "modifier")
  ], { title: "Bi-entity Damage Action" }),
  bientityAction("origins:add_velocity", [
    float("x", { defaultValue: 0 }),
    float("y", { defaultValue: 0 }),
    float("z", { defaultValue: 0 }),
    bool("client", { defaultValue: true }),
    bool("server", { defaultValue: true }),
    bool("set", { defaultValue: false }),
    str("reference", { required: true })
  ], { title: "Bi-entity Add Velocity" }),

  itemAction("origins:consume", [int("amount", { defaultValue: 1 })]),
  itemAction("origins:damage", [int("amount", { required: true }), bool("ignore_unbreaking", { defaultValue: false }), str("damage_type")], {
    title: "Item Damage Action"
  }),

  blockAction("origins:execute_command", [str("command", { required: true })], { title: "Block Execute Command" }),
  blockAction("origins:set_block", [str("block", { required: true })]),
  blockAction("origins:add_block", [str("block", { required: true })]),

  entityCondition("origins:in_tag", [str("tag", { required: true })]),
  entityCondition("origins:owner", [], { title: "Entity Owner Condition" }),
  entityCondition("origins:on_block", [slot("block_condition", "block_condition")]),
  entityCondition("origins:air", [str("comparison", { required: true }), int("compare_to", { required: true })]),
  entityCondition("origins:target_condition", [slot("condition", "entity_condition", { required: true })], { title: "Entity Target Condition" }),
  entityCondition("origins:sneaking"),
  entityCondition("origins:sprinting"),
  entityCondition("origins:fall_flying"),
  entityCondition("origins:exposed_to_sun"),
  entityCondition("origins:submerged_in", [str("fluid", { required: true })]),
  entityCondition("origins:fluid_height", [str("fluid", { required: true }), str("comparison", { required: true }), float("compare_to", { required: true })]),
  entityCondition("origins:entity_type", [str("entity_type", { required: true })]),
  entityCondition("origins:entity_group", [str("group", { required: true })], { title: "Entity Group Condition" }),
  entityCondition("origins:biome", [slot("condition", "biome_condition"), str("biome")]),
  entityCondition("origins:resource", [str("resource", { required: true }), str("comparison", { required: true }), int("compare_to", { required: true })], {
    title: "Resource Condition"
  }),
  entityCondition("origins:inventory", [
    str("inventory_types"),
    str("process_mode"),
    slot("item_condition", "item_condition"),
    str("slots"),
    str("slot"),
    str("power"),
    str("comparison", { defaultValue: ">" }),
    int("compare_to", { defaultValue: 0 })
  ]),
  entityCondition("origins:status_effect", [
    str("effect", { required: true }),
    int("min_amplifier", { defaultValue: 0 }),
    int("max_amplifier"),
    int("min_duration", { defaultValue: -1 }),
    int("max_duration")
  ]),
  entityCondition("origins:food_level", [str("comparison", { required: true }), int("compare_to", { required: true })]),
  entityCondition("origins:health", [str("comparison", { required: true }), float("compare_to", { required: true })]),
  entityCondition("origins:armor_value", [str("comparison", { required: true }), int("compare_to", { required: true })]),
  entityCondition("origins:power_active", [str("power", { required: true })]),
  entityCondition("origins:moving", [bool("horizontally", { defaultValue: true }), bool("vertically", { defaultValue: true })]),
  entityCondition("origins:in_block", [slot("block_condition", "block_condition")]),
  entityCondition("origins:block_collision", [slot("block_condition", "block_condition"), int("offset_x", { defaultValue: 0 }), int("offset_y", { defaultValue: 0 }), int("offset_z", { defaultValue: 0 })]),
  entityCondition("origins:time_of_day", [str("comparison", { required: true }), int("compare_to", { required: true })]),
  entityCondition("origins:temperature", [str("comparison", { required: true }), float("compare_to", { required: true })]),

  bientityCondition("origins:actor_condition", [slot("condition", "entity_condition", { required: true })]),
  bientityCondition("origins:target_condition", [slot("condition", "entity_condition", { required: true })], { title: "Bi-entity Target Condition" }),
  bientityCondition("origins:owner", [], { title: "Bi-entity Owner Condition" }),
  bientityCondition("origins:attacker"),
  bientityCondition("origins:distance", [str("comparison", { required: true }), float("compare_to", { required: true })]),

  blockCondition("origins:block", [str("block", { required: true })]),
  blockCondition("origins:block_state", [str("property", { required: true }), str("value", { required: true })]),
  blockCondition("origins:block_in_radius", [
    slot("block_condition", "block_condition", { required: true }),
    int("radius", { required: true }),
    str("shape", { required: true }),
    str("comparison", { required: true }),
    int("compare_to", { required: true })
  ]),

  damageCondition("origins:amount", [str("comparison", { required: true }), float("compare_to", { required: true })]),
  damageCondition("origins:projectile", [str("projectile")]),

  fluidCondition("origins:fluid", [str("fluid", { required: true })]),

  itemCondition("origins:ingredient", [data("ingredient", "ingredient", { required: true })]),
  itemCondition("origins:food"),
  itemCondition("origins:meat"),
  itemCondition("origins:smeltable"),
  itemCondition("origins:nbt", [str("nbt", { required: true })]),
  itemCondition("origins:relative_durability", [str("comparison", { required: true }), float("compare_to", { required: true })]),
  itemCondition("origins:power_count", [str("slot"), str("comparison", { required: true }), int("compare_to", { required: true })])
];

function metaActionSchemas(kind: SlotKind): NodeSchema[] {
  const conditionKind = actionConditionKind(kind);
  return [
    node("origins:and", kind, [slotArray("actions", kind, { required: true })], { title: "Action And" }),
    node("origins:or", kind, [slotArray("actions", kind, { required: true })], { title: `${kindTitle(kind)} Or` }),
    node("origins:chance", kind, [slot("action", kind, { required: true }), float("chance", { required: true }), slot("fail_action", kind)], {
      title: `${kindTitle(kind)} Chance`
    }),
    node("origins:if_else", kind, [slot("condition", conditionKind, { required: true }), slot("if_action", kind, { required: true }), slot("else_action", kind)], {
      title: `${kindTitle(kind)} If Else`
    }),
    node("origins:delay", kind, [int("ticks", { required: true }), slot("action", kind, { required: true })], { title: `${kindTitle(kind)} Delay` }),
    node("origins:nothing", kind, [], { title: `${kindTitle(kind)} Nothing` })
  ];
}

function metaConditionSchemas(kind: SlotKind): NodeSchema[] {
  return [
    node("origins:and", kind, [slotArray("conditions", kind, { required: true })], { title: "Condition And", allowInverted: true }),
    node("origins:or", kind, [slotArray("conditions", kind, { required: true })], { title: `${kindTitle(kind)} Or`, allowInverted: true }),
    node("origins:chance", kind, [float("chance", { required: true })], { title: `${kindTitle(kind)} Chance`, allowInverted: true }),
    node("origins:constant", kind, [bool("value", { required: true })], { title: `${kindTitle(kind)} Constant`, allowInverted: true })
  ];
}

function actionConditionKind(kind: SlotKind): SlotKind {
  if (kind === "bientity_action") return "bientity_condition";
  if (kind === "block_action") return "block_condition";
  if (kind === "item_action") return "item_condition";
  return "entity_condition";
}

function kindTitle(kind: SlotKind) {
  return kind
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
