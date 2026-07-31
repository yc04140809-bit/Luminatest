extends Node

## ゲーム全体の状態管理・シーン遷移(game層)
## PROJECT_BIBLE / 体験設計書 第1章: ゲーム起動後・各コンテンツ終了後は必ずホームへ戻る。

const TITLE_SCENE := "res://game/scenes/title/Title.tscn"
const HOME_SCENE := "res://game/scenes/home/Home.tscn"
const STORY_SCENE := "res://game/scenes/story/StoryPlayer.tscn"


func goto_title() -> void:
	get_tree().change_scene_to_file(TITLE_SCENE)


func goto_home() -> void:
	get_tree().change_scene_to_file(HOME_SCENE)


func goto_story_scene(json_path: String) -> void:
	var story_scene: PackedScene = load(STORY_SCENE)
	var instance: Node = story_scene.instantiate()
	instance.scene_json_path = json_path
	get_tree().root.add_child(instance)
	var previous := get_tree().current_scene
	get_tree().current_scene = instance
	if previous != null:
		previous.queue_free()


func on_story_scene_finished() -> void:
	goto_home()
