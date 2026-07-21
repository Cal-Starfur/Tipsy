# Tipsy — Skin System Spec (v1)

## Reality Check: What the Distribution Channels Actually Support
- **itch.io**: no native in-game purchase / IAP flow for HTML5 embeds. Supported models: donations, pay-what-you-want, premium game + tip, optionally-paid bonus files, and a limited-quantity "reward" system (can even collect a shipping address). Ads and true IAP are explicitly not supported.
- **YouTube Playables**: in-app purchases are currently prohibited outright — even routing through an external/off-platform payment page violates current certification rules. Ads (pre-roll/interstitial/rewarded) are supported instead. IAP is expected sometime later in 2026 or into 2027, not available now.
- **Reddit/Devvit**: deprioritized, not evaluated here.

**Net:** no channel Tipsy ships on has a clean "buy a skin mid-game" flow today. v1 has to be a **redemption code** model — purchase happens outside the running game, unlock happens inside it.

---

## Recommended Architecture: Storefront-Agnostic Entitlements
Skins unlock via a local owned-skins list, populated by either an achievement trigger or a redeemed code. The game itself doesn't need to know which storefront a code came from — one unlock path, multiple ways to reach it.

**Purchase-path options (business call, not a technical one):**
1. **itch "optionally paid file"** — sell a small paid download (e.g. "Supporter Pack") whose content is a redemption code. Stays entirely on itch, matches the reward-system pattern itch already documents and supports.
2. **External storefront** (Gumroad / Ko-fi / Stripe Payment Link) — sell codes there, keep the itch page fully free. No itch-specific constraints, and works as a revenue channel independent of Playables' current IAP ban.

Either way, in-game mechanism is identical: a redemption input, checked against a code list, unlocking a skin ID in local storage.

**Security note:** itch's own guidance acknowledges purchase verification is inherently loose for solo devs — a static code list is fine for v1 economics. If this scales enough to matter, the upgrade path is a small serverless code-validation endpoint, not a rewrite.

---

## Skin Data Model
```json
{
  "skinId": "neon-courier",
  "displayName": "Neon Courier",
  "unlockType": "purchase | achievement | free",
  "spriteSet": {
    "heading0": "asset ref",
    "heading1": "asset ref",
    "heading2": "asset ref",
    "heading3": "asset ref"
  }
}
```

Local storage additions: `ownedSkins: [skinId, ...]`, `equippedSkin: skinId`.

---

## Asset Requirement — the Real Cost of This Feature
Every skin needs a full sprite/palette set across all 4 headings — same invariant that already governs every rendering system in the game. This is the actual bottleneck: skins are cheap to sell and cheap to unlock, expensive to draw. One skin means at minimum 4 heading variants, validated the same way heading fixes already are. Budget art time accordingly, not engineering time.

---

## Delivery Model
The game is a single file with no dynamic asset loading elsewhere in the architecture, so skins ship baked into `game/index.html` at build time rather than fetched at runtime. A new skin means a new game version and a new itch/butler deploy through the existing manual-trigger pipeline. A remote skin catalog (buy today, skin appears without an update) would need actual asset-hosting infrastructure that doesn't exist yet — explicitly out of scope for v1.

---

## Free Unlock Track
Challenge levels already exist as a progression hook (Phase 1 of the roadmap) — some skins can be `achievement`-type rewards tied to challenge completion instead of purchases. Reuses existing infrastructure, gives non-paying players something to chase, and makes purchasable skins read as a subset of the roster rather than a paywall on all customization.

---

## Open Decisions
- [ ] itch optionally-paid-file vs external storefront (or both)
- [ ] Redemption code format/generation (manual list vs generated batch)
- [ ] Which challenge routes gate which achievement-unlock skins
- [ ] Launch skin count (recommend small — 2–3 purchasable, 1–2 achievement-gated)
- [ ] Price point(s)
