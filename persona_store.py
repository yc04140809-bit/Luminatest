"""persona_store.py

「AIケイオス参謀 β」用の persona.json 読み書きユーティリティ。

既存の AutoLoop Persona 機能（他アプリ側で persona.json を利用している場合）を
壊さないよう、既に存在するキーは一切上書きせず、不足しているキーだけを
補完する方針で実装している。

エラーハンドリング方針:
    - persona.json が存在しない  -> デフォルト値で新規作成
    - persona.json が壊れている  -> 壊れたファイルをバックアップしてから初期化
    - 保存時は一時ファイルに書いてから置き換える（書き込み途中のクラッシュで
      ファイルが壊れるのを防ぐ）
"""

from __future__ import annotations

import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent
PERSONA_PATH = BASE_DIR / "persona.json"

# 「AIケイオス参謀 β」が追加で必要とするキーとその初期値。
# 既存の persona.json にこれらのキーが無い場合のみ補完する。
CHAOS_ADVISOR_DEFAULT_KEYS: dict[str, Any] = {
    "growth_level": 1,
    "experience_points": 0,
    "total_predicted_impressions": 0,
    "current_trend_affinity": 0,
    "vocabulary_pool": ["共感", "発見", "あるある"],
    "strategy_titles": ["初期作戦"],
    "post_history": [],
    "chaos_advisor_message": "今日も一緒に、無理なく伸びる投稿を考えようね。",
}

# persona.json が全く存在しない場合に使う土台部分。
# こちらも「AIケイオス参謀 β」が動くための最低限の項目のみ。
BASE_PERSONA_DEFAULTS: dict[str, Any] = {
    "persona_name": "あなた",
    "tone": "やさしく前向き、少しだけ小悪魔的で現実的",
    "writing_style": ["共感ベース", "断定しすぎない", "絵文字は控えめ"],
}


def _default_persona() -> dict[str, Any]:
    persona: dict[str, Any] = {}
    persona.update(BASE_PERSONA_DEFAULTS)
    persona.update(CHAOS_ADVISOR_DEFAULT_KEYS)
    return persona


def ensure_persona_keys(persona: dict[str, Any]) -> dict[str, Any]:
    """不足しているキーだけを補完する。既存の値は一切変更しない。"""
    if not isinstance(persona, dict):
        persona = {}
    for key, default_value in {**BASE_PERSONA_DEFAULTS, **CHAOS_ADVISOR_DEFAULT_KEYS}.items():
        if key not in persona:
            # list/dict はミュータブルなので参照共有を避けてコピーする
            if isinstance(default_value, list):
                persona[key] = list(default_value)
            elif isinstance(default_value, dict):
                persona[key] = dict(default_value)
            else:
                persona[key] = default_value
    return persona


def _backup_corrupt_file(path: Path) -> Path | None:
    if not path.exists():
        return None
    backup_path = path.with_suffix(path.suffix + ".broken.bak")
    try:
        shutil.copy2(path, backup_path)
        return backup_path
    except OSError:
        return None


def load_persona() -> dict[str, Any]:
    """persona.json を読み込む。存在しない/壊れている場合も必ず dict を返す。"""
    if not PERSONA_PATH.exists():
        persona = _default_persona()
        save_persona(persona)
        return persona

    try:
        raw_text = PERSONA_PATH.read_text(encoding="utf-8")
        persona = json.loads(raw_text)
        if not isinstance(persona, dict):
            raise ValueError("persona.json のルートが object ではありません")
    except (json.JSONDecodeError, ValueError, OSError):
        # 壊れている場合はバックアップしてから初期化する
        _backup_corrupt_file(PERSONA_PATH)
        persona = _default_persona()
        save_persona(persona)
        return persona

    persona = ensure_persona_keys(persona)
    return persona


def save_persona(persona: dict[str, Any]) -> None:
    """persona.json を安全に保存する（一時ファイル経由でアトミックに置換）。"""
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(
        prefix="persona_", suffix=".json.tmp", dir=str(BASE_DIR)
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as tmp_file:
            json.dump(persona, tmp_file, ensure_ascii=False, indent=2)
        os.replace(tmp_path, PERSONA_PATH)
    except OSError:
        # 保存に失敗しても既存の persona.json は壊さない
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise
