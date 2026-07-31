extends Node

## BGM/SE再生・フェード制御(Phase1では最小スタブ。Phase3で本実装)

var _bgm_player: AudioStreamPlayer


func _ready() -> void:
	_bgm_player = AudioStreamPlayer.new()
	add_child(_bgm_player)


func play_bgm(bgm_id: String, _fade_sec: float = 0.0) -> void:
	var path := "res://game/assets/bgm/%s.ogg" % bgm_id
	if ResourceLoader.exists(path):
		_bgm_player.stream = load(path)
		_bgm_player.play()


func play_se(se_id: String) -> void:
	var path := "res://game/assets/se/%s.wav" % se_id
	if ResourceLoader.exists(path):
		var se_player := AudioStreamPlayer.new()
		add_child(se_player)
		se_player.stream = load(path)
		se_player.finished.connect(se_player.queue_free)
		se_player.play()
