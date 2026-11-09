#!/usr/bin/env bash
# Publish the consistency-pass TEST PAGE (https://cal-starfur.github.io/Tipsy/consistency-pass/).
# Sir, 2026-10-31: "i want you go to ahead with that on your own" -- this is the one allowed path.
# It builds consistency-pass/index.html from a consistency-pass commit into a fresh worktree of
# origin/main and pushes a commit that touches ONLY the consistency-pass/ folder. It refuses to push
# anything else, so it can never change the live game.
#   usage: tools/publish_test_page.sh [commit]   (default: the local consistency-pass head)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REV="${1:-consistency-pass}"
C="$(git -C "$ROOT" rev-parse --short "$REV")"
W="$(mktemp -d)/mainwt"
cleanup(){ git -C "$ROOT" worktree remove --force "$W" >/dev/null 2>&1 || true; }
trap cleanup EXIT
git -C "$ROOT" fetch -q origin main
git -C "$ROOT" worktree add -q --detach "$W" origin/main
python3 "$ROOT/tools/publish_consistency.py" "$W" "$C"
cd "$W"
git add consistency-pass
if git diff --cached --quiet; then echo "test page already at consistency-pass @ $C"; exit 0; fi
# the guard: nothing outside consistency-pass/ may be in this commit
if git diff --cached --name-only | grep -v '^consistency-pass/' | grep -q .; then
  echo "refusing: the commit would touch files outside consistency-pass/" >&2; exit 1
fi
git commit -q -m "Consistency pass test page (consistency-pass @ $C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q origin HEAD:main
echo "published test page: consistency-pass @ $C -> main $(git rev-parse --short HEAD)"
