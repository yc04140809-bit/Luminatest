# CHAOS RE:BIRTH — Godotプロジェクト

最高位ルール: [`PROJECT_BIBLE.md`](../PROJECT_BIBLE.md) / 設計書: [`GAME_DESIGN_DOCUMENT.md`](../docs/design/GAME_DESIGN_DOCUMENT.md) , [`GAME_EXPERIENCE_DESIGN.md`](../docs/design/GAME_EXPERIENCE_DESIGN.md)

## Phase1(基盤構築)実装状況

- `core/story_engine/` : JSON駆動の会話再生エンジン(コア層、IP非依存)
- `core/localization_core/` : テキストキー方式のローカライズ基盤
- `game/autoload/` : GameManager / SaveManager / AudioManager(スタブ) / Flags
- `game/scenes/title/` , `game/scenes/story/` : タイトル ⇄ 会話シーンの最小プレイアブルスライス

## Character Gallery System 実装状況(設計書 第18章)

本編(ストーリー・戦闘)とは独立したサブシステムとして実装。

- `core/gallery_engine/GalleryUnlockEvaluator.gd` : 解放条件判定(IP非依存、Callable経由でgame層から注入)
- `core/ui_kit/GalleryThumbnail.tscn` / `GalleryCategoryTile.tscn` / `GalleryImageViewer.tscn` : サムネイル・カテゴリタイル・タップ拡大＋スワイプ送りの画像ビューア(いずれもIP非依存)
- `game/gallery/GalleryRepository.gd` : `game/data/gallery/*.json` の読み込みと検索/絞り込み(autoload)
- `game/gallery/scenes/GalleryRoot.tscn` : カテゴリ選択 → キャラ一覧(検索/絞り込み) → キャラ詳細 → 画像ビューア

## Phase2 MVP 実装状況(体験設計書 第1・3章、PROJECT_BIBLE準拠)

「ケイオスちゃんに会えて、会話して、もう一度起動したくなる」を完成基準に、新規設計を増やさず動くものを実装。

- `game/scenes/home/Home.tscn` : ホーム画面。ゲーム起動後・各コンテンツ終了後は必ずここへ戻る。時間帯(朝/昼/夕方/夜/深夜、`game/data/home/time_bands.json`)で背景・BGM・挨拶が変化し、Memoryがあれば挨拶に優先的に混ぜ込む。ケイオスちゃんをタップすると挨拶を再抽選できる。
- `core/memory_engine/MemorySelector.gd` : Memory選定ロジック(IP非依存)。重要度×新鮮さ(参照回数)×直近タグの多様性でスコアリングし、同じ話ばかりにならないようにする。
- `game/memory/MemoryManager.gd` : Memory定義(`game/data/memory/*.json`)の読込・発生条件判定・記録・セーブ連携(autoload)。Phase2 MVPでは発生条件は `story_flag` のみに絞り、初回Home訪問・出会い・初戦闘の勝敗を記録する。
- `game/scenes/battle/BattleMock.tscn` : 仮戦闘。攻撃ボタンで殴り合うだけの最小構成。勝敗をFlagsに記録し、Memory Systemの初勝利/初敗北トリガーとなる(第13章の本格的なターン制バトルは未実装)。
- セーブは `story_progress.json` に加えて `memory.json` を保存/復元する(第14章のモジュール分割セーブを踏襲)。
- Title「はじめから」→ 会話(JSON) → Home。「つづきから」→ Home へ直接。

### Golden Slice Review 改善(1周目)

CLAUDE.md記載の7項目レビューを実施した結果、BattleMockが「ケイオスちゃんが目立っていない」「気持ちよくない」「テンポが悪い」「PROJECT_BIBLEのDESIGN原則に反する」でNOと判定し、以下を改善した。

- `core/ui_kit/SceneFader.gd` : 画面遷移フェード(IP非依存、autoload)。すべてのシーン遷移(`GameManager.goto_*`)を0.45秒フェードに統一し、瞬間切り替えを排除。
- `game/scenes/battle/BattleMock.tscn` : ケイオスちゃんの立ち絵を常時表示し、攻撃のたびに軽いパンチ演出(伸縮tween)を追加。プレイヤー/敵の攻撃応酬に0.35秒の間を入れ、テンポを調整。

再レビューで7項目すべてYESとなったため次工程へ進行。

## 表情システム / アイドルモーション / Memoryリアクション / Affection(RelationshipStage)

体験設計書 第2・3・5章の設計を実装に統合(新規設計章は追加せず)。

