extends Control

## サムネイル1枚(core層/IP非依存)。画像パスと解放状態のみを受け取る。

signal pressed()

@onready var texture_rect: TextureRect = $TextureRect
@onready var lock_overlay: ColorRect = $LockOverlay
@onready var lock_label: Label = $LockOverlay/LockLabel
@onready var button: Button = $Button

var unlocked: bool = false


func _ready() -> void:
	button.pressed.connect(func(): pressed.emit())


func setup(image_path: String, is_unlocked: bool) -> void:
	unlocked = is_unlocked
	if is_unlocked and image_path != "" and ResourceLoader.exists(image_path):
		texture_rect.texture = load(image_path)
		lock_overlay.visible = false
		button.disabled = false
	else:
		texture_rect.texture = null
		lock_overlay.visible = true
		button.disabled = true
