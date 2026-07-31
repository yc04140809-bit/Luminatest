extends Node

## テキストキー方式のローカライズ基盤(core層/IP非依存)
## game/localization/<locale>/ 以下のJSONを再帰的に読み込み、key -> text で解決する。
## 未翻訳キーは "ja" にフォールバックする。

const LOCALIZATION_ROOT := "res://game/localization"
const FALLBACK_LOCALE := "ja"

var current_locale: String = FALLBACK_LOCALE

var _cache_by_locale: Dictionary = {}


func t(key: String) -> String:
	if key == "":
		return ""
	var table := _get_table(current_locale)
	if table.has(key):
		return table[key]
	if current_locale != FALLBACK_LOCALE:
		var fallback_table := _get_table(FALLBACK_LOCALE)
		if fallback_table.has(key):
			return fallback_table[key]
	return "[%s]" % key


func set_locale(locale: String) -> void:
	current_locale = locale


func _get_table(locale: String) -> Dictionary:
	if not _cache_by_locale.has(locale):
		var table := {}
		_load_dir(LOCALIZATION_ROOT.path_join(locale), table)
		_cache_by_locale[locale] = table
	return _cache_by_locale[locale]


func _load_dir(path: String, table: Dictionary) -> void:
	var dir := DirAccess.open(path)
	if dir == null:
		return
	dir.list_dir_begin()
	var entry := dir.get_next()
	while entry != "":
		if not entry.begins_with("."):
			var full_path := path.path_join(entry)
			if dir.current_is_dir():
				_load_dir(full_path, table)
			elif entry.ends_with(".json"):
				_merge_json(full_path, table)
		entry = dir.get_next()
	dir.list_dir_end()


func _merge_json(path: String, table: Dictionary) -> void:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return
	var text := f.get_as_text()
	f.close()
	var data: Variant = JSON.parse_string(text)
	if data is Dictionary:
		for key in data.keys():
			table[key] = data[key]
