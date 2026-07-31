class_name DialogueSelector
extends RefCounted

## 複数条件(Memory/Emotion/RelationshipStage/Story進行/時間/場所等)から
## 「今この瞬間に最も自然な台詞」を選ぶ純粋ロジック(core層/IP非依存)。
## Dialogueの中身(text_key)には一切関知しない。
##
## Fallback: 該当が無ければ段階的に必須項目を緩め、character_idの候補が
## 1件でもあれば必ず何か返す(PROJECT_BIBLE「必ず何か返す」)。
## 重み付け: Priority + Condition一致率 + Emotion一致 + Relationship一致 +
## Memory重要度 - 直近使用ペナルティ + 僅かなジッター。

const RECENCY_PENALTY := 30.0
const EMOTION_MATCH_BONUS := 15.0
const RELATIONSHIP_MATCH_BONUS := 10.0
const MATCH_RATE_WEIGHT := 40.0
const MEMORY_IMPORTANCE_WEIGHT := 2.0
const JITTER_MAX := 2.0

## 段階的に必須項目を緩めていくフォールバック順序。
const FALLBACK_TIERS := [
	{ "name": "full", "required_fields": [
		"relationship_stage", "emotion", "time_of_day", "season",
		"weather", "story_chapter", "location", "login_type",
		"battle_result", "event_type",
	] },
	{ "name": "core_context", "required_fields": ["relationship_stage", "emotion", "time_of_day", "location"] },
	{ "name": "relationship_only", "required_fields": ["relationship_stage"] },
	{ "name": "any", "required_fields": [] },
]


## entries: DialogueDatabaseが読み込んだ、対象character_id分の候補すべて。
## context: 現在の状況("character_id"を含む)。
## recent_ids: 直近使用したdialogue id(重複防止)。
static func select(entries: Array, context: Dictionary, recent_ids: Array = [], rng: RandomNumberGenerator = null) -> DialogueResult:
	if rng == null:
		rng = RandomNumberGenerator.new()
		rng.randomize()

	for tier in FALLBACK_TIERS:
		var eligible: Array = []
		for entry in entries:
			if DialogueCondition.is_eligible(entry, context, tier["required_fields"]):
				eligible.append(entry)
		if not eligible.is_empty():
			return _pick_best(eligible, context, recent_ids, String(tier["name"]), rng)

	return DialogueResult.new()  # 該当キャラのデータが1件も無い(データ未整備)


static func _pick_best(eligible: Array, context: Dictionary, recent_ids: Array, tier_name: String, rng: RandomNumberGenerator) -> DialogueResult:
	var best: Dictionary = {}
	var best_score: float = -INF

	for entry in eligible:
		var score := _score(entry, context, recent_ids, rng)
		if score > best_score:
			best_score = score
			best = entry

	return DialogueResult.new(
		String(best.get("id", "")),
		String(best.get("text_key", "")),
		best_score,
		tier_name,
		best.get("conditions", {})
	)


static func _score(entry: Dictionary, context: Dictionary, recent_ids: Array, rng: RandomNumberGenerator) -> float:
	var score: float = float(entry.get("priority", 0))
	score += DialogueCondition.match_rate(entry, context) * MATCH_RATE_WEIGHT

	if DialogueCondition.emotion_matches(entry, context):
		score += EMOTION_MATCH_BONUS
	if DialogueCondition.relationship_matches(entry, context):
		score += RELATIONSHIP_MATCH_BONUS

	var memory_flags: Array = DialogueCondition.get_memory_flags(entry)
	if not memory_flags.is_empty():
		var importance_map: Dictionary = context.get("memory_importance_by_id", {})
		var total_importance := 0.0
		for flag in memory_flags:
			total_importance += float(importance_map.get(flag, 0))
		score += (total_importance / memory_flags.size()) * MEMORY_IMPORTANCE_WEIGHT

	var recency_hits := 0
	var entry_id: String = String(entry.get("id", ""))
	for used_id in recent_ids:
		if used_id == entry_id:
			recency_hits += 1
	score -= recency_hits * RECENCY_PENALTY

	score += rng.randf_range(0.0, JITTER_MAX)
	return score
