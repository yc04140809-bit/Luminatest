extends Control

## ホーム画面(体験設計書 第1章)。
## ゲーム起動後・各コンテンツ終了後は必ずここへ戻る「居場所」。
## PROJECT_BIBLE: 主役は常にケイオスちゃん。UIは目立たない。時間は嘘をつかない。
##
## Emotion Engine(game/emotion)のオーケストレーション拠点。Home自身は
## MemoryManager/AffectionManager/EmotionManagerそれぞれの単体API(読み取り・
## 通知)だけを呼び、3者の間を橋渡しする(各Managerは互いを直接知らない)。
##
## 挨拶の優先順位: ①戦闘直後のリキャップ(一度きり) > ②Memory Systemの
## リアクション > ③いつもの一言(Character Voice & Dialogue Database)。
## 文言は Emotion → RelationshipStage の順で言い回しを差し替え、
## 表情もEmotionに追従する。①②は既存の実装(未変更)、③のみ
## DialogueDatabaseへ委譲する(特別な出来事が無い「いつもの雑談」を
## データベース化し、同じ台詞の連続を避けながら選ぶ)。

const TIME_BANDS_PATH := "res://game/data/home/time_bands.json"
const ASSET_ROOT := "res://game/assets/"
const CHARACTER_ID := "kaosu"
const STORY_SCENE_PATH := "res://game/data/story/episode0/ep0_000_test.json"
const BATTLE_SCENE := "res://game/scenes/battle/BattleMock.tscn"
const GALLERY_ROOT_SCENE := "res://game/gallery/scenes/GalleryRoot.tscn"
const SAVE_SLOT := 0

@onready var background: TextureRect = $Background
@onready var kaosu_portrait: CharacterPortraitView = $KaosuButton/Portrait
@onready var kaosu_button: Button = $KaosuButton
@onready var greeting_label: RichTextLabel = $GreetingBox/GreetingLabel
@onready var story_button: Button = $Nav/StoryButton
@onready var battle_button: Button = $Nav/BattleButton
@onready var gallery_button: Button = $Nav/GalleryButton

var _current_band: Dictionary = {}


func _ready() -> void:
	_record_first_visit_if_needed()
	MemoryManager.record_login()
	MemoryManager.check_and_record()

	_apply_time_band()
	kaosu_portrait.set_character(CHARACTER_ID)
	_evaluate_ambient_emotion()
	_on_kaosu_tapped()

	story_button.text = LocalizationManager.t("home_nav_story")
	battle_button.text = LocalizationManager.t("home_nav_battle")
	gallery_button.text = LocalizationManager.t("home_nav_gallery")

	kaosu_button.pressed.connect(_on_kaosu_tapped)
	story_button.pressed.connect(_on_story_pressed)
	battle_button.pressed.connect(_on_battle_pressed)
	gallery_button.pressed.connect(_on_gallery_pressed)

	SaveManager.save_game(SAVE_SLOT)


func _record_first_visit_if_needed() -> void:
	if Flags.get_flag("first_home_visit", false) != true:
		Flags.set_flag("first_home_visit", true)
		AffectionManager.add_points(CHARACTER_ID, 10)


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


func _hour_in_band(hour: int, band: Dictionary) -> bool:
	var start: int = band.get("start_hour", 0)
	var end: int = band.get("end_hour", 24)
	if start < end:
		return hour >= start and hour < end
	return hour >= start or hour < end


## Emotion Engineへ「今この瞬間の環境要因」を通知する(Home連携・Battle連携とは
## 別枠の、常時ゆるく効くアンビエント要因)。優先度は低いため、戦闘結果等の
## 強い出来事があればそちらが優先される(core/emotion_engineの優先度解決による)。
func _evaluate_ambient_emotion() -> void:
	EmotionManager.notify_time_band(CHARACTER_ID, String(_current_band.get("id", "")))
	EmotionManager.notify_relationship_baseline(CHARACTER_ID, AffectionManager.get_stage(CHARACTER_ID))
	EmotionManager.notify_login(CHARACTER_ID, MemoryManager.get_last_login_gap_days())
	EmotionManager.check_long_session(CHARACTER_ID)


