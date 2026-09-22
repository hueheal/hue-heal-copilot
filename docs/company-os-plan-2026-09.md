# Copilot as a Company OS: the plan (22 September 2026)

## What the founder said

Too many interaction layers. Teams is hard to use and understand. At its core Copilot should be a simple company portfolio management system, an agentic Company OS that takes the heavy lifting of complex tasks, admin, outreach, customer engagement and marketing. Chat is the main way in, like the Claude interface, but visual and design-led: Apple-minimal, beautiful transitions, not a cockpit. Nothing we have built gets stripped out; it gets folded behind fewer doors.

References: two One Life app frames by Gleb Kuznetsov (greeting with counts, a single stack of cards, a five-item pill nav) and the founder's own Figma desktop frame (Copilot, node 8-179).

## The one idea

**One column, one conversation.** Every workspace opens on a single page that answers "what needs me today?" and a composer that can ask the company for anything. Departments, rooms, studios, clients and settings still exist; they are where work happens after you have said what you want, not where you start.

Reading order on the page, top to bottom:

1. **Greeting** (fades in on load): "Good morning, Maria. You have 2 approvals and 4 things on your desk." It fades out as the list comes into focus.
2. **Needs you**: approvals with Approve/Decline, decisions with a proposed default and an Answer chip.
3. **Now** and **Next**: the chief of staff's desk, one line each, tickable, tagged with the priority it serves.
4. **Priorities**: the founder's ordered list; open a row for its detail; tick to mark done.
5. **Parked**: dimmed, so nothing is lost and nothing shouts.
6. **Composer** (bottom, always there): plain words to the chief of staff, who routes to the right leads and rewrites the desk when replies land. Same channel as Telegram.

Chrome: workspace switcher centred at the top (mark, name, chevron; the menu lists workspaces), bell on the right with the approvals count, settings on the left. **Main menu on the right** as a floating glass rail: Today, Chat, Teams, Create, Clients. On a phone the rail becomes the bottom pill nav and the composer sits above it.

## Principles

- **Chat first, buttons second.** Anything you can click, you can also say. The composer is never more than one glance away.
- **Progressive disclosure, two levels.** A row shows a title and one line of meta. Opening it shows the detail in place. Anything deeper opens the room.
- **One accent, one primary action per row.** Copper only on the thing to do next.
- **Motion tells you where you are.** Greeting in, greeting out, list into focus, rows rising in sequence. 700 to 950ms, one easing. Reduced motion respected.
- **Poppins throughout the chrome. Hue & Heal palette always.** The workspace shows as a mark and a name, never a recolour.
- **Nothing lost.** Every current surface stays reachable from the rail or from a row.

## Phases

**Phase 1 (this draft): the home.** `/os` in the app, its own shell (no old top bar). Real data when signed in: roles, jobs, priorities, the chief's latest desk. `?demo=1` (or local mode) shows a sample day so the design can be judged before a desk exists. Ticks on desk lines are kept per browser for now.

**Phase 2: chat as a surface.** Tapping Chat opens the conversation with the company in place: your messages, the chief's routing note, replies as cards you can open, deliverables and image candidates inline with approve/decline. This replaces the daily briefing box, the room threads and most of the Team page as the way in. Rooms remain as the place to read a department's full history.

**Phase 3: Teams, simplified.** One page: the people, grouped by department, each with what they are doing now and one button, Talk. Hiring a department or a specialist is a single sentence in the composer ("hire a medical expert for Remedae"). The office dioramas move to a Teams sub-view rather than the front door.

**Phase 4: Create and Clients on the same grammar.** The studios keep their editors; their list pages become the same one-column card stack with the same rows and chips, opened from the rail or from a row's action.

**Phase 5: retire the old Home and Team routes** once the new ones cover every path, and promote `/os` to `/`.

## Open questions for the founder

1. Is "Today" the right name for the home, or "Home"?
2. The greeting hold is 3.2 seconds, and a click skips it. Right length?
3. Should the desk lines that you tick also tell the chief (so the next desk reflects it), or stay a personal checklist?
4. Rail order: Today, Chat, Teams, Create, Clients. Anything missing at the top level?
