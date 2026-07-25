---
name: devvit-cli
description: Deploy a Devvit (Reddit developer platform) app to Reddit from Claude by driving a GitHub Actions runner — Claude's own container is firewalled off from Reddit (403) so the CLI can't upload from here. Load whenever the task involves devvit commands — "devvit upload", "devvit playtest", "devvit login", "publish to Reddit", "update the Devvit app", deploying Tipsy (app name tipsey-delivery, subreddit r/tipsey) to Reddit, or any mention of the Devvit CLI, app versioning, or app uploads. Covers the Claude-driven Actions deploy, the one-time DEVVIT_TOKEN secret setup, offline in-container validation, and the approve-before-deploy rule. Pairs with github-sync for pulling repo code.
---

# Devvit CLI — deploy to Reddit without a Codespace

**Read this first — it's the whole reason the old version of this skill
failed:** Claude's container network is firewalled to GitHub/npm/PyPI.
Anything the Devvit CLI sends to Reddit (`login`, `upload`, `install`,
`playtest`, `publish`) comes back **`HTTP 403 Forbidden`**. The CLI
*installs* fine here and offline commands work, but you **cannot** log in
or upload from inside Claude's container. Do not try — it's a network
wall, not a bug to work around.

The way to deploy Devvit from Claude is to run the CLI **on a GitHub
Actions runner** (which reaches Reddit fine) and drive that runner from
here via the GitHub API. No Codespace, no terminal.

---

## The deploy workflow (primary path)

Each Devvit repo has a `.github/workflows/deploy-devvit.yml`
(`workflow_dispatch`) that installs the CLI on a runner, restores auth
from the `DEVVIT_TOKEN` repo secret, and runs `devvit upload` +
`devvit install r/<subreddit>`. Claude dispatches it and reads the logs.

- **Tipsy** → repo `Cal-Starfur/Tipsy`, workflow `deploy-devvit.yml`,
  Devvit project in `tipsey-delivery/`, prod subreddit `tipsey`, dev
  subreddit `tipsey_delivery_dev`.
- Other repos: same pattern; confirm the workflow filename and the target
  subreddit before dispatching.

### To deploy (approval-gated — see rules below)

1. **Show what will ship.** Latest commit on the default branch, the
   changed files, and the target subreddit. STOP and get explicit
   approval ("yes" / "ship it" / "upload it").
2. **Dispatch the workflow** via the GitHub MCP tools
   (`mcp__github__actions_run_trigger`, `workflow_dispatch`) with inputs
   `{ subreddit: "<name>", publish: false }`. Leave `publish` false for a
   routine update — `upload` + `install` is enough; `publish` files the
   app for Reddit review and needs its own separate approval.
3. **Watch it.** Poll `mcp__github__actions_list` / `actions_get`, and on
   completion pull `mcp__github__get_job_logs` (`failed_only` when it
   failed). Report the result — the `devvit whoami` line confirms the
   right account, and the install step confirms the version landed.
4. If it fails, read the logs and fix forward. A transient "version isn't
   ready to be installed yet" is already retried inside the workflow.

🚫 Never dispatch a deploy without explicit approval in the current turn.
🚫 `publish: true` always needs its own separate approval, even right
after an approved upload.

---

## One-time setup: the DEVVIT_TOKEN secret

The runner authenticates by restoring a saved Devvit token. This is set up
**once** (until the token expires):

1. Get a token: run `devvit login --copy-paste` **once** somewhere with
   real network — a local machine, or **Google Cloud Shell**
   (shell.cloud.google.com — free, works in iPhone Safari). After
   `Logged in as ...`, run `cat ~/.devvit/token` and copy the output.
2. In GitHub → the repo → **Settings → Secrets and variables → Actions →
   New repository secret**: name it exactly **`DEVVIT_TOKEN`**, paste the
   token, save.

The token is a password — it goes only into the GitHub secret box. Never
paste it into chat, never commit it, never echo it in tool output. Claude
does **not** handle the token value; the user sets the secret directly.

If a deploy fails at the `Verify auth` / `devvit whoami` step with
"Not currently logged in", the secret is missing or the token expired —
redo this setup.

---

## What the container IS good for (offline only)

Install works; use it for **validation before deploy**, never for talking
to Reddit:

```bash
npm install -g devvit && devvit --version   # fine
cd tipsey-delivery && npm install
npm run build            # bundle check
npm run test:types       # tsc
npm run lint             # biome
node --check <file.js>   # syntax
```

Pull the repo with the **github-sync** patterns (or a PAT clone). The live
repo is the source of truth — never deploy from cached/stale files.

---

## Playtest / logs — still need a real shell

`devvit playtest` and `devvit logs` are long-running and talk to Reddit
live, so they can't run from Claude's container OR cleanly through a
one-shot Actions run. For those, use **Google Cloud Shell**
(shell.cloud.google.com — persistent 5GB home, so devvit login and the
clone survive between sessions; works in iPhone Safari). For Tipsy, note
that GitHub Pages
(https://cal-starfur.github.io/Tipsy/game/index.html) is the real testing
loop and needs no CLI at all — prefer it over playtest.

---

## Troubleshooting

- **`HTTP 403 Forbidden` on login/upload from Claude's container** →
  expected, the container can't reach Reddit. Use the Actions deploy, not
  the container.
- **`Not currently logged in` in the Actions run** → `DEVVIT_TOKEN` secret
  missing/expired → redo the one-time setup.
- **Version conflict on upload** → the version already exists → Devvit
  usually auto-bumps; if not, bump the version and re-run.
- **`install` fails right after `upload`** → benign timing; the workflow
  already retries with backoff.
