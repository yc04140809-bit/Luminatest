class_name BattleMock
extends Control

## 仮戦闘(Phase2 MVP)。本格的なターン制バトルシステム(第13章)は将来実装し、
## ここでは「攻撃し合って勝敗がつく」最小構成のみを実装する。
## ケイオスちゃんを画面に常時表示し(core/ui_kit/CharacterPortraitView)、
## 攻撃のたびに軽いパンチ演出と間(テンポ)を入れる(PROJECT_BIBLE「主役は常にケイオスちゃん」)。
## 演出中はCharacterPortraitViewのアイドルモーションを一時停止する。
## 勝敗はFlagsに記録し、Memory Systemの初勝利/初敗北Memoryのトリガーとなる。
## 戦闘直後のHome挨拶(リキャップ)用に、直近の勝敗を一時フラグとして渡す。
## Emotion Engineへ瀕死・勝敗を通知し、ケイオスちゃんの表情に即反映する。

const PLAYER_DATA_PATH := "res://game/data/characters/kaosu.json"
const ENEMY_DATA_PATH := "res://game/data/enemies/enemy_training_dummy.json"
const CHARACTER_ID := "kaosu"
const WIN_FLAG := "ep0_first_battle_won"
const LOSE_FLAG := "ep0_first_battle_lost"
const BEAT_DELAY := 0.35
const WIN_AFFECTION_POINTS := 20

var _player_hp: int
var _player_max_hp: int
var _player_attack: int
var _enemy_hp: int
var _enemy_max_hp: int
var _enemy_attack: int
var _enemy_name: String
var _battle_over: bool = false
var _busy: bool = false
var _won_last: bool = false

@onready var kaosu_portrait: CharacterPortraitView = $KaosuPortrait
@onready var player_hp_bar: ProgressBar = $Panel/VBox/PlayerRow/PlayerHpBar
@onready var enemy_hp_bar: ProgressBar = $Panel/VBox/EnemyRow/EnemyHpBar
@onready var enemy_name_label: Label = $Panel/VBox/EnemyRow/EnemyNameLabel
@onready var log_label: RichTextLabel = $Panel/VBox/LogScroll/LogLabel
@onready var attack_button: Button = $Panel/VBox/CommandRow/AttackButton
@onready var back_button: Button = $Panel/VBox/CommandRow/BackButton


func _ready() -> void:
	var player_stats: Dictionary = _read_json(PLAYER_DATA_PATH).get("base_stats", {})
	_player_max_hp = player_stats.get("hp", 100)
	_player_hp = _player_max_hp
	_player_attack = player_stats.get("attack", 10)

	var enemy_data := _read_json(ENEMY_DATA_PATH)
	_enemy_max_hp = enemy_data.get("max_hp", 50)
	_enemy_hp = _enemy_max_hp
	_enemy_attack = enemy_data.get("attack", 5)
	_enemy_name = LocalizationManager.t(enemy_data.get("name_key", ""))

	kaosu_portrait.set_character(CHARACTER_ID)
	kaosu_portrait.set_expression(EmotionManager.get_portrait_expression(CHARACTER_ID))

	enemy_name_label.text = _enemy_name
	player_hp_bar.max_value = _player_max_hp
	enemy_hp_bar.max_value = _enemy_max_hp
	_refresh_hp_bars()

	attack_button.pressed.connect(_on_attack_pressed)
	back_button.pressed.connect(_on_back_pressed)
	back_button.disabled = true

	_log(LocalizationManager.t("battle_mock_start_line") % _enemy_name)


