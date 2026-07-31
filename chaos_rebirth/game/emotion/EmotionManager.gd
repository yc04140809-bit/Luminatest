extends Node

## Emotion Engineのgame層実装。Memory System / RelationshipStage(Affection) /
## Story / Battle / Home のいずれからも呼べる共通エンジンとして設計する。
##
## 責務分離(重要):
##   - MemoryManager・AffectionManagerを本スクリプトから直接呼び出すことはしない。
##     関係性の橋渡し(Memoryの感情バイアスを取り込む等)は各画面のオーケストレーション
##     コード(Home.gd等)が担い、EmotionManagerは「渡された候補を優先度で解決する」
##     ことだけに専念する。Memoryの「発生条件を満たしたら記録する」役割や
##     Affectionの「ポイント→ステージ変換」役割を重複実装しない。
##   - 判定ロジック本体(候補から1つ選ぶ・期限切れ判定)は core/emotion_engine の
##     EmotionEngine(IP非依存の純粋関数)に委譲する。
##
## Emotionの中身(状態一覧・各種イベント→感情の対応表)は一切コードへ直接書かず、
## game/data/emotion/*.json で定義する(将来100種類以上の追加はデータ追加のみで可能)。

const STATES_PATH := "res://game/data/emotion/emotion_states.json"
const RULES_PATH := "res://game/data/emotion/emotion_rules.json"
const DEFAULT_EMOTION := "NORMAL"
const LONG_SESSION_SECONDS := 2700.0  # 45分

var _states: Dictionary = {}   # emotion_id -> { portrait_expression, default_duration_sec }
var _rules: Dictionary = {}    # rule_id -> { emotion, priority, duration_sec }

## character_id -> { emotion, priority, duration_sec, set_at_unix }
var _current: Dictionary = {}

var _session_start_ticks: int = 0
var _now_override_unix: float = -1.0  # テスト用: 実時刻の代わりに使うunix時間


func _ready() -> void:
	_load_states()
	_load_rules()
	_session_start_ticks = Time.get_ticks_msec()


## テスト専用: 経過時間判定に使う「現在時刻」を固定する。負値で実時刻に戻す。
func set_now_override(unix_time: float) -> void:
	_now_override_unix = unix_time


# --- 汎用API ---

## 現在のEmotion(期限切れなら自動的にNORMAL等へフォールバック済み)。
func get_current_emotion(character_id: String) -> String:
	var active := _active_state(character_id)
	if active.is_empty():
		return DEFAULT_EMOTION
	return String(active.get("emotion", DEFAULT_EMOTION))


## CharacterPortraitViewへそのまま渡せる表情キー。
## Emotion定義に対応する表情差分が無い場合は、CharacterPortraitView側で
## さらにnormalへフォールバックされる(このメソッドは単に対応表を引くだけ)。
func get_portrait_expression(character_id: String) -> String:
	var emotion := get_current_emotion(character_id)
	return String(_states.get(emotion, {}).get("portrait_expression", "normal"))


## data/emotion/emotion_rules.json に定義済みのrule_idを適用する。
## Story/Battle/Home等、繰り返し使う定型イベントはこちらを使う。
func notify_event(character_id: String, rule_id: String) -> void:
	if not _rules.has(rule_id):
		push_warning("EmotionManager: unknown rule_id '%s'" % rule_id)
		return
	var rule: Dictionary = _rules[rule_id]
	_apply_candidate(character_id, _candidate_from(rule))


## rule_idを介さず、その場で候補(emotion/priority/duration_sec)を直接渡す。
## Memory定義の emotion_bias 等、呼び出し側ごとに内容が異なるものに使う。
func notify_bias(character_id: String, bias: Dictionary) -> void:
	if bias.is_empty():
		return
	_apply_candidate(character_id, _candidate_from(bias))


func get_state() -> Dictionary:
	return { "schema_version": 1, "current": _current.duplicate(true) }


func load_state(data: Dictionary) -> void:
	_current = data.get("current", {}).duplicate(true)


# --- Battle連携 ---

func notify_battle_result(character_id: String, won: bool, is_boss: bool = false) -> void:
	if won and is_boss:
		notify_event(character_id, "battle_win_boss")
	elif won:
		notify_event(character_id, "battle_win")
	else:
		notify_event(character_id, "battle_loss")


