extends SceneTree

## Character Voice & Dialogue Database
## (core/dialogue_engine + game/dialogue/DialogueDatabase)の動作確認。
## 実行: godot --headless --script res://tools/dialogue_database_smoke_test.gd

var _ok := true
var _frames := 0
var _started := false


func _process(_delta: float) -> bool:
	_frames += 1
	if _frames < 2:
		return false
	if not _started:
		_started = true
		_run_test()
	return false


func _run_test() -> void:
	var memory := root.get_node("MemoryManager")
	var affection := root.get_node("AffectionManager")
	var save := root.get_node("SaveManager")
	var flags := root.get_node("Flags")
	var dialogue_db := root.get_node("DialogueDatabase")

	flags.reset()
	memory.load_state({})
	affection.load_state({})

	_test_core_condition_matching()
	_test_core_selector_fallback_tiers()
	_test_core_selector_recency_penalty()
	_test_database_scenarios(dialogue_db, affection)
	_test_memory_flag_integration(dialogue_db, memory, flags)
	_test_last_dialogues_persistence(memory, save)
	_test_home_battle_integration_smoke(dialogue_db)

	if _ok:
		print("DIALOGUE_DATABASE_SMOKE_TEST_RESULT: PASS")
	else:
		print("DIALOGUE_DATABASE_SMOKE_TEST_RESULT: FAIL")
	quit(0 if _ok else 1)


# --- core/dialogue_engine/DialogueCondition ---

func _test_core_condition_matching() -> void:
	var entry := {
		"id": "e1",
		"character_id": "kaosu",
		"text_key": "dlg_e1",
		"priority": 10,
		"conditions": { "relationship_stage": "friend", "emotion": "HAPPY", "time_of_day": "morning" },
	}
	var context_match := { "character_id": "kaosu", "relationship_stage": "friend", "emotion": "HAPPY", "time_of_day": "morning" }
	var context_mismatch := { "character_id": "kaosu", "relationship_stage": "friend", "emotion": "SAD", "time_of_day": "morning" }
	var context_other_character := { "character_id": "someone_else", "relationship_stage": "friend", "emotion": "HAPPY", "time_of_day": "morning" }

	var all_fields := ["relationship_stage", "emotion", "time_of_day"]
	_assert(DialogueCondition.is_eligible(entry, context_match, all_fields) == true, "an entry whose specified conditions all match context should be eligible")
	_assert(DialogueCondition.is_eligible(entry, context_mismatch, all_fields) == false, "a mismatched required field should make the entry ineligible")
	_assert(DialogueCondition.is_eligible(entry, context_other_character, all_fields) == false, "character_id must always match regardless of tier")

	_assert(DialogueCondition.is_eligible(entry, context_mismatch, ["relationship_stage"]) == true, "relaxing the required fields should let a partially-mismatched entry become eligible again")

	_assert(is_equal_approx(DialogueCondition.match_rate(entry, context_match), 1.0), "a fully-matching entry should have match_rate 1.0")
	_assert(DialogueCondition.match_rate(entry, context_mismatch) < 1.0, "a partially-matching entry should have match_rate below 1.0")

	var wildcard_entry := { "id": "e2", "character_id": "kaosu", "conditions": {} }
	_assert(is_equal_approx(DialogueCondition.match_rate(wildcard_entry, context_match), 0.5), "an entry with no specified conditions should have a neutral match_rate of 0.5")

	_assert(DialogueCondition.emotion_matches(entry, context_match) == true, "emotion_matches should be true when conditions.emotion equals context.emotion")
	_assert(DialogueCondition.relationship_matches(entry, context_match) == true, "relationship_matches should be true when conditions.relationship_stage equals context.relationship_stage")

	# AffectionRange(常に必須)
	var ranged_entry := { "id": "e3", "character_id": "kaosu", "conditions": { "affection_min_level": 3, "affection_max_level": 5 } }
	_assert(DialogueCondition.is_eligible(ranged_entry, { "character_id": "kaosu", "affection_level": 4 }, []) == true, "affection_level within range should be eligible")
	_assert(DialogueCondition.is_eligible(ranged_entry, { "character_id": "kaosu", "affection_level": 1 }, []) == false, "affection_level outside range should be ineligible even with no required_fields")

	# MemoryFlag(常に必須)
	var memory_gated_entry := { "id": "e4", "character_id": "kaosu", "conditions": { "memory_flags": ["mem_x"] } }
	_assert(DialogueCondition.is_eligible(memory_gated_entry, { "character_id": "kaosu", "recorded_memory_ids": [] }, []) == false, "an unrecorded required memory_flag should make the entry ineligible")
	_assert(DialogueCondition.is_eligible(memory_gated_entry, { "character_id": "kaosu", "recorded_memory_ids": ["mem_x"] }, []) == true, "a recorded required memory_flag should make the entry eligible")


