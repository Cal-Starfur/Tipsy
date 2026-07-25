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

No local terminal, no bridge (deprioritized — `tools/bridge3.js` and the
`Cal-Starfur/codespace-bridge` relay are not in active use). The real
setup: a **GitHub Codespace opened in a browser** (often the iPhone
browser). Claude gives copy-paste command blocks; Sir runs them in that
terminal and pastes the output back.

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

## Updating r/tipsey (production) — the no-Codespace path

**This is now the preferred way to ship.** Deploying used to require a
Codespace because the Claude Code sandbox's egress proxy blocks
`developers.reddit.com` / `reddit.com` (org network policy — a hard 403,
not something Claude can route around), so the Devvit CLI's `login` /
`upload` / `install` all fail *inside* a Claude session. GitHub Actions
runners have open network, so we deploy from CI instead.

**The workflow:** `.github/workflows/devvit-deploy.yml` (`workflow_dispatch`,
"Deploy to Reddit"). It runs, from a GitHub-hosted runner:
`npm ci` → checks → `npm run build` → `devvit upload` → `devvit install`
(with a retry loop for the "isn't ready yet" timing issue below).

**How to run it:**
- From the Actions tab (works on the phone browser): **Actions → Deploy to
  Reddit → Run workflow**, pick the subreddit (default `r/tipsey`) and
  version bump.
- Or ask Claude to trigger it — it's a `workflow_dispatch` on `ref: main`,
  drivable straight from a chat via the GitHub Actions API, no terminal.

### One-time setup: the `DEVVIT_AUTH_TOKEN` secret

CI authenticates non-interactively by reading a `DEVVIT_AUTH_TOKEN` env var
(the CLI checks this before the on-disk token — see
`@devvit/cli` `AuthTokenStore.readFSToken`). To mint it, log in **once**
anywhere with a browser (local machine, or a Codespace this one last time):

```bash
devvit login --copy-paste   # approve in browser, paste the code back
devvit whoami               # sanity-check the account is right
cat ~/.devvit/token         # copy this ENTIRE line — it's the token value
```

Then in GitHub: **Settings → Secrets and variables → Actions → New
repository secret**, name `DEVVIT_AUTH_TOKEN`, value = the full contents of
`~/.devvit/token` (a JSON string like `{"token":"<base64>","copyPaste":true}`).
That's the last Codespace login you should ever need; the token carries a
refresh token, so the workflow keeps working until you `devvit logout` or the
grant is revoked. If a deploy ever fails at `devvit whoami` with a "not
logged in" error, the token was revoked — repeat this one-time step.

### The equivalent manual commands (still valid, for reference / debugging)

**Confirmed working, no review needed:** `devvit upload` followed by
`devvit install r/tipsey` — run from inside `tipsey-delivery/`, no app
name argument (the CLI already knows which app from the current
directory; `devvit install tipsey-delivery r/tipsey` — two args — is
WRONG and errors with "App r/tipsey is not found").

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
