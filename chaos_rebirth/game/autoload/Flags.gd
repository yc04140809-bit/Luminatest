extends Node

## シナリオ進行フラグの保持(game層)

var _flags: Dictionary = {}


func reset() -> void:
	_flags.clear()


func set_flag(flag: String, value: Variant) -> void:
	_flags[flag] = value


func get_flag(flag: String, default_value: Variant = null) -> Variant:
	return _flags.get(flag, default_value)


func get_all() -> Dictionary:
	return _flags.duplicate()


func set_all(data: Dictionary) -> void:
	_flags = data.duplicate()
