extends Control

## カテゴリ選択タイル(core層/IP非依存)。表示文字列と有効/無効のみ受け取る。

signal pressed()

@onready var label: Label = $Label
@onready var button: Button = $Button


func _ready() -> void:
	button.pressed.connect(func(): pressed.emit())


func setup(display_text: String, enabled: bool) -> void:
	label.text = display_text if enabled else "%s\n(Coming Soon)" % display_text
	button.disabled = not enabled
	modulate = Color(1, 1, 1, 1) if enabled else Color(1, 1, 1, 0.4)
