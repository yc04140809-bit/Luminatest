class_name DialogueCondition
extends RefCounted

## Dialogueエントリの条件(conditions)とcontext(現在の状況)の一致判定(core層/IP非依存)。
## 「必須項目(段階に応じて緩められる)」と「常に必須の項目」を分離し、
## DialogueSelectorが段階的フォールバックで「どこまで必須とみなすか」を
## 差し替えられるようにする。
##
## 対応する条件フィールド(最低対応):
##   character_id(常に必須) / relationship_stage / emotion / time_of_day /
##   season / weather / story_chapter / location / memory_flags(常に必須) /
##   login_type / battle_result / event_type / affection_min_level・
##   affection_max_level(常に必須、AffectionRange)
## priorityは条件一致ではなくDialogueSelectorのスコアリングで直接使う。

## スコアリング(段階的に緩められる)対象のフィールド一覧。
const SCORED_FIELDS := [
	"relationship_stage", "emotion", "time_of_day", "season",
	"weather", "story_chapter", "location", "login_type",
	"battle_result", "event_type",
]


## エントリがcontextの下で「候補として成立するか」を判定する。
## character_id / affection_range / memory_flags は常に必須(緩められない)。
## required_fields に含まれるフィールドのみ、エントリが指定していれば
## contextと厳密一致を要求する(指定していないフィールドは常にワイルドカード)。
static func is_eligible(entry: Dictionary, context: Dictionary, required_fields: Array) -> bool:
	if String(entry.get("character_id", "")) != String(context.get("character_id", "")):
		return false
	if not _affection_in_range(entry, context):
		return false
	if not _memory_flags_satisfied(entry, context):
		return false

	var conditions: Dictionary = entry.get("conditions", {})
	for field in required_fields:
		if conditions.has(field):
			if not context.has(field) or conditions[field] != context[field]:
				return false
	return true


## SCORED_FIELDS全体のうち、エントリが指定した項目のどれだけがcontextと
## 一致したかを 0.0〜1.0 で返す。何も指定していないエントリは0.5(中立)。
static func match_rate(entry: Dictionary, context: Dictionary) -> float:
	var conditions: Dictionary = entry.get("conditions", {})
	var specified := 0
	var matched := 0
	for field in SCORED_FIELDS:
		if conditions.has(field):
			specified += 1
			if context.has(field) and conditions[field] == context[field]:
				matched += 1
	if specified == 0:
		return 0.5
	return float(matched) / float(specified)


static func emotion_matches(entry: Dictionary, context: Dictionary) -> bool:
	var conditions: Dictionary = entry.get("conditions", {})
	return conditions.has("emotion") and context.has("emotion") and conditions["emotion"] == context["emotion"]


static func relationship_matches(entry: Dictionary, context: Dictionary) -> bool:
	var conditions: Dictionary = entry.get("conditions", {})
	return conditions.has("relationship_stage") and context.has("relationship_stage") \
		and conditions["relationship_stage"] == context["relationship_stage"]


static func get_memory_flags(entry: Dictionary) -> Array:
	return entry.get("conditions", {}).get("memory_flags", [])


static func _affection_in_range(entry: Dictionary, context: Dictionary) -> bool:
	var conditions: Dictionary = entry.get("conditions", {})
	if not conditions.has("affection_min_level") and not conditions.has("affection_max_level"):
		return true
	var level: int = int(context.get("affection_level", 0))
	var min_level: int = int(conditions.get("affection_min_level", -2147483648))
	var max_level: int = int(conditions.get("affection_max_level", 2147483647))
	return level >= min_level and level <= max_level


static func _memory_flags_satisfied(entry: Dictionary, context: Dictionary) -> bool:
	var required: Array = get_memory_flags(entry)
	if required.is_empty():
		return true
	var recorded: Array = context.get("recorded_memory_ids", [])
	for flag in required:
		if not recorded.has(flag):
			return false
	return true
