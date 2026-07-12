#!/usr/bin/env bash
# PostToolUseフック: TypeScriptファイル(chaos-ai-suite/packages配下)を編集した直後に
# 型チェックだけを自動実行する。軽い確認(3〜8秒)なので編集のたびに走らせても負担が小さい。
# 重いテストはここでは実行しない(Stopフック側でターンの節目に1回だけ実行する設計)。
# 型エラーがあれば exit 2 でClaudeへ通知し、次の大きな編集へ進む前に修正させる。
set -uo pipefail

# jqが無い環境では安全に何もしない(このプロジェクト専用フックなのでエラーにしない)
if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

INPUT="$(cat)"
FILE_PATH="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"

# TypeScript以外の変更(ドキュメント・設定ファイル等)は対象外
if [ -z "$FILE_PATH" ] || [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
APP_DIR="$REPO_ROOT/chaos-ai-suite"

# 本体アプリ(chaos-ai-suite/packages配下)以外のTSファイルは対象外
case "$FILE_PATH" in
  "$APP_DIR"/packages/*) ;;
  *) exit 0 ;;
esac

[ -d "$APP_DIR" ] || exit 0
cd "$APP_DIR" || exit 0

RESULT="$(npm run typecheck 2>&1)"
STATUS=$?

if [ "$STATUS" -ne 0 ]; then
  {
    echo "❌ 型チェックでエラーが見つかりました（編集ファイル: $(basename "$FILE_PATH")）。"
    echo "次の大きな変更に進む前に、このエラーを直してください。"
    echo "$RESULT" | tail -40
  } >&2
  exit 2
fi

echo "✓ 型チェックOK（$(basename "$FILE_PATH")）"
exit 0
