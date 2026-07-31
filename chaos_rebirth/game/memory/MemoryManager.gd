extends Node

## Memory System(第3章)のgame層実装。Memory定義はJSON外部管理とし、
## 発生条件を満たしたら記録し、Homeの挨拶等で自然に呼び戻す。
## Phase2 MVPでは発生条件タイプを story_flag のみに絞る
## (Flags側で first_home_visit / ep0_first_battle_won 等を立てることで表現する)。

const MEMORY_DIR := "res://game/data/memory"

var _definitions: Dictionary = {}   # id -> definition dict
var _records: Dictionary = {}       # id -> { occurred_at, reference_count, last_referenced_at }
var _recent_tags: Array = []

const RECENT_TAGS_WINDOW := 3


func _ready() -> void:
	_load_definitions()


## 未記録のMemoryのうち、発生条件を満たしたものを記録する。
func check_and_record() -> void:
	for id in _definitions.keys():
		if _records.has(id):
			continue
		if _trigger_satisfied(_definitions[id].get("trigger", {})):
			_records[id] = {
				"occurred_at": Time.get_datetime_string_from_system(),
				"reference_count": 0,
				"last_referenced_at": "",
			}


## 今この瞬間に話すのにふさわしいMemoryを1つ選び、text_keyを返す。
## 該当なしの場合は空文字を返す(無理に何か言わせない)。
func pick_greeting_text_key() -> String:
	var candidates: Array = []
	for id in _records.keys():
		var definition: Dictionary = _definitions.get(id, {})
		if definition.is_empty():
			continue
		if not _within_reference_limits(id, definition):
			continue
		var record: Dictionary = _records[id]
		candidates.append({
			"id": id,
			"importance": definition.get("importance", 1),
			"tags": definition.get("tags", []),
			"reference_count": record.get("reference_count", 0),
			"text_key": definition.get("text_key", ""),
		})

	var chosen := MemorySelector.select(candidates, _recent_tags)
	if chosen.is_empty():
		return ""

	var id: String = chosen["id"]
	_records[id]["reference_count"] = int(_records[id].get("reference_count", 0)) + 1
	_records[id]["last_referenced_at"] = Time.get_datetime_string_from_system()

	_recent_tags.append_array(chosen.get("tags", []))
	while _recent_tags.size() > RECENT_TAGS_WINDOW:
		_recent_tags.pop_front()

	return chosen.get("text_key", "")


func is_recorded(id: String) -> bool:
	return _records.has(id)


func get_recorded_ids() -> Array:
	return _records.keys()


func get_state() -> Dictionary:
	return { "schema_version": 1, "records": _records.duplicate(true) }


func load_state(data: Dictionary) -> void:
	_records = data.get("records", {}).duplicate(true)
	_recent_tags.clear()


func _within_reference_limits(id: String, definition: Dictionary) -> bool:
	var record: Dictionary = _records.get(id, {})
	var max_references: Variant = definition.get("max_references", null)
	if max_references != null and int(record.get("reference_count", 0)) >= int(max_references):
		return false

	var cooldown_days: int = definition.get("reference_cooldown_days", 0)
	if cooldown_days <= 0:
		return true
	var last_referenced: String = record.get("last_referenced_at", "")
	if last_referenced == "":
		return true
	var elapsed_seconds := Time.get_unix_time_from_system() - Time.get_unix_time_from_datetime_string(last_referenced)
	return (elapsed_seconds / 86400.0) >= cooldown_days


func _trigger_satisfied(trigger: Dictionary) -> bool:
	match trigger.get("type", ""):
		"story_flag":
			return Flags.get_flag(trigger.get("flag", ""), false) == true
		_:
			return false


func _load_definitions() -> void:
	var dir := DirAccess.open(MEMORY_DIR)
	if dir == null:
		return
	dir.list_dir_begin()
	var entry := dir.get_next()
	while entry != "":
		if entry.ends_with(".json"):
			var data := _read_json(MEMORY_DIR.path_join(entry))
			for item in data.get("memories", []):
				var id: String = item.get("id", "")
				if id != "":
					_definitions[id] = item
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
