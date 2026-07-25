---
name: devvit-cli
description: >-
  Run the Devvit CLI (Reddit's developer platform) directly inside Claude
  Code's container to ship the Tipsy app to Reddit — a replacement for
  opening a Codespace. Load whenever the task involves devvit commands:
  "devvit upload", "devvit install", "devvit login", "publish Tipsy to
  Reddit", "update r/tipsey", "ship to Reddit", or any mention of the Devvit
  CLI or app uploads. Covers the network precheck, install, copy-paste login
  (no localhost needed), token restore between sessions, and the
  approve-before-upload rule. Pairs with docs/DEVVIT_WORKFLOW.md.
---

# Devvit CLI inside Claude Code (Tipsy)

Claude Code's container can replace a GitHub Codespace for Devvit work —
**but only if this environment's network policy allows Reddit.** Everything
below is verified working: Node v22, `npm install -g devvit` (CLI 0.13.x),
`devvit login --copy-paste`, token cached at `~/.devvit/token`.

**The container resets every session** — install + auth are per-session
(~1 min total). The token dies with the container.

---

## Step 0 — Network precheck (DO THIS FIRST, every session)

The Devvit CLI must reach `reddit.com`. Restricted Claude-Code-on-web
environments block it at the egress proxy (403), and then login/upload fail
in confusing ways. Check before doing anything else:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" --max-time 15 https://www.reddit.com
```

- `200`/`3xx` → network is open, continue to Step 1.
- `000` with `CONNECT tunnel failed, response 403`, or the proxy status shows
  a `connect_rejected` for a `reddit.com` host
  (`curl -sS "$HTTPS_PROXY/__agentproxy/status"`):

  **STOP. Do not try to work around it — a 403 is an org policy denial.**
  Tell Cal, verbatim:

  > This environment's network policy is blocking `reddit.com`, so the Devvit
  > CLI can't log in or upload from here. Open this environment's settings in
  > Claude Code on the web and set **Network access** to Full, or to a custom
  > allowlist that includes `*.reddit.com`. You may need to recreate the
  > environment for it to take effect. Docs:
  > https://code.claude.com/docs/en/claude-code-on-the-web

  Then end the turn — there is nothing further to do here until it's opened.

## Step 1 — Install (every session, ~30s)

```bash
npm install -g devvit && devvit --version
```

## Step 2 — Authenticate (pick one path)

### Path A — Fast restore (if Cal saved a token from a prior session)
Cal pastes the token string; Claude writes it, never echoes it:

```bash
mkdir -p ~/.devvit && printf '%s' 'PASTED_TOKEN_JSON' > ~/.devvit/token
devvit whoami   # should print Cal's Reddit username
```

⚠️ Token = password. Never echo it in chat, never stage it, never commit it.

### Path B — Fresh login (copy-paste flow, no localhost)
`devvit login --copy-paste` is interactive, so drive it through a FIFO:

```bash
mkdir -p /tmp/devvit
mkfifo /tmp/devvit/login_input 2>/dev/null || true
(devvit login --copy-paste < /tmp/devvit/login_input > /tmp/devvit/login.log 2>&1 &)
sleep 3 && cat /tmp/devvit/login.log
```

1. The log prints a `reddit.com/api/v1/authorize...` URL → **STOP. Paste the
   URL in chat for Cal.** (The URL generates offline — it printing does *not*
   mean the network is open; only Step 0 confirms that.)
2. Cal opens it (iPhone Safari is fine), authorizes, copies the code Reddit
   shows at the `developers.reddit.com/cli-login` redirect, pastes it in chat.
3. Feed the code in:

```bash
printf '%s\n' 'PASTED_CODE' > /tmp/devvit/login_input
sleep 4 && cat /tmp/devvit/login.log && devvit whoami
```

   If this step errors with a network/timeout failure instead of a username,
   go back to Step 0 — the token exchange needs `reddit.com`.
4. Confirm `devvit whoami` prints the intended account before anything else.
5. Offer once: "Want to save this token for faster login next session?" If
   yes, send `cat ~/.devvit/token` output **to Cal only, marked sensitive** —
   Cal stores it in a password manager, never in the repo.

## Step 3 — Get the latest Tipsy code

The live repo is the sole source of truth — never upload from cached or
previously-uploaded files. In a normal Claude Code session on Tipsy the repo
is already at `/home/user/Tipsy` (or wherever it was cloned) — just make sure
it's current:

```bash
cd /home/user/Tipsy && git pull
cd tipsey-delivery && npm install
```

## Step 4 — Upload / install to Reddit (approval-gated)

Tipsy ships with `upload` + `install` (NOT `publish` — see
`docs/DEVVIT_WORKFLOW.md`). Both run from **inside `tipsey-delivery/`**.

```
STEP 1 — Show what will ship: git log -1, devvit.json/package version, changed files
STEP 2 — Ask for approval. STOP.
STEP 3 — Only after explicit approval ("yes", "go", "upload it", "ship it"):
```

```bash
cd /home/user/Tipsy/tipsey-delivery
devvit upload              # new version to the app directory
devvit install r/tipsey    # push that version live to r/tipsey — NO app-name arg
```

- `devvit install tipsey-delivery r/tipsey` (two args) is **WRONG** — it errors
  with "App r/tipsey is not found". The CLI knows the app from the cwd.
- If `install` errors "That version of this app isn't ready to be installed
  yet" right after upload, that's a benign backend-timing issue — wait ~30s
  and retry `install`, do NOT re-upload.
- `devvit publish` files the app for Reddit review — do **not** default to it.
  It's only needed if `install` ever gets rejected for a review/subscriber
  reason. Requires its own separate explicit approval.

🚫 Never run `upload`, `install`, or `publish` without explicit approval in the
current turn.

---

## Command reference

| Command | Notes |
|---|---|
| `devvit whoami` | Verify auth (local token check, no network) |
| `devvit upload` | Push a new version of the app |
| `devvit install r/tipsey` | Make the uploaded version live on r/tipsey |
| `devvit publish` | File for Reddit review — separate approval, rarely needed |
| `devvit playtest tipsey_delivery_dev` | Live-reload dev mode (long-running) |
| `devvit logs r/tipsey` | Stream app logs (long-running) |

## Long-running command caveat

`playtest` and `logs` stream forever — awkward through the bash tool. For a
bounded peek:

```bash
timeout 20 devvit logs r/tipsey 2>&1 | tail -30
```

Per `docs/DEVVIT_WORKFLOW.md`, the real Tipsy test loop is GitHub Pages
(`https://cal-starfur.github.io/Tipsy/game/index.html`), not `playtest` —
don't default to suggesting playtest.

## Troubleshooting

- **`Not currently logged in`** → token missing/expired → redo Step 2.
- **Login/upload fails with a network or timeout error** → Step 0: the env is
  blocking `reddit.com`. Do not retry; get the network opened.
- **`403` / `CONNECT tunnel failed` on any reddit host** → org policy denial,
  never retry — report it and point Cal at the network-access setting.
- **Version conflict on upload** → that version already exists → bump the
  version and re-upload.
- **FIFO login hangs** → `pkill -f "devvit login"`, `rm /tmp/devvit/login_input`,
  retry Path B from the top.

## Session-end offer

If a login happened this session and Cal hasn't saved the token, offer once
more before ending — saving it turns next session's auth into a 10-second paste.
