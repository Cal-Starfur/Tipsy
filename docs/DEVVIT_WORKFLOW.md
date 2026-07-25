# Devvit workflow — how we actually ship to Reddit

This is the current, real workflow for `tipsey-delivery/` (Devvit Web).
`docs/DEVVIT_SETUP.md` describes an earlier, now-superseded architecture
(the old `devvit/` Blocks scaffold + a remote bridge) — ignore it for
anything operational; it's kept only for historical context.

## The three source files that must stay in sync

- **`game/index.html`** — the canonical source. Everything gets written
  here first. This is also what GitHub Pages serves directly
  (`https://cal-starfur.github.io/Tipsy/game/index.html`) and what the
  itch.io deploy packages.
- **`tipsey-delivery/public/game.html`** — the Devvit shell (title
  screen, overlays, viewport-fix script). Structurally near-identical to
  `game/index.html`'s HTML/CSS, minus the embedded game logic.
- **`tipsey-delivery/public/game-logic.js`** — the Devvit build's copy
  of the game logic, meant to be generated *from* `game/index.html`.

**There used to be a `/tmp/build_devvit_game.py` script that did this
generation automatically.** It was never committed to the repo, only
ever lived in a prior session's ephemeral `/tmp`, and did not survive a
session reset. Until it's rebuilt or found, **any logic change has to be
hand-mirrored into both `game/index.html` and `game-logic.js`** — same
edit, same location, applied twice. Skipping this was a real mistake
once already (a change went to `game-logic.js` only, leaving
`game/index.html` — the actual source of truth — unpatched, which would
have silently reverted on the next real regen).

Always `node --check` both after editing (extract the last `<script>`
block from `game/index.html` first — see pattern below).

```bash
python3 -c "
import re
content = open('game/index.html').read()
scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)
open('/tmp/last.js','w').write(scripts[-1])
"
node --check /tmp/last.js
node --check tipsey-delivery/public/game-logic.js
```

## Where to actually run commands

**Devvit CLI commands that talk to Reddit (`login`, `upload`, `install`,
`playtest`, `publish`) cannot run inside Claude's own container.** That
container's network is firewalled to GitHub/npm/PyPI only — any call to
`reddit.com` / `developers.reddit.com` comes back `403 Forbidden`. The CLI
installs fine there and offline commands (`npm run build`, `lint`,
`test:types`, `node --check`) work, but anything that reaches Reddit will
fail. Don't try to `devvit login`/`upload` from the Claude sandbox; it's a
network wall, not a fixable bug.

### The primary path — Claude-driven GitHub Actions deploy

`.github/workflows/deploy-devvit.yml` runs the Devvit CLI on a
GitHub-hosted runner (full network, reaches Reddit fine) and does
`devvit upload` + `devvit install r/<subreddit>`. Claude triggers it via
the GitHub Actions API (`workflow_dispatch`) and reads the run logs back —
**no Codespace, no terminal.** To ship, you just ask Claude to deploy; it
dispatches the workflow, watches it, and reports the result.

**One-time setup (do this once):**

1. Get a Devvit auth token. Run `devvit login --copy-paste` **once**
   somewhere with real network — a local machine, or
   [Google Cloud Shell](https://shell.cloud.google.com) (free, works in
   iPhone Safari). After it prints `Logged in as ...`, copy the contents of
   `~/.devvit/token` (`cat ~/.devvit/token`).
2. Add it as a repo secret: GitHub → the `Cal-Starfur/Tipsy` repo →
   **Settings → Secrets and variables → Actions → New repository secret**,
   name it exactly **`DEVVIT_TOKEN`**, paste the token contents, save.

That's the only manual step, and only until the token expires. After that
every deploy is Claude-driven. (Keep the token private — it's a password.
Never paste it into chat or commit it; only into the GitHub secret box.)

### Fallback path — a browser Codespace / Cloud Shell

If the Actions token isn't set up yet, the old manual route still works: a
**GitHub Codespace or Google Cloud Shell opened in a browser** (often the
iPhone browser). Claude gives copy-paste command blocks; Sir runs them and
pastes the output back. The `tools/bridge3.js` / `Cal-Starfur/codespace-bridge`
relay is deprioritized and not in active use.

## Logging in

```bash
devvit login --copy-paste
```

Prints an authorize URL and then prompts `Paste the code you got here
and press Enter:`. Open the URL in any browser, approve, copy the code
Reddit shows you, paste it back into *that same terminal*. Confirm the
logged-in username after (`Logged in as X`) actually matches the
intended account before doing anything else — worth a sanity check
every time, not just once.

## Testing

GitHub Pages (`https://cal-starfur.github.io/Tipsy/game/index.html`) is
the real testing loop — no Codespace, no devvit CLI needed. `playtest`
against `tipsey_delivery_dev` exists as a Devvit-CLI feature but isn't
part of the actual workflow here; don't default to suggesting it.

## Updating r/tipsey (production)

**Preferred: ask Claude to deploy.** Once `DEVVIT_TOKEN` is set (see
setup above), Claude dispatches `deploy-devvit.yml` with
`subreddit: tipsey` and reads the logs — no terminal needed. The workflow
runs exactly the commands below on the runner.

**The underlying commands** (what the workflow runs, and what to type by
hand in a Codespace/Cloud Shell if you're doing it manually) —
`devvit upload` followed by `devvit install r/tipsey`, run from inside
`tipsey-delivery/`, no app name argument (the CLI already knows which app
from the current directory; `devvit install tipsey-delivery r/tipsey` —
two args — is WRONG and errors with "App r/tipsey is not found").

```bash
cd /workspaces/Tipsy
git pull
cd tipsey-delivery
devvit upload
devvit install r/tipsey
```

That's the whole thing — this is the actual command for getting a
change onto r/tipsey, verified working end to end (confirmed live at
version 0.0.20). Don't reach for `devvit publish` by default; it files
the app for Reddit review, which is unnecessary friction for a routine
update and isn't what's actually been used here.

If `devvit install` errors with *"That version of this app isn't ready
to be installed yet"* right after uploading, that's a benign, known
timing issue — Reddit's backend needs a few moments to finish
processing server-side. Wait ~30s and retry, don't re-upload.

(`publish` + review may become necessary again someday — e.g. if a
future upload does get rejected by `install` for a subscriber-count or
review-status reason — but don't default to it. Let the actual error
tell you if it's needed.)

## The itch.io deploy is separate from all of the above

Manual-trigger-only GitHub Actions workflow:
`.github/workflows/itch-deploy.yml` (workflow ID `315522381`), packages
`game/index.html` and pushes via `butler push build
cal-starfur/tipsey:html5` — **note the slug is `tipsey`**, not `tipsy`
(the itch.io page URL was renamed at some point; the workflow file was
out of sync with that rename once already — if a future deploy fails
cleanly at the "Push to itch.io" step after packaging/butler-setup both
succeed, check whether the slug drifted again before assuming the
`BUTLER_API_KEY` secret expired).

Trigger via the GitHub Actions API (`workflow_dispatch` on that workflow
ID, `ref: main`) — no terminal needed for this one, it's Claude-drivable
directly via the GitHub Contents/Actions API with a PAT.
