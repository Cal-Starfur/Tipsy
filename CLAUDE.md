# Tipsy workflow

## Every change
1. Edit only `game/index.html`. Then run `python3 tools/build_devvit.py`, which regenerates
   `tipsey-delivery/public/game-logic.js` and `game.html`. Never hand-edit those two files.
2. Boot the game headless (Playwright + Chromium) and check: no page errors, and a
   screenshot of the thing that changed.
3. Publish the full `game/index.html` as an Artifact so I can play it on my iPad.
   Keep ONE preview per session: republish to the same artifact after changes.
4. Wait. I test in the artifact. Do not commit or push until I say "push".

## On "push"
- Commit and push straight to `main`. No side branches, no PRs.
- Before pushing, fetch and confirm `main` hasn't moved; if it has, stop and tell me.
- After pushing, fetch `main` and confirm the SHA-256 of `game/index.html` and
  `game-logic.js` matches what I tested.
- Tell me it's landed so I can test again on the live GitHub Pages build
  (the iPad home-screen app runs `game.html` / `game-logic.js` from main).

## Other rules
- Fix root causes, not symptoms. Measure before patching.
- Any change has to work in both the web and Reddit (Devvit) builds.
- Changes that depend on saved state: say so, and give a console line to seed it
  (the artifact boots with empty localStorage).
