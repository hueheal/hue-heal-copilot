# Copilot: heuristic review and refined brief, September 2026

The September redesign brief. Supersedes the visual sections of
`docs/master-redesign-prompt.md`; the chrome/canvas rule and everything
about brand engines still stand.

## 1. What Copilot is

One sentence: **Copilot is the operating system for a suite of businesses:
an AI workforce you brief, review and approve, plus the studio where its
tangible output is made.**

Three areas, and only three, for now: **Team** (the workforce), **Create**
(the studio), **Clients** (the people we serve). Home is the founder's desk
above all three. Analytics, Library and Calendar are parked until the core
is excellent.

The user is one person: a design-led founder running several brands. Every
screen must answer her first question in one glance and hide the rest one
click away.

## 2. Heuristic review of the current build (Nielsen's ten, applied)

**Visibility of status.** Good bones (job dots, working pills) but status is
scattered: Home, Team, seven rooms and Telegram each show a different slice.
No single place answers "what is happening right now".

**Match to the real world.** Strong in copy ("brief", "desk", "hire"), weak
in space: the org is a metaphor of an office told entirely in lists. Nothing
looks like the thing it is.

**User control.** Approvals, declines and parking are good. But destructive
and rare actions (retire, cadence) sit at the same visual weight as daily
ones.

**Consistency.** Three generations of UI coexist: the ck chrome (Team,
Home), the older hh surfaces (Clients, Settings panels), and per-editor
one-offs. Type sizes are set inline in dozens of places.

**Recognition over recall.** The rooms bury their rails: playbook, tools,
requests and people all render at once, below the board. Nothing is
progressive; everything is a wall.

**Aesthetic and minimalist design.** The main failure. Density has crept in
with every feature: Home now stacks six sections; a department room renders
nine. Spacing is inconsistent (14px here, 48px there), cards nest inside
cards, and the neutral grey palette reads as generic admin, not Hue & Heal.

**Error prevention, recovery, help.** Adequate: failures land as cards with
Try again; empty states explain themselves. Keep.

**Verdict.** The engine is right, the presentation is three tools wearing
one name. The fix is one system: one palette, one type scale, one layout
grammar, and progressive disclosure everywhere.

## 3. Design principles (in priority order)

1. **Breathable.** Space is the first material. A screen shows one primary
   thing; everything else is folded, tabbed or a click deeper. If a section
   is not needed to answer the screen's question, it is not on the screen.
2. **Progressive disclosure.** Board first, rails behind tabs, detail on
   open. Nothing renders more than two levels of information at rest.
3. **Apple HIG, Hue & Heal skin.** Layout, hierarchy, depth, motion and
   controls follow the macOS Human Interface Guidelines: clarity, deference,
   depth. Typography is **Poppins** (400/500/600) in place of SF. Colour is
   the Hue & Heal palette; the chrome no longer changes colour per
   workspace (the workspace shows as a name and dot only).
4. **Glass and depth.** Translucent material for the three navigation
   surfaces only: the floating top menu, the chat panel, the task panel.
   Content sits on opaque warm surfaces. Depth by soft shadow and blur,
   never by borders alone.
5. **The office is a place.** Team renders as rooms you can see and enter,
   not a list. Chat left, environment centre, tasks right.

## 4. The system

**Palette (chrome only; canvases untouched).**
Ground `#ECE6DA` (sand) with a soft radial warm gradient; panels
`#FBFAF6` (lotus); cards `#F5F1E8` (bone); ink `#1E1B18` (anthracite);
muted `#6E6257`; faint `#9A8D7E`; hairline `rgba(30,27,24,.09)`; accent
`#B5632F` (copper) for the one primary action per screen; department
accents survive only as marks and dots. Dark mode: anthracite ground
`#1E1B18`, cacao surfaces, bone ink; second-class but never broken.

**Type.** Poppins. Base 13px/1.55; h1 26px/600 tracking -0.02em; h2 (page
sections) 12px/600 uppercase tracked; numbers tabular. No inline font-size
in new code: sizes come from the scale (11, 12, 13, 15, 17, 20, 26).

**Layout grammar.** One floating glass menu at top (workspace, the three
areas + Home, search, theme, settings). Below it, per area: either a single
centred column (Home, Create list) max 880px, or the three-panel stage
(Team rooms, later Clients): chat 300px left, environment fluid centre,
tasks 320px right, panels collapsible.

**Spacing scale.** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 72. Section gap 48.
Card padding 16. Panel padding 20. Nothing tighter than 8.

**Motion.** 160ms ease-out for state, 240ms for panels; reduced-motion
respected everywhere.

## 5. The office (Team)

Seven department rooms rendered as isometric dioramas in the Hue & Heal
palette (Higgsfield, founder-approved, one per department; hover lifts,
active glows, a working dot animates when a seat is busy). Navigate by
clicking a room or arrow keys. Inside a room: chat with the lead (left),
the room scene (centre), board and rails behind tabs (right). A **meeting
room** joins the seven: call any set of seats, one agenda, minutes and
actions by the Chief of staff. 2.5D now (CSS depth on renders); Spline is
the agreed upgrade path for true 3D.

## 6. Phases

1. **Shell.** Poppins, palette, glass top menu, spacing pass, kill inline
   sizes on touched files. Ships first.
2. **Office.** Dioramas, three-panel stage, room chat, tabs. Meeting room.
3. **Clients + Create.** Same grammar: list left, subject centre, work
   right. Retire the last hh-era admin surfaces.

Out of scope in all phases: brand canvases, exports, the org engine, seat
prompts, Telegram behaviour.
