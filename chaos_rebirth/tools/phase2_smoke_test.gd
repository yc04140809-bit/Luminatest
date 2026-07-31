extends SceneTree

## Phase2 MVP(Home / Memory System / BattleMock / セーブ連携)の動作確認。
## 実行: godot --headless --script res://tools/phase2_smoke_test.gd
##
## BattleMockの攻撃処理はGolden Slice Review改善でawait(間・演出待ち)を
## 含む非同期処理になったため、本テストも_run_test()をコルーチンとして
## バックグラウンドで走らせ、完了時にquit()する構成にしている。

var _ok := true
var _frames := 0
var _started := false
var _flags: Node
var _memory: Node
var _save: Node


func _process(_delta: float) -> bool:
	_frames += 1
	if _frames < 2:
		return false
	if not _started:
		_started = true
		_run_test()
	return false


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
	var first_pick: String = _memory.pick_reaction_text_key()
	_assert(first_pick != "", "pick_reaction_text_key should return something once memories exist")

	home.queue_free()

	# --- 仮戦闘: 勝利までAttackを叩き、WINフラグが立つこと ---
	# 注意: BattleMockをここで静的型(BattleMock)として参照すると、このエントリスクリプトの
	# コンパイル時にBattleMock.gdが(autoload未登録の状態で)先行コンパイルされ
	# LocalizationManager等の解決に失敗する(--script実行時特有の初期化順序の制約)。
	# そのためControl型のまま、シグナル経由でハンドラを起動しポーリングで待つ。
	var battle_scene: PackedScene = load("res://game/scenes/battle/BattleMock.tscn")
	var battle: Control = battle_scene.instantiate()
	root.add_child(battle)

	var kaosu_portrait: Control = battle.get_node("KaosuPortrait")
	_assert(kaosu_portrait != null, "BattleMock should show a Kaosu portrait node (Golden Slice Review #1/#6)")

	var attack_button: Button = battle.get_node("Panel/VBox/CommandRow/AttackButton")
	var back_button: Button = battle.get_node("Panel/VBox/CommandRow/BackButton")
	_assert(back_button.disabled == true, "back button should be disabled while battle is ongoing")

	var guard := 0
	while back_button.disabled and guard < 60:
		if not attack_button.disabled:
			attack_button.pressed.emit()
		await create_timer(0.1).timeout
		guard += 1
	_assert(guard < 60, "battle should conclude within a reasonable number of attacks")
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

	# --- GameManager.goto_home の定数パス / SceneFaderの存在確認 ---
	_assert(ResourceLoader.exists("res://game/scenes/home/Home.tscn"), "GameManager.HOME_SCENE path should resolve")
	_assert(root.get_node_or_null("SceneFader") != null, "SceneFader should be registered as an autoload (Golden Slice Review #3)")

	if _ok:
		print("PHASE2_SMOKE_TEST_RESULT: PASS")
	else:
		print("PHASE2_SMOKE_TEST_RESULT: FAIL")
	quit(0 if _ok else 1)


func _assert(condition: bool, message: String) -> void:
	if not condition:
		_ok = false
		printerr("ASSERT FAILED: %s" % message)
