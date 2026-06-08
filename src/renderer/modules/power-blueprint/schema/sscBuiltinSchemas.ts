import type { FieldSchema, NodeSchema } from "./blueprintSchemaTypes";
import {
  bientityAction,
  bool,
  data,
  dataArray,
  entityAction,
  entityCondition,
  float,
  int,
  itemAction,
  itemCondition,
  power,
  slot,
  slotArray,
  str,
  unknown
} from "./schemaBuilders";

const ns = (id: string) => `shape-shifter-curse:${id}`;

const simplePowerIds = [
  "always_sweeping",
  "powder_snow_walker",
  "fox_friendly",
  "no_step_sound",
  "pillager_friendly",
  "prevent_berry_effect",
  "witch_friendly",
  "scare_villager",
  "breathing_under_water",
  "hold_breath",
  "keep_sneaking",
  "sneaking_jump_clash",
  "t_wolf_friendly",
  "hiss_phantom",
  "bypasses_landing_effects",
  "bypasses_stepping_effects",
  "disable_player_rotation",
  "hide_tp_held_item",
  "render_trinkets_slot"
];

export const sscBuiltinSchemas: NodeSchema[] = [
  ...simplePowerIds.map((id) => power(ns(id))),

  power(ns("scale"), [float("scale", { defaultValue: 1 }), float("eye_scale", { defaultValue: 1 }), slot("condition", "entity_condition")]),
  power(ns("falling_protection"), [float("fall_distance", { defaultValue: 6 })]),
  power(ns("water_flexibility"), [float("water_flex", { defaultValue: 0.5 })]),
  power(ns("always_sprint_swimming"), [float("hunger_multiplier", { defaultValue: 1 })]),
  power(ns("add_sustained_instinct"), [
    str("instinct_effect_id", { required: true }),
    float("value", { defaultValue: 0 }),
    int("duration", { defaultValue: 1 }),
    slot("condition", "entity_condition")
  ]),
  power(ns("add_immediate_instinct"), [str("instinct_effect_id", { required: true }), float("value", { defaultValue: 0 })]),
  power(ns("delay_attribute"), [
    unknown("modifier", { required: true }),
    int("tick_rate", { required: true }),
    bool("updateHealth", { required: true }),
    int("delay", { required: true }),
    slot("condition", "entity_condition")
  ]),
  power(ns("conditioned_mana_attribute"), [
    str("mana_type", { required: true }),
    unknown("modifier", { required: true }),
    int("tick_rate", { required: true }),
    slot("condition", "entity_condition")
  ]),
  power(ns("mana_attribute"), [str("mana_type", { required: true }), unknown("modifier", { required: true })]),
  power(ns("mana_type_power"), [str("mana_type", { required: true }), str("mana_source", { required: true })]),
  power(ns("charge_action"), [str("charge_power_id"), data("key", "key"), ...chargeTierFields(10)]),
  power(ns("action_on_sprinting_to_sneaking"), [slot("entity_action", "entity_action"), slot("entity_condition", "entity_condition")]),
  power(ns("action_on_jump"), [slot("entity_action", "entity_action"), slot("entity_condition", "entity_condition")]),
  power(ns("action_on_splash_potion_take_effect"), [
    slot("entity_action", "entity_action"),
    slot("entity_condition", "entity_condition"),
    bool("trigger_on_no_effect", { defaultValue: false })
  ]),
  power(ns("action_on_entity_in_range"), [
    slot("entity_condition", "entity_condition"),
    slot("entity_action", "entity_action"),
    slot("self_action", "entity_action"),
    float("action_radius", { defaultValue: 8 }),
    int("detection_interval", { defaultValue: 10 })
  ]),
  power(ns("attract_by_entity"), [
    slot("entity_condition", "entity_condition"),
    slot("entity_action", "entity_action"),
    slot("self_action", "entity_action"),
    float("attraction_speed", { defaultValue: 0.1 }),
    float("attraction_radius", { defaultValue: 8 }),
    float("stop_radius", { defaultValue: 1 }),
    float("escape_attraction_speed", { defaultValue: 0.025 }),
    float("escape_angle")
  ]),
  power(ns("triple_jump"), [
    slot("first_jump_action", "entity_action"),
    slot("second_jump_action", "entity_action"),
    slot("third_jump_action", "entity_action"),
    float("first_jump_multiplier", { defaultValue: 1 }),
    float("second_jump_multiplier", { defaultValue: 1.5 }),
    float("third_jump_multiplier", { defaultValue: 2 }),
    int("reset_ticks_on_ground", { defaultValue: 10 })
  ]),
  power(ns("virtual_totem"), [
    str("virtual_totem_type", { defaultValue: "shape-shifter-curse:default" }),
    data("totem_stack", "item_stack"),
    slotArray("entity_actions", "entity_action"),
    int("totem_health", { defaultValue: 1 }),
    dataArray("totem_status_effects", "status_effect_instance"),
    int("cooldown", { defaultValue: 1200 }),
    str("hud_render")
  ]),
  power(ns("virtual_shield"), [
    slot("active_shield_condition", "entity_condition"),
    slot("taken_damage_action", "entity_action"),
    slot("normal_damage_action", "entity_action"),
    slot("shield_break_action", "entity_action")
  ]),
  power(ns("custom_edible"), [
    str("item_id_list", { required: true }),
    int("hunger", { required: true }),
    float("saturation_modifier", { required: true }),
    bool("always_edible", { required: true })
  ]),
  power(ns("custom_water_breathing"), [int("land_water_breathing_level", { defaultValue: 0 })]),
  power(ns("in_water_speed_modifier"), [unknown("modifier", { required: true })]),
  power(ns("modify_step_height"), [
    float("step_height_scale", { required: true }),
    slot("condition", "entity_condition"),
    bool("affect_sneak", { defaultValue: false })
  ]),
  power(ns("condition_scale"), [
    float("scale", { defaultValue: 1 }),
    float("eye_scale", { defaultValue: 1 }),
    slot("condition", "entity_condition", { required: true })
  ]),
  power(ns("no_render_arm"), [slot("condition", "entity_condition")]),
  power(ns("modify_block_drop"), [slot("block_condition", "block_condition"), float("chance", { defaultValue: 1 }), dataArray("target_item_stack_list", "item_stack")]),
  power(ns("modify_entity_loot"), [slot("from_item_condition", "item_condition"), float("chance", { defaultValue: 1 }), str("target_item")]),
  power(ns("modify_food_heal"), [int("food_timer_add_amount", { defaultValue: 0 }), int("modify_food_timer_tick_rate", { defaultValue: 1 })]),
  power(ns("soul_speed"), [int("level", { defaultValue: 1 }), int("max_level", { defaultValue: 3 })]),
  power(ns("form_camera_bobbing"), [str("bobbing_type", { required: true })]),
  power(ns("slowdown_percent"), [float("slowdown_percent", { required: true })]),
  power(ns("apply_effect"), [dataArray("status_effects", "status_effect_instance")]),
  power(ns("optional_effect_immunity"), [str("effects"), slot("condition", "entity_condition")]),
  power(ns("modify_fall_damage"), [unknown("modifier"), slot("condition", "entity_condition")]),
  power(ns("modify_footstep_sound_speed"), [float("speed", { defaultValue: 1 }), slot("condition", "entity_condition")]),

  entityAction(ns("add_instinct"), [str("instinct_effect_id", { required: true }), float("value", { defaultValue: 0 }), int("duration", { defaultValue: 1 })]),
  entityAction(ns("set_falling_distance"), [float("fall_distance", { required: true })]),
  entityAction(ns("set_mana"), [float("mana", { defaultValue: 0 })]),
  entityAction(ns("gain_mana"), [float("mana", { defaultValue: 0 })]),
  entityAction(ns("consume_mana"), [float("mana", { defaultValue: 0 })]),
  entityAction(ns("gain_mana_with_time"), [float("mana", { defaultValue: 0 }), int("time", { defaultValue: 0 })]),
  entityAction(ns("transform_to_form"), [str("form_id"), bool("instant", { defaultValue: false })]),
  entityAction(ns("give_custom_transform_effect"), [str("form_id")]),
  entityAction(ns("explosion_damage_entity"), [
    float("power", { required: true }),
    bool("explosion_damage_entity", { defaultValue: true }),
    slot("entity_condition", "entity_condition"),
    slot("entity_action", "entity_action")
  ]),
  entityAction(ns("summon_anubis_wolf_minion"), minionFields()),
  bientityAction(ns("bi_summon_anubis_wolf_minion"), minionFields()),
  entityAction(ns("spawn_particles_in_circle"), [
    data("particle", "particle_effect", { required: true }),
    int("count", { defaultValue: 1 }),
    float("speed", { defaultValue: 0 }),
    bool("force", { defaultValue: false }),
    data("spread", "vector"),
    float("radius", { defaultValue: 1 }),
    int("sample_count", { defaultValue: 16 }),
    float("offset_y", { defaultValue: 0 })
  ]),
  entityAction(ns("web_bridge"), [int("web_bridge_length", { defaultValue: 16 }), int("web_bridge_width", { defaultValue: 0 })]),
  entityAction(ns("fire_web_bullet"), [
    int("tier", { defaultValue: 1 }),
    float("divergence", { defaultValue: 1 }),
    float("speed", { defaultValue: 1.5 }),
    slot("projectile_action", "entity_action"),
    bool("enable_entangled_effect", { defaultValue: true }),
    bool("enable_top_block_build", { defaultValue: true })
  ]),
  entityAction(ns("drop_accessory"), accessoryBaseFields([int("slot_index", { defaultValue: -1 }), bool("remove", { defaultValue: false })])),
  entityAction(ns("invoke_accessory"), accessoryBaseFields([int("slot_index", { defaultValue: 0 }), slot("action", "item_action")])),
  itemAction(ns("store_item"), [str("key", { required: true })]),
  itemAction(ns("restore_item"), [str("key", { required: true })]),

  entityCondition(ns("has_mana"), [float("mana", { defaultValue: 0 })]),
  entityCondition(ns("has_mana_percent"), [float("mana_percent", { defaultValue: 0 })]),
  entityCondition(ns("mana_compare"), [str("comparison"), float("compare_to", { defaultValue: 0 })]),
  entityCondition(ns("mana_percent_compare"), [str("comparison"), float("compare_to", { defaultValue: 0 })]),
  entityCondition(ns("chance"), [float("chance", { required: true })]),
  entityCondition(ns("instinct_value"), [str("instinct_effect_id", { required: true }), str("comparison", { required: true }), float("compare_to", { required: true })]),
  entityCondition(ns("digging_bare_hand")),
  entityCondition(ns("jump_event")),
  entityCondition(ns("must_crawling")),
  entityCondition(ns("can_render_gui")),
  entityCondition(ns("enable_random_sound")),
  entityCondition(ns("last_attack_witch_time"), [str("comparison", { required: true }), int("compare_to", { defaultValue: 0 })]),
  entityCondition(ns("last_attack_pillager_time"), [str("comparison", { required: true }), int("compare_to", { defaultValue: 0 })]),
  entityCondition(ns("is_sleep")),
  entityCondition(ns("equip_accessory"), [str("accessory_mod", { defaultValue: "auto" }), str("accessory")]),
  entityCondition(ns("check_accessory"), accessoryBaseFields([int("slot_index", { defaultValue: 0 }), slot("condition", "item_condition")])),

  itemCondition(ns("is_weapon")),
  itemCondition(ns("is_morph_scale_item")),
  itemCondition(ns("is_morph_scale_food"))
];

