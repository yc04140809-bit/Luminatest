extends SceneTree

## Character Gallery System の動作確認用ヘッドレステスト。
## データ読込・解放条件判定・検索フィルタ・画面遷移(GalleryRoot)を検証する。
## 実行: godot --headless --script res://tools/gallery_smoke_test.gd
##
## 自動登録されたautoloadの_ready()は次フレームで実行されるため、
## _initializeでは即座に検証せず、_processで1フレーム待ってから実行する。

var _ok := true
var _frames := 0
var _flags: Node
var _repo: Node


func _process(_delta: float) -> bool:
	_frames += 1
	if _frames < 2:
		return false
	_run_test()
	return true


func _run_test() -> void:
	_flags = root.get_node("Flags")
	_repo = root.get_node("GalleryRepository")

	_flags.reset()

	# --- カテゴリ定義の読み込み確認 ---
	var categories: Array = _repo.get_categories()
	_assert(categories.size() == 9, "expected 9 categories, got %d" % categories.size())

	var enabled_ids: Array = []
	var disabled_ids: Array = []
	for c in categories:
		if c.get("enabled", true):
			enabled_ids.append(c.get("id"))
		else:
			disabled_ids.append(c.get("id"))
	_assert(disabled_ids.has("voice") and disabled_ids.has("live2d"), "voice/live2d should be disabled categories, got %s" % str(disabled_ids))
	_assert(enabled_ids.has("standing_art") and enabled_ids.has("event_cg"), "standing_art/event_cg should be enabled")

	# --- 未解放状態(フラグ無し)での判定 ---
	_assert(_repo.is_character_unlocked("kaosu") == false, "kaosu should be locked before met_kaosu flag")

	var expressions_locked: Array = _repo.get_category_entries("expressions", "kaosu")
	var normal_entry: Dictionary = _find_entry(expressions_locked, "kaosu_normal")
	var smile_entry: Dictionary = _find_entry(expressions_locked, "kaosu_smile")
	_assert(normal_entry.get("unlocked", false) == true, "kaosu_normal has no conditions, should always be unlocked")
	_assert(smile_entry.get("unlocked", false) == false, "kaosu_smile requires met_kaosu flag, should be locked initially")

	var cg_locked: Array = _repo.get_category_entries("event_cg", "kaosu")
	_assert(cg_locked[0].get("unlocked", false) == false, "event CG should be locked before midboss flag")

	var costume_locked: Array = _repo.get_category_entries("costumes", "kaosu")
	_assert(costume_locked[0].get("unlocked", false) == false, "costume should be locked without item")

	# --- フラグ/アイテム所持後の解放確認 ---
	_flags.set_flag("met_kaosu", true)
	_assert(_repo.is_character_unlocked("kaosu") == true, "kaosu should unlock after met_kaosu flag")

	var expressions_unlocked: Array = _repo.get_category_entries("expressions", "kaosu")
	_assert(_find_entry(expressions_unlocked, "kaosu_smile").get("unlocked", false) == true, "kaosu_smile should unlock after met_kaosu flag")

	_flags.set_flag("item_owned_item_gothic_dress_ticket", true)
	var costume_unlocked: Array = _repo.get_category_entries("costumes", "kaosu")
	_assert(costume_unlocked[0].get("unlocked", false) == true, "costume should unlock after item_owned flag")

	# --- 検索/絞り込み ---
	var all_summaries: Array = _repo.get_character_summaries({})
	_assert(all_summaries.size() == 1, "expected 1 character in gallery data, got %d" % all_summaries.size())

	var acquired_only: Array = _repo.get_character_summaries({"acquired_only": true})
	_assert(acquired_only.size() == 1, "kaosu should appear in acquired_only filter after unlock")

	_flags.reset()
	var unacquired_only: Array = _repo.get_character_summaries({"unacquired_only": true})
	_assert(unacquired_only.size() == 1, "kaosu should appear in unacquired_only filter before unlock")

	var element_filter: Array = _repo.get_character_summaries({"element": "chaos"})
	_assert(element_filter.size() == 1, "element filter 'chaos' should match kaosu")
	var element_filter_none: Array = _repo.get_character_summaries({"element": "unknown_element"})
	_assert(element_filter_none.size() == 0, "element filter with unknown element should match nothing")

	# --- 画面遷移(GalleryRoot) ---
	_flags.set_flag("met_kaosu", true)
	var gallery_scene: PackedScene = load("res://game/gallery/scenes/GalleryRoot.tscn")
	var gallery_root: Control = gallery_scene.instantiate()
	root.add_child(gallery_root)

	var view_container: Node = gallery_root.get_node("ViewContainer")
	_assert(view_container.get_child_count() == 1, "GalleryRoot should start with TopView pushed")
	_assert(view_container.get_child(0).name == "GalleryTopView", "initial view should be GalleryTopView, got %s" % view_container.get_child(0).name)

	gallery_root.open_character_list()
	_assert(view_container.get_child_count() == 2, "open_character_list should push a second view")
	_assert(view_container.get_child(1).name == "GalleryCharacterListView", "expected GalleryCharacterListView")

	gallery_root.open_character_detail("kaosu")
	_assert(view_container.get_child_count() == 3, "open_character_detail should push a third view")
	var detail_view: Control = view_container.get_child(2)
	_assert(detail_view.name == "GalleryCharacterDetailView", "expected GalleryCharacterDetailView")

	var name_label: Label = detail_view.get_node("ScrollContainer/VBox/NameLabel")
	_assert(name_label.text == "ケイオス", "detail view should show resolved character name, got '%s'" % name_label.text)

	var skill_list: Node = detail_view.get_node("ScrollContainer/VBox/SkillList")
	_assert(skill_list.get_child_count() == 1, "expected 1 skill entry in detail view")

	gallery_root.show_image_viewer(["res://game/assets/characters/kaosu/base/kaosu_base.png"], 0)
	var image_viewer: Control = gallery_root.get_node("ImageViewer")
	_assert(image_viewer.visible == true, "image viewer should be visible after show_image_viewer")

	if _ok:
		print("GALLERY_SMOKE_TEST_RESULT: PASS")
	else:
		print("GALLERY_SMOKE_TEST_RESULT: FAIL")
	quit(0 if _ok else 1)


func _find_entry(entries: Array, id: String) -> Dictionary:
	for e in entries:
		if e.get("id", "") == id:
			return e
	return {}


func _assert(condition: bool, message: String) -> void:
	if not condition:
		_ok = false
		printerr("ASSERT FAILED: %s" % message)
