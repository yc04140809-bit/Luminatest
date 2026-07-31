class_name MemorySelector
extends RefCounted

## 記録済みMemoryから「今どれを話すか」を選ぶ汎用ロジック(core層/IP非依存)。
## Memoryの中身(text_keyが何を意味するか等)には一切関知しない。
## PROJECT_BIBLE「ゲームはデータを保存するのではない。思い出を保存する。」を
## 実現するための選定ロジックであり、同じ話ばかりにならないよう
## 重要度・新鮮さ(参照回数)・直近のタグ多様性でスコアリングする。

## candidates: Array[Dictionary] 各要素は次のキーを持つ想定
##   importance: int, reference_count: int, tags: Array
static func select(candidates: Array, recent_tags: Array = [], rng: RandomNumberGenerator = null) -> Dictionary:
	if candidates.is_empty():
		return {}
	if rng == null:
		rng = RandomNumberGenerator.new()
		rng.randomize()

	var best: Dictionary = {}
	var best_score: float = -INF
	for candidate in candidates:
		var score := _score(candidate, recent_tags, rng)
		if score > best_score:
			best_score = score
			best = candidate
	return best


static func _score(candidate: Dictionary, recent_tags: Array, rng: RandomNumberGenerator) -> float:
	var importance: float = float(candidate.get("importance", 1))
	var reference_count: int = candidate.get("reference_count", 0)
	var freshness: float = 1.0 / float(reference_count + 1)

	var diversity: float = 1.0
	for tag in candidate.get("tags", []):
		if recent_tags.has(tag):
			diversity *= 0.5

	var jitter: float = rng.randf_range(0.0, 0.2)
	return importance * freshness * diversity + jitter