- `core/ui_kit/CharacterPortraitView.gd` : 立ち絵表示の共通コンポーネント(IP非依存)。表情差分の解決(未整備の表情はnormalへ自動フォールバック)、瞬き・呼吸のアイドルモーション、演出中の一時停止(`set_motion_enabled`)、将来Live2D差し替え用のモーションパラメータチャンネルを1箇所に集約。Home/Story/Battleすべての立ち絵表示をこれに統一した。
- `core/affection_engine/AffectionEvaluator.gd` : ポイント→レベル→RelationshipStageの変換ロジック(IP非依存の純粋関数)。
- `game/affection/AffectionManager.gd` : Affectionのgame層実装(autoload)。内部ではポイントを保持するが、外部公開APIは必ず `RelationshipStage`(stranger/acquaintance/friend/best_friend/family の文字列)を介す。数値を直接見て挙動分岐することを禁止する設計。
- `game/memory/MemoryManager.gd` を拡張: `story_flag` に加え `login_streak` / `absence_return` / `date_special`(anniversary/birthday)のトリガー種別を追加。「昨日来てくれたね」「連続ログイン」「久しぶり」「記念日」を実際に検知できる。会話側APIとして `pick_reaction_text_key()`(旧`pick_greeting_text_key`から改称・汎用化)と `get_last_referenced_id()`(前回話題)を整理。
- `core/story_engine/StoryEngine.gd` に `say_memory` コマンドを追加。シナリオJSONから「今言えることを1つ話す」をMemory Systemに委譲できる(該当なしなら自動で読み飛ばす)。
- `core/localization_core/LocalizationManager.gd` に `t_for_context(base_key, context)` を追加。`<key>_<stage>` があれば使い、無ければ元のキーへ自動フォールバックするため、全パターンのテキストを用意しなくてもRelationshipStage別の口調変化が破綻しない。
- Home画面: タップのたびにRelationshipStageの`smile_bias`に応じて表情(笑顔/通常)を再抽選。挨拶は「戦闘直後のリキャップ(一度きり)→Memoryリアクション→時間帯の通常挨拶」の優先順位で合成し、すべてRelationshipStage別の言い回しに対応。
- 親密度ポイントの付与: Home初回訪問+10、会話シーン終了+5、戦闘勝利+20(いずれも仮の値、バランス調整は今後)。
- セーブに `affection.json` モジュールを追加。

## Emotion Engine(瞬間の感情。Memory/RelationshipStage/Story/Battle/Homeが共有する共通エンジン)

新規設計章は追加せず、既存4システムから呼べる共通エンジンとして統合。「ケイオスちゃんが毎回同じ反応ではなく、今この瞬間の感情で自然に話す」ことが目的。

- `core/emotion_engine/EmotionEngine.gd` : 候補(候補: emotion/priority/duration_sec)から優先度最大のものを選ぶ純粋関数と、持続時間の経過判定(IP非依存)。
- `game/emotion/EmotionManager.gd` : Emotionのgame層実装(autoload)。状態一覧・イベント→感情の対応表は一切コードへ書かず `game/data/emotion/emotion_states.json`(状態: NORMAL/HAPPY/SHY/SAD/ANGRY/SURPRISED/THINKING/SLEEPY/EXCITED/TIRED/SPECIAL の11種、将来100種以上追加可能)と `emotion_rules.json`(イベントID→感情の対応表)から解決する。**MemoryManager・AffectionManagerを直接呼び出さない**(責務分離。橋渡しはHome.gd/StoryPlayer.gd/BattleMock.gdといった各画面のオーケストレーションコードが担う)。
- Emotion Priority: 新しい候補と、まだ持続時間内の現在の感情を比較し優先度が高い方を採用。弱いアンビエント信号(時間帯・RelationshipStage基準)は強い出来事(戦闘結果等)を上書きしない。Emotion Duration: 持続時間が経過すると自動的にNORMAL等へ戻る(次に問い合わせた時点で遅延評価、常時ticking不要)。
- `core/ui_kit/CharacterPortraitView.gd` に表情クロスフェード(0.12秒×2)を追加し、瞬間切替を禁止(初回表示のみ即時)。
- `core/story_engine/StoryEngine.gd` に `choice_selected` シグナルを追加。選択肢JSONの任意フィールド `emotion_tag` をそのまま通知し、StoryPlayerがEmotionManagerへ橋渡しする(プレイヤー選択肢→Emotion)。
- `core/localization_core/LocalizationManager.gd` に `t_for_contexts(base_key, [emotion, stage])` を追加。Emotion別の言い回しをRelationshipStage別より優先して探し、無ければ元のキーへフォールバックする。
- Memory連携: Memory定義に任意の `emotion_bias` を追加可能にし(例: 初敗北→SAD、久しぶり→SAD、30日記念日→SPECIAL)、`MemoryManager.get_last_picked_emotion_bias()` で取得できるようにした。MemoryManager自体はEmotionの存在を知らない。
- Battle連携: `BattleMock` が勝利/敗北/瀕死(HP25%以下)でEmotionManagerへ通知し、表情へ即反映。ボス撃破→EXCITED、レベルアップ・必殺技使用のAPIも用意(実システム未実装のため現状未接続)。
- Home連携: 時間帯(深夜→SLEEPY等)・RelationshipStage基準・久しぶりログイン(→HAPPY)・長時間プレイ(45分→TIRED)をアンビエント信号として通知。
- セーブに `emotion.json` モジュールを追加。

