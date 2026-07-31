class_name GalleryUnlockEvaluator
extends RefCounted

## ギャラリー要素(キャラ/立ち絵/CG/衣装等)の解放条件判定(core層/IP非依存)。
## Flags/Inventory/PartyManager等の実データには一切触れず、game層が注入する
## Callableを通じてのみ判定する(第16章の依存方向ルールに従う)。

var has_story_flag: Callable      # func(flag: String) -> bool
var has_cleared_event: Callable   # func(event_id: String) -> bool
var has_party_member: Callable    # func(character_id: String) -> bool
var has_item: Callable            # func(item_id: String) -> bool


## conditions が空配列の場合は「常に解放済み」として扱う。
## logic: "any"(いずれか1つ満たせば解放/デフォルト) または "all"(すべて満たして解放)
func is_unlocked(conditions: Array, logic: String = "any") -> bool:
	if conditions.is_empty():
		return true
	for condition in conditions:
		var result := _check(condition)
		if logic == "all" and not result:
			return false
		if logic != "all" and result:
			return true
	return logic == "all"


func _check(condition: Dictionary) -> bool:
	match condition.get("type", ""):
		"story_flag":
			return _call(has_story_flag, condition.get("flag", ""))
		"event_clear":
			return _call(has_cleared_event, condition.get("event_id", ""))
		"party_join":
			return _call(has_party_member, condition.get("character_id", ""))
		"item_owned":
			return _call(has_item, condition.get("item_id", ""))
		_:
			return false


func _call(callable: Callable, arg: String) -> bool:
	if not callable.is_valid():
		return false
	return callable.call(arg)