## ケイオスちゃんをタップするたび、挨拶(戦闘リキャップ > Memory > 通常挨拶の
## 優先順位)とEmotionに応じた表情を再抽選する。
func _on_kaosu_tapped() -> void:
	_refresh_greeting()
	kaosu_portrait.set_expression(EmotionManager.get_portrait_expression(CHARACTER_ID))


func _refresh_greeting() -> void:
	var stage := AffectionManager.get_stage(CHARACTER_ID)

	var recap_key := _consume_battle_recap_key()
	if recap_key != "":
		var emotion := EmotionManager.get_current_emotion(CHARACTER_ID)
		greeting_label.text = LocalizationManager.t_for_contexts(recap_key, [emotion, stage])
		return

	var memory_key := MemoryManager.pick_reaction_text_key()
	if memory_key != "":
		# Memoryが持つ感情バイアスをEmotion Engineへ橋渡しする(MemoryManagerと
		# EmotionManagerは互いを直接知らないため、この画面が仲介する)。
		EmotionManager.notify_bias(CHARACTER_ID, MemoryManager.get_last_picked_emotion_bias())
		var emotion := EmotionManager.get_current_emotion(CHARACTER_ID)
		greeting_label.text = LocalizationManager.t_for_contexts(memory_key, [emotion, stage])
		return

	# 特別な出来事が無い「いつもの一言」はDialogue Databaseから選ぶ。
	var emotion := EmotionManager.get_current_emotion(CHARACTER_ID)
	var context := _build_dialogue_context(emotion, stage)
	var recent_ids: Array = MemoryManager.get_recent_dialogue_ids(CHARACTER_ID)
	var result := DialogueDatabase.pick_dialogue(CHARACTER_ID, context, recent_ids)
	if result.is_valid():
		MemoryManager.record_dialogue_used(CHARACTER_ID, result.entry_id)
		greeting_label.text = LocalizationManager.t_for_contexts(result.text_key, [emotion, stage])
	else:
		# DialogueDatabaseに該当キャラのデータが無い場合の最終防衛線。
		var band_key: String = String(_current_band.get("greeting_key", ""))
		greeting_label.text = LocalizationManager.t_for_contexts(band_key, [emotion, stage])


## Dialogue Databaseへ渡す「今この瞬間の状況」。Memory/Emotion/Relationship/
## Story/Time/Locationをひとつの文脈として組み立てる(この橋渡し自体は
## Home画面の責務。DialogueDatabaseはMemory/Affection/Emotionを一切知らない)。
func _build_dialogue_context(emotion: String, stage: String) -> Dictionary:
	var context := {
		"relationship_stage": stage,
		"emotion": emotion,
		"time_of_day": String(_current_band.get("id", "")),
		"story_chapter": "episode0",
		"location": "home",
		"affection_level": AffectionManager.get_level(CHARACTER_ID),
		"recorded_memory_ids": MemoryManager.get_recorded_ids(),
		"memory_importance_by_id": MemoryManager.get_importance_map(),
	}
	if MemoryManager.get_last_login_gap_days() >= 7:
		context["login_type"] = "long_absence_return"
	elif MemoryManager.get_login_streak() >= 7:
		context["login_type"] = "streak"
	return context


## 戦闘直後の一度きりのリキャップ。表示したら即フラグを消費するので、
## 同じHome滞在中に何度タップしても繰り返されない。
func _consume_battle_recap_key() -> String:
	if Flags.get_flag("just_returned_from_battle", false) != true:
		return ""
	Flags.set_flag("just_returned_from_battle", false)
	var won: bool = Flags.get_flag("last_battle_result", "") == "won"
	return "home_battle_recap_win" if won else "home_battle_recap_loss"


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
