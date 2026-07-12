#!/usr/bin/env bash
# Stopフック: Claudeがそのターンを終える直前に1回だけ、まとまった品質チェックを行う。
# 型チェックより重いテスト・Lintはここに置き、編集のたびに走らせて遅くならないようにする。
# chaos-ai-suite/packages配下に変更がない場合(調査・会話だけのターン)は何もしない。
# package.jsonに実際に定義されているscriptだけを実行し、存在しないコマンドは推測実行しない。
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
APP_DIR="$REPO_ROOT/chaos-ai-suite"

[ -d "$APP_DIR" ] || exit 0

# 無限ループ防止: 既にこのStopフックで一度差し戻されたターンでは、
# 再度ブロックせず結果を知らせるだけにする(stop_hook_activeで判定)
STOP_HOOK_ACTIVE="false"
if command -v jq >/dev/null 2>&1; then
  INPUT="$(cat)"
  STOP_HOOK_ACTIVE="$(printf '%s' "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null)"
fi

# gitリポジトリでない、またはchaos-ai-suite/packages配下に変更がなければ何もしない
if ! git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi
CHANGED="$(git -C "$REPO_ROOT" status --porcelain -- chaos-ai-suite/packages 2>/dev/null)"
if [ -z "$CHANGED" ]; then
  exit 0
fi

cd "$APP_DIR" || exit 0

FAIL=0
SUMMARY=""

has_script() {
  # $1=ワークスペースのディレクトリ, $2=スクリプト名
  node -e "const s=require('./$1/package.json').scripts||{}; process.exit(s['$2']?0:1);" 2>/dev/null
}

# backendにtestスクリプトが定義されている場合のみ実行
if has_script "packages/backend" "test"; then
  TEST_OUT="$(npm run test --workspace packages/backend 2>&1)"
  if [ $? -ne 0 ]; then
    FAIL=1
    SUMMARY="${SUMMARY}❌ バックエンドのテストが失敗しています。\n$(echo "$TEST_OUT" | tail -20)\n"
  else
    SUMMARY="${SUMMARY}✓ バックエンドのテスト: 成功\n"
  fi
fi

# 各ワークスペースにlintスクリプトがあれば実行(現状は未導入のため通常は何も起きない)
for pkg in packages/shared packages/backend packages/frontend; do
  if has_script "$pkg" "lint"; then
    LINT_OUT="$(npm run lint --workspace "$pkg" 2>&1)"
    if [ $? -ne 0 ]; then
      FAIL=1
      SUMMARY="${SUMMARY}❌ ${pkg} のLintでエラーがあります。\n"
    else
      SUMMARY="${SUMMARY}✓ ${pkg} のLint: 成功\n"
    fi
  fi
done

if [ -n "$SUMMARY" ]; then
  printf "%b" "$SUMMARY" >&2
fi

if [ "$FAIL" -eq 1 ] && [ "$STOP_HOOK_ACTIVE" != "true" ]; then
  echo "重大なエラーが見つかりました。修正するか、未確認事項として明確にユーザーへ報告してください。" >&2
  exit 2
fi

exit 0