# --- core/dialogue_engine/DialogueSelector: 段階的フォールバック ---

func _test_core_selector_fallback_tiers() -> void:
	var entries := [
		{ "id": "specific", "character_id": "kaosu", "text_key": "dlg_specific", "priority": 10,
		  "conditions": { "relationship_stage": "friend", "emotion": "HAPPY", "time_of_day": "morning" } },
		{ "id": "relationship_only", "character_id": "kaosu", "text_key": "dlg_rel_only", "priority": 5,
		  "conditions": { "relationship_stage": "friend" } },
		{ "id": "universal", "character_id": "kaosu", "text_key": "dlg_universal", "priority": 1,
		  "conditions": {} },
	]

	var full_context := { "character_id": "kaosu", "relationship_stage": "friend", "emotion": "HAPPY", "time_of_day": "morning" }
	var full_result := DialogueSelector.select(entries, full_context, [])
	_assert(full_result.entry_id == "specific", "an exact full-context match should win at the top tier")

	var mismatched_context := { "character_id": "kaosu", "relationship_stage": "friend", "emotion": "SAD", "time_of_day": "night" }
	var relaxed_result := DialogueSelector.select(entries, mismatched_context, [])
	_assert(relaxed_result.entry_id == "relationship_only", "when the top tiers fail, the selector should relax to a relationship-only match")

	var stranger_context := { "character_id": "kaosu", "relationship_stage": "stranger", "emotion": "ANGRY", "time_of_day": "midnight" }
	var fallback_result := DialogueSelector.select(entries, stranger_context, [])
	_assert(fallback_result.entry_id == "universal", "as a last resort, the selector should fall back to the character's universal line rather than returning nothing")
	_assert(fallback_result.is_valid(), "the final fallback result should still be valid (something is always returned)")

	var unknown_character_result := DialogueSelector.select(entries, { "character_id": "nobody" }, [])
	_assert(unknown_character_result.is_valid() == false, "with no entries at all for the given character, the result should be invalid (nothing to say)")


# --- core/dialogue_engine/DialogueSelector: 重複防止(直近使用ペナルティ) ---

func _test_core_selector_recency_penalty() -> void:
	var entries := [
		{ "id": "a", "character_id": "kaosu", "text_key": "dlg_a", "priority": 10, "conditions": {} },
		{ "id": "b", "character_id": "kaosu", "text_key": "dlg_b", "priority": 10, "conditions": {} },
	]
	var context := { "character_id": "kaosu" }

	# 同点優先度でも、直近使用したもの("a")は避けられ、"b"が選ばれるはず。
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	var result := DialogueSelector.select(entries, context, ["a", "a", "a"], rng)
	_assert(result.entry_id == "b", "a recently-and-repeatedly-used entry should be penalized enough to lose to an equally-weighted alternative")


# --- game/dialogue/DialogueDatabase: 実データでのシナリオ(スペック記載例) ---

