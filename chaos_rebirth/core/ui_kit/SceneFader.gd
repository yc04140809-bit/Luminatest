extends CanvasLayer

## 画面遷移フェード(core層/IP非依存)。体験設計書 第11章 Atmosphere:
## シーン間の遷移は400〜600msのフェードで統一し、瞬間切り替えの安っぽさを避ける。
## autoloadとして登録し、シーン切り替えを跨いでも常駐させる。

const FADE_DURATION := 0.45

var _overlay: ColorRect


func _ready() -> void:
	layer = 100
	_overlay = ColorRect.new()
	_overlay.color = Color(0, 0, 0, 0)
	_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_overlay)


## フェードアウト → シーン切り替え → フェードインを一括で行う。
func change_scene(path: String) -> void:
	await fade_out()
	get_tree().change_scene_to_file(path)
	await get_tree().process_frame
	await fade_in()


func fade_out() -> void:
	_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	var tween := create_tween()
	tween.tween_property(_overlay, "color:a", 1.0, FADE_DURATION)
	await tween.finished


func fade_in() -> void:
	var tween := create_tween()
	tween.tween_property(_overlay, "color:a", 0.0, FADE_DURATION)
	await tween.finished
	_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
