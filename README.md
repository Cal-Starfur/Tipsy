# TIPSY — a clumsy delivery

An isometric Phaser 3 daily-delivery game. You are the routing AI of a top-heavy
sidewalk delivery robot in the fictional city of **Costa Palma**. One address a day.
The city wants you horizontal.

Inspired by real sidewalk delivery robots having a genuinely bad time on real pavements.

## The daily loop

- Every date seeds an identical route for every player: neighborhood, terrain,
  hazards, address, and tip multiplier.
- Reach the door **slow and upright**. Tip over and the lid flops open and your
  burrito hits the pavement.
- Payout = tip multiplier × cargo condition − time penalty.

## Controls (one thumb)

| Input | Action |
|---|---|
| Hold right side | Throttle |
| Hold left side | Brake |
| Swipe up / down | Change lane |

Desktop: arrow keys (←/→ throttle-brake, ↑/↓ lane).

Every hazard is a small real-time routing problem: hop lanes (costs stability,
scaled by speed) or brake (costs time). Driveways cross-tilt you continuously
while you're on them. Hills add speed whether you like it or not.

## Repo layout

- `game/index.html` — the playable prototype (Phaser 3 via CDN)
- `labs/` — the development labs: sprite dial-in, district visuals, daily route generator
- `prototypes/` — the original Matter.js side-scroller proof of concept
- `docs/DESIGN.md` — living design document (decisions, tuning values, roadmap)

## Status

Playable prototype. Built for the Reddit hackathon (Games with a Hook · Best Use
of Phaser), July 2026. Built with Claude for code; original game design.
