extends SceneTree

## 表情システム / アイドルモーション / Memoryリアクション / Affection
## (RelationshipStage)の動作確認。
## 実行: godot --headless --script res://tools/expression_memory_affection_smoke_test.gd

var _ok := true
var _frames := 0
var _started := false

## say_memoryコマンドのテスト専用の状態。
## 注意: RefCounted(StoryEngine)の自身のシグナルハンドラをローカル変数の
## クロージャで束縛すると参照循環でリークするため、メンバ変数+バインド
## メソッド(本番のStoryPlayer.gdと同じパターン)で保持する。
var _say_memory_engine: StoryEngine
var _say_memory_manager: Node
var _say_count := 0
var _scene_finished := false
var _spoken_keys: Array = []


func _process(_delta: float) -> bool:
	_frames += 1
	if _frames < 2:
		return false
	if not _started:
		_started = true
		_run_test()
	return false


func _run_test() -> void:
	var flags := root.get_node("Flags")
	var memory := root.get_node("MemoryManager")
	var affection := root.get_node("AffectionManager")
	var save := root.get_node("SaveManager")
	var localization := root.get_node("LocalizationManager")

	flags.reset()
	memory.load_state({})
	affection.load_state({})

	_test_character_portrait_view()
	_test_affection_evaluator()
	_test_affection_manager(affection, save)
	_test_memory_triggers(flags, memory)
	_test_localization_context(localization)
	await _test_say_memory_command(flags, memory)

	if _ok:
		print("EXPR_MEMORY_AFFECTION_SMOKE_TEST_RESULT: PASS")
	else:
		print("EXPR_MEMORY_AFFECTION_SMOKE_TEST_RESULT: FAIL")
	quit(0 if _ok else 1)


# --- ① 表情システム / ② アイドルモーション ---

func _test_character_portrait_view() -> void:
	var scene: PackedScene = load("res://core/ui_kit/CharacterPortraitView.tscn")
	var view: Control = scene.instantiate()
	root.add_child(view)

	view.call("set_character", "kaosu")
	view.call("set_expression", "normal")
	var texture_rect: TextureRect = view.get_node("TextureRect")
	_assert(texture_rect.texture != null, "known expression 'normal' should resolve a texture")

	# 未整備の表情(例: 怒り)は登場人物ごとに用意されていなくても、
	# normalへ自動フォールバックしエラーにならないこと。
	view.call("set_expression", "angry")
	_assert(texture_rect.texture != null, "missing expression should gracefully fall back to normal, not crash")
	_assert(view.call("get_expression") == "angry", "get_expression should still report the requested state")

	# 演出中の一時停止(set_motion_enabled)がエラーなく呼べること。
	view.call("set_motion_enabled", false)
	_assert(view.get("motion_enabled") == false, "set_motion_enabled(false) should disable idle motion")
	view.call("set_motion_enabled", true)
	_assert(view.get("motion_enabled") == true, "set_motion_enabled(true) should re-enable idle motion")

	# Live2D差し替え用のモーションパラメータチャンネルが保持されること。
	view.call("set_motion_parameter", "hair_sway", 0.5)
	_assert(is_equal_approx(view.call("get_motion_parameter", "hair_sway"), 0.5), "motion parameter channel should round-trip")

	view.queue_free()


# --- ④ Affection: core層の純粋関数 ---

