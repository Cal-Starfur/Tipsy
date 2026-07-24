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

## Getting a change onto the dev subreddit (playtest)

Dev target is pinned in `tipsey-delivery/devvit.json` →
`"dev": {"subreddit": "tipsey_delivery_dev"}` — no need to pass a
subreddit name.

```bash
cd /workspaces/Tipsy
git pull
cd tipsey-delivery
npm install
npm run playtest
```

`npm run playtest` → `devvit playtest`. Live-syncs on further file
changes once running — no need to re-run per edit.

## Publishing live to r/tipsey (production)

```bash
cd /workspaces/Tipsy/tipsey-delivery
npm run publish
```

This runs `npm run clean && npm run build && devvit publish` (already
scripted in `package.json`). Unconfirmed whether an update to an
already-installed app republishes instantly or queues for Reddit's own
review — read whatever `devvit publish` prints after it finishes.

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
