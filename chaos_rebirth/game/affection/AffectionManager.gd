extends Node

## 親密度(Affection)のgame層実装(体験設計書 第2章)。
## 内部ではポイント/レベルを保持するが、外部への公開APIは必ず
## RelationshipStage(文字列: stranger/acquaintance/friend/best_friend/family)
## を介して行う。口調・表情・距離感等の挙動制御はこのStageのみを見て判断すること。

const AFFECTION_DIR := "res://game/data/affection"

var _definitions: Dictionary = {}   # character_id -> { levels, stages }
var _points: Dictionary = {}        # character_id -> int


func _ready() -> void:
	_load_definitions()


func add_points(character_id: String, amount: int) -> void:
	_points[character_id] = int(_points.get(character_id, 0)) + amount


func get_points(character_id: String) -> int:
	return int(_points.get(character_id, 0))


func get_level(character_id: String) -> int:
	var definition: Dictionary = _definitions.get(character_id, {})
	return AffectionEvaluator.compute_level(get_points(character_id), definition.get("levels", []))


## RelationshipStageを返す(唯一の正規の関係性表現)。未定義キャラは空文字。
func get_stage(character_id: String) -> String:
	var definition: Dictionary = _definitions.get(character_id, {})
	if definition.is_empty():
		return ""
	return AffectionEvaluator.compute_stage(get_level(character_id), definition.get("stages", []))


## 現在のRelationshipStageに応じた「笑顔になりやすさ」(0.0〜1.0)。
## 表情選択(CharacterPortraitView)から利用する。
func get_smile_bias(character_id: String) -> float:
	var definition: Dictionary = _definitions.get(character_id, {})
	if definition.is_empty():
		return 0.1
	var stage_data := AffectionEvaluator.compute_stage_data(get_level(character_id), definition.get("stages", []))
	return float(stage_data.get("smile_bias", 0.1))


func get_state() -> Dictionary:
	return { "schema_version": 1, "points": _points.duplicate(true) }


func load_state(data: Dictionary) -> void:
	_points = data.get("points", {}).duplicate(true)


func _load_definitions() -> void:
	var dir := DirAccess.open(AFFECTION_DIR)
	if dir == null:
		return
	dir.list_dir_begin()
	var entry := dir.get_next()
	while entry != "":
		if entry.ends_with("_affection.json"):
			var data := _read_json(AFFECTION_DIR.path_join(entry))
			var character_id: String = data.get("character_id", "")
			if character_id != "":
				_definitions[character_id] = data
		entry = dir.get_next()
	dir.list_dir_end()


func _read_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var f := FileAccess.open(path, FileAccess.READ)
	var text := f.get_as_text()
	f.close()
	var result: Variant = JSON.parse_string(text)
	return result if result is Dictionary else {}
