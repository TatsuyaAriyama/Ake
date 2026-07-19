#!/bin/bash
# App Store 用スクリーンショット（日本語・英語）を生成する。
#
#   bash scripts/store/make-screenshots.sh
#
# 手順:
#   1. 撮影ハーネスを public/ に一時配置（アプリと同一オリジンが必要なため）
#   2. Chrome の新ヘッドレスで 440x956 を 3x 描画 = 実機と同じ 1320x2868 で
#      アプリ画面を撮影（位置・方位・設定はハーネスがモックする）
#   3. 朱雀パレットのマーケティングフレームを重ねて store/screenshots/{ja,en} へ出力
#
# 前提: dev サーバ (npm run dev) が :5173 で起動していること。
#
# 注意: 旧ヘッドレス(--headless)では requestAnimationFrame が進まず、
#       コンパスの針が回転しない。必ず --headless=new を使うこと。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# node が PATH に無い環境向けに既定の導入先を足しておく。
command -v node >/dev/null 2>&1 || export PATH="$HOME/.local/node/bin:$PATH"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
WORK="${TMPDIR:-/tmp}/suzaku-store-$$"
HARNESS="$ROOT/public/__capture.html"
BASE="http://localhost:5173"

mkdir -p "$WORK/shots" "$WORK/frames"
cleanup() { rm -f "$HARNESS"; rm -rf "$WORK"; }
trap cleanup EXIT

if ! curl -sf "$BASE" >/dev/null; then
  echo "error: dev サーバが $BASE で応答しません。先に 'npm run dev' を実行してください。" >&2
  exit 1
fi

cp "$ROOT/scripts/store/capture-harness.html" "$HARNESS"
sleep 1   # vite が public/ の新規ファイルを配信し始めるのを待つ

render() { # url out [w] [h]
  "$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --allow-file-access-from-files --force-device-scale-factor=3 \
    --window-size="${3:-440},${4:-956}" --virtual-time-budget=12000 \
    --screenshot="$2" "$1" >/dev/null 2>&1
}

echo "1/3  アプリ画面を撮影"
for lang in ja en; do
  for screen in glance compass aligned search arrived; do
    render "$BASE/__capture.html?screen=$screen&lang=$lang" "$WORK/shots/$lang-$screen.png"
    printf '  %s/%s\n' "$lang" "$screen"
  done
done

echo "2/3  フレーム HTML を生成"
node "$ROOT/scripts/store/build-frames.mjs" "$WORK/frames" "$WORK/shots"

echo "3/3  フレームを描画して出力"
for lang in ja en; do
  outdir="$ROOT/store/screenshots/$lang"
  mkdir -p "$outdir"
  for f in "$WORK/frames/$lang-"*.html; do
    name="$(basename "$f" .html)"
    render "file://$f" "$outdir/${name#"$lang-"}.png"
  done
  echo "  -> store/screenshots/$lang/ (5枚)"
done

echo "完了: 1320x2868 (6.9インチ) x 5枚 x 2言語"
