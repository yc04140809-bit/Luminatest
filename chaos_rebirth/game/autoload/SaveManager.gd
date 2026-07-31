extends Node

## セーブ/ロード制御(第14章: モジュール分割セーブの土台)
## Phase1時点では story_progress のみ。他モジュールはPhase2以降で追加する。

const SAVE_DIR_FORMAT := "user://saves/slot_%d/"
const SCHEMA_VERSION := 1


func has_save(slot: int) -> bool:
	return FileAccess.file_exists(_dir(slot) + "meta.json")


func save_game(slot: int) -> void:
	var dir_path := _dir(slot)
	DirAccess.make_dir_recursive_absolute(dir_path)
	_write_json(dir_path + "meta.json", {
		"schema_version": SCHEMA_VERSION,
		"saved_at": Time.get_datetime_string_from_system(),
	})
	_write_json(dir_path + "story_progress.json", {
		"schema_version": SCHEMA_VERSION,
		"story_flags": Flags.get_all(),
	})


func load_game(slot: int) -> void:
	var dir_path := _dir(slot)
	var progress := _read_json(dir_path + "story_progress.json")
	Flags.set_all(progress.get("story_flags", {}))


func _dir(slot: int) -> String:
	return SAVE_DIR_FORMAT % slot


func _write_json(path: String, data: Dictionary) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		push_error("SaveManager: failed to open %s for write" % path)
		return
	f.store_string(JSON.stringify(data, "  "))
	f.close()


func _read_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var f := FileAccess.open(path, FileAccess.READ)
	var text := f.get_as_text()
	f.close()
	var result: Variant = JSON.parse_string(text)
	return result if result is Dictionary else {}
