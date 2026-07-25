#!/usr/bin/env bash
#
# devvit.sh — run the Tipsy Devvit workflow directly, no codespace bridge.
#
# This replaces tools/bridge3.js (the GitHub-relay-to-codespace hack). It runs
# the real `devvit` CLI in place, from the tipsey-delivery/ app directory.
#
# It only works where two things are true:
#   1. The environment can reach Reddit (developers.reddit.com + reddit.com).
#      In a network-restricted Claude environment you must widen the network
#      policy first — `devvit.sh preflight` tells you if you're blocked.
#   2. There is a Devvit auth token, provided one of two ways:
#        a. DEVVIT_AUTH_TOKEN env var (recommended — set it as an environment
#           secret so every session is authenticated with no interaction), OR
#        b. a ~/.devvit/token file from a prior `devvit.sh login`.
#
# Usage:
#   tools/devvit.sh preflight        # check CLI, deps, network, auth
#   tools/devvit.sh whoami           # who am I logged in as
#   tools/devvit.sh ship             # upload + install to r/tipsey (prod)
#   tools/devvit.sh playtest [sub]   # background playtest (default: dev sub)
#   tools/devvit.sh playtest-log     # tail the running playtest log
#   tools/devvit.sh playtest-stop    # stop the background playtest
#   tools/devvit.sh publish          # file a public review request (rarely)
#   tools/devvit.sh login            # start interactive copy-paste login
#   tools/devvit.sh code <CODE>      # feed the pasted code to a pending login
#   tools/devvit.sh token-export     # print token file (to save as a secret)
#
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$REPO_ROOT/tipsey-delivery"
DEVVIT="$APP_DIR/node_modules/.bin/devvit"

PROD_SUB="r/tipsey"
DEV_SUB="tipsey_delivery_dev"
REDDIT_HOST="developers.reddit.com"

LOGIN_PIPE="/tmp/devvit-login.pipe"
LOGIN_LOG="/tmp/devvit-login.log"
LOGIN_HOLDER_PID="/tmp/devvit-login.holder.pid"
PLAYTEST_LOG="/tmp/devvit-playtest.log"
PLAYTEST_PID="/tmp/devvit-playtest.pid"

c_red=$'\033[31m'; c_grn=$'\033[32m'; c_yel=$'\033[33m'; c_dim=$'\033[2m'; c_0=$'\033[0m'
ok(){   printf '%s  ok  %s %s\n'   "$c_grn" "$c_0" "$*"; }
warn(){ printf '%s warn %s %s\n'   "$c_yel" "$c_0" "$*"; }
bad(){  printf '%s fail %s %s\n'   "$c_red" "$c_0" "$*"; }
die(){  printf '%sERROR:%s %s\n' "$c_red" "$c_0" "$*" >&2; exit 1; }

need_cli(){
  [ -x "$DEVVIT" ] || die "devvit CLI not installed. Run: (cd \"$APP_DIR\" && npm install)"
}

# Returns 0 if the proxy/network lets us reach Reddit at all (any HTTP status),
# non-zero if the CONNECT tunnel is refused (policy block) or times out.
net_ok(){
  curl -sS -o /dev/null --max-time 8 "https://$REDDIT_HOST" >/dev/null 2>&1
}

auth_state(){
  if [ -n "${DEVVIT_AUTH_TOKEN:-}" ]; then
    echo "env"        # authenticated via DEVVIT_AUTH_TOKEN secret
  elif [ -s "$HOME/.devvit/token" ]; then
    echo "file"       # authenticated via ~/.devvit/token
  else
    echo "none"
  fi
}

# Run a devvit subcommand from the app dir with the CLI's browserless flags on.
dv(){ ( cd "$APP_DIR" && "$DEVVIT" "$@" ); }

cmd_preflight(){
  echo "Tipsy · devvit preflight"
  echo "------------------------"
  if [ -x "$DEVVIT" ]; then ok "CLI    $("$DEVVIT" --version 2>/dev/null)"
  else bad "CLI    not installed — run: (cd tipsey-delivery && npm install)"; fi

  if [ -d "$APP_DIR/node_modules" ]; then ok "deps   installed"
  else bad "deps   missing — run: (cd tipsey-delivery && npm install)"; fi

  case "$(auth_state)" in
    env)  ok   "auth   DEVVIT_AUTH_TOKEN secret is set" ;;
    file) ok   "auth   ~/.devvit/token present" ;;
    none) warn "auth   none — set DEVVIT_AUTH_TOKEN secret, or run: tools/devvit.sh login" ;;
  esac

  if net_ok; then ok "net    $REDDIT_HOST reachable"
  else
    bad "net    $REDDIT_HOST BLOCKED by this environment's network policy"
    echo "         Reddit-touching commands (login/whoami/ship/playtest/publish)"
    echo "         will fail until you widen the network policy for this"
    echo "         environment to allow reddit.com + developers.reddit.com."
    echo "         See: https://code.claude.com/docs/en/claude-code-on-the-web"
  fi
}

cmd_whoami(){ need_cli; net_ok || die "$REDDIT_HOST is blocked — widen the network policy first."; dv whoami; }

cmd_ship(){
  need_cli
  [ "$(auth_state)" = none ] && die "not authenticated — set DEVVIT_AUTH_TOKEN or run: tools/devvit.sh login"
  net_ok || die "$REDDIT_HOST is blocked — widen the network policy first."
  echo ">> devvit upload"
  dv upload || die "upload failed"
  # Known benign race: install right after upload can report the version isn't
  # ready yet. Retry a few times with a pause rather than re-uploading.
  echo ">> devvit install $PROD_SUB"
  local n=0
  until dv install "$PROD_SUB"; do
    n=$((n+1))
    [ "$n" -ge 4 ] && die "install still failing after $n tries"
    warn "install not ready yet (attempt $n) — waiting 30s (known post-upload timing race)"
    sleep 30
  done
  ok "shipped to $PROD_SUB"
}

