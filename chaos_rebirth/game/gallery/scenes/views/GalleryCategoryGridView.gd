extends Control

## 選択カテゴリの全キャラクター横断サムネイル一覧(game層)。

const THUMB_SCENE := preload("res://core/ui_kit/GalleryThumbnail.tscn")
const ASSET_ROOT := "res://game/assets/"

var gallery_root: Control
var _category_id: String = ""
var _entries: Array = []

@onready var grid: GridContainer = $ScrollContainer/Grid


func get_title_key() -> String:
	return "gallery_cat_%s" % _category_id


func setup(params: Dictionary) -> void:
	_category_id = params.get("category_id", "")
	_entries = GalleryRepository.get_category_entries(_category_id)
	for i in _entries.size():
		var entry: Dictionary = _entries[i]
		var thumb: Control = THUMB_SCENE.instantiate()
		grid.add_child(thumb)
		thumb.setup(ASSET_ROOT + String(entry.get("thumbnail", "")), entry.get("unlocked", false))
		thumb.pressed.connect(_on_thumb_pressed.bind(i))


func _on_thumb_pressed(index: int) -> void:
	var entry: Dictionary = _entries[index]
	if not entry.get("unlocked", false):
		return
	var unlocked_paths: Array = []
	var start_index := 0
	for e in _entries:
		if not e.get("unlocked", false):
			continue
		if e.get("id", "") == entry.get("id", "") and e.get("character_id", "") == entry.get("character_id", ""):
			start_index = unlocked_paths.size()
		unlocked_paths.append(ASSET_ROOT + String(e.get("image", "")))
	gallery_root.show_image_viewer(unlocked_paths, start_index)