func _test_affection_evaluator() -> void:
	var levels := [
		{ "level": 1, "required_points": 0 },
		{ "level": 2, "required_points": 20 },
		{ "level": 3, "required_points": 50 },
		{ "level": 4, "required_points": 100 },
		{ "level": 5, "required_points": 200 },
	]
	var stages := [
		{ "stage": "stranger", "min_level": 1, "smile_bias": 0.1 },
		{ "stage": "acquaintance", "min_level": 2, "smile_bias": 0.25 },
		{ "stage": "friend", "min_level": 3, "smile_bias": 0.4 },
		{ "stage": "best_friend", "min_level": 4, "smile_bias": 0.55 },
		{ "stage": "family", "min_level": 5, "smile_bias": 0.7 },
	]

	_assert(AffectionEvaluator.compute_level(0, levels) == 1, "0 points should be level 1")
	_assert(AffectionEvaluator.compute_level(19, levels) == 1, "just below threshold should stay at previous level")
	_assert(AffectionEvaluator.compute_level(20, levels) == 2, "exact threshold should reach the new level")
	_assert(AffectionEvaluator.compute_level(9999, levels) == 5, "points far beyond the table should cap at the max level")

	_assert(AffectionEvaluator.compute_stage(1, stages) == "stranger", "level 1 should map to stranger")
	_assert(AffectionEvaluator.compute_stage(3, stages) == "friend", "level 3 should map to friend")
	_assert(AffectionEvaluator.compute_stage(5, stages) == "family", "level 5 should map to family")


# --- ④ Affection: game層のAffectionManager(RelationshipStage経由) ---

func _test_affection_manager(affection: Node, save: Node) -> void:
	_assert(affection.get_stage("kaosu") == "stranger", "fresh save should start at stranger stage")

	affection.add_points("kaosu", 20)
	_assert(affection.get_stage("kaosu") == "acquaintance", "20 points should reach acquaintance")

	affection.add_points("kaosu", 180)  # 累計200
	_assert(affection.get_stage("kaosu") == "family", "200 points should reach family")
	_assert(affection.get_smile_bias("kaosu") > 0.5, "family stage should have a high smile bias")

	save.save_game(0)
	affection.load_state({})
	_assert(affection.get_stage("kaosu") == "stranger", "sanity check: load_state({}) should reset to stranger")
	save.load_game(0)
	_assert(affection.get_stage("kaosu") == "family", "affection stage should survive save/load round trip")


# --- ③ Memoryリアクション: 新トリガー種別 ---

func _test_memory_triggers(flags: Node, memory: Node) -> void:
	flags.reset()
	memory.load_state({})

	# 連続ログイン(「昨日来てくれたね」「連続ログイン」)
	memory.set_today_override("2026-01-01")
	memory.record_login()
	_assert(memory.get_login_streak() == 1, "first login should start a streak of 1")

	memory.set_today_override("2026-01-02")
	memory.record_login()
	_assert(memory.get_login_streak() == 2, "consecutive day login should increment the streak")
	memory.check_and_record()
	_assert(memory.is_recorded("mem_returned_next_day"), "streak=2 should trigger mem_returned_next_day (『昨日来てくれたね』)")

	for i in range(3, 8):
		memory.set_today_override("2026-01-%02d" % i)
		memory.record_login()
	_assert(memory.get_login_streak() == 7, "7 consecutive days should reach streak 7")
	memory.check_and_record()
	_assert(memory.is_recorded("mem_login_streak_7"), "streak=7 should trigger mem_login_streak_7 (『連続ログイン』)")

	# 久しぶり(absence_return)
	memory.set_today_override("2026-01-20")  # 01-07から13日ぶり
	memory.record_login()
	_assert(memory.get_last_login_gap_days() >= 7, "gap after a long absence should be captured")
	memory.check_and_record()
	_assert(memory.is_recorded("mem_absence_return"), "returning after a long gap should trigger mem_absence_return (『久しぶり』)")

	# 記念日(date_special / anniversary) — 初回ログイン(01-01)から30日後
	memory.set_today_override("2026-01-31")
	memory.record_login()
	memory.check_and_record()
	_assert(memory.is_recorded("mem_anniversary_30days"), "30 days since first login should trigger the anniversary memory (『記念日』)")

	memory.set_today_override("")

	# 前回話題: 直近参照したMemoryを取得できること
	var picked: String = memory.pick_reaction_text_key()
	_assert(picked != "", "there should be something to say once several memories are recorded")
	_assert(memory.get_last_referenced_id() != "", "get_last_referenced_id should report the most recently referenced memory (『前回話題』)")


# --- LocalizationManager.t_for_context によるRelationshipStage別の言い回し ---

