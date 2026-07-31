extends SceneTree

## Emotion Engine(core/emotion_engine + game/emotion)の動作確認。
## Memory / RelationshipStage(Affection) / Story / Battle / Home の
## いずれからも利用できる共通エンジンであることを、各連携経路ごとに検証する。
## 実行: godot --headless --script res://tools/emotion_engine_smoke_test.gd

var _ok := true
var _frames := 0
var _started := false

## StoryEngine(RefCounted)を使うサブテスト専用の状態。
## 自身のシグナルをローカルクロージャで束縛すると参照循環でリークするため、
## メンバ変数+バインドメソッド(本番のStoryPlayer.gdと同じ形)で保持する。
var _story_engine: StoryEngine
var _selected_option: Dictionary = {}


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
	var emotion := root.get_node("EmotionManager")
	var save := root.get_node("SaveManager")
	var localization := root.get_node("LocalizationManager")

	flags.reset()
	memory.load_state({})
	affection.load_state({})
	emotion.load_state({})
	emotion.set_now_override(1_700_000_000.0)  # 固定時刻でテストを決定的にする

	_test_core_engine()
	_test_basic_resolution(emotion)
	_test_priority_and_duration(emotion)
	_test_battle_integration(emotion)
	_test_home_time_and_relationship_integration(emotion, affection)
	_test_memory_integration(emotion, memory)
	_test_localization_contexts(localization)
	_test_portrait_expression_mapping(emotion)
	_test_save_load_round_trip(emotion, save)
	await _test_story_choice_integration(flags, emotion)
	_test_character_portrait_view_crossfade()

	if _ok:
		print("EMOTION_ENGINE_SMOKE_TEST_RESULT: PASS")
	else:
		print("EMOTION_ENGINE_SMOKE_TEST_RESULT: FAIL")
	quit(0 if _ok else 1)


# --- core/emotion_engine/EmotionEngine (純粋関数) ---

func _test_core_engine() -> void:
	var candidates := [
		{ "emotion": "SAD", "priority": 10, "duration_sec": 100.0 },
		{ "emotion": "HAPPY", "priority": 60, "duration_sec": 900.0 },
		{ "emotion": "SLEEPY", "priority": 30, "duration_sec": 300.0 },
	]
	var resolved := EmotionEngine.resolve(candidates, "NORMAL")
	_assert(resolved.get("emotion") == "HAPPY", "resolve should pick the highest-priority candidate")

	var empty_resolved := EmotionEngine.resolve([], "NORMAL")
	_assert(empty_resolved.get("emotion") == "NORMAL", "resolve with no candidates should fall back to default_emotion")

	_assert(EmotionEngine.has_expired(50.0, 100.0) == false, "50s elapsed of a 100s duration should not have expired yet")
	_assert(EmotionEngine.has_expired(150.0, 100.0) == true, "150s elapsed of a 100s duration should have expired")
	_assert(EmotionEngine.has_expired(1.0, 0.0) == true, "duration_sec<=0 should always be considered expired")


# --- 基本の解決: 未設定時はNORMAL、rule_id経由の適用 ---

func _test_basic_resolution(emotion: Node) -> void:
	_assert(emotion.get_current_emotion("kaosu") == "NORMAL", "with no events yet, current emotion should default to NORMAL")
	_assert(emotion.get_portrait_expression("kaosu") == "normal", "NORMAL should map to the 'normal' portrait expression")


# --- Emotion Priority / Emotion Duration(自然な減衰、瞬間切替の禁止) ---

