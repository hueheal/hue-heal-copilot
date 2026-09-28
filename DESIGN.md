# DESIGN.md: Hue & Heal Copilot (Company OS)

The design system for the copilot's OS surfaces (`/os`, the member layer, `/os/newsletter`), in the awesome-design-md format so any coding agent can build on-brand UI from it. Source of truth: the founder's Figma file "Copilot" (frames 8-179 home, 16-176 menu expansion, 23-811 team member chat). Implementation: `src/styles/os.css`, `src/pages/OsHome.tsx`, `src/components/os/MemberLayer.tsx`.

## 1. Overview

A chat-first Company OS that should feel like an Apple app, not a cockpit. One column, one conversation. The day arrives as one-sentence messages from team members (AI seats); opening any of them is a single chat with that member. Glass over a soft horizon sky, generous space, a large Light greeting that frosts in and settles as a small headline. Progressive disclosure: two levels at rest, anything deeper opens a room.

Two skins share the same bones: **sand** (default, the Figma frames) and **graphite** (dark, monochrome, Grok-manner; `?skin=graphite`).

## 2. Colors

| Token | Sand | Graphite | Use |
|---|---|---|---|
| `--os-ink` | `#2C2B2B` | `#F2F2F0` | body text |
| `--os-ink-60` | `rgba(44,43,43,.6)` | `rgba(242,242,240,.58)` | meta, menu, labels |
| heading ink | `#000` | `#FFF` | names, titles |
| `--os-accent` | `#FE8C2E` | `#FFFFFF` | the one primary action, the founder's name in the greeting, status dots |
| `--os-card` | `rgba(255,255,255,.40)` | `rgba(255,255,255,.055)` | every glass surface |
| ground | `linear-gradient(144deg,#F3F4F6 25%,#ECE7E4 46%,#E8D8C9 72%)` | `#0B0B0D` with faint white and violet blooms | page |
| founder bubble | `rgba(0,0,0,.9)` on `#E4E4E4` text | `#F2F2F0` on `#0B0B0D` | your own messages |

Orange appears once per card at most. Failures use an orange tint, never red.

## 3. Typography

Poppins only (300, 400, 500, 600 loaded). Sizes and tracking are the Figma file's, verbatim at desktop:

| Role | Size / line | Weight | Tracking |
|---|---|---|---|
| Greeting (on load) | 80 / 81 | 300 Light | -3.2px |
| Member name, chat title | 60 / 81 | 300 Light | -2.4px |
| Menu items | 30.56 | 500 | -1.22px, ink 60% |
| Card name | 30 / 34 | 500 | -1.2px |
| Card sentence | 24 / 27 | 400 | -0.96px, clamp 2 lines |
| Tab pill, room names | 20.5 / 20 | 500 | -0.82px |
| Composer text, settled headline | 18 / 22 | 500 | -0.72px |
| Chat bubble | 16 / 22 | 400 | -0.72px |
| Label, meta | 14 / 27 | 400-500 | -0.56px |

Emphasis inside a sentence stays at the sentence weight; the hierarchy comes from size and the Light/Medium contrast, not bold runs.

## 4. Layout

- Home column max 929px, centred. Member layer: 285px rooms, fluid chat, 286px task history, 30px gutters.
- Page padding 29px sides; top bar 22px from the top.
- Cards 13px apart; card padding 30px; avatar 97px with 32px gap to text.
- The chat panel is viewport-height with its own scroll; the composer is pinned to its foot and the newest message is always in view.

## 5. Elevation and depth

Glass, not shadow: `--os-card` fill, `backdrop-filter: blur(24px)`, an inner 1px white top highlight, and one soft ambient shadow `0 12px 40px rgba(60,40,30,.06)`. Avatars and workspace tiles carry the Figma five-layer drop shadow. A sky fade at the top and a ground fade at the bottom keep the switcher and composer legible over scrolling content.

## 6. Shapes

Radii: cards 40, chat panel 46, bubbles 28 with the tail corner 12, rooms 18, tiles 7.8, avatars 17.5, pills and composer fully round. Bot avatars are the soft 3D blob characters from the Figma file; photography only from the brand's own renders, never stock or placeholders.

## 7. Components

- **Top bar:** menu button (74x56 pill, flips to close), workspace switcher (row of 43px tiles in a white-40% tray, current tile at full opacity, others 50%), bell with approvals badge.
- **Menu:** large muted labels dropping in top-left with a 40ms stagger (Marketing, Teams, Clients, Approvals, Settings).
- **Message card:** avatar, `Name:`, one sentence (the seat's two-line `brief`), optional chips beneath. Clicking the card opens that member's chat.
- **Chips:** white-75% pills, 14px Medium; the primary is orange (sand) or white (graphite). One primary per card.
- **Member layer:** name, tab pill (Chat plus what the seat produces), rooms list (SLT Team, leads, members folded under the selected lead), chat panel, task history with spend.
- **Bubbles:** founder dark and right; members light and left. Working bubbles show three animated dots and who is being briefed; failed bubbles carry Try again; image runs show candidates with Keep / No.
- **Composer:** two-line pill ("Ask me anything" over the placeholder), 48px orange round send.

## 8. Do's and don'ts

Do: keep every home item to one sentence from one named member; let chat be the way in; put actions inside the message they belong to; use the file's type scale exactly.

Don't: add sidebars, rails or dashboards to the home; show system jobs (DESK:, ROUTE:) as if the founder said them; use em or en dashes in copy; assume the founder's gender; use stock or placeholder photography; name a medical condition in an email subject.

## 9. Responsive behaviour

Below 1200px the task history hides and becomes a Tasks tab. Below 900px: type steps down (greeting 40, card 20/16.5), rooms become an avatar strip, the menu labels drop to 26px, the composer becomes 64px high. Reduced motion collapses every transition to 1ms.

## 10. Motion

One easing, `cubic-bezier(.22,1,.36,1)`. Greeting frosts in over 2s (blur 16 to 0), holds about 3.6s or until a click, then shrinks into the settled headline while cards rise in sequence (80ms stagger). Menu items drop 10px in with a 40ms stagger. The ground breathes on a 22s loop.

## 11. Known gaps

Per-seat character art (currently two shared blobs), the Chat tab's rich post previews, and the graphite skin's email preview (kept light on purpose because that is what readers receive).
