---
name: devvit
description: >-
  Run the Tipsy Devvit workflow directly inside Claude — no codespace, no
  bridge. Use whenever the user wants to ship/deploy Tipsy to Reddit, upload a
  new version, install to r/tipsey, run a playtest, publish for review, check
  the logged-in Reddit user, or set up Devvit auth. Triggers on: "ship tipsy",
  "deploy to reddit", "devvit upload", "push to r/tipsey", "run a playtest",
  "devvit login", "am I logged in to devvit", "update the reddit app".
---

# Devvit workflow (direct, no codespace)

This runs the real `devvit` CLI in place via `tools/devvit.sh`, from the
`tipsey-delivery/` app directory. It replaces the old codespace relay
(`tools/bridge3.js`) — do not use that.

Two environmental requirements — a single command reports both:

```bash
tools/devvit.sh preflight
```

**Always run `preflight` first** and act on what it says before anything else.

## Requirement 1 — network to Reddit

The `devvit` CLI talks to `developers.reddit.com` and `reddit.com`. Restricted
Claude environments block these by default, and preflight will show
`net … BLOCKED`. This is **not** something you can fix from inside the container
— the user must widen their environment's network policy to allow
`reddit.com` + `developers.reddit.com`
(https://code.claude.com/docs/en/claude-code-on-the-web). If preflight shows
the block, tell the user exactly that and stop — don't attempt Reddit commands,
they will only fail slowly.

## Requirement 2 — auth

Preferred: an environment secret **`DEVVIT_AUTH_TOKEN`**, so every session is
authenticated with zero interaction and no re-login. To obtain the value: if
the user already has a `~/.devvit/token` anywhere they've logged in (e.g. an
old codespace), that file's contents *are* the token — they paste it into a
`DEVVIT_AUTH_TOKEN` secret. If they have no token yet, do the interactive login
once (below), then `tools/devvit.sh token-export` prints the value to save.

Interactive login (only when there's no token to reuse, and network is open):

```bash
tools/devvit.sh login          # prints an authorize URL, then waits
# → user opens URL, approves, copies the code Reddit shows
tools/devvit.sh code <CODE>    # feeds the code back; confirms "Logged in as X"
tools/devvit.sh token-export   # copy output into a DEVVIT_AUTH_TOKEN secret
```

After any login, confirm the username with `tools/devvit.sh whoami` matches the
intended account before shipping.

## Shipping to production (the routine path)

r/tipsey is production. The verified, no-review command is upload-then-install:

```bash
tools/devvit.sh ship          # devvit upload && devvit install r/tipsey
```

`ship` already handles the known benign race where `install` reports "that
version isn't ready yet" right after upload — it waits 30s and retries, it does
not re-upload. Do **not** reach for `publish` for routine updates.

## Playtesting (long-running)

Playtest is a watch process (hot-reloads on save, streams logs). It runs
detached in the background:

```bash
tools/devvit.sh playtest              # uses dev sub tipsey_delivery_dev
tools/devvit.sh playtest-log          # tail recent output
tools/devvit.sh playtest-stop         # stop it
```

Note: per `docs/DEVVIT_WORKFLOW.md`, the day-to-day iteration loop is usually
GitHub Pages, not playtest — only reach for playtest when the user specifically
wants the in-Reddit webview.

## Publishing for review (rare)

```bash
tools/devvit.sh publish               # files a Reddit review request
```

Only when the user explicitly asks to publish/submit for review, or an
`install` gets rejected for a review-status reason. Confirm before running.

## Keeping the two game sources in sync

Any change to game logic must be mirrored in **both** `game/index.html` (source
of truth) and `tipsey-delivery/public/game-logic.js` — see
`docs/DEVVIT_WORKFLOW.md` ("The three source files that must stay in sync").
Ship only after both are updated and `node --check` passes on each.

## If something fails

- `net … BLOCKED` → network policy, see Requirement 1. Not fixable in-container.
- `not authenticated` → set `DEVVIT_AUTH_TOKEN` or run `login` (Requirement 2).
- `devvit CLI not installed` → `(cd tipsey-delivery && npm install)`.
- `install` errors "isn't ready to be installed yet" → benign timing; `ship`
  retries automatically. If run manually, wait ~30s and retry install.
