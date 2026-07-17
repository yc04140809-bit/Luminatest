#!/usr/bin/env bash
# PreToolUseフック（Bashツール専用）: 実行前に危険な可能性があるコマンドを検出し、
# 該当すればexit 2でブロックする。既存のPostToolUse（型チェック）・Stop（品質チェック）
# フックとは役割が異なり、これが唯一の「実行してよいかどうか」を判定するフック。
#
# 対象: 再帰的な強制削除(rm -rf等)・Gitの強制push・git reset --hard・
#       git clean -f・git branch -D・リモートスクリプトの直接シェル実行・破壊的SQL。
# 対象外: 通常のgit add/commit/push -u origin <branch>など、このプロジェクトで
#         日常的に使う操作は誤検知しないよう、危険な操作に隣接するパターンのみを見る。
#         判定は「引用符の中身を取り除いた文字列」に対して行う。これにより、
#         コミットメッセージ本文で「rm -rf」等の語を説明・言及しているだけの場合
#         （実際にはコマンドとして実行されない）を誤検知しない。
#
# これはあくまで安全網の1つであり、これだけに頼らない。最終的な承認判断は
# 引き続きユーザーとの対話・確認に基づく。
set -uo pipefail

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

INPUT="$(cat)"
TOOL_NAME="$(printf '%s' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)"
[ "$TOOL_NAME" = "Bash" ] || exit 0

COMMAND="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$COMMAND" ] && exit 0

# 引用符（'...' や "..."）の中身を取り除いてから判定する。
# コミットメッセージ本文（例: -m "rm -rfについて説明する"）に危険な語が
# 含まれるだけで誤検知しないようにするための前処理。
CHECK_TARGET="$(printf '%s' "$COMMAND" | sed -E 's/"[^"]*"//g; s/'"'"'[^'"'"']*'"'"'//g')"

shopt -s nocasematch

block() {
  {
    echo "危険な可能性がある操作を検出したため、実行前に停止しました。"
    echo "理由: $1"
    echo ""
    echo "実行しようとしたコマンド:"
    echo '```'
    echo "$COMMAND"
    echo '```'
    echo ""
    echo "本当に必要な操作であれば、ユーザーへ目的を説明し、明示的な許可を得てから実行してください。"
  } >&2
  exit 2
}

# rm -rf / rm -fr（結合した短縮オプション。順序違いを両方見る）
if [[ "$CHECK_TARGET" =~ rm[[:space:]]+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*([[:space:]]|$) ]] \
  || [[ "$CHECK_TARGET" =~ rm[[:space:]]+-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*([[:space:]]|$) ]]; then
  block "再帰的な強制削除（rm -rf相当）"
fi

# git push の強制実行
if [[ "$CHECK_TARGET" =~ git[[:space:]]+push[[:space:]]+[^\|\;\&]*(--force|-f)([[:space:]]|$) ]]; then
  block "Gitの強制push（リモートの履歴を上書きする可能性）"
fi

# git reset --hard（未コミットの変更を破棄）
if [[ "$CHECK_TARGET" =~ git[[:space:]]+reset[[:space:]]+--hard ]]; then
  block "git reset --hard（未コミットの変更を破棄）"
fi

# git clean -f（未追跡ファイルの削除）
if [[ "$CHECK_TARGET" =~ git[[:space:]]+clean[[:space:]]+-[a-zA-Z]*f ]]; then
  block "git clean -f（未追跡ファイルの削除）"
fi

# git branch -D（ブランチの強制削除）
if [[ "$CHECK_TARGET" =~ git[[:space:]]+branch[[:space:]]+-D ]]; then
  block "git branch -D（ブランチの強制削除）"
fi

# リモートから取得したスクリプトを直接シェルへ渡す実行
if [[ "$CHECK_TARGET" =~ (curl|wget)[^\|]*\|[[:space:]]*(sudo[[:space:]]+)?(sh|bash|zsh)([[:space:]]|$) ]]; then
  block "リモートから取得したスクリプトを確認せず直接実行しようとしています"
fi

# 破壊的なSQL操作（引用符除去の対象外にしたいクエリ文字列だが、
# 最小実装のため今回はCHECK_TARGET基準のまま。誤検知時はユーザーへ報告する）
if [[ "$COMMAND" =~ (DROP[[:space:]]+(TABLE|DATABASE)|TRUNCATE[[:space:]]+TABLE) ]]; then
  block "破壊的なSQL操作（DROP/TRUNCATE）"
fi

exit 0
