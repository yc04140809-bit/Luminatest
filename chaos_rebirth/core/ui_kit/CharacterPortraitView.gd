class_name CharacterPortraitView
extends Control

## 立ち絵表示の共通コンポーネント(core層/IP非依存)。体験設計書 第5章の
## 抽象化を実装したもの。表情差分の解決・アイドルモーション(瞬き/呼吸)・
## 将来のLive2D差し替えを1箇所に集約する。Home/Story/Battle等、
## 立ち絵を表示するすべての画面はこれ経由で表示する。
##
## PROJECT_BIBLE: 「主役は常にケイオスちゃん」「立ち絵は常に生きているように」。

const ASSET_ROOT := "res://game/assets/characters/"
const DEFAULT_EXPRESSION := "normal"

const BLINK_SQUASH_SCALE := Vector2(1.0, 0.86)
const BLINK_DURATION := 0.09
const BLINK_MIN_INTERVAL := 2.5
const BLINK_MAX_INTERVAL := 6.0

const BREATH_AMPLITUDE := 4.0
const BREATH_PERIOD := 3.2

## Emotion Engine等による表情切り替えは瞬間切替を禁止し、必ず短いクロス
## フェードで自然に遷移させる(PROJECT_BIBLE「瞬間切替は禁止」)。
const EXPRESSION_FADE_DURATION := 0.12

@export var motion_enabled: bool = true

var _character_id: String = ""
var _expression: String = DEFAULT_EXPRESSION
var _time: float = 0.0
var _blink_timer: float = 0.0
var _next_blink_interval: float = 3.0
var _rng := RandomNumberGenerator.new()
var _base_position: Vector2 = Vector2.ZERO

## 将来Live2D差し替え時のパラメータチャンネル(瞬き/口パク/呼吸/髪揺れ/服揺れ/翼揺れ)。
## 現状の静的表示では値を保持するのみで、blink/breath以外は見た目に反映しない
## (体験設計書 第5.2節の想定どおり、Live2D未導入時点ではダミー実装でよい)。
var _motion_parameters: Dictionary = {}

@onready var texture_rect: TextureRect = $TextureRect


func _ready() -> void:
	_rng.randomize()
	_next_blink_interval = _rng.randf_range(BLINK_MIN_INTERVAL, BLINK_MAX_INTERVAL)
	_base_position = texture_rect.position


func _process(delta: float) -> void:
	if not motion_enabled:
		return
	_time += delta
	_apply_breath()
	_update_blink(delta)


func set_character(character_id: String) -> void:
	_character_id = character_id
	_refresh_texture()


func get_character() -> String:
	return _character_id


func set_expression(expression: String) -> void:
	_expression = expression
	_refresh_texture()


func get_expression() -> String:
	return _expression


## 演出中(必殺技カットイン等)は呼吸/瞬きを止めたいので、外部から一時停止できる。
func set_motion_enabled(enabled: bool) -> void:
	motion_enabled = enabled
	if not enabled:
		texture_rect.position = _base_position


func set_motion_parameter(param_name: String, value: float) -> void:
	_motion_parameters[param_name] = value


func get_motion_parameter(param_name: String) -> float:
	return _motion_parameters.get(param_name, 0.0)


func _refresh_texture() -> void:
	if _character_id == "":
		return
	var path := _expression_path(_expression)
	if not ResourceLoader.exists(path):
		path = _expression_path(DEFAULT_EXPRESSION)
	if not ResourceLoader.exists(path):
		return

	var new_texture: Texture2D = load(path)
	if new_texture == texture_rect.texture:
		return

	if texture_rect.texture == null:
		# 初回表示はフェードの必要がない(何も無い状態からの出現は「切替」ではない)。
		texture_rect.texture = new_texture
		return

	var tween := create_tween()
	tween.tween_property(texture_rect, "modulate:a", 0.0, EXPRESSION_FADE_DURATION)
	tween.tween_callback(func(): texture_rect.texture = new_texture)
	tween.tween_property(texture_rect, "modulate:a", 1.0, EXPRESSION_FADE_DURATION)


func _expression_path(expression: String) -> String:
	return "%s%s/expressions/%s_%s.png" % [ASSET_ROOT, _character_id, _character_id, expression]


func _apply_breath() -> void:
	var offset_y := sin(_time * TAU / BREATH_PERIOD) * BREATH_AMPLITUDE
	texture_rect.position = _base_position + Vector2(0, offset_y)


func _update_blink(delta: float) -> void:
	_blink_timer += delta
	if _blink_timer < _next_blink_interval:
		return
	_blink_timer = 0.0
	_next_blink_interval = _rng.randf_range(BLINK_MIN_INTERVAL, BLINK_MAX_INTERVAL)
	_play_blink()


func _play_blink() -> void:
	var tween := create_tween()
	tween.tween_property(texture_rect, "scale", BLINK_SQUASH_SCALE, BLINK_DURATION)
	tween.tween_property(texture_rect, "scale", Vector2.ONE, BLINK_DURATION)