func _test_database_scenarios(dialogue_db: Node, affection: Node) -> void:
	affection.load_state({})

	# 「HOME 朝 Emotion=Happy Relationship=Friend → おはよう!今日は一緒に頑張ろう!」
	var morning_context := {
		"relationship_stage": "friend", "emotion": "HAPPY", "time_of_day": "morning",
		"story_chapter": "episode0", "location": "home", "affection_level": 3,
		"recorded_memory_ids": [], "memory_importance_by_id": {},
	}
	var morning_result: DialogueResult = dialogue_db.pick_dialogue("kaosu", morning_context, [])
	_assert(morning_result.text_key == "dlg_home_morning_happy_friend", "morning+HAPPY+friend should pick the specific morning-friend line")

	# 「夜 Emotion=Sleepy → もう遅いよ。ちゃんと寝ないと駄目だからね。」
	var sleepy_context := {
		"relationship_stage": "acquaintance", "emotion": "SLEEPY", "time_of_day": "night",
		"story_chapter": "episode0", "location": "home", "affection_level": 2,
		"recorded_memory_ids": [], "memory_importance_by_id": {},
	}
	var sleepy_result: DialogueResult = dialogue_db.pick_dialogue("kaosu", sleepy_context, [])
	_assert(sleepy_result.text_key == "dlg_home_night_sleepy", "SLEEPY emotion should pick the sleepy-specific line regardless of relationship stage")

	# 「久しぶりログイン → 会いたかった…。」
	var long_absence_context := {
		"relationship_stage": "friend", "emotion": "NORMAL", "time_of_day": "evening",
		"story_chapter": "episode0", "location": "home", "affection_level": 3,
		"recorded_memory_ids": [], "memory_importance_by_id": {}, "login_type": "long_absence_return",
	}
	var long_absence_result: DialogueResult = dialogue_db.pick_dialogue("kaosu", long_absence_context, [])
	_assert(long_absence_result.text_key == "dlg_login_long_absence", "login_type=long_absence_return should pick the 'missed you' line")

	# 「親友 → おかえり。待ってた。」
	var best_friend_context := {
		"relationship_stage": "best_friend", "emotion": "NORMAL", "time_of_day": "noon",
		"story_chapter": "episode0", "location": "home", "affection_level": 4,
		"recorded_memory_ids": [], "memory_importance_by_id": {},
	}
	var best_friend_result: DialogueResult = dialogue_db.pick_dialogue("kaosu", best_friend_context, [])
	_assert(best_friend_result.text_key == "dlg_welcome_best_friend", "best_friend stage should pick its own welcome-home line")

	# 「家族 → おかえり。今日も無事でよかった。」
	var family_context := {
		"relationship_stage": "family", "emotion": "NORMAL", "time_of_day": "noon",
		"story_chapter": "episode0", "location": "home", "affection_level": 5,
		"recorded_memory_ids": [], "memory_importance_by_id": {},
	}
	var family_result: DialogueResult = dialogue_db.pick_dialogue("kaosu", family_context, [])
	_assert(family_result.text_key == "dlg_welcome_family", "family stage should pick its own distinct welcome-home line (異なる距離感)")
	_assert(family_result.text_key != best_friend_result.text_key, "best_friend and family should not collapse into the same line (Stage毎に距離感/呼び方を変更)")

	# 「初勝利 → やったね!!すごく嬉しい!」
	var first_win_context := {
		"relationship_stage": "friend", "emotion": "HAPPY", "battle_result": "win",
		"story_chapter": "episode0", "location": "battle", "affection_level": 3,
		"recorded_memory_ids": [], "memory_importance_by_id": {}, "event_type": "first_battle_win",
	}
	var first_win_result: DialogueResult = dialogue_db.pick_dialogue("kaosu", first_win_context, [])
	_assert(first_win_result.text_key == "dlg_battle_first_win", "event_type=first_battle_win should outrank the generic battle-win line")


# --- Memory連携: 「歌が好き」→「最近歌ってる?」---

