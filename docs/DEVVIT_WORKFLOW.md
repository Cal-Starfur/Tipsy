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

## Updating r/tipsey (production)

**This is a two-step process: `publish`, then a separate `install`.**
Confirmed straight from the CLI's own help text:

- **`upload`** — creates a new version, but that version is only
  installable on a subreddit under 200 subscribers. Not r/tipsey's
  situation.
- **`publish`** — creates the version, uploads it, *and* files it for
  Reddit's review. This already includes what `upload` does — never run
  both.
- **`install`** — the separate step that actually points a specific
  subreddit at a specific version. **A subreddit does NOT auto-jump to
  a new version just because one was published or approved** — it
  stays pinned to whatever version it was last installed with until
  `install` is run again.

```bash
cd /workspaces/Tipsy
git pull
cd tipsey-delivery
npm run test
devvit publish
```

That submits the new version for review — nothing more to do until
Reddit approves it (check status at
`https://developers.reddit.com/apps/tipsey-delivery`, or ask Claude to
poll it). **Once approved**, this is the command that actually makes
r/tipsey run it:

```bash
devvit install tipsey-delivery r/tipsey
```

(defaults to `@latest`, i.e. whatever version was just approved)

If `devvit install` errors with *"That version of this app isn't ready
to be installed yet"* right after publishing/uploading, that's a
benign, known timing issue — Reddit's backend needs a few moments to
finish processing server-side. Just wait ~30s and retry, don't
re-upload.

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