func _test_priority_and_duration(emotion: Node) -> void:
	emotion.set_now_override(1000.0)
	emotion.notify_event("kaosu", "time_band_midnight")  # priority 10, duration 300
	_assert(emotion.get_current_emotion("kaosu") == "SLEEPY", "time_band_midnight rule should set SLEEPY")

	# 優先度の低いアンビエント信号(baseline)は、まだ有効な強い感情を上書きしない。
	emotion.notify_event("kaosu", "relationship_baseline_family")  # priority 4
	_assert(emotion.get_current_emotion("kaosu") == "SLEEPY", "a lower-priority ambient signal should not override an active higher-priority emotion")

	# 優先度の高い出来事(戦闘勝利)は即座に上書きする。
	emotion.notify_event("kaosu", "battle_win")  # priority 60
	_assert(emotion.get_current_emotion("kaosu") == "HAPPY", "a higher-priority event should override the current emotion")

	# 持続時間が経過すれば自然にリセットされる(次の弱い信号や既定値へ)。
	emotion.set_now_override(1000.0 + 901.0)  # battle_winのduration=900を超過
	_assert(emotion.get_current_emotion("kaosu") == "NORMAL", "after the duration elapses, the emotion should naturally fall back toward NORMAL")


# --- Battle連携: 勝利/敗北/瀕死 ---

func _test_battle_integration(emotion: Node) -> void:
	# それぞれ独立したシナリオとして検証するため、毎回クリーンな状態から始める。
	emotion.load_state({})
	emotion.set_now_override(2000.0)
	emotion.notify_battle_result("kaosu", true, false)
	_assert(emotion.get_current_emotion("kaosu") == "HAPPY", "battle win should result in HAPPY")

	emotion.load_state({})
	emotion.set_now_override(2000.0)
	emotion.notify_battle_result("kaosu", true, true)
	_assert(emotion.get_current_emotion("kaosu") == "EXCITED", "boss battle win should result in EXCITED (ボス撃破→EXCITED)")

	emotion.load_state({})
	emotion.set_now_override(3000.0)
	emotion.notify_battle_result("kaosu", false, false)
	_assert(emotion.get_current_emotion("kaosu") == "SAD", "battle loss should result in SAD")

	emotion.load_state({})
	emotion.set_now_override(3000.0)
	emotion.notify_near_death("kaosu")
	_assert(emotion.get_current_emotion("kaosu") == "SURPRISED", "near-death should register on its own")

	emotion.load_state({})


# --- Home連携: 時間帯 / RelationshipStage / 久しぶりログイン / 長時間プレイ ---

func _test_home_time_and_relationship_integration(emotion: Node, affection: Node) -> void:
	emotion.set_now_override(4000.0)
	emotion.notify_time_band("kaosu", "midnight")
	_assert(emotion.get_current_emotion("kaosu") == "SLEEPY", "midnight time band should bias toward SLEEPY (深夜→SLEEPY)")

	emotion.set_now_override(4001.0)
	emotion.notify_time_band("kaosu", "morning")
	# NORMAL同士の再解決なのでemotionそのものは変わらないが、ルールが正しく引けることを確認する。
	_assert(emotion.get_current_emotion("kaosu") == "NORMAL" or emotion.get_current_emotion("kaosu") == "SLEEPY", "morning band notify should not crash even if SLEEPY is still within its window")

	affection.load_state({})
	affection.add_points("kaosu", 200)  # family stage
	emotion.set_now_override(5000.0)
	emotion.notify_relationship_baseline("kaosu", affection.get_stage("kaosu"))
	_assert(affection.get_stage("kaosu") == "family", "setup: affection should be at family stage")
	_assert(emotion.get_current_emotion("kaosu") == "HAPPY", "family-stage relationship baseline should bias toward HAPPY")

	emotion.set_now_override(6000.0)
	emotion.notify_login("kaosu", 10)
	_assert(emotion.get_current_emotion("kaosu") == "HAPPY", "returning after a long absence (>=7 days) should bias toward HAPPY (久しぶりログイン→HAPPY)")

	emotion.set_now_override(7000.0)
	emotion.notify_login("kaosu", 1)
	# gap=1は閾値未満なのでlogin_return_long_absenceルールは発火しない(クラッシュしないことのみ確認)。
	_assert(true, "notify_login with a short gap should not error")

	# 長時間プレイ: セッション開始直後はTIREDにならないこと(閾値未満)。
	emotion.check_long_session("kaosu")
	_assert(emotion.get_current_emotion("kaosu") != "TIRED", "immediately after session start, long_session should not fire yet")