cmd_playtest(){
  need_cli
  [ "$(auth_state)" = none ] && die "not authenticated — set DEVVIT_AUTH_TOKEN or run: tools/devvit.sh login"
  net_ok || die "$REDDIT_HOST is blocked — widen the network policy first."
  local sub="${1:-$DEV_SUB}"
  if [ -f "$PLAYTEST_PID" ] && kill -0 "$(cat "$PLAYTEST_PID")" 2>/dev/null; then
    die "playtest already running (pid $(cat "$PLAYTEST_PID")). Use playtest-log / playtest-stop."
  fi
  : > "$PLAYTEST_LOG"
  ( cd "$APP_DIR" && setsid "$DEVVIT" playtest "$sub" >"$PLAYTEST_LOG" 2>&1 < /dev/null & echo $! > "$PLAYTEST_PID" )
  sleep 2
  ok "playtest started on $sub (pid $(cat "$PLAYTEST_PID" 2>/dev/null))"
  echo "   log: $PLAYTEST_LOG   ·   tail: tools/devvit.sh playtest-log   ·   stop: tools/devvit.sh playtest-stop"
}

cmd_playtest_log(){ [ -f "$PLAYTEST_LOG" ] || die "no playtest log yet"; tail -n 40 "$PLAYTEST_LOG"; }

cmd_playtest_stop(){
  if [ -f "$PLAYTEST_PID" ]; then
    kill "$(cat "$PLAYTEST_PID")" 2>/dev/null && ok "playtest stopped" || warn "no live playtest process"
    rm -f "$PLAYTEST_PID"
  else warn "no playtest pid file"; fi
}

cmd_publish(){
  need_cli
  net_ok || die "$REDDIT_HOST is blocked — widen the network policy first."
  warn "publish files the app for Reddit review. The routine path is 'ship' (upload+install)."
  dv publish "$@"
}

# ---- interactive copy-paste login (fallback; DEVVIT_AUTH_TOKEN is preferred) ----
cmd_login(){
  need_cli
  net_ok || die "$REDDIT_HOST is blocked — widen the network policy first."
  rm -f "$LOGIN_PIPE"; mkfifo "$LOGIN_PIPE"; : > "$LOGIN_LOG"
  # Holder keeps the write end of the FIFO open across separate tool calls so
  # the CLI (the reader) doesn't hit EOF between printing the URL and getting
  # the code. setsid detaches both from this shell so they outlive the call.
  setsid bash -c 'exec 9>"'"$LOGIN_PIPE"'"; sleep 900' >/dev/null 2>&1 < /dev/null &
  echo $! > "$LOGIN_HOLDER_PID"
  ( cd "$APP_DIR" && setsid "$DEVVIT" login --copy-paste <"$LOGIN_PIPE" >"$LOGIN_LOG" 2>&1 & ) >/dev/null 2>&1
  # wait for the authorize URL to show up
  local i
  for i in $(seq 1 20); do grep -q "https://" "$LOGIN_LOG" && break; sleep 1; done
  echo "---- devvit login ----"
  cat "$LOGIN_LOG"
  echo "----------------------"
  echo "Open the URL above, approve, copy the code Reddit shows, then run:"
  echo "  tools/devvit.sh code <THE_CODE>"
}

cmd_code(){
  [ -p "$LOGIN_PIPE" ] || die "no login in progress — run: tools/devvit.sh login"
  [ -n "${1:-}" ] || die "usage: tools/devvit.sh code <CODE>"
  printf '%s\n' "$1" > "$LOGIN_PIPE"
  local i
  for i in $(seq 1 25); do grep -qiE "Logged in as|error|invalid" "$LOGIN_LOG" && break; sleep 1; done
  cat "$LOGIN_LOG"
  [ -f "$LOGIN_HOLDER_PID" ] && kill "$(cat "$LOGIN_HOLDER_PID")" 2>/dev/null
  rm -f "$LOGIN_PIPE" "$LOGIN_HOLDER_PID"
  if grep -qi "Logged in as" "$LOGIN_LOG"; then
    ok "logged in — now persist it so you never log in again:"
    echo "   tools/devvit.sh token-export   (copy the output into a DEVVIT_AUTH_TOKEN secret)"
  fi
}

cmd_token_export(){
  local f="$HOME/.devvit/token"
  [ -s "$f" ] || die "no token file at $f — run: tools/devvit.sh login first"
  echo "# Copy the single line below into an environment secret named DEVVIT_AUTH_TOKEN."
  echo "# (It is your Reddit dev credential — treat it like a password, never commit it.)"
  cat "$f"; echo
}

sub="${1:-preflight}"; shift || true
case "$sub" in
  preflight)      cmd_preflight "$@" ;;
  whoami)         cmd_whoami "$@" ;;
  ship)           cmd_ship "$@" ;;
  playtest)       cmd_playtest "$@" ;;
  playtest-log)   cmd_playtest_log "$@" ;;
  playtest-stop)  cmd_playtest_stop "$@" ;;
  publish)        cmd_publish "$@" ;;
  login)          cmd_login "$@" ;;
  code)           cmd_code "$@" ;;
  token-export)   cmd_token_export "$@" ;;
  -h|--help|help) sed -n '2,40p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' ;;
  *) die "unknown command: $sub  (try: tools/devvit.sh help)" ;;
esac
