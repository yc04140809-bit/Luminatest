class_name StoryEngine
extends RefCounted

## JSON駆動の会話・ノベルパート再生エンジン(core層/IP非依存)
## game層はシグナルを購読するだけで、シーンJSONの内容には関知しない。

signal background_changed(bg_id: String)
signal bgm_requested(bgm_id: String, fade_sec: float)
signal se_requested(se_id: String)
signal character_entered(id: String, position: String, expression: String)
signal character_exited(id: String)
signal character_expression_changed(id: String, expression: String)
signal say_requested(speaker_id: String, text_key: String)
signal memory_say_requested(speaker_id: String)
signal choice_requested(options: Array)
signal flag_changed(flag: String, value: Variant)
signal scene_finished()

var _commands: Array = []
var _index: int = -1
var _base_dir: String = ""
var _waiting_for_advance: bool = false
var _waiting_for_choice: bool = false


func load_scene(json_path: String) -> void:
	_base_dir = json_path.get_base_dir()
	var text := FileAccess.get_file_as_string(json_path)
	var parsed: Variant = JSON.parse_string(text)
	if not (parsed is Dictionary):
		push_error("StoryEngine: invalid scene json: %s" % json_path)
		scene_finished.emit()
		return
	_commands = parsed.get("commands", [])
	_index = -1
	_waiting_for_advance = false
	_waiting_for_choice = false
	_advance()


## テキスト送り待ちのときに呼ぶ(タップ操作)
func advance() -> void:
	if _waiting_for_advance:
		_waiting_for_advance = false
		_advance()


## 選択肢が表示されているときに呼ぶ
func choose(option_index: int) -> void:
	if not _waiting_for_choice:
		return
	_waiting_for_choice = false
	var options: Array = _commands[_index].get("options", [])
	if option_index < 0 or option_index >= options.size():
		_advance()
		return
	var goto_target: String = options[option_index].get("goto", "")
	if goto_target != "":
		load_scene(_base_dir.path_join(goto_target + ".json"))
	else:
		_advance()


func _advance() -> void:
	_index += 1
	if _index >= _commands.size():
		scene_finished.emit()
		return
	_execute(_commands[_index])


func _execute(cmd: Dictionary) -> void:
	match cmd.get("type", ""):
		"background":
			background_changed.emit(cmd.get("value", ""))
			_advance()
		"bgm":
			bgm_requested.emit(cmd.get("value", ""), cmd.get("fade_sec", 0.0))
			_advance()
		"se":
			se_requested.emit(cmd.get("value", ""))
			_advance()
		"character_enter":
			character_entered.emit(cmd.get("id", ""), cmd.get("position", "center"), cmd.get("expression", "normal"))
			_advance()
		"character_exit":
			character_exited.emit(cmd.get("id", ""))
			_advance()
		"expression_change":
			character_expression_changed.emit(cmd.get("id", ""), cmd.get("expression", "normal"))
			_advance()
		"say", "narration":
			_waiting_for_advance = true
			say_requested.emit(cmd.get("speaker", ""), cmd.get("text_key", ""))
		"say_memory":
			# Memory Systemから「今言えること」を1つ取り出して話す(game層のMemoryManagerが
			# text_keyを解決する。何も無ければgame層が自動で読み飛ばす)。
			_waiting_for_advance = true
			memory_say_requested.emit(cmd.get("speaker", ""))
		"choice":
			_waiting_for_choice = true
			choice_requested.emit(cmd.get("options", []))
		"set_flag":
			flag_changed.emit(cmd.get("flag", ""), cmd.get("value", null))
			_advance()
		"jump":
			load_scene(_base_dir.path_join(cmd.get("target", "") + ".json"))
		"wait":
			_advance()
		_:
			push_warning("StoryEngine: unknown command type '%s'" % cmd.get("type", ""))
			_advance()