## 瀕死。BattleMock(仮戦闘)から実際に呼ばれる。
func notify_near_death(character_id: String) -> void:
	notify_event(character_id, "near_death")


## レベルアップ・必殺技使用は将来のBattle System本実装向けの受け口(現状未接続)。
func notify_level_up(character_id: String) -> void:
	notify_event(character_id, "level_up")


func notify_ultimate_used(character_id: String) -> void:
	notify_event(character_id, "ultimate_used")


# --- Home連携 ---

func notify_time_band(character_id: String, band_id: String) -> void:
	if band_id == "":
		return
	var rule_id := "time_band_%s" % band_id
	if _rules.has(rule_id):
		notify_event(character_id, rule_id)


func notify_login(character_id: String, gap_days: int) -> void:
	if gap_days >= 7:
		notify_event(character_id, "login_return_long_absence")


func notify_relationship_baseline(character_id: String, stage: String) -> void:
	if stage == "":
		return
	var rule_id := "relationship_baseline_%s" % stage
	if _rules.has(rule_id):
		notify_event(character_id, rule_id)


func get_elapsed_session_seconds() -> float:
	return (Time.get_ticks_msec() - _session_start_ticks) / 1000.0


func check_long_session(character_id: String) -> void:
	if _is_long_session(get_elapsed_session_seconds()):
		notify_event(character_id, "long_session")


func _is_long_session(elapsed_seconds: float) -> bool:
	return elapsed_seconds >= LONG_SESSION_SECONDS


# --- Story連携 ---

## StoryEngineのchoice_selectedシグナル(第12章の選択肢に "emotion_tag" を
## 付けたもの)を受けて呼ぶ。該当ルールが無いタグは静かに無視する。
func notify_player_choice(character_id: String, choice_tag: String) -> void:
	if choice_tag == "":
		return
	var rule_id := "player_choice_%s" % choice_tag
	if _rules.has(rule_id):
		notify_event(character_id, rule_id)


# --- 内部処理 ---

func _candidate_from(source: Dictionary) -> Dictionary:
	var emotion: String = String(source.get("emotion", DEFAULT_EMOTION))
	var default_duration: float = float(_states.get(emotion, {}).get("default_duration_sec", 0))
	return {
		"emotion": emotion,
		"priority": int(source.get("priority", 0)),
		"duration_sec": float(source.get("duration_sec", default_duration)),
	}


## 新しい候補と、まだ有効な現在の感情(あれば)を比較し、優先度が高い方を採用する。
## 現在の感情が既に期限切れなら比較対象に含めない(=自然にNORMAL等へ戻っていく)。
func _apply_candidate(character_id: String, candidate: Dictionary) -> void:
	var current := _active_state(character_id)
	var candidates: Array = [candidate]
	if not current.is_empty():
		candidates.append(current)
	var resolved := EmotionEngine.resolve(candidates, DEFAULT_EMOTION)
	_current[character_id] = {
		"emotion": resolved.get("emotion", DEFAULT_EMOTION),
		"priority": resolved.get("priority", 0),
		"duration_sec": resolved.get("duration_sec", 0.0),
		"set_at_unix": _now(),
	}


func _active_state(character_id: String) -> Dictionary:
	if not _current.has(character_id):
		return {}
	var state: Dictionary = _current[character_id]
	var elapsed: float = _now() - float(state.get("set_at_unix", 0))
	if EmotionEngine.has_expired(elapsed, float(state.get("duration_sec", 0))):
		return {}
	return state


func _now() -> float:
	if _now_override_unix >= 0.0:
		return _now_override_unix
	return Time.get_unix_time_from_system()


func _load_states() -> void:
	for entry in _read_json(STATES_PATH).get("states", []):
		var id: String = entry.get("id", "")
		if id != "":
			_states[id] = entry


func _load_rules() -> void:
	var rules: Dictionary = _read_json(RULES_PATH).get("rules", {})
	for rule_id in rules.keys():
		_rules[rule_id] = rules[rule_id]


func _read_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var f := FileAccess.open(path, FileAccess.READ)
	var text := f.get_as_text()
	f.close()
	var result: Variant = JSON.parse_string(text)
	return result if result is Dictionary else {}
