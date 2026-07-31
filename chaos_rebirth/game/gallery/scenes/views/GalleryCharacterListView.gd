extends Control

## キャラクター一覧 + 検索/絞り込み(game層)。

const THUMB_SCENE := preload("res://core/ui_kit/GalleryThumbnail.tscn")
const ASSET_ROOT := "res://game/assets/"

var gallery_root: Control

@onready var name_input: LineEdit = $FilterBar/NameInput
@onready var element_option: OptionButton = $FilterBar/ElementOption
@onready var acquired_toggle: CheckButton = $FilterBar/ToggleRow/AcquiredToggle
@onready var unacquired_toggle: CheckButton = $FilterBar/ToggleRow/UnacquiredToggle
@onready var grid: GridContainer = $ScrollContainer/Grid


func get_title_key() -> String:
	return "gallery_title_character_list"


func setup(_params: Dictionary) -> void:
	_populate_element_options()
	name_input.text_changed.connect(func(_t): _refresh())
	element_option.item_selected.connect(func(_i): _refresh())
	acquired_toggle.toggled.connect(func(_v): _refresh())
	unacquired_toggle.toggled.connect(func(_v): _refresh())
	_refresh()


func _populate_element_options() -> void:
	element_option.clear()
	element_option.add_item(LocalizationManager.t("gallery_filter_all"))
	var seen: Dictionary = {}
	for character_id in GalleryRepository.get_character_ids():
		var profile := GalleryRepository.get_character_profile(character_id)
		var element: String = profile.get("element", "")
		if element != "" and not seen.has(element):
			seen[element] = true
			element_option.add_item(element)


func _refresh() -> void:
	for child in grid.get_children():
		child.queue_free()
	var filter := {
		"name": name_input.text,
		"element": "" if element_option.selected <= 0 else element_option.get_item_text(element_option.selected),
		"acquired_only": acquired_toggle.button_pressed,
		"unacquired_only": unacquired_toggle.button_pressed,
	}
	for summary in GalleryRepository.get_character_summaries(filter):
		var thumb: Control = THUMB_SCENE.instantiate()
		grid.add_child(thumb)
		var art_path: String = ASSET_ROOT + String(summary.get("full_body_art", ""))
		thumb.setup(art_path, summary["unlocked"])
		thumb.pressed.connect(_on_character_pressed.bind(summary["character_id"], summary["unlocked"]))


func _on_character_pressed(character_id: String, unlocked: bool) -> void:
	if not unlocked:
		return
	gallery_root.open_character_detail(character_id)
