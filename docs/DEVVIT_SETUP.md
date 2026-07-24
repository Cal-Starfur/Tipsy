> **⚠️ SUPERSEDED — historical only.** This describes the old
> `devvit/` Blocks scaffold and the `tools/bridge3.js` remote
> bridge, neither of which reflect the current setup. For the
> real, current workflow (`tipsey-delivery/`, login, playtest,
> publish), see `docs/DEVVIT_WORKFLOW.md` instead.

# Devvit setup — porting TIPSY to Reddit

## What's here

```
devvit/
├── devvit.yaml          ← permissions (reddit_api, redis), webroot pointer
├── package.json         ← pinned to @devvit/public-api ^0.11.0 (same range
│                           proven working on Wigglers Room — the latest
│                           published version, 0.13.x, has since dropped/
│                           renamed useState and addCustomPostType, so
│                           DO NOT bump this without re-verifying)
├── tsconfig.json         ← classic JSX (Devvit.createElement factory),
│                           not the modern jsx-runtime — matches the
│                           version above exactly
├── src/main.tsx          ← Blocks host: tap-to-launch → webview, plus the
│                           daily-best leaderboard bridge (Redis)
└── webroot/index.html    ← the actual game (copy of game/index.html,
                             with the Devvit bridge patch already applied)
```

Root-level additions (for the remote bridge, see below):
```
.devcontainer/devcontainer.json
.devcontainer/start-bridge.sh
tools/bridge3.js
```

## The one thing that changed in the game itself

`game/index.html` (and its copy at `devvit/webroot/index.html`) got a small,
surgical patch — nothing else touched:

- A `tipsyBridge` shim near the top of the script (postMessage in/out).
- `loadRoute(dateStr)` now also calls `requestDailyBest(dateStr)` — covers
  boot, the "today" button, and reroll (arbitrary future dates) uniformly.
- The win-screen daily-best block reads/writes through `tipsyBridge` when
  embedded in the Devvit webview, and falls straight back to `localStorage`
  otherwise — so the standalone GitHub Pages build keeps working exactly
  as before, unchanged.

Everything else — rendering, physics, route generation — is untouched.

## ⚠️ Not yet verified against the real platform

Everything above compiles cleanly against the real, pinned `@devvit/public-api`
package (confirmed with `tsc` locally) and matches Wigglers Room's proven
working pattern (`useWebView` + `addCustomPostType`, envelope-unwrapped
messages). But **none of it has run inside an actual Devvit webview yet** —
`devvit playtest` needs real network access to Reddit's servers, which this
sandbox doesn't have. Treat this as "should work" until it's actually
playtested once.

## Bringing the remote bridge online (so Claude can drive the CLI directly)

Sir already built `tools/bridge3.js` for Wigglers Room — a small relay that
polls `Cal-Starfur/codespace-bridge` (a shared repo used purely as a message
relay) for commands and runs them inside the Codespace. It's been copied
into this repo unchanged; only `start-bridge.sh`'s hardcoded path was
updated to `/workspaces/Tipsy`.

**To bring it online:**
1. Open a GitHub Codespace on `Cal-Starfur/Tipsy`.
2. Set a `BRIDGE_TOKEN` Codespaces secret (a PAT with repo write access to
   `Cal-Starfur/codespace-bridge`) — same pattern as Wigglers Room — so
   `start-bridge.sh` auto-launches the bridge on container start. Or just
   run it manually in the Codespace terminal:
   ```bash
   export BRIDGE_TOKEN=your_github_pat
   node tools/bridge3.js
   ```
3. Once it prints `Bridge is live`, tell Claude — from there I can run
   `npm install`, `devvit login` (this prints a URL — you'll still need to
   open it and approve, I can't complete OAuth for you), `devvit whoami`,
   `devvit playtest`, and `devvit upload` remotely, with `cwd` set to
   `/workspaces/Tipsy/devvit` for each command.

As of right now (last checked 2026-07-17) the bridge is **not** currently
running — last activity in the relay repo was 2026-07-15. It only stays up
while a Codespace is open.

## What Claude cannot do from this chat's sandbox

This sandbox's network is limited to GitHub, npm, PyPI, and a few package
registries — no `reddit.com`, no Devvit's own servers. So without the bridge
above, `devvit login`, `devvit playtest`, and `devvit upload` all have to be
run by Sir directly in a Codespace or local terminal.
