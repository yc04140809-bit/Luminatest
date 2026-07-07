"""composer.py

「AIケイオス参謀 β」の投稿案生成ロジック。

重要:
    - ここでは投稿文の「案」を作るだけで、実際のSNS投稿は一切行わない。
    - ユーザーが手動でコピーして投稿する前提のテキストを組み立てる。
    - 炎上狙い・攻撃的表現・誤情報・過度な煽りを避け、テンプレートベースで
      安全に生成する。将来LLMに差し替える場合は _try_llm_generate() を実装する。
"""

from __future__ import annotations

import random
from typing import Any

from trend_detector import is_text_safe

MAX_POST_LENGTH = 140

# ケイオスちゃんの参謀コメント（通常時）
_ADVISOR_LINES_NORMAL = [
    "今日のトレンド、わたしが読んできたよ。",
    "安全に、でもちゃんと伸びる作戦でいこう。",
    "この作戦なら、無理なく共感してもらえるはず。",
    "焦らなくて大丈夫。着実に伸ばしていこうね。",
]

# 危険ワードを検出して差し替えた場合の参謀コメント
_ADVISOR_LINES_RISK = [
    "この投稿は少し炎上リスクがあるかも。別案も出しておくね。",
    "ちょっと攻めすぎかもって思ったから、安全な言い回しに変えておいたよ。",
]

# 投稿本文の型（{trend}・{vocab}・{tone} に差し込む）
_POST_TEMPLATES = [
    "最近{trend}が気になっていて、少しずつ試してみてる。\n{vocab}できることが増えると、それだけで嬉しい。",
    "{trend}について、今日わかったことをメモ。\n完璧じゃなくていい、まずは{vocab}から始めてみる。",
    "{trend}、みんなはどう向き合ってる?\n私はまず小さく試して、{vocab}を大事にしてる。",
    "{trend}に触れてみて感じたこと。\n無理せず、{vocab}できるペースでいいんだと思う。",
]

_FALLBACK_TEMPLATE = "今日は{trend}について考えてみた。\n{vocab}のきっかけになったら嬉しいな。"

# ハッシュタグを組み立てる際の共通タグ候補
_COMMON_HASHTAGS = ["#今日の学び", "#気づき", "#成長記録"]


def _pick_strategy_title(persona: dict[str, Any]) -> str:
    titles = persona.get("strategy_titles") or ["初期作戦"]
    return random.choice(titles)


def _pick_vocabulary(persona: dict[str, Any]) -> str:
    vocab_pool = persona.get("vocabulary_pool") or ["共感"]
    return random.choice(vocab_pool)


def _build_post_text(trend: str, vocab: str) -> str:
    template = random.choice(_POST_TEMPLATES)
    text = template.format(trend=trend, vocab=vocab)
    if len(text) > MAX_POST_LENGTH:
        text = text[: MAX_POST_LENGTH - 1] + "…"
    return text


def _build_hashtags(trend: str, vocab: str, persona: dict[str, Any]) -> list[str]:
    tags: list[str] = []
    trend_tag = "#" + trend.replace(" ", "")
    tags.append(trend_tag)

    vocab_tag = "#" + vocab.replace(" ", "")
    if vocab_tag not in tags:
        tags.append(vocab_tag)

    for tag in _COMMON_HASHTAGS:
        if len(tags) >= 5:
            break
        if tag not in tags:
            tags.append(tag)

    # 最低3個は確保する
    fallback_index = 0
    fallback_tags = ["#AI活用", "#日々の記録", "#前向き習慣"]
    while len(tags) < 3 and fallback_index < len(fallback_tags):
        if fallback_tags[fallback_index] not in tags:
            tags.append(fallback_tags[fallback_index])
        fallback_index += 1

    return tags[:5]


def _predicted_scores(persona: dict[str, Any], trend: str) -> tuple[int, int]:
    """(trend_affinity, predicted_buzz_score) を返す簡易スコアリング。"""
    base_affinity = persona.get("current_trend_affinity", 0) or 0
    vocab_richness = len(persona.get("vocabulary_pool") or [])
    level = persona.get("growth_level", 1) or 1

    trend_affinity = min(100, max(10, int(base_affinity * 0.6 + random.randint(40, 90))))
    buzz_score = min(
        100,
        max(
            15,
            int(trend_affinity * 0.5 + vocab_richness * 3 + level * 2 + random.randint(0, 15)),
        ),
    )
    return trend_affinity, buzz_score


def _try_llm_generate(persona: dict[str, Any], trend: str, vocab: str) -> str | None:
    """LLMによる生成を試みる拡張ポイント（MVPでは未接続）。

    TODO(将来拡張): LLM_API_KEY が設定されている場合はここで実際のLLM呼び出しを
    実装する。呼び出しに失敗した場合は None を返し、呼び出し元がテンプレート
    生成にフォールバックする設計にすること。
    """
    return None


def generate_chaos_strategy_post(persona: dict[str, Any], trends: list[str]) -> dict[str, Any]:
    """Personaの口調とトレンドを踏まえた投稿作戦案を1件生成する。

    自動投稿は行わない。戻り値はユーザーが手動でコピーして使うための案。
    """
    safe_trends = [t for t in trends if is_text_safe(t)] or ["今日の気づき"]
    trend = random.choice(safe_trends)
    vocab = _pick_vocabulary(persona)
    strategy_title = _pick_strategy_title(persona)

    post_text = _try_llm_generate(persona, trend, vocab)
    if not post_text:
        post_text = _build_post_text(trend, vocab)

    risk_level = "low"
    risk_reason = "炎上リスクの低い一般的な学び投稿のため"
    advisor_message = random.choice(_ADVISOR_LINES_NORMAL)

    # 生成された本文自体にも念のため安全チェックをかける
    if not is_text_safe(post_text):
        post_text = _FALLBACK_TEMPLATE.format(trend=trend, vocab=vocab)
        if len(post_text) > MAX_POST_LENGTH:
            post_text = post_text[: MAX_POST_LENGTH - 1] + "…"
        risk_level = "medium"
        risk_reason = "特定ワードに炎上リスクの可能性があったため、安全な表現に差し替えました"
        advisor_message = random.choice(_ADVISOR_LINES_RISK)

    if len(post_text) > MAX_POST_LENGTH:
        post_text = post_text[: MAX_POST_LENGTH - 1] + "…"

    hashtags = _build_hashtags(trend, vocab, persona)
    trend_affinity, predicted_buzz_score = _predicted_scores(persona, trend)

    copy_ready_text = post_text + "\n\n" + " ".join(hashtags)

    return {
        "advisor_message": advisor_message,
        "post_text": post_text,
        "hashtags": hashtags,
        "risk_level": risk_level,
        "risk_reason": risk_reason,
        "trend_affinity": trend_affinity,
        "predicted_buzz_score": predicted_buzz_score,
        "strategy_title": strategy_title,
        "copy_ready_text": copy_ready_text,
        "source_trend": trend,
    }
