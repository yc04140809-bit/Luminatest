extends Control

## core/story_engine/StoryEngine を再生するノベル画面(game層)
## StoryEngineのシグナルを購読し、テクスチャ解決・テキスト解決・セーブ連携のみを担当する。
## 立ち絵表示は core/ui_kit/CharacterPortraitView に一本化する(表情差分・
## アイドルモーション・将来のLive2D差し替えは同コンポーネント側で扱う)。

var scene_json_path: String = ""

var _engine: StoryEngine

@onready var background: TextureRect = $Background
@onready var character_sprite: CharacterPortraitView = $CharacterSprite
@onready var dialogue_box: Control = $DialogueBox
@onready var speaker_label: Label = $DialogueBox/SpeakerLabel
@onready var body_label: RichTextLabel = $DialogueBox/BodyLabel
@onready var choice_container: VBoxContainer = $ChoiceContainer


func _ready() -> void:
	_engine = StoryEngine.new()
	_engine.background_changed.connect(_on_background_changed)
	_engine.bgm_requested.connect(_on_bgm_requested)
	_engine.se_requested.connect(_on_se_requested)
	_engine.character_entered.connect(_on_character_entered)
	_engine.character_exited.connect(_on_character_exited)
	_engine.character_expression_changed.connect(_on_character_expression_changed)
	_engine.say_requested.connect(_on_say_requested)
	_engine.memory_say_requested.connect(_on_memory_say_requested)
	_engine.choice_requested.connect(_on_choice_requested)
	_engine.flag_changed.connect(_on_flag_changed)
	_engine.scene_finished.connect(_on_scene_finished)

	dialogue_box.hide()
	choice_container.hide()

	if scene_json_path != "":
		_engine.load_scene(scene_json_path)


func _unhandled_input(event: InputEvent) -> void:
	var tapped: bool = (event is InputEventScreenTouch and event.pressed) \
		or (event is InputEventMouseButton and event.pressed)
	if tapped and dialogue_box.visible:
		_engine.advance()


func _on_background_changed(bg_id: String) -> void:
	var path := "res://game/assets/backgrounds/%s.png" % bg_id
	if ResourceLoader.exists(path):
		background.texture = load(path)


func _on_bgm_requested(bgm_id: String, fade_sec: float) -> void:
	AudioManager.play_bgm(bgm_id, fade_sec)


func _on_se_requested(se_id: String) -> void:
	AudioManager.play_se(se_id)


func _on_character_entered(id: String, _position: String, expression: String) -> void:
	character_sprite.visible = true
	character_sprite.set_character(id)
	character_sprite.set_expression(expression)


func _on_character_exited(_id: String) -> void:
	character_sprite.visible = false


func _on_character_expression_changed(id: String, expression: String) -> void:
	character_sprite.set_character(id)
	character_sprite.set_expression(expression)


func _on_say_requested(speaker_id: String, text_key: String) -> void:
	var stage := AffectionManager.get_stage(speaker_id) if speaker_id != "" else ""
	speaker_label.text = LocalizationManager.t("chara_%s_name" % speaker_id) if speaker_id != "" else ""
	body_label.text = LocalizationManager.t_for_context(text_key, stage)
	dialogue_box.show()


## Memory Systemから「今言えること」を1つ話す(say_memoryコマンド)。
## 何も該当がなければシナリオを止めずに読み飛ばす。
func _on_memory_say_requested(speaker_id: String) -> void:
	var text_key: String = MemoryManager.pick_reaction_text_key()
	if text_key == "":
		_engine.advance()
		return
	_on_say_requested(speaker_id, text_key)


func _on_choice_requested(options: Array) -> void:
	dialogue_box.hide()
	for child in choice_container.get_children():
		child.queue_free()
	for i in options.size():
		var option: Dictionary = options[i]
		var button := Button.new()
		button.text = LocalizationManager.t(option.get("text_key", ""))
		button.custom_minimum_size = Vector2(0, 60)
		button.pressed.connect(_on_choice_pressed.bind(i))
		choice_container.add_child(button)
	choice_container.show()


func _on_choice_pressed(index: int) -> void:
	choice_container.hide()
	_engine.choose(index)


func _on_flag_changed(flag: String, value: Variant) -> void:
	Flags.set_flag(flag, value)


func _on_scene_finished() -> void:
	dialogue_box.hide()
	choice_container.hide()
	AffectionManager.add_points("kaosu", 5)
	SaveManager.save_game(0)
	GameManager.on_story_scene_finished()
