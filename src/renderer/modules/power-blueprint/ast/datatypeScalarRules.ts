const SCALAR_INPUT_FIELD_NAMES = new Map<string, string>([
  ["action_result", "value"],
  ["attribute_modifier_operation", "value"],
  ["attributed_attribute_modifier_operation", "value"],
  ["comparison", "value"],
  ["container_type", "value"],
  ["destruction_type", "value"],
  ["entity_type_tag_like", "value"],
  ["fluid_handling", "value"],
  ["heightmap_type", "value"],
  ["identifier", "value"],
  ["inventory_type", "value"],
  ["item_slot", "value"],
  ["material", "value"],
  ["nbt", "value"],
  ["player_ability", "value"],
  ["process_mode", "value"],
  ["shape", "value"],
  ["shape_type", "value"],
  ["space", "value"],
  ["stat", "value"],
  ["crafting_recipe", "recipe"],
  ["default_translatable_text_component", "translate"],
  ["ingredient", "item"],
  ["item_stack", "item"],
  ["text", "text"]
]);

export function scalarInputDatatypeFieldName(datatype: string) {
  return SCALAR_INPUT_FIELD_NAMES.get(datatype);
}