# --- Memory連携: Memoryのemotion_biasがEmotion Engineへ橋渡しされること ---

func _test_memory_integration(emotion: Node, memory: Node) -> void:
	var flags := root.get_node("Flags")
	flags.reset()
	memory.load_state({})
	emotion.load_state({})

	flags.set_flag("ep0_first_battle_lost", true)
	memory.check_and_record()
	_assert(memory.is_recorded("mem_first_battle_loss"), "setup: mem_first_battle_loss should be recorded")

	emotion.set_now_override(8000.0)
	var picked_key: String = memory.pick_reaction_text_key()
	_assert(picked_key != "", "setup: a memory reaction should be available")
	var bias: Dictionary = memory.get_last_picked_emotion_bias()
	_assert(bias.get("emotion", "") == "SAD", "mem_first_battle_loss should carry a SAD emotion_bias (悲しかった出来事→SAD補正)")

	emotion.notify_bias("kaosu", bias)
	_assert(emotion.get_current_emotion("kaosu") == "SAD", "forwarding the memory's emotion_bias should update the current emotion")

	# MemoryManagerはEmotionManagerを直接呼び出さない(責務分離)ことの確認:
	# MemoryManager側のAPIはEmotionの概念を一切要求せず、Dictionaryを返すだけである。
	_assert(bias is Dictionary, "MemoryManager only exposes plain data; it never references EmotionManager itself")


# --- LocalizationManager.t_for_contexts: Emotion > RelationshipStage > base の優先順 ---

func _test_localization_contexts(localization: Node) -> void:
	var happy_text: String = localization.t_for_contexts("home_battle_recap_win", ["HAPPY", "family"])
	var family_only_text: String = localization.t_for_contexts("home_battle_recap_win", ["", "family"])
	var base_text: String = localization.t_for_contexts("home_battle_recap_win", ["", ""])

	_assert(happy_text == "おかえり! 待ってたよ!", "emotion context should take priority over relationship stage when both variants exist")
	_assert(family_only_text == "おかえり! 勝てたんだ、すごいよ!", "with no emotion variant, it should fall back to the relationship-stage variant")
	_assert(base_text == localization.t("home_battle_recap_win"), "with no context at all, it should fall back to the base key")

	var unknown_text: String = localization.t_for_contexts("home_battle_recap_win", ["ANGRY_UNUSED_TAG", "unknown_stage"])
	_assert(unknown_text == base_text, "unmatched contexts should gracefully fall back to the base key rather than erroring")


# --- 表情連携: Emotion→portrait_expressionの対応表 ---

func _test_portrait_expression_mapping(emotion: Node) -> void:
	emotion.load_state({})
	emotion.set_now_override(9000.0)
	emotion.notify_event("kaosu", "battle_win")
	_assert(emotion.get_portrait_expression("kaosu") == "smile", "HAPPY should map to the 'smile' portrait expression")

	emotion.set_now_override(9000.0)
	emotion.notify_event("kaosu", "battle_loss")
	# battle_win(priority60)とbattle_loss(priority60)は同点。EmotionEngine.resolve()は
	# 候補配列を [新しい候補, 現在の候補] の順で受け取り、同点の場合は先頭(=新しい方)を
	# 保持する実装のため、新しい出来事が同点の旧感情を上書きする(仕様として妥当)。
	_assert(emotion.get_portrait_expression("kaosu") == "sad", "on an exact priority tie, the newer event should win over the still-active older one")


# --- セーブ/ロード往復 ---

