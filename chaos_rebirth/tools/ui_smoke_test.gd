extends SceneTree

## Title.tscn / StoryPlayer.tscn の実シーンを読み込み、
## ノード参照(@onready)やシーン遷移(GameManager)にエラーが出ないかを確認する。
## 実行: godot --headless --script res://tools/ui_smoke_test.gd
##
## GameManagerのシーン遷移はSceneFader(Golden Slice Review改善)で
## フェードするため実時間がかかる。固定フレーム数ではなくポーリングで待つ。

const TIMEOUT_FRAMES := 300
const GRACE_FRAMES := 90  # SceneFaderのfade_in(0.45s)が完了するまでの猶予

var _frames := 0
var _did_start := false
var _did_finish := false
var _finish_frame := -1


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

	if not _did_finish and current_scene != null and current_scene.name == "StoryPlayer":
		_did_finish = true
		_finish_frame = _frames
		print("StoryPlayer loaded. class ok, dialogue_box visible=%s" % current_scene.get_node("DialogueBox").visible)

	# 成功後もqueue_free()やSceneFaderのtweenが片付く猶予を数フレーム置いてから終了する。
	if _did_finish and _frames >= _finish_frame + GRACE_FRAMES:
		print("UI_SMOKE_TEST_RESULT: PASS")
		quit(0)
		return true

	if _frames >= TIMEOUT_FRAMES:
		printerr("ASSERT FAILED: did not reach StoryPlayer scene within %d frames" % TIMEOUT_FRAMES)
		print("UI_SMOKE_TEST_RESULT: FAIL")
		quit(1)
		return true

	return false
