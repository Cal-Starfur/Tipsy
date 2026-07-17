/**
 * main.tsx — TIPSY (Devvit host)
 *
 * Responsibilities:
 *  1. On webview ready → look up today's (or whatever date was requested)
 *     shared daily-best from Redis, send it down.
 *  2. On a new daily-best from the webview → re-verify against Redis
 *     (source of truth, not the client's own comparison) and store it,
 *     tagged with the Reddit username.
 *
 * Pattern matches Wigglers Room's working main.tsx (useWebView +
 * addCustomPostType, pinned to the same @devvit/public-api range) rather
 * than the newer Blocks docs, since that's the version actually proven
 * to work on this account. Devvit's runtime wraps inbound webview
 * messages in a `{ type: 'devvit-message', data: { message } }` envelope
 * — unwrapped below the same way Wigglers Room does it.
 *
 * Redis key: tipsy:global:best:<dateStr> -> JSON { tip, ms, username }
 * dateStr is "YYYY-MM-DD" (UTC) — matches the webview's own
 * `new Date().toISOString().slice(0,10)` exactly, since every route is
 * seeded by that same string (see requestDailyBest() in game/index.html).
 */

import { Devvit, useWebView } from '@devvit/public-api';

// ─── Message type constants ────────────────────────────────────────────────
// Inbound (webview → host)
const MSG_REQUEST_BEST = 'TIPSY_REQUEST_BEST';
const MSG_DAILY_BEST   = 'TIPSY_DAILY_BEST';
// Outbound (host → webview)
const MSG_BEST_REPLY   = 'TIPSY_BEST_REPLY';

Devvit.configure({
  redditAPI: true,
  redis: true,
});

// ─── Redis helpers ──────────────────────────────────────────────────────────
type DailyBest = { tip: number; ms: number; username: string } | null;

const KV_BEST = (dateStr: string) => `tipsy:global:best:${dateStr}`;

async function getDailyBest(redis: any, dateStr: string): Promise<DailyBest> {
  const raw = await redis.get(KV_BEST(dateStr));
  return raw ? JSON.parse(raw) : null;
}

Devvit.addCustomPostType({
  name: 'Tipsy',
  description: 'One address a day. You are the routing AI of a top-heavy sidewalk delivery robot — the city wants you horizontal.',
  height: 'tall',

  render: (context) => {
    const { redis } = context;

    const webView = useWebView({
      url: 'index.html',

      async onMessage(rawMessage: any) {
        // Unwrap Devvit's message envelope if present (same pattern as
        // Wigglers Room — the webview's plain window.parent.postMessage
        // arrives here wrapped).
        let message: any;
        if (rawMessage?.type === 'devvit-message' && rawMessage?.data?.message) {
          message = typeof rawMessage.data.message === 'string'
            ? JSON.parse(rawMessage.data.message)
            : rawMessage.data.message;
        } else {
          message = rawMessage;
        }
        if (!message || !message.type) return;

        switch (message.type) {
          case MSG_REQUEST_BEST: {
            const { dateStr } = message.payload;
            const best = await getDailyBest(redis, dateStr);
            webView.postMessage({ type: MSG_BEST_REPLY, payload: { dateStr, best } });
            break;
          }

          case MSG_DAILY_BEST: {
            const { dateStr, tip, ms } = message.payload;
            // Redis is the source of truth for the shared record, not the
            // client's own "better than what I last saw" check — re-verify
            // here so two players finishing close together can't both
            // think they set the record and overwrite each other with a
            // worse one.
            const current = await getDailyBest(redis, dateStr);
            const better = !current || tip > current.tip || (tip === current.tip && ms < current.ms);
            if (better) {
              const user = await context.reddit.getCurrentUser().catch(() => null);
              const username = user?.username ?? 'anonymous';
              await redis.set(KV_BEST(dateStr), JSON.stringify({ tip, ms, username }));
            }
            break;
          }

          default:
            console.warn('[main] Unknown message type:', message.type);
        }
      },

      onUnmount() {
        console.log('[main] WebView unmounted');
      },
    });

    // Tap-to-launch — the webview (full Phaser bundle) only loads once
    // someone actually taps play, not on every feed impression.
    return (
      <zstack width="100%" height="100%" alignment="center middle" onPress={() => webView.mount()}>
        <vstack alignment="center middle" height="100%" width="100%">
          <text size="xxlarge" weight="bold">🤖 TIPSY</text>
          <text size="medium" color="neutral-content-weak">a clumsy delivery — tap to play</text>
        </vstack>
      </zstack>
    );
  },
});

// ─── Subreddit menu item to create a new Tipsy post ────────────────────────
Devvit.addMenuItem({
  label: '🤖 Create Tipsy post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event: any, context: any) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      title: 'TIPSY — a clumsy delivery 🤖',
      subredditName: subreddit.name,
      preview: (
        <vstack alignment="center middle" height="100%" width="100%">
          <text size="large">🤖 Loading TIPSY...</text>
        </vstack>
      ),
    });
    ui.showToast({ text: '🤖 Tipsy post created!', appearance: 'success' });
    ui.navigateTo(post);
  },
});

export default Devvit;