func _on_attack_pressed() -> void:
	if _battle_over or _busy:
		return
	_busy = true
	attack_button.disabled = true

	_enemy_hp = max(_enemy_hp - _player_attack, 0)
	_log(LocalizationManager.t("battle_mock_player_attack_line") % _player_attack)
	_refresh_hp_bars()
	_punch(kaosu_portrait)

	if _enemy_hp <= 0:
		await get_tree().create_timer(BEAT_DELAY).timeout
		_end_battle(true)
		return

	await get_tree().create_timer(BEAT_DELAY).timeout

	_player_hp = max(_player_hp - _enemy_attack, 0)
	_log(LocalizationManager.t("battle_mock_enemy_attack_line") % _enemy_attack)
	_refresh_hp_bars()
	_punch(kaosu_portrait)

	if _player_hp <= 0:
		await get_tree().create_timer(BEAT_DELAY).timeout
		_end_battle(false)
		return

	if _player_hp <= _player_max_hp * 0.25:
		EmotionManager.notify_near_death(CHARACTER_ID)
		kaosu_portrait.set_expression(EmotionManager.get_portrait_expression(CHARACTER_ID))

	_busy = false
	attack_button.disabled = false


## 攻撃のたびにケイオスちゃんへ軽くパンチのような伸縮を入れ、手応えを出す。
## 演出中はアイドルモーション(呼吸)を止め、終わったら再開する。
func _punch(node: CharacterPortraitView) -> void:
	node.set_motion_enabled(false)
	var tween := create_tween()
	tween.tween_property(node, "scale", Vector2(1.06, 0.94), 0.08)
	tween.tween_property(node, "scale", Vector2(1.0, 1.0), 0.12)
	tween.finished.connect(func(): node.set_motion_enabled(true))


func _end_battle(won: bool) -> void:
	_battle_over = true
	_busy = false
	_won_last = won
	attack_button.disabled = true
	back_button.disabled = false

	var is_first_win: bool = won and Flags.get_flag(WIN_FLAG, false) != true

	if won:
		Flags.set_flag(WIN_FLAG, true)
		AffectionManager.add_points(CHARACTER_ID, WIN_AFFECTION_POINTS)
	else:
		Flags.set_flag(LOSE_FLAG, true)

	EmotionManager.notify_battle_result(CHARACTER_ID, won, false)
	kaosu_portrait.set_expression(EmotionManager.get_portrait_expression(CHARACTER_ID))

	_log(_pick_battle_result_line(won, is_first_win))


## 勝敗の台詞はCharacter Voice & Dialogue Databaseから選ぶ(初勝利は専用の
## 高優先度エントリが自然に優先される)。該当データが無ければ既存の固定文言へ
## フォールバックする(既存機能非破壊)。
func _pick_battle_result_line(won: bool, is_first_win: bool) -> String:
	var stage := AffectionManager.get_stage(CHARACTER_ID)
	var emotion := EmotionManager.get_current_emotion(CHARACTER_ID)
	var context := {
		"relationship_stage": stage,
		"emotion": emotion,
		"battle_result": "win" if won else "loss",
		"story_chapter": "episode0",
		"location": "battle",
		"affection_level": AffectionManager.get_level(CHARACTER_ID),
		"recorded_memory_ids": MemoryManager.get_recorded_ids(),
		"memory_importance_by_id": MemoryManager.get_importance_map(),
	}
	if is_first_win:
		context["event_type"] = "first_battle_win"

	var recent_ids: Array = MemoryManager.get_recent_dialogue_ids(CHARACTER_ID)
	var result := DialogueDatabase.pick_dialogue(CHARACTER_ID, context, recent_ids)
	if result.is_valid():
		MemoryManager.record_dialogue_used(CHARACTER_ID, result.entry_id)
		return LocalizationManager.t_for_contexts(result.text_key, [emotion, stage])

	return LocalizationManager.t("battle_mock_victory_line") if won else LocalizationManager.t("battle_mock_defeat_line")


func _on_back_pressed() -> void:
	Flags.set_flag("just_returned_from_battle", true)
	Flags.set_flag("last_battle_result", "won" if _won_last else "lost")
	GameManager.goto_home()


func _refresh_hp_bars() -> void:
	player_hp_bar.value = _player_hp
	enemy_hp_bar.value = _enemy_hp


func _log(text: String) -> void:
	log_label.text += text + "\n"


func _read_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var f := FileAccess.open(path, FileAccess.READ)
	var text := f.get_as_text()
	f.close()
	var result: Variant = JSON.parse_string(text)
	return result if result is Dictionary else {}