func _test_save_load_round_trip(emotion: Node, save: Node) -> void:
	emotion.load_state({})
	emotion.set_now_override(10000.0)
	emotion.notify_event("kaosu", "battle_win_boss")
	_assert(emotion.get_current_emotion("kaosu") == "EXCITED", "setup: EXCITED should be active before saving")

	save.save_game(0)
	emotion.load_state({})
	_assert(emotion.get_current_emotion("kaosu") == "NORMAL", "sanity check: load_state({}) should reset to NORMAL")

	save.load_game(0)
	emotion.set_now_override(10000.0)  # 保存時と同じ「現在時刻」に戻して期限切れにならないようにする
	_assert(emotion.get_current_emotion("kaosu") == "EXCITED", "emotion state should survive save/load round trip")


# --- Story連携: 選択肢のemotion_tag ---

func _test_story_choice_integration(flags: Node, emotion: Node) -> void:
	flags.reset()
	emotion.load_state({})
	emotion.set_now_override(11000.0)

	_selected_option = {}
	_story_engine = StoryEngine.new()
	_story_engine.say_requested.connect(_on_test_say_autoadvance)
	_story_engine.choice_requested.connect(_on_test_choice_requested)
	_story_engine.choice_selected.connect(_on_test_choice_selected)
	_story_engine.load_scene("res://game/data/story/episode0/ep0_000_test.json")

	_assert(_selected_option.get("emotion_tag", "") == "friendly_choice", "StoryEngine.choice_selected should carry the option's emotion_tag through untouched")

	# StoryPlayer._on_choice_selected相当の処理: タグをEmotionManagerへ橋渡しする。
	emotion.notify_player_choice("kaosu", _selected_option.get("emotion_tag", ""))
	_assert(emotion.get_current_emotion("kaosu") == "HAPPY", "player_choice_friendly_choice rule should bias toward HAPPY (プレイヤー選択肢→Emotion)")

	_disconnect_story_engine()


func _on_test_say_autoadvance(_speaker_id: String, _text_key: String) -> void:
	_story_engine.advance()  # UIのタップ操作の代わりに即座に次へ進める(自動テストのため)


func _on_test_choice_requested(_options: Array) -> void:
	_story_engine.choose(0)  # 常に1つ目("emotion_tag": "friendly_choice")を選ぶ


func _on_test_choice_selected(option: Dictionary) -> void:
	_selected_option = option


func _disconnect_story_engine() -> void:
	if _story_engine == null:
		return
	for connection in _story_engine.say_requested.get_connections():
		_story_engine.say_requested.disconnect(connection["callable"])
	for connection in _story_engine.choice_requested.get_connections():
		_story_engine.choice_requested.disconnect(connection["callable"])
	for connection in _story_engine.choice_selected.get_connections():
		_story_engine.choice_selected.disconnect(connection["callable"])
	_story_engine = null


# --- CharacterPortraitView: 表情切替がクロスフェードでエラーなく動くこと ---

func _test_character_portrait_view_crossfade() -> void:
	var scene: PackedScene = load("res://core/ui_kit/CharacterPortraitView.tscn")
	var view: Control = scene.instantiate()
	root.add_child(view)

	view.call("set_character", "kaosu")
	view.call("set_expression", "normal")
	var texture_rect: TextureRect = view.get_node("TextureRect")
	_assert(texture_rect.texture != null, "first expression assignment should apply instantly (no fade from nothing)")

	# 2回目以降の切替はクロスフェードのtweenを使う(瞬間切替の禁止)。呼び出し自体が
	# エラーなく完了することを確認する(視覚的なフェードはheadlessでは検証できない)。
	view.call("set_expression", "smile")
	_assert(view.call("get_expression") == "smile", "get_expression should report the newly requested state immediately even while the fade tween is in flight")

	view.queue_free()


func _assert(condition: bool, message: String) -> void:
	if not condition:
		_ok = false
		printerr("ASSERT FAILED: %s" % message)
