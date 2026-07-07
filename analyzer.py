"""analyzer.py

「AIケイオス参謀 β」の育成ゲーム風フィードバックロジック。

predicted_buzz_score（予測バズスコア）に応じて経験値を加算し、
一定値でケイオス参謀レベルをアップさせる。レベルアップ時には
新しいバズ語彙・作戦名を解放する。

注意: ここで扱う「予測」「インプレッション」はすべてデモ用の疑似値であり、
実際のSNS計測値ではない（実インプレッション取得は今回のMVPでは行わない）。
"""

from __future__ import annotations

import datetime
from typing import Any

# レベルアップ時に解放される可能性のある新語彙プール
VOCABULARY_POOL_SOURCE: list[str] = [
    "共感フック",
    "逆張りしない差別化",
    "体験談導入",
    "失敗談シェア",
    "小さな気づき",
    "保存される投稿",
    "朝の宣言",
    "やさしい問題提起",
]

# レベルアップ時に解放される可能性のある新作戦名プール
STRATEGY_TITLE_POOL: list[str] = [
    "共感フック作戦",
    "安全バズ作戦",
    "朝活ブースト作戦",
    "失敗談リライト作戦",
    "あるある共鳴作戦",
    "保存率アップ作戦",
]

# post_history に保存する件数の上限（無制限に増え続けないようにする）
# TODO(将来拡張): 本格的なDB導入時にはこの上限を撤廃し、全履歴を永続化する。
MAX_POST_HISTORY = 30

# レベルアップ時の参謀コメント
_LEVEL_UP_MESSAGE = "ケイオス参謀レベルが上がったよ。新しいバズ語彙を解放したね。"
_NORMAL_MESSAGE_TEMPLATES = [
    "今日の作戦、いい感じに育ってきたよ。この調子でいこう。",
    "無理せず続けるのが、いちばんの近道だよ。",
    "今日も一緒に、無理なく伸びる投稿を考えようね。",
]


def _xp_required_for_level(level: int) -> int:
    """指定レベルから次のレベルに上がるために必要な累計経験値。"""
    return level * 100


def _next_unused(pool: list[str], existing: list[str], count: int) -> list[str]:
    """pool の中から existing に無いものを順番に count 個取り出す。

    pool を使い切った場合は連番付きの語彙名で補う（枯渇対策）。
    """
    picked: list[str] = []
    for item in pool:
        if len(picked) >= count:
            break
        if item not in existing and item not in picked:
            picked.append(item)

    extra_index = 1
    while len(picked) < count:
        candidate = f"{pool[extra_index % len(pool)]}+{extra_index}"
        if candidate not in existing and candidate not in picked:
            picked.append(candidate)
        extra_index += 1

    return picked


def apply_chaos_growth_feedback(
    persona: dict[str, Any],
    predicted_buzz_score: int,
    post_result: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """予測バズスコアに応じて persona を成長させ、成長ログを返す。

    persona は呼び出し元が事前に ensure_persona_keys() 済みであることを
    前提とするが、念のためキーが無くても壊れないようにデフォルト値で
    アクセスする。
    """
    predicted_buzz_score = max(0, min(100, int(predicted_buzz_score or 0)))

    xp_gained = predicted_buzz_score
    persona["experience_points"] = persona.get("experience_points", 0) + xp_gained

    new_vocabulary: list[str] = []
    new_strategy_titles: list[str] = []
    leveled_up = False

    while persona["experience_points"] >= _xp_required_for_level(persona.get("growth_level", 1)):
        persona["experience_points"] -= _xp_required_for_level(persona.get("growth_level", 1))
        persona["growth_level"] = persona.get("growth_level", 1) + 1
        leveled_up = True

        gained_vocab = _next_unused(
            VOCABULARY_POOL_SOURCE, persona.get("vocabulary_pool", []), 3
        )
        persona.setdefault("vocabulary_pool", []).extend(gained_vocab)
        new_vocabulary.extend(gained_vocab)

        gained_title = _next_unused(
            STRATEGY_TITLE_POOL, persona.get("strategy_titles", []), 1
        )
        persona.setdefault("strategy_titles", []).extend(gained_title)
        new_strategy_titles.extend(gained_title)

    # 疑似インプレッション（実測値ではないデモ用の数値）
    pseudo_impressions = predicted_buzz_score * 120
    persona["total_predicted_impressions"] = (
        persona.get("total_predicted_impressions", 0) + pseudo_impressions
    )

    # トレンド親和度は指数移動平均でゆるやかに更新する
    prev_affinity = persona.get("current_trend_affinity", 0) or 0
    new_affinity_sample = predicted_buzz_score
    persona["current_trend_affinity"] = round(
        prev_affinity * 0.7 + new_affinity_sample * 0.3
    )

    if leveled_up:
        persona["chaos_advisor_message"] = _LEVEL_UP_MESSAGE
    else:
        idx = persona.get("growth_level", 1) % len(_NORMAL_MESSAGE_TEMPLATES)
        persona["chaos_advisor_message"] = _NORMAL_MESSAGE_TEMPLATES[idx]

    history_entry: dict[str, Any] = {
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "predicted_buzz_score": predicted_buzz_score,
    }
    if post_result:
        history_entry.update(
            {
                "post_text": post_result.get("post_text"),
                "hashtags": post_result.get("hashtags"),
                "strategy_title": post_result.get("strategy_title"),
                "risk_level": post_result.get("risk_level"),
            }
        )
    persona.setdefault("post_history", []).append(history_entry)
    persona["post_history"] = persona["post_history"][-MAX_POST_HISTORY:]

    growth_log = {
        "xp_gained": xp_gained,
        "leveled_up": leveled_up,
        "growth_level": persona["growth_level"],
        "experience_points": persona["experience_points"],
        "xp_to_next_level": _xp_required_for_level(persona["growth_level"]),
        "new_vocabulary": new_vocabulary,
        "new_strategy_titles": new_strategy_titles,
        "total_predicted_impressions": persona["total_predicted_impressions"],
        "current_trend_affinity": persona["current_trend_affinity"],
        "chaos_advisor_message": persona["chaos_advisor_message"],
    }
    return growth_log
