extends Node

## Memory System(第3章)のgame層実装。Memory定義はJSON外部管理とし、
## 発生条件を満たしたら記録し、Homeの挨拶や会話から自然に呼び戻す。
##
## 会話側から呼び出す公開API(整理版):
##   check_and_record()          … 未記録Memoryの発生判定(Home訪問時・戦闘後等に呼ぶ)
##   record_login()               … ログイン記録(連続ログイン/久しぶり判定の土台)
##   pick_reaction_text_key()     … 「今なにを話すか」を1つ選ぶ(Home挨拶にもStoryEngineの
##                                   say_memoryコマンドにも共通で使う唯一の入口)
##   get_last_referenced_id()     … 直近参照したMemoryID(「前回話題」の参照に使う)
##
## トリガー種別: story_flag / login_streak / absence_return / date_special

const MEMORY_DIR := "res://game/data/memory"
const RECENT_TAGS_WINDOW := 3

var _definitions: Dictionary = {}   # id -> definition dict
var _records: Dictionary = {}       # id -> { occurred_at, reference_count, last_referenced_at }
var _recent_tags: Array = []
var _last_picked_emotion_bias: Dictionary = {}

## ログイン記録(連続ログイン/久しぶり/記念日判定に使う)
var _attendance: Dictionary = { "first_login_date": "", "last_login_date": "", "streak": 0 }
var _last_gap_days: int = 0
var _today_override: String = ""  # テスト用: 実時刻の代わりに使う日付("YYYY-MM-DD")


func _ready() -> void:
	_load_definitions()


## テスト専用: 実際の日付の代わりに使う日付を注入する。空文字で実時刻に戻す。
func set_today_override(date: String) -> void:
	_today_override = date


## 未記録のMemoryのうち、発生条件を満たしたものを記録する。
## Home訪問時・会話終了時・戦闘終了時等、状態が変わったタイミングで呼ぶ。
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


## ログインを記録する(1日1回のみ加算)。連続ログイン日数・前回ログインからの
## 経過日数(久しぶり判定用)・初回ログイン日(記念日判定用)を更新する。
func record_login() -> void:
	var today := _today_string()
	if _attendance.get("first_login_date", "") == "":
		_attendance["first_login_date"] = today

	var last: String = _attendance.get("last_login_date", "")
	if last == today:
		_last_gap_days = 0
		return

	if last == "":
		_last_gap_days = 0
		_attendance["streak"] = 1
	else:
		var gap := _days_between(last, today)
		_last_gap_days = gap
		if gap == 1:
			_attendance["streak"] = int(_attendance.get("streak", 0)) + 1
		else:
			_attendance["streak"] = 1
	_attendance["last_login_date"] = today


func get_login_streak() -> int:
	return int(_attendance.get("streak", 0))


## 直近のrecord_login()で判明した「前回ログインからの経過日数」。同日内なら0。
func get_last_login_gap_days() -> int:
	return _last_gap_days


## 今この瞬間に話すのにふさわしいMemoryを1つ選び、text_keyを返す。
## Home挨拶・StoryEngineのsay_memoryコマンド、双方の共通入口。
## 該当なしの場合は空文字を返す(無理に何か言わせない)。
func pick_reaction_text_key() -> String:
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
		_last_picked_emotion_bias = {}
		return ""

	var id: String = chosen["id"]
	_records[id]["reference_count"] = int(_records[id].get("reference_count", 0)) + 1
	_records[id]["last_referenced_at"] = Time.get_datetime_string_from_system()

	_recent_tags.append_array(chosen.get("tags", []))
	while _recent_tags.size() > RECENT_TAGS_WINDOW:
		_recent_tags.pop_front()

	# Emotion Engine連携用。MemoryManagerはEmotionManagerを一切呼び出さない
	# (責務分離)。「今選ばれたMemoryにemotion_biasが付いているか」を
	# 問い合わせられるようにするだけで、実際にEmotionManagerへ渡すかどうかは
	# 呼び出し元(Home.gd等)の判断に委ねる。
	_last_picked_emotion_bias = _definitions.get(id, {}).get("emotion_bias", {})

	return chosen.get("text_key", "")


## 直近の pick_reaction_text_key() で選ばれたMemoryのemotion_bias
## (無ければ空Dictionary)。Emotion Engineへ橋渡しする際に使う。
func get_last_picked_emotion_bias() -> Dictionary:
	return _last_picked_emotion_bias.duplicate(true)


## 「前回話題」用: 直近で実際に参照されたMemoryのID(無ければ空文字)。
func get_last_referenced_id() -> String:
	var latest_id := ""
	var latest_time := ""
	for id in _records.keys():
		var referenced_at: String = _records[id].get("last_referenced_at", "")
		if referenced_at != "" and referenced_at > latest_time:
			latest_time = referenced_at
			latest_id = id
	return latest_id


func is_recorded(id: String) -> bool:
	return _records.has(id)


func get_recorded_ids() -> Array:
	return _records.keys()


func get_state() -> Dictionary:
	return {
		"schema_version": 1,
		"records": _records.duplicate(true),
		"attendance": _attendance.duplicate(true),
	}


func load_state(data: Dictionary) -> void:
	_records = data.get("records", {}).duplicate(true)
	_attendance = data.get("attendance", { "first_login_date": "", "last_login_date": "", "streak": 0 }).duplicate(true)
	_recent_tags.clear()
	_last_gap_days = 0


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
		"login_streak":
			return get_login_streak() >= int(trigger.get("days", 1))
		"absence_return":
			return _last_gap_days >= int(trigger.get("min_days", 1))
		"date_special":
			return _date_special_satisfied(trigger)
		_:
			return false


func _date_special_satisfied(trigger: Dictionary) -> bool:
	match trigger.get("kind", ""):
		"anniversary":
			var first: String = _attendance.get("first_login_date", "")
			if first == "":
				return false
			var days := _days_between(first, _today_string())
			var unit: String = trigger.get("unit", "day")
			var count: int = int(trigger.get("count", 1))
			match unit:
				"day":
					return days >= count
				"month":
					return days >= count * 30
				"year":
					return days >= count * 365
				_:
					return false
		"birthday":
			# ケイオスちゃんの誕生日は本編で明かされる伏線のため現時点ではデータ未設定。
			# トリガーの型だけ用意しておき、判明した時点でMemoryデータに日付を追加すればよい。
			var target: String = trigger.get("date", "")
			if target == "":
				return false
			return _today_string().substr(5, 5) == target
		_:
			return false


func _today_string() -> String:
	if _today_override != "":
		return _today_override
	var d := Time.get_datetime_dict_from_system()
	return "%04d-%02d-%02d" % [d.year, d.month, d.day]


func _days_between(date_a: String, date_b: String) -> int:
	var unix_a := Time.get_unix_time_from_datetime_string(date_a + "T00:00:00")
	var unix_b := Time.get_unix_time_from_datetime_string(date_b + "T00:00:00")
	return int(round((unix_b - unix_a) / 86400.0))


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
