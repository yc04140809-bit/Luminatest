extends Control

const TEST_SCENE_PATH := "res://game/data/story/episode0/ep0_000_test.json"
const SAVE_SLOT := 0

@onready var start_button: Button = $VBox/StartButton
@onready var continue_button: Button = $VBox/ContinueButton


func _ready() -> void:
	start_button.text = LocalizationManager.t("title_new_game")
	continue_button.text = LocalizationManager.t("title_continue")
	continue_button.disabled = not SaveManager.has_save(SAVE_SLOT)
	start_button.pressed.connect(_on_start_pressed)
	continue_button.pressed.connect(_on_continue_pressed)


func _on_start_pressed() -> void:
	Flags.reset()
	GameManager.goto_story_scene(TEST_SCENE_PATH)


func _on_continue_pressed() -> void:
	SaveManager.load_game(SAVE_SLOT)
	GameManager.goto_story_scene(TEST_SCENE_PATH)
