extends SceneTree

## Title.tscn / StoryPlayer.tscn の実シーンを読み込み、
## ノード参照(@onready)やシーン遷移(GameManager)にエラーが出ないかを確認する。
## 実行: godot --headless --script res://tools/ui_smoke_test.gd

var _frames := 0
var _did_start := false
var _did_finish := false


func _initialize() -> void:
	var title_scene: PackedScene = load("res://game/scenes/title/Title.tscn")
	var title: Control = title_scene.instantiate()
	root.add_child(title)
	current_scene = title


func _process(_delta: float) -> bool:
	_frames += 1

	if _frames == 2 and not _did_start:
		_did_start = true
		var start_button: Button = current_scene.get_node("VBox/StartButton")
		print("Title loaded. start_button.text=%s" % start_button.text)
		start_button.pressed.emit()

	if _frames == 4 and not _did_finish:
		var story_player := current_scene
		if story_player.name == "StoryPlayer":
			print("StoryPlayer loaded. class ok, dialogue_box visible=%s" % story_player.get_node("DialogueBox").visible)
			_did_finish = true
		else:
			printerr("ASSERT FAILED: expected StoryPlayer as current_scene, got %s" % story_player.name)
			quit(1)
			return true

	if _frames >= 6:
		if _did_finish:
			print("UI_SMOKE_TEST_RESULT: PASS")
			quit(0)
		else:
			printerr("ASSERT FAILED: did not reach StoryPlayer scene")
			print("UI_SMOKE_TEST_RESULT: FAIL")
			quit(1)
		return true

	return false
