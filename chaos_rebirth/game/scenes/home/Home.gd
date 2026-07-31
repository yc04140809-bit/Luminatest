extends Control

## ホーム画面(体験設計書 第1章)。
## ゲーム起動後・各コンテンツ終了後は必ずここへ戻る「居場所」。
## PROJECT_BIBLE: 主役は常にケイオスちゃん。UIは目立たない。時間は嘘をつかない。

const TIME_BANDS_PATH := "res://game/data/home/time_bands.json"
const ASSET_ROOT := "res://game/assets/"
const STORY_SCENE_PATH := "res://game/data/story/episode0/ep0_000_test.json"
const BATTLE_SCENE := "res://game/scenes/battle/BattleMock.tscn"
const GALLERY_ROOT_SCENE := "res://game/gallery/scenes/GalleryRoot.tscn"
const SAVE_SLOT := 0

@onready var background: TextureRect = $Background
@onready var kaosu_portrait: TextureRect = $KaosuButton/Portrait
@onready var kaosu_button: Button = $KaosuButton
@onready var greeting_label: RichTextLabel = $GreetingBox/GreetingLabel
@onready var story_button: Button = $Nav/StoryButton
@onready var battle_button: Button = $Nav/BattleButton
@onready var gallery_button: Button = $Nav/GalleryButton

var _current_band: Dictionary = {}


func _ready() -> void:
	_record_first_visit_if_needed()
	MemoryManager.check_and_record()

	_apply_time_band()
	_refresh_greeting()

	story_button.text = LocalizationManager.t("home_nav_story")
	battle_button.text = LocalizationManager.t("home_nav_battle")
	gallery_button.text = LocalizationManager.t("home_nav_gallery")

	kaosu_button.pressed.connect(_refresh_greeting)
	story_button.pressed.connect(_on_story_pressed)
	battle_button.pressed.connect(_on_battle_pressed)
	gallery_button.pressed.connect(_on_gallery_pressed)

	SaveManager.save_game(SAVE_SLOT)


func _record_first_visit_if_needed() -> void:
	if Flags.get_flag("first_home_visit", false) != true:
		Flags.set_flag("first_home_visit", true)


func _apply_time_band() -> void:
	var hour: int = Time.get_datetime_dict_from_system().get("hour", 12)
	var bands: Array = _read_json(TIME_BANDS_PATH).get("bands", [])

	_current_band = {}
	for band in bands:
		if _hour_in_band(hour, band):
			_current_band = band
			break
	if _current_band.is_empty() and bands.size() > 0:
		_current_band = bands[0]

	var bg_path: String = ASSET_ROOT + String(_current_band.get("background", ""))
	if ResourceLoader.exists(bg_path):
		background.texture = load(bg_path)
	AudioManager.play_bgm(_current_band.get("bgm", ""))

	var portrait_path := ASSET_ROOT + "characters/kaosu/expressions/kaosu_normal.png"
	if ResourceLoader.exists(portrait_path):
		kaosu_portrait.texture = load(portrait_path)


func _hour_in_band(hour: int, band: Dictionary) -> bool:
	var start: int = band.get("start_hour", 0)
	var end: int = band.get("end_hour", 24)
	if start < end:
		return hour >= start and hour < end
	return hour >= start or hour < end


func _refresh_greeting() -> void:
	var memory_key := MemoryManager.pick_greeting_text_key()
	var text_key: String = memory_key if memory_key != "" else String(_current_band.get("greeting_key", ""))
	greeting_label.text = LocalizationManager.t(text_key)


func _on_story_pressed() -> void:
	GameManager.goto_story_scene(STORY_SCENE_PATH)


func _on_battle_pressed() -> void:
	get_tree().change_scene_to_file(BATTLE_SCENE)


func _on_gallery_pressed() -> void:
	var gallery_scene: PackedScene = load(GALLERY_ROOT_SCENE)
	var gallery: Control = gallery_scene.instantiate()
	get_tree().root.add_child(gallery)
	gallery.closed.connect(func(): gallery.queue_free())


func _read_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var f := FileAccess.open(path, FileAccess.READ)
	var text := f.get_as_text()
	f.close()
	var result: Variant = JSON.parse_string(text)
	return result if result is Dictionary else {}
