extends SceneTree

## Phase1動作確認用のヘッドレス自動テスト。
## タイトル→会話シーン(JSON駆動)→選択肢→フラグ→セーブ/ロードの一連を
## 実機/エディタなしで検証する。
## 実行: godot --headless --script res://tools/smoke_test.gd
##
## --script実行時はautoloadがグローバル識別子として静的解決されないため、
## get_node("/root/<Name>") で明示的に参照する。

const TEST_SCENE := "res://game/data/story/episode0/ep0_000_test.json"

var _say_count := 0
var _choice_made := false
var _ok := true

var _flags: Node
var _save_manager: Node
var _localization: Node


func _initialize() -> void:
	_flags = root.get_node("Flags")
	_save_manager = root.get_node("SaveManager")
	_localization = root.get_node("LocalizationManager")

	_flags.reset()

	var engine := StoryEngine.new()
	engine.say_requested.connect(_on_say.bind(engine))
	engine.choice_requested.connect(_on_choice.bind(engine))
	engine.flag_changed.connect(func(flag, value): _flags.set_flag(flag, value))
	engine.scene_finished.connect(_on_scene_finished)

	engine.load_scene(TEST_SCENE)

	_assert(_say_count >= 3, "say_requested should fire at least 3 times, got %d" % _say_count)
	_assert(_choice_made, "choice should have been resolved")
	_assert(_flags.get_flag("met_kaosu", false) == true, "met_kaosu flag should be true after scene")

	_save_manager.save_game(0)
	_assert(_save_manager.has_save(0), "save file should exist after save_game(0)")

	_flags.reset()
	_save_manager.load_game(0)
	_assert(_flags.get_flag("met_kaosu", false) == true, "met_kaosu flag should survive save/load round trip")

	var resolved_text: String = _localization.t("ep0_000_line001")
	_assert(resolved_text != "" and not resolved_text.begins_with("["), "text_key should resolve via LocalizationManager, got '%s'" % resolved_text)

	if _ok:
		print("SMOKE_TEST_RESULT: PASS")
	else:
		print("SMOKE_TEST_RESULT: FAIL")
	quit(0 if _ok else 1)


func _on_say(_speaker_id: String, text_key: String, engine: StoryEngine) -> void:
	_say_count += 1
	print("SAY[%d] key=%s text=%s" % [_say_count, text_key, _localization.t(text_key)])
	# UIのタップ操作の代わりに即座に次へ進める(自動テストのため)
	engine.advance()


func _on_choice(options: Array, engine: StoryEngine) -> void:
	print("CHOICE options=%d" % options.size())
	_choice_made = true
	engine.choose(0)


func _on_scene_finished() -> void:
	print("SCENE_FINISHED")


func _assert(condition: bool, message: String) -> void:
	if not condition:
		_ok = false
		printerr("ASSERT FAILED: %s" % message)
