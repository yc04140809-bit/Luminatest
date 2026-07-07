"""api.py

「AIケイオス参謀 β」FastAPIアプリケーション。

このアプリはSNSへの自動投稿を一切行わない。
ケイオスちゃんが投稿案・作戦名・ハッシュタグ・予測バズスコアを提案し、
ユーザーが手動でコピーして投稿する前提の「投稿作戦会議アプリ」である。

起動方法:
    pip install -r requirements.txt
    uvicorn api:app --reload

主なエンドポイント:
    GET  /persona/status          現在のケイオス参謀ステータスを取得
    POST /chaos/generate-strategy 今日の投稿作戦案を1件生成する
    POST /chaos/simulate-post     投稿はせず、疑似シミュレーション結果を返す
"""

from __future__ import annotations

import logging
import traceback
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from analyzer import apply_chaos_growth_feedback
from composer import generate_chaos_strategy_post
from persona_store import ensure_persona_keys, load_persona, save_persona
from trend_detector import fetch_current_trends, filter_safe_trends

logger = logging.getLogger("chaos_advisor")
logging.basicConfig(level=logging.INFO)

APP_NAME = "AIケイオス参謀 β"
CHARACTER_NAME = "ケイオスちゃん"

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
CHARACTER_IMAGE_PATH = STATIC_DIR / "images" / "chaos_chan.png"
CHARACTER_IMAGE_URL = "/static/images/chaos_chan.png"

# 画像/静的ディレクトリが無くてもアプリが落ちないよう、事前に用意しておく
(STATIC_DIR / "images").mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP_NAME)

# ローカルの静的デモUI(static/chaos_advisor.html)から同一オリジンで
# 呼び出す想定だが、他オリジンからの検証もしやすいよう緩めに許可する。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


def get_character_image_url() -> Optional[str]:
    """画像ファイルが実在する場合のみURLを返す。無ければ None（プレースホルダー表示用）。"""
    if CHARACTER_IMAGE_PATH.exists():
        return CHARACTER_IMAGE_URL
    return None


class SimulatePostRequest(BaseModel):
    post_text: Optional[str] = None
    hashtags: Optional[list[str]] = None
    predicted_buzz_score: Optional[int] = None


def _safe_error_response(context: str, exc: Exception) -> JSONResponse:
    """例外発生時もアプリを落とさず、必ずJSONで返す共通ハンドラ。"""
    logger.error("%s: %s\n%s", context, exc, traceback.format_exc())
    return JSONResponse(
        status_code=200,
        content={
            "error": True,
            "context": context,
            "message": "ごめんね、少し不調みたい。もう一度試してみてね。",
            "detail": str(exc),
        },
    )


@app.get("/")
def root() -> RedirectResponse:
    return RedirectResponse(url="/static/chaos_advisor.html")


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "app_name": APP_NAME}


@app.get("/persona/status")
def get_persona_status() -> dict[str, Any]:
    try:
        persona = load_persona()
        persona = ensure_persona_keys(persona)
        save_persona(persona)

        recent_posts = list(reversed(persona.get("post_history", [])))[:5]

        return {
            "character_name": CHARACTER_NAME,
            "app_name": APP_NAME,
            "character_image_url": get_character_image_url(),
            "growth_level": persona.get("growth_level", 1),
            "experience_points": persona.get("experience_points", 0),
            "total_predicted_impressions": persona.get("total_predicted_impressions", 0),
            "current_trend_affinity": persona.get("current_trend_affinity", 0),
            "vocabulary_pool": persona.get("vocabulary_pool", []),
            "strategy_titles": persona.get("strategy_titles", []),
            "chaos_advisor_message": persona.get("chaos_advisor_message", ""),
            "recent_posts": recent_posts,
        }
    except Exception as exc:  # noqa: BLE001 - アプリを落とさないための最終防波堤
        return _safe_error_response("GET /persona/status", exc)


@app.post("/chaos/generate-strategy")
def post_generate_strategy() -> dict[str, Any]:
    try:
        # 1. persona.json を読み込む（存在しない/壊れている場合も安全に処理される）
        persona = load_persona()
        # 2. 足りないキーを補完する
        persona = ensure_persona_keys(persona)

        # 3. 現在のトレンドを取得する
        trends = fetch_current_trends()
        # 4. 安全フィルターを通す
        safe_trends = filter_safe_trends(trends)

        # 5. ケイオスちゃんの投稿作戦を生成する
        post_result = generate_chaos_strategy_post(persona, safe_trends)

        # 6. 予測バズスコアに応じて成長フィードバックを適用する
        growth_log = apply_chaos_growth_feedback(
            persona, post_result["predicted_buzz_score"], post_result
        )

        # 7. persona.json を保存する
        save_persona(persona)

        # 8. 投稿案、ケイオスちゃんの一言、成長ログを返す
        return {
            "app_name": APP_NAME,
            "character_name": CHARACTER_NAME,
            "character_image_url": get_character_image_url(),
            "post": post_result,
            "growth_log": growth_log,
            "trends_considered": safe_trends,
        }
    except Exception as exc:  # noqa: BLE001
        return _safe_error_response("POST /chaos/generate-strategy", exc)


@app.post("/chaos/simulate-post")
def post_simulate_post(payload: SimulatePostRequest | None = None) -> dict[str, Any]:
    """実際のSNS投稿は行わない。コピー用テキストと疑似シミュレーション結果のみ返す。"""
    try:
        persona = load_persona()
        persona = ensure_persona_keys(persona)

        post_text = payload.post_text if payload else None
        hashtags = payload.hashtags if payload else None
        predicted_buzz_score = payload.predicted_buzz_score if payload else None

        if not post_text or predicted_buzz_score is None:
            trends = fetch_current_trends()
            safe_trends = filter_safe_trends(trends)
            generated = generate_chaos_strategy_post(persona, safe_trends)
            post_text = post_text or generated["post_text"]
            hashtags = hashtags or generated["hashtags"]
            predicted_buzz_score = (
                predicted_buzz_score
                if predicted_buzz_score is not None
                else generated["predicted_buzz_score"]
            )

        predicted_buzz_score = max(0, min(100, int(predicted_buzz_score)))
        hashtags = hashtags or []
        copy_ready_text = post_text + ("\n\n" + " ".join(hashtags) if hashtags else "")

        # 疑似インプレッション（実際のSNS計測値ではない、デモ用の値）
        pseudo_impressions = predicted_buzz_score * 130
        pseudo_likes = int(pseudo_impressions * 0.04)
        pseudo_shares = int(pseudo_impressions * 0.01)
        pseudo_comments = int(pseudo_impressions * 0.005)

        return {
            "simulated": True,
            "posted_to_sns": False,
            "note": "これはデモ用のシミュレーション結果です。実際のSNS投稿は行われていません。",
            "copy_ready_text": copy_ready_text,
            "predicted_buzz_score": predicted_buzz_score,
            "pseudo_impressions": pseudo_impressions,
            "pseudo_likes": pseudo_likes,
            "pseudo_shares": pseudo_shares,
            "pseudo_comments": pseudo_comments,
        }
    except Exception as exc:  # noqa: BLE001
        return _safe_error_response("POST /chaos/simulate-post", exc)
