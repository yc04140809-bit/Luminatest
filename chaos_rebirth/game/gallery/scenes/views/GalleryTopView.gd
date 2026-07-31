extends Control

## カテゴリ選択画面(game層)。GalleryRepositoryのカテゴリ一覧をタイル表示する。

const TILE_SCENE := preload("res://core/ui_kit/GalleryCategoryTile.tscn")

var gallery_root: Control

@onready var grid: GridContainer = $ScrollContainer/Grid


func get_title_key() -> String:
	return "gallery_title_top"


func setup(_params: Dictionary) -> void:
	for category in GalleryRepository.get_categories():
		var tile: Control = TILE_SCENE.instantiate()
		grid.add_child(tile)
		tile.setup(LocalizationManager.t(category.get("name_key", "")), category.get("enabled", true))
		var category_id: String = category.get("id", "")
		tile.pressed.connect(_on_category_pressed.bind(category_id))


func _on_category_pressed(category_id: String) -> void:
	match category_id:
		"character_list", "profile":
			gallery_root.open_character_list()
		"voice", "live2d":
			pass
		_:
			gallery_root.open_category_grid(category_id)
