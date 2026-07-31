class_name DialogueResult
extends RefCounted

## Dialogue選定の結果を表す値オブジェクト(core層/IP非依存)。
## DialogueSelectorの戻り値としてのみ生成される。

var entry_id: String = ""
var text_key: String = ""
var score: float = 0.0
## どの段階のフォールバックで見つかったか("full"/"core_context"/"relationship_only"/"any"/"")。
## 空文字は「該当データが1件も無かった」ことを示す(is_valid()がfalseになる)。
var fallback_tier: String = ""
var matched_conditions: Dictionary = {}


func _init(
	p_entry_id: String = "",
	p_text_key: String = "",
	p_score: float = 0.0,
	p_fallback_tier: String = "",
	p_matched_conditions: Dictionary = {}
) -> void:
	entry_id = p_entry_id
	text_key = p_text_key
	score = p_score
	fallback_tier = p_fallback_tier
	matched_conditions = p_matched_conditions


func is_valid() -> bool:
	return entry_id != "" and text_key != ""
