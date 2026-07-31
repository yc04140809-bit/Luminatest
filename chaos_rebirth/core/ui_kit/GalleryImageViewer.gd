extends Control

## フルスクリーン画像ビューア(core層/IP非依存)。
## タップで拡大表示された画像を開き、左右スワイプで前後の画像へ移動する。

signal closed()

const SWIPE_THRESHOLD := 60.0

var _images: Array = []
var _index: int = 0
var _drag_start_x: float = -1.0
var _dragging: bool = false

@onready var texture_rect: TextureRect = $TextureRect
@onready var counter_label: Label = $CounterLabel


func open(images: Array, start_index: int = 0) -> void:
	_images = images
	_index = clampi(start_index, 0, max(images.size() - 1, 0))
	_refresh()
	show()


func _refresh() -> void:
	if _images.is_empty():
		counter_label.text = ""
		texture_rect.texture = null
		return
	var path: String = _images[_index]
	texture_rect.texture = load(path) if ResourceLoader.exists(path) else null
	counter_label.text = "%d / %d" % [_index + 1, _images.size()]


func _gui_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		_handle_touch(event.pressed, event.position.x)
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		_handle_touch(event.pressed, event.position.x)


func _handle_touch(pressed: bool, x: float) -> void:
	if pressed:
		_drag_start_x = x
		_dragging = true
	elif _dragging:
		_dragging = false
		var delta: float = x - _drag_start_x
		if abs(delta) > SWIPE_THRESHOLD:
			if delta < 0:
				next_image()
			else:
				previous_image()
		else:
			close()
		_drag_start_x = -1.0


func next_image() -> void:
	if _images.is_empty():
		return
	_index = (_index + 1) % _images.size()
	_refresh()


func previous_image() -> void:
	if _images.is_empty():
		return
	_index = (_index - 1 + _images.size()) % _images.size()
	_refresh()


func close() -> void:
	hide()
	closed.emit()
