extends Node

## ギャラリーのデータ読み込み・検索・解放判定(game層)
## core/gallery_engine の GalleryUnlockEvaluator に、Flags等の実データ参照を
## Callableとして注入する(coreはgame層のクラスを一切知らない)。

const CATEGORIES_PATH := "res://game/data/gallery/gallery_categories.json"
const GALLERY_DIR := "res://game/data/gallery"
const CHARACTERS_DIR := "res://game/data/characters"

var _categories: Array = []
var _character_galleries: Dictionary = {}   # character_id -> raw gallery dict
var _character_master: Dictionary = {}      # character_id -> raw character master dict
var _evaluator: GalleryUnlockEvaluator


func _ready() -> void:
	_evaluator = GalleryUnlockEvaluator.new()
	_evaluator.has_story_flag = Callable(self, "_has_story_flag")
	_evaluator.has_cleared_event = Callable(self, "_has_cleared_event")
	_evaluator.has_party_member = Callable(self, "_has_party_member")
	_evaluator.has_item = Callable(self, "_has_item")

	_load_categories()
	_load_character_galleries()
	_load_character_master()


func get_categories() -> Array:
	return _categories


func get_character_ids() -> Array:
	return _character_galleries.keys()


func get_character_profile(character_id: String) -> Dictionary:
	var gallery: Dictionary = _character_galleries.get(character_id, {})
	return gallery.get("profile", {})


func get_character_skill_ids(character_id: String) -> Array:
	return _character_master.get(character_id, {}).get("skill_ids", [])


func is_character_unlocked(character_id: String) -> bool:
	var profile := get_character_profile(character_id)
	return _evaluator.is_unlocked(profile.get("unlock_conditions", []), profile.get("unlock_logic", "any"))


func get_character_summary(character_id: String) -> Dictionary:
	var profile := get_character_profile(character_id)
	return {
		"character_id": character_id,
		"name_key": profile.get("name_key", ""),
		"affiliation_key": profile.get("affiliation_key", ""),
		"element": profile.get("element", ""),
		"rarity": profile.get("rarity", 0),
		"unlocked": is_character_unlocked(character_id),
		"full_body_art": profile.get("full_body_art", ""),
	}


## filter keys: name(String), element(String), affiliation_key(String),
##              rarity(int), acquired_only(bool), unacquired_only(bool)
func get_character_summaries(filter: Dictionary = {}) -> Array:
	var results: Array = []
	for character_id in _character_galleries.keys():
		var summary := get_character_summary(character_id)
		if _passes_filter(summary, filter):
			results.append(summary)
	return results


## category_id: "standing_art" | "expressions" | "event_cg" | "costumes" | "weapons"
## character_id を空にすると全キャラクター横断で取得する。
func get_category_entries(category_id: String, character_id: String = "") -> Array:
	var results: Array = []
	var character_ids: Array = [character_id] if character_id != "" else _character_galleries.keys()
	for cid in character_ids:
		var gallery: Dictionary = _character_galleries.get(cid, {})
		var entries: Array = gallery.get(category_id, [])
		for entry in entries:
			var unlocked := _evaluator.is_unlocked(entry.get("unlock_conditions", []), entry.get("unlock_logic", "any"))
			results.append({
				"id": entry.get("id", ""),
				"character_id": cid,
				"image": entry.get("image", ""),
				"thumbnail": entry.get("thumbnail", entry.get("image", "")),
				"unlocked": unlocked,
			})
	return results


func _passes_filter(summary: Dictionary, filter: Dictionary) -> bool:
	if filter.get("name", "") != "":
		var query: String = filter["name"]
		var name_text: String = LocalizationManager.t(summary["name_key"])
		if name_text.findn(query) == -1:
			return false
	if filter.get("element", "") != "" and summary["element"] != filter["element"]:
		return false
	if filter.get("affiliation_key", "") != "" and summary["affiliation_key"] != filter["affiliation_key"]:
		return false
	if filter.get("rarity", 0) != 0 and summary["rarity"] != filter["rarity"]:
		return false
	if filter.get("acquired_only", false) and not summary["unlocked"]:
		return false
	if filter.get("unacquired_only", false) and summary["unlocked"]:
		return false
	return true


func _load_categories() -> void:
	_categories = _read_json(CATEGORIES_PATH).get("categories", [])


func _load_character_galleries() -> void:
	var dir := DirAccess.open(GALLERY_DIR)
	if dir == null:
		return
	dir.list_dir_begin()
	var entry := dir.get_next()
	while entry != "":
		if entry.ends_with("_gallery.json"):
			var data := _read_json(GALLERY_DIR.path_join(entry))
			var character_id: String = data.get("character_id", "")
			if character_id != "":
				_character_galleries[character_id] = data
		entry = dir.get_next()
	dir.list_dir_end()


func _load_character_master() -> void:
	var dir := DirAccess.open(CHARACTERS_DIR)
	if dir == null:
		return
	dir.list_dir_begin()
	var entry := dir.get_next()
	while entry != "":
		if entry.ends_with(".json") and entry != "character_index.json":
			var data := _read_json(CHARACTERS_DIR.path_join(entry))
			var character_id: String = data.get("id", "")
			if character_id != "":
				_character_master[character_id] = data
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


# --- 解放条件コンテキスト ---
# Phase1時点ではFlagsの規約キーで代替する。Phase2以降でInventory/PartyManager/
# EventManagerが実装され次第、ここだけを差し替えればcore側は変更不要。

func _has_story_flag(flag: String) -> bool:
	return Flags.get_flag(flag, false) == true


func _has_cleared_event(event_id: String) -> bool:
	return Flags.get_flag("event_clear_%s" % event_id, false) == true


func _has_party_member(character_id: String) -> bool:
	return Flags.get_flag("party_member_%s" % character_id, false) == true


func _has_item(item_id: String) -> bool:
	return Flags.get_flag("item_owned_%s" % item_id, false) == true
