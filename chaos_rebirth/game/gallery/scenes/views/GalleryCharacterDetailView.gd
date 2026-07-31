extends Control

## キャラクター詳細画面(game層)。
## 全身立ち絵・名前・二つ名・プロフィール・世界設定・所属・属性・身長・誕生日・
## 好きなもの・嫌いなもの・スキル一覧・取得済みCG一覧を1画面に集約する。

const THUMB_SCENE := preload("res://core/ui_kit/GalleryThumbnail.tscn")
const ASSET_ROOT := "res://game/assets/"

var gallery_root: Control
var _character_id: String = ""
var _cg_entries: Array = []

@onready var full_body_art: TextureRect = $ScrollContainer/VBox/FullBodyArt
@onready var name_label: Label = $ScrollContainer/VBox/NameLabel
@onready var alias_label: Label = $ScrollContainer/VBox/AliasLabel
@onready var profile_label: RichTextLabel = $ScrollContainer/VBox/ProfileLabel
@onready var world_setting_label: RichTextLabel = $ScrollContainer/VBox/WorldSettingLabel
@onready var stats_label: RichTextLabel = $ScrollContainer/VBox/StatsLabel
@onready var likes_label: RichTextLabel = $ScrollContainer/VBox/LikesLabel
@onready var dislikes_label: RichTextLabel = $ScrollContainer/VBox/DislikesLabel
@onready var skill_list: VBoxContainer = $ScrollContainer/VBox/SkillList
@onready var cg_grid: GridContainer = $ScrollContainer/VBox/CgGrid


func get_title_key() -> String:
	return "gallery_title_character_detail"


func setup(params: Dictionary) -> void:
	_character_id = params.get("character_id", "")
	var profile := GalleryRepository.get_character_profile(_character_id)

	var art_path := ASSET_ROOT + String(profile.get("full_body_art", ""))
	full_body_art.texture = load(art_path) if ResourceLoader.exists(art_path) else null

	name_label.text = LocalizationManager.t(profile.get("name_key", ""))
	alias_label.text = LocalizationManager.t(profile.get("alias_key", ""))
	profile_label.text = LocalizationManager.t(profile.get("profile_key", ""))
	world_setting_label.text = LocalizationManager.t(profile.get("world_setting_key", ""))

	var affiliation: String = LocalizationManager.t(profile.get("affiliation_key", ""))
	var element: String = profile.get("element", "")
	var height: int = profile.get("height_cm", 0)
	var birthday: String = profile.get("birthday", "")
	stats_label.text = "%s: %s\n%s: %s\n%s: %scm\n%s: %s" % [
		LocalizationManager.t("gallery_label_affiliation"), affiliation,
		LocalizationManager.t("gallery_label_element"), element,
		LocalizationManager.t("gallery_label_height"), str(height),
		LocalizationManager.t("gallery_label_birthday"), birthday,
	]

	likes_label.text = "%s: %s" % [LocalizationManager.t("gallery_label_likes"), LocalizationManager.t(profile.get("likes_key", ""))]
	dislikes_label.text = "%s: %s" % [LocalizationManager.t("gallery_label_dislikes"), LocalizationManager.t(profile.get("dislikes_key", ""))]

	_populate_skills()
	_populate_cg()


func _populate_skills() -> void:
	for child in skill_list.get_children():
		child.queue_free()
	for skill_id in GalleryRepository.get_character_skill_ids(_character_id):
		var label := Label.new()
		label.text = LocalizationManager.t("%s_name" % skill_id)
		skill_list.add_child(label)


func _populate_cg() -> void:
	for child in cg_grid.get_children():
		child.queue_free()
	_cg_entries = GalleryRepository.get_category_entries("event_cg", _character_id)
	for i in _cg_entries.size():
		var entry: Dictionary = _cg_entries[i]
		var thumb: Control = THUMB_SCENE.instantiate()
		cg_grid.add_child(thumb)
		thumb.setup(ASSET_ROOT + String(entry.get("thumbnail", "")), entry.get("unlocked", false))
		thumb.pressed.connect(_on_cg_pressed.bind(i))


func _on_cg_pressed(index: int) -> void:
	var entry: Dictionary = _cg_entries[index]
	if not entry.get("unlocked", false):
		return
	var unlocked_paths: Array = []
	var start_index := 0
	for e in _cg_entries:
		if not e.get("unlocked", false):
			continue
		if e.get("id", "") == entry.get("id", ""):
			start_index = unlocked_paths.size()
		unlocked_paths.append(ASSET_ROOT + String(e.get("image", "")))
	gallery_root.show_image_viewer(unlocked_paths, start_index)
