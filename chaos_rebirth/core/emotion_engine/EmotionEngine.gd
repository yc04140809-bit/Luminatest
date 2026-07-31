class_name EmotionEngine
extends RefCounted

## Emotion決定の純粋ロジック(core層/IP非依存)。
## 「ケイオスちゃん」等の固有知識は一切持たず、候補(candidates)から
## 優先度最大のものを選ぶことと、持続時間の経過判定だけを行う。
## Memory System / RelationshipStage(Affection)固有の実装には関知しない
## (game層のEmotionManagerがそれぞれから候補を集めてここへ渡す)。

## candidates: Array[Dictionary]、各要素は { emotion: String, priority: int, duration_sec: float }
## 最も優先度の高い候補を返す。空ならdefault_emotionを優先度0で返す。
static func resolve(candidates: Array, default_emotion: String = "NORMAL") -> Dictionary:
	if candidates.is_empty():
		return { "emotion": default_emotion, "priority": 0, "duration_sec": 0.0 }
	var best: Dictionary = candidates[0]
	for candidate in candidates:
		if int(candidate.get("priority", 0)) > int(best.get("priority", 0)):
			best = candidate
	return best


## 経過時間(秒)が持続時間を超えていれば true(=NORMAL等へ戻すべき)。
## duration_secが0以下は「常時無効」とみなし、常にtrueを返す。
static func has_expired(elapsed_seconds: float, duration_seconds: float) -> bool:
	if duration_seconds <= 0.0:
		return true
	return elapsed_seconds >= duration_seconds
