"""trend_detector.py

「AIケイオス参謀 β」のトレンド取得・安全フィルターモジュール。

重要な方針:
    - X/Twitter へのスクレイピング・直接アクセスは一切行わない
    - 外部トレンドAPIのキーが無い場合は必ずサンプルトレンドにフォールバックする
    - 将来、正式な外部トレンドAPI（契約済みのニュース/トレンドAPIなど）に
      差し替えやすいように、取得処理は関数として分離してある
"""

from __future__ import annotations

import os

# APIキー未設定時に返すサンプルトレンド（デモ・開発用）
SAMPLE_TRENDS: list[str] = [
    "AI活用",
    "副業",
    "朝活",
    "スマホアプリ",
    "画像生成",
]

# 安全フィルターで除外するNGキーワード（カテゴリごと）
# 誤爆を避けるため、できるだけ具体的な語を選んでいる。
_NG_KEYWORDS: list[str] = [
    # 政治
    "政治", "選挙", "与党", "野党", "首相", "国会議員", "内閣", "政党", "政権",
    # 宗教
    "宗教", "信仰", "教団", "カルト", "布教", "宗派",
    # 事件
    "逮捕", "容疑者", "殺人事件", "誘拐", "詐欺事件", "事件発生",
    # 災害
    "地震速報", "津波警報", "台風被害", "災害情報", "土砂崩れ", "大規模火災",
    # 訃報
    "訃報", "逝去", "死去", "急死",
    # 差別
    "差別発言", "ヘイトスピーチ", "人種差別", "性差別", "民族差別",
    # 誹謗中傷
    "誹謗中傷", "名誉毀損", "晒し上げ", "個人叩き", "デマ拡散",
    # 暴力
    "暴力事件", "暴行", "虐待", "テロ", "殺害予告",
    # 過激な炎上ワード
    "炎上商法", "祭り上げて叩く", "総攻撃", "扇動",
    # 真偽確認が必要なニュース
    "未確認情報", "陰謀論", "速報未確認",
]


def _fetch_from_external_api(api_key: str) -> list[str]:
    """外部トレンドAPIから取得する処理（今後の拡張ポイント）。

    TODO(将来拡張): 契約済みの正式なトレンド/ニュースAPI（X/Twitter API規約に
    抵触しないもの）が用意でき次第、ここで実際のHTTPリクエストを実装する。
    現時点では未実装のため、呼び出し元は例外を捕捉してサンプルトレンドに
    フォールバックすること。
    """
    raise NotImplementedError("外部トレンドAPI連携は未実装です（MVPでは未対応）")


def fetch_current_trends() -> list[str]:
    """現在のトレンドキーワード一覧を取得する。

    - TREND_API_KEY 環境変数が未設定の場合は、常にサンプルトレンドを返す
      （シミュレーションモード）。
    - 環境変数が設定されていても、外部API呼び出しに失敗した場合は
      サンプルトレンドにフォールバックし、アプリを落とさない。
    - スクレイピングやX/Twitterへの直接アクセスは行わない。
    """
    api_key = os.environ.get("TREND_API_KEY", "").strip()

    if not api_key:
        return list(SAMPLE_TRENDS)

    try:
        trends = _fetch_from_external_api(api_key)
        if not trends:
            return list(SAMPLE_TRENDS)
        return trends
    except Exception:
        # 外部API失敗時も必ずサンプルトレンドへフォールバックする
        return list(SAMPLE_TRENDS)


def is_text_safe(text: str) -> bool:
    """テキストにNGキーワードが含まれていないかを判定する。"""
    if not text:
        return True
    return not any(ng_word in text for ng_word in _NG_KEYWORDS)


def filter_safe_trends(trends: list[str]) -> list[str]:
    """炎上・危険リスクのあるトレンドワードを除外する。

    政治/宗教/事件/災害/訃報/差別/誹謗中傷/暴力/過激な炎上ワード/
    真偽確認が必要なニュース、を含むトレンドは除外する。
    """
    safe_trends = [trend for trend in trends if is_text_safe(trend)]

    # 全て除外されてしまった場合は、安全なサンプルトレンドで補う
    if not safe_trends:
        safe_trends = [t for t in SAMPLE_TRENDS if is_text_safe(t)]

    return safe_trends
