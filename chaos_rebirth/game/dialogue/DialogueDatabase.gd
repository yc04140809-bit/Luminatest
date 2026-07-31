extends Node

## Character Voice & Dialogue Database のgame層データアクセス+公開API(autoload)。
## 台詞は一切コードへ書かず、`game/data/dialogue/<character_id>/*.json` から
## 読み込む(フォルダにファイルを追加するだけでキャラ・カテゴリを拡張できる)。
## キャラクターごとに遅延ロード+キャッシュし、100キャラ以上に増えても起動時に
## 全員分を読み込まない(第11章CharacterDatabaseと同じ思想)。
##
## 判定・スコアリング本体は core/dialogue_engine の
## DialogueCondition / DialogueSelector(IP非依存の純粋ロジック)に委譲する。
##
## 責務分離: MemoryManager / AffectionManager / EmotionManagerを
## 直接呼び出すことはしない。文脈(context)の組み立てと「直近使用した台詞」の
## 受け渡しは、呼び出し元の画面(Home.gd等)が担う(Emotion Engineと同じ方針)。

const DIALOGUE_DIR := "res://game/data/dialogue"

var _entries_by_character: Dictionary = {}   # character_id -> Array[Dictionary]
var _loaded_characters: Dictionary = {}       # character_id -> true(読込済みフラグ)


## 指定キャラの全エントリ(生データ)。デバッグ・ツール用途向け。
func get_entries(character_id: String) -> Array:
	_ensure_loaded(character_id)
	return _entries_by_character.get(character_id, [])


## メインAPI。文脈(context)から最も自然な台詞を1つ選ぶ。
## DialogueSelectorの段階的フォールバックにより、該当データがある限り
## 必ず何か返す(is_valid()がfalseなのは、そのキャラのデータが1件も
## 存在しない場合のみ)。
## recent_ids: 直近使用したdialogue id一覧(重複防止、呼び出し元が供給)。
func pick_dialogue(character_id: String, context: Dictionary, recent_ids: Array = []) -> DialogueResult:
	_ensure_loaded(character_id)
	var entries: Array = _entries_by_character.get(character_id, [])
	var full_context: Dictionary = context.duplicate(true)
	full_context["character_id"] = character_id
	return DialogueSelector.select(entries, full_context, recent_ids)


func _ensure_loaded(character_id: String) -> void:
	if _loaded_characters.has(character_id):
		return
	_loaded_characters[character_id] = true
	_entries_by_character[character_id] = _load_character_entries(character_id)


func _load_character_entries(character_id: String) -> Array:
	var entries: Array = []
	var dir_path := DIALOGUE_DIR.path_join(character_id)
	var dir := DirAccess.open(dir_path)
	if dir == null:
		return entries
	dir.list_dir_begin()
	var file_name := dir.get_next()
	while file_name != "":
		if file_name.ends_with(".json"):
			var data := _read_json(dir_path.path_join(file_name))
			for item in data.get("dialogues", []):
				entries.append(item)
		file_name = dir.get_next()
	dir.list_dir_end()
	return entries


func _read_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var f := FileAccess.open(path, FileAccess.READ)
	var text := f.get_as_text()
	f.close()
	var result: Variant = JSON.parse_string(text)
	return result if result is Dictionary else {}
