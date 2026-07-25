---
name: devvit-cli
description: >-
  Run the Devvit workflow for tipsey-delivery from inside Claude without
  GitHub Codespaces. Load whenever the task involves devvit commands — build,
  lint, test, "devvit upload", "devvit playtest", "devvit login", "publish to
  Reddit", "ship the Devvit app", or deploying tipsey-delivery to Reddit.
---

# Devvit CLI workflow — tipsey-delivery

The Devvit app lives in **`tipsey-delivery/`** (repo `cal-starfur/tipsy`).
Everything here is scoped to that subdirectory.

## The one thing to understand first

Claude's container and a GitHub Actions runner have **different network
access**, and that split defines the whole workflow:

| Command | Needs Reddit? | Runs in Claude container? | Runs in GitHub Actions? |
|---|---|---|---|
| `npm install`, `npm run build`, `lint`, `test:types`, `test:unit` | no | ✅ yes | ✅ yes |
| edit / commit / push | no | ✅ yes | — |
| `devvit login` (code exchange) | yes | ⚠️ only if policy allows | ✅ yes |
| `devvit whoami` | yes | ⚠️ only if policy allows | ✅ yes |
| `devvit upload` / `publish` | yes | ⚠️ only if policy allows | ✅ yes |
| `devvit playtest` / `logs` | yes | ⚠️ + interactive/long-running | ⚠️ not in CI |

**By default this Claude container's network policy blocks `*.reddit.com`**
(the proxy returns `403 CONNECT tunnel failed` for `www.reddit.com` and
`developers.reddit.com`). When it's blocked, the login URL still generates,
but the code exchange — and every `whoami`/`upload`/`publish` — fails. That is
the single reason a naïve "run devvit login in Claude" flow stalls.

So the workflow has two halves. Use the right half for the job.

---

## Half 1 — Local dev & CI, inside Claude (no Reddit needed)

This all works in the container right now. Always run from `tipsey-delivery/`.

```bash
cd tipsey-delivery
npm install                # ~1 min, first time per session
npm run build              # esbuild client + server
npm run lint               # biome (use `npm run format` to auto-fix)
npm run test:types         # tsc --build
npm run test:unit          # node --test
npm test                   # all of the above in sequence
```

Use this half for iterating on game/server code, fixing lint/type errors, and
verifying a change builds — then commit and push. No Codespace required.

---

## Half 2 — Ship to Reddit (needs Reddit access)

### Preferred: GitHub Actions (`.github/workflows/devvit-deploy.yml`)

The runner can reach Reddit, so this is the reliable no-Codespace ship path.

One-time setup:
1. On any machine that can reach Reddit, run `devvit login`, then copy the full
   contents of `~/.devvit/token`.
2. Add it as repo secret **`DEVVIT_TOKEN`** (Settings → Secrets and variables →
   Actions).

To ship: Actions tab → **Devvit deploy** → Run workflow → pick
`upload` (private test version) or `publish` (submit to go live) and a bump.
Re-add the secret if it expires (the `Verify auth` step will fail with
"Not currently logged in").

### Alternative: run devvit directly in Claude

Only works if the container's network policy allows `*.reddit.com`. To use it,
Cal must switch this environment to a network policy that permits reddit.com
(chosen when the environment is created — see
https://code.claude.com/docs/en/claude-code-on-the-web). Once Reddit is
reachable:

```bash
cd tipsey-delivery
npm install
npx devvit login --copy-paste   # interactive — see login flow below
npx devvit whoami               # should print Cal's Reddit username
```

**Copy-paste login flow** (no localhost needed):
1. Run `npx devvit login --copy-paste`. It prints a `reddit.com/api/v1/authorize`
   URL. **STOP and paste that URL to Cal.**
2. Cal opens it (iPhone Safari is fine), authorizes, copies the code.
3. Cal pastes the code back; feed it to the waiting prompt.
4. Verify with `npx devvit whoami`.

**Faster next session** — restore a saved token instead of logging in:
```bash
mkdir -p ~/.devvit && printf '%s' 'PASTED_TOKEN_JSON' > ~/.devvit/token
npx devvit whoami
```

Then `npx devvit upload --bump patch` / `npx devvit publish --bump patch`.

---

## Approval gate (both halves)

`upload` and `publish` change what exists on Reddit. Before either:

1. Show what will ship: `git log -1`, current version, changed files.
2. **Ask for explicit approval and STOP.**
3. Only after "yes / go / ship it" in the *current* turn, run the command.

`publish` always needs its **own** approval, even right after an approved
`upload` — it submits the app to go live, `upload` only makes a private test
version.

## Token safety

The devvit token is a password. Never echo it in chat, never `cat` it into
visible output, never commit it, never stage it. In CI it lives only in the
`DEVVIT_TOKEN` secret; in the container it dies on reset.

## Troubleshooting

- **`Not currently logged in`** → token missing/expired → restore or re-login.
- **`403 CONNECT tunnel failed` / network error on reddit** → the container
  policy is blocking Reddit → use the GitHub Actions path, or switch the
  environment's network policy.
- **Version conflict on upload** → that version already exists → use a
  different `--bump` or an explicit `--version`.
- **`playtest` / `logs` hang** → they stream forever; they're impractical
  through a one-shot shell. For a bounded peek: `timeout 20 npx devvit logs
  r/SUBREDDIT 2>&1 | tail -30`. For real interactive playtest, use a
  persistent shell that can reach Reddit (local terminal or Cloud Shell).
