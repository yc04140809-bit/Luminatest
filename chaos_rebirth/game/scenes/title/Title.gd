extends Control

const TEST_SCENE_PATH := "res://game/data/story/episode0/ep0_000_test.json"
const GALLERY_ROOT_SCENE := "res://game/gallery/scenes/GalleryRoot.tscn"
const SAVE_SLOT := 0

@onready var start_button: Button = $VBox/StartButton
@onready var continue_button: Button = $VBox/ContinueButton
@onready var gallery_button: Button = $VBox/GalleryButton


func _ready() -> void:
	start_button.text = LocalizationManager.t("title_new_game")
	continue_button.text = LocalizationManager.t("title_continue")
	continue_button.disabled = not SaveManager.has_save(SAVE_SLOT)
	gallery_button.text = LocalizationManager.t("gallery_button")
	start_button.pressed.connect(_on_start_pressed)
	continue_button.pressed.connect(_on_continue_pressed)
	gallery_button.pressed.connect(_on_gallery_pressed)


func _on_start_pressed() -> void:
	Flags.reset()
	GameManager.goto_story_scene(TEST_SCENE_PATH)


func _on_continue_pressed() -> void:
	SaveManager.load_game(SAVE_SLOT)
	GameManager.goto_home()


func _on_gallery_pressed() -> void:
	var gallery_scene: PackedScene = load(GALLERY_ROOT_SCENE)
	var gallery: Control = gallery_scene.instantiate()
	get_tree().root.add_child(gallery)
	gallery.closed.connect(func(): gallery.queue_free())
