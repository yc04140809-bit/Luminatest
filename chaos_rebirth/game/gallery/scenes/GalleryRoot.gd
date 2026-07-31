extends Control

## ギャラリーサブシステムのエントリポイント(game層)。
## 本編のGameManagerとは独立したナビゲーションスタックを内部に持ち、
## closedシグナルで呼び出し元(Title等)に制御を返す。

signal closed()

const TOP_VIEW := preload("res://game/gallery/scenes/views/GalleryTopView.tscn")
const CATEGORY_GRID_VIEW := preload("res://game/gallery/scenes/views/GalleryCategoryGridView.tscn")
const CHARACTER_LIST_VIEW := preload("res://game/gallery/scenes/views/GalleryCharacterListView.tscn")
const CHARACTER_DETAIL_VIEW := preload("res://game/gallery/scenes/views/GalleryCharacterDetailView.tscn")

@onready var back_button: Button = $TopBar/BackButton
@onready var close_button: Button = $TopBar/CloseButton
@onready var title_label: Label = $TopBar/TitleLabel
@onready var view_container: Control = $ViewContainer
@onready var image_viewer: Control = $ImageViewer

var _stack: Array = []


func _ready() -> void:
	back_button.pressed.connect(_on_back_pressed)
	close_button.pressed.connect(_on_close_pressed)
	image_viewer.closed.connect(func(): pass)
	_push(TOP_VIEW, {})


func open_category_grid(category_id: String) -> void:
	_push(CATEGORY_GRID_VIEW, {"category_id": category_id})


func open_character_list() -> void:
	_push(CHARACTER_LIST_VIEW, {})


func open_character_detail(character_id: String) -> void:
	_push(CHARACTER_DETAIL_VIEW, {"character_id": character_id})


func show_image_viewer(images: Array, start_index: int) -> void:
	image_viewer.open(images, start_index)


func _push(view_scene: PackedScene, params: Dictionary) -> void:
	var view: Control = view_scene.instantiate()
	view_container.add_child(view)
	if _stack.size() > 0:
		_stack[-1].hide()
	view.set("gallery_root", self)
	if view.has_method("setup"):
		view.setup(params)
	_stack.append(view)
	_refresh_top_bar()


func _on_back_pressed() -> void:
	if _stack.size() <= 1:
		return
	var top: Control = _stack.pop_back()
	top.queue_free()
	_stack[-1].show()
	_refresh_top_bar()


func _on_close_pressed() -> void:
	closed.emit()


func _refresh_top_bar() -> void:
	back_button.visible = _stack.size() > 1
	var current: Control = _stack[-1]
	if current.has_method("get_title_key"):
		title_label.text = LocalizationManager.t(current.call("get_title_key"))