func _test_memory_flag_integration(dialogue_db: Node, memory: Node, flags: Node) -> void:
	flags.reset()
	memory.load_state({})

	var context_without_memory := {
		"relationship_stage": "friend", "emotion": "NORMAL", "time_of_day": "noon",
		"story_chapter": "episode0", "location": "home", "affection_level": 3,
		"recorded_memory_ids": memory.get_recorded_ids(), "memory_importance_by_id": memory.get_importance_map(),
	}
	var without_result: DialogueResult = dialogue_db.pick_dialogue("kaosu", context_without_memory, [])
	_assert(without_result.text_key != "dlg_memory_likes_singing", "without the memory recorded, the singing callback should not be eligible")

	flags.set_flag("learned_kaosu_likes_singing", true)
	memory.check_and_record()
	_assert(memory.is_recorded("mem_likes_singing"), "setup: mem_likes_singing should now be recorded")

	var context_with_memory := {
		"relationship_stage": "friend", "emotion": "NORMAL", "time_of_day": "noon",
		"story_chapter": "episode0", "location": "home", "affection_level": 3,
		"recorded_memory_ids": memory.get_recorded_ids(), "memory_importance_by_id": memory.get_importance_map(),
	}
	var with_result: DialogueResult = dialogue_db.pick_dialogue("kaosu", context_with_memory, [])
	_assert(with_result.text_key == "dlg_memory_likes_singing", "with mem_likes_singing recorded, 'Memory「歌が好き」→「最近歌ってる?」' should be selectable (may still lose to a higher-priority line, but here nothing else qualifies at this tier)")


# --- MemoryManagerのlast_dialogues台帳: 記録・取得・セーブ往復 ---

func _test_last_dialogues_persistence(memory: Node, save: Node) -> void:
	memory.load_state({})
	memory.record_dialogue_used("kaosu", "dlg_a")
	memory.record_dialogue_used("kaosu", "dlg_b")
	var recent: Array = memory.get_recent_dialogue_ids("kaosu")
	_assert(recent == ["dlg_a", "dlg_b"], "get_recent_dialogue_ids should return ids in the order they were used")

	save.save_game(0)
	memory.load_state({})
	_assert(memory.get_recent_dialogue_ids("kaosu").is_empty(), "sanity check: load_state({}) should clear the dialogue history")
	save.load_game(0)
	_assert(memory.get_recent_dialogue_ids("kaosu") == ["dlg_a", "dlg_b"], "last_dialogues should survive the save/load round trip via memory.json")


# --- Home/Battle統合の簡易確認: シーンが実際にDialogueDatabaseを使ってもエラーにならないこと ---

func _test_home_battle_integration_smoke(dialogue_db: Node) -> void:
	var entries: Array = dialogue_db.get_entries("kaosu")
	_assert(entries.size() >= 10, "kaosu should have a reasonably-sized dialogue set loaded from game/data/dialogue/kaosu/*.json (%d entries found)" % entries.size())

	var home_scene: PackedScene = load("res://game/scenes/home/Home.tscn")
	var home: Control = home_scene.instantiate()
	root.add_child(home)
	var greeting_label: RichTextLabel = home.get_node("GreetingBox/GreetingLabel")
	_assert(greeting_label.text != "" and not greeting_label.text.begins_with("["), "Home should still resolve a real greeting after wiring in DialogueDatabase")
	home.queue_free()

	var battle_scene: PackedScene = load("res://game/scenes/battle/BattleMock.tscn")
	var battle: Control = battle_scene.instantiate()
	root.add_child(battle)
	var log_label: RichTextLabel = battle.get_node("Panel/VBox/LogScroll/LogLabel")
	_assert(log_label.text != "", "BattleMock should still produce log text after wiring in DialogueDatabase")
	battle.queue_free()


func _assert(condition: bool, message: String) -> void:
	if not condition:
		_ok = false
		printerr("ASSERT FAILED: %s" % message)