func _test_localization_context(localization: Node) -> void:
	var stranger_line: String = localization.t_for_context("home_greeting_morning", "stranger")
	var family_line: String = localization.t_for_context("home_greeting_morning", "family")
	var unknown_stage_line: String = localization.t_for_context("home_greeting_morning", "acquaintance")

	_assert(stranger_line != family_line, "stranger and family should use different phrasing for the same greeting")
	_assert(unknown_stage_line == localization.t("home_greeting_morning"), "a stage without a dedicated variant should fall back to the base line")


# --- ③ 会話側から呼べるAPI: StoryEngineのsay_memoryコマンド ---

func _test_say_memory_command(flags: Node, memory: Node) -> void:
	# StoryEngine(RefCounted)自身のシグナルハンドラをローカルクロージャで
	# engine自身を捕捉すると参照循環でリークするため、本番のStoryPlayer.gdと
	# 同じく「メンバ変数として保持 + バインドされたメソッド」の形にする。
	_say_memory_manager = memory

	# ケース1: Memoryが1件もない状態ではシナリオを止めずに自動で読み飛ばすこと。
	flags.reset()
	memory.load_state({})

	_say_count = 0
	_scene_finished = false
	_say_memory_engine = StoryEngine.new()
	_say_memory_engine.say_requested.connect(_on_test_say)
	_say_memory_engine.scene_finished.connect(_on_test_scene_finished)
	_say_memory_engine.memory_say_requested.connect(_on_test_memory_say_skip_if_empty)
	_say_memory_engine.load_scene("res://game/data/story/episode0/ep0_test_memory_say.json")
	_assert(_scene_finished == false, "scene should not finish yet (line after say_memory still pending)")
	_assert(_say_count == 1, "the normal 'say' line after say_memory should still play even with no memory available")
	_disconnect_test_engine()

	# ケース2: Memoryが記録済みなら、say_memoryが実際にそのテキストで発話されること。
	flags.reset()
	memory.load_state({})
	flags.set_flag("met_kaosu", true)
	memory.check_and_record()
	_assert(memory.is_recorded("mem_met_kaosu"), "setup: mem_met_kaosu should be recorded before testing say_memory")

	_spoken_keys = []
	_say_memory_engine = StoryEngine.new()
	_say_memory_engine.say_requested.connect(_on_test_say_collect)
	_say_memory_engine.memory_say_requested.connect(_on_test_memory_say_collect)
	_say_memory_engine.load_scene("res://game/data/story/episode0/ep0_test_memory_say.json")
	_assert(_spoken_keys.size() >= 1 and _spoken_keys[0] != "", "say_memory should speak a resolvable memory text_key when one is available")
	_disconnect_test_engine()


func _on_test_say(_speaker: String, _key: String) -> void:
	_say_count += 1


func _on_test_scene_finished() -> void:
	_scene_finished = true


func _on_test_memory_say_skip_if_empty(_speaker: String) -> void:
	if _say_memory_manager.pick_reaction_text_key() == "":
		_say_memory_engine.advance()


func _on_test_say_collect(_speaker: String, key: String) -> void:
	_spoken_keys.append(key)


func _on_test_memory_say_collect(_speaker: String) -> void:
	var text_key: String = _say_memory_manager.pick_reaction_text_key()
	if text_key == "":
		_say_memory_engine.advance()
	else:
		_spoken_keys.append(text_key)
		_say_memory_engine.advance()


func _disconnect_test_engine() -> void:
	if _say_memory_engine == null:
		return
	for connection in _say_memory_engine.say_requested.get_connections():
		_say_memory_engine.say_requested.disconnect(connection["callable"])
	for connection in _say_memory_engine.scene_finished.get_connections():
		_say_memory_engine.scene_finished.disconnect(connection["callable"])
	for connection in _say_memory_engine.memory_say_requested.get_connections():
		_say_memory_engine.memory_say_requested.disconnect(connection["callable"])
	_say_memory_engine = null


func _assert(condition: bool, message: String) -> void:
	if not condition:
		_ok = false
		printerr("ASSERT FAILED: %s" % message)