## 動作確認方法

Godot 4.3 (stable) の実行ファイルがあれば、GUIなしで動作確認できる。

```bash
# ロジック単体テスト: StoryEngine → Flags → SaveManager → LocalizationManager の一連
godot --headless --script res://tools/smoke_test.gd

# UIシーンテスト: Title.tscn → (はじめから押下) → StoryPlayer.tscn への遷移確認
godot --headless --script res://tools/ui_smoke_test.gd

# ギャラリーテスト: データ読込・解放条件判定・検索フィルタ・画面遷移の確認
godot --headless --script res://tools/gallery_smoke_test.gd

# Phase2 MVPテスト: Home初回訪問Memory記録・挨拶合成・仮戦闘勝敗・セーブ/ロード往復
godot --headless --script res://tools/phase2_smoke_test.gd

# 表情/アイドルモーション/Memoryリアクション/Affectionテスト
godot --headless --script res://tools/expression_memory_affection_smoke_test.gd

# Emotion Engineテスト: 優先度解決・持続時間・Battle/Home/Memory/Story連携・セーブ往復
godot --headless --script res://tools/emotion_engine_smoke_test.gd
```

いずれも最後に `..._RESULT: PASS` が出力されれば正常(exit code 0)。

エディタで見た目を確認する場合は `project.godot` をGodot 4.3のエディタで開き、`F5`(または `game/scenes/title/Title.tscn` を指定して実行)。

## 既知の制約

- 立ち絵・背景・CG・衣装は `img/kaosu/` の既存アセットを仮流用(最終アートではない)。ホーム背景も2種の既存画像を時間帯ごとに使い回している。
- BGM/SEは未組み込み(`AudioManager` はスタブのみ)。
- ギャラリーの解放条件(`event_clear` / `party_join` / `item_owned`)は、体験設計書で定義済みだが、Phase2 MVPでは `Flags` の規約キーで暫定判定(InventoryやPartyManager実装後に差し替え予定)。
- Memoryの `first_time`(初勝利以外の初回系: 初レベルアップ・初ボス撃破・初衣装変更・初スキル習得等)、誕生日(ケイオスちゃんの誕生日は本編で明かされる伏線のため、トリガーの型のみ実装しデータは未設定)は未着手。
- 仮戦闘は属性・状態異常・スキル・必殺技を持たない最小構成(第13章のBattle Systemは未実装)。
- 表情差分は現在 normal/smile の2種類のみ実データがあり、他6種(照れ/怒り/悲しい/驚き/考え中/眠い)はCharacterPortraitView側で正しくnormalへフォールバックする(コードは完成、アセット待ち)。
- アイドルモーションは瞬き・呼吸のみ実装(1枚絵のため)。髪揺れ・翼揺れはLive2D導入時に備えたモーションパラメータチャンネルとしてAPIのみ用意し、現状は見た目に反映しないダミー実装(体験設計書 第5.2節の想定どおり)。
- Affection/Emotionの口調変化は `t_for_contexts` の仕組みが機能することを確認できる代表例(「おかえり」等)のみ用意。全キー・全パターンの言い回しは今後拡充する。
- Emotionのレベルアップ・必殺技使用は将来のBattle System本実装向けのAPI(`notify_level_up`/`notify_ultimate_used`)のみ用意し、実際のゲームプレイからは未接続(対応するシステム自体が未実装のため)。
- World/Collectionは体験設計書に設計済みだが未着手。
