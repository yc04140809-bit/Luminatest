extends SceneTree

## Phase2 MVP(Home / Memory System / BattleMock / セーブ連携)の動作確認。
## 実行: godot --headless --script res://tools/phase2_smoke_test.gd

var _ok := true
var _frames := 0
var _flags: Node
var _memory: Node
var _save: Node


func _process(_delta: float) -> bool:
	_frames += 1
	if _frames < 2:
		return false
	_run_test()
	return true


func _run_test() -> void:
	_flags = root.get_node("Flags")
	_memory = root.get_node("MemoryManager")
	_save = root.get_node("SaveManager")

	_flags.reset()
	_memory.load_state({})

	# --- Home画面: 初回訪問でmem_first_loginが記録されること ---
	var home_scene: PackedScene = load("res://game/scenes/home/Home.tscn")
	var home: Control = home_scene.instantiate()
	root.add_child(home)

	_assert(_flags.get_flag("first_home_visit", false) == true, "Home._ready should set first_home_visit flag")
	_assert(_memory.is_recorded("mem_first_login"), "mem_first_login should be recorded after first Home visit")

	var greeting_label: RichTextLabel = home.get_node("GreetingBox/GreetingLabel")
	_assert(greeting_label.text != "", "Home greeting should not be empty")
	_assert(not greeting_label.text.begins_with("["), "Home greeting should resolve to real text, got '%s'" % greeting_label.text)

	# --- 会話フラグでmem_met_kaosuが記録されること ---
	_flags.set_flag("met_kaosu", true)
	_memory.check_and_record()
	_assert(_memory.is_recorded("mem_met_kaosu"), "mem_met_kaosu should be recorded once met_kaosu flag is true")

	# --- 同じMemoryばかりにならないこと(選定のたびにreference_countが伸びる) ---
	var first_pick: String = _memory.pick_greeting_text_key()
	_assert(first_pick != "", "pick_greeting_text_key should return something once memories exist")

	home.queue_free()

	# --- 仮戦闘: 勝利までAttackを叩き、WINフラグが立つこと ---
	var battle_scene: PackedScene = load("res://game/scenes/battle/BattleMock.tscn")
	var battle: Control = battle_scene.instantiate()
	root.add_child(battle)

	var attack_button: Button = battle.get_node("VBox/CommandRow/AttackButton")
	var back_button: Button = battle.get_node("VBox/CommandRow/BackButton")
	_assert(back_button.disabled == true, "back button should be disabled while battle is ongoing")

	var guard := 0
	while not attack_button.disabled and guard < 50:
		attack_button.pressed.emit()
		guard += 1
	_assert(guard < 50, "battle should conclude within a reasonable number of attacks")
	_assert(_flags.get_flag("ep0_first_battle_won", false) == true or _flags.get_flag("ep0_first_battle_lost", false) == true, "battle should record a win or loss flag")
	_assert(back_button.disabled == false, "back button should be enabled once battle ends")

	battle.queue_free()

	_memory.check_and_record()
	if _flags.get_flag("ep0_first_battle_won", false) == true:
		_assert(_memory.is_recorded("mem_first_battle_win"), "mem_first_battle_win should be recorded after a win")

	# --- セーブ/ロードでMemory記録が保持されること ---
	_save.save_game(0)
	_memory.load_state({})
	_assert(not _memory.is_recorded("mem_met_kaosu"), "sanity check: load_state({}) should clear records")
	_save.load_game(0)
	_assert(_memory.is_recorded("mem_met_kaosu"), "mem_met_kaosu should survive save/load round trip")

	# --- GameManager.goto_home の定数パスが実在すること ---
	_assert(ResourceLoader.exists("res://game/scenes/home/Home.tscn"), "GameManager.HOME_SCENE path should resolve")

	if _ok:
		print("PHASE2_SMOKE_TEST_RESULT: PASS")
	else:
		print("PHASE2_SMOKE_TEST_RESULT: FAIL")
	quit(0 if _ok else 1)


func _assert(condition: bool, message: String) -> void:
	if not condition:
		_ok = false
		printerr("ASSERT FAILED: %s" % message)