function chargeTierFields(tierCount: number): FieldSchema[] {
  const fields: FieldSchema[] = [];
  for (let tier = 0; tier < tierCount; tier += 1) {
    fields.push(
      bool(`tier${tier}_enable`, { defaultValue: tier === 0 }),
      int(`tier${tier}_charge_time`, { defaultValue: tier === 0 ? 0 : -1 }),
      slot(`tier${tier}_condition`, "entity_condition"),
      slot(`tier${tier}_can_charge_condition`, "entity_condition"),
      slot(`tier${tier}_auto_fire_condition`, "entity_condition"),
      slot(`tier${tier}_use_action`, "entity_action"),
      slot(`tier${tier}_tick_action`, "entity_action"),
      slot(`tier${tier}_charge_tick_action`, "entity_action"),
      slot(`tier${tier}_charge_complete_action`, "entity_action"),
      slot(`tier${tier}_charge_complete_use_action`, "entity_action"),
      slot(`tier${tier}_charge_complete_tick_action`, "entity_action"),
      int(`tier${tier}_cooldown`, { defaultValue: 0 })
    );
  }
  return fields;
}

function minionFields(): FieldSchema[] {
  return [
    int("minion_level", { defaultValue: 1 }),
    int("count", { defaultValue: 1 }),
    int("max_minion_count"),
    int("cooldown", { defaultValue: 0 }),
    slot("owner_action", "entity_action"),
    slot("target_action", "entity_action"),
    bool("reverse", { defaultValue: false })
  ];
}

function accessoryBaseFields(extraFields: FieldSchema[]): FieldSchema[] {
  return [
    str("accessory_mod", { defaultValue: "auto" }),
    str("group", { defaultValue: "" }),
    str("slot", { defaultValue: "" }),
    ...extraFields
  ];
}
