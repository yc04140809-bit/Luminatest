class_name AffectionEvaluator
extends RefCounted

## 親密度ポイント→レベル→RelationshipStageの変換ロジック(core層/IP非依存)。
## PROJECT_BIBLE: 関係性は生の数値ではなく RelationshipStage(文字列)として
## 扱う。挙動制御(口調・表情・距離感等)は必ずこのStage経由で行い、
## 呼び出し側がポイント数を直接見て分岐することを禁止する設計とする。

## levels: [{ "level": int, "required_points": int }, ...] (points昇順を想定)
static func compute_level(points: int, levels: Array) -> int:
	var current_level := 1
	for entry in levels:
		if points >= int(entry.get("required_points", 0)):
			current_level = int(entry.get("level", current_level))
	return current_level


## stages: [{ "stage": String, "min_level": int, ... }, ...] (min_level昇順を想定)
static func compute_stage(level: int, stages: Array) -> String:
	var current_stage := ""
	for entry in stages:
		if level >= int(entry.get("min_level", 1)):
			current_stage = String(entry.get("stage", current_stage))
	return current_stage


## 該当ステージの定義データ全体(smile_bias等の付随パラメータ込み)を返す。
static func compute_stage_data(level: int, stages: Array) -> Dictionary:
	var result: Dictionary = {}
	for entry in stages:
		if level >= int(entry.get("min_level", 1)):
			result = entry
	return result
