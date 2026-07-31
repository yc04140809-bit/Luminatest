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


## RelationshipStage等の単一の「文脈」で言い回しを変えたい場合に使う。
## "<base_key>_<context>" が存在すればそれを、無ければ base_key へ
## 自動フォールバックする(体験設計書 第2.3節: 親密度と口調変化)。
## 個々のキーに全パターンを用意しなくても破綻しない。
func t_for_context(base_key: String, context: String) -> String:
	return t_for_contexts(base_key, [context])


## 複数の文脈候補を優先度順(先頭が最優先)に試す版。
## 例: t_for_contexts("home_battle_recap_win", [emotion, stage])
##     → まず "..._HAPPY" のようなEmotion別の言い回しを探し、
##       無ければ "..._family" のようなRelationshipStage別の言い回しを探し、
##       それも無ければ base_key へフォールバックする。
## Emotion Engine(game/emotion)とRelationshipStage(game/affection)の両方が
## この同じ仕組みを共有し、LocalizationManager自体はどちらの概念も知らない。
func t_for_contexts(base_key: String, contexts: Array) -> String:
	var table := _get_table(current_locale)
	var fallback_table: Dictionary = {}
	if current_locale != FALLBACK_LOCALE:
		fallback_table = _get_table(FALLBACK_LOCALE)

	for context in contexts:
		if context == null or String(context) == "":
			continue
		var staged_key := "%s_%s" % [base_key, context]
		if table.has(staged_key):
			return table[staged_key]
		if fallback_table.has(staged_key):
			return fallback_table[staged_key]

	return t(base_key)


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
