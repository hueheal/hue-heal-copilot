# The org: how roles work together, stay separated, and reach your phone

Three guarantees, and the machinery behind each.

## 1. Roles build on each other instead of overruling each other

**Remits.** Every seat declares what it owns and what it hands over. The CMO owns
the calendar and positioning; the Editor-in-chief owns quality, headlines and the
story slate; the Social strategist owns Instagram; the Brand guardian owns voice.
A custom seat's remit is taken from the first line of its charter. The remit is in
the system prompt, and the rule with it is explicit: anything inside a colleague's
remit is theirs to decide.

**The org brief.** Before a role decides anything it is given, in its own words:

- where every colleague stands (their most recent deliverable, title and summary,
  marked live and in force),
- controller decisions already settled (approved and declined items across the
  org, not to be reopened),
- what is already on your desk from other roles, so two seats don't ask you for
  the same tool twice,
- its inbox, and the handoffs it has already sent.

The instruction attached to it: never redo, contradict or quietly overwrite a
colleague's live decision. Disagreement is allowed, but it goes out as a note to
that role, so you see one argument rather than two conflicting plans.

**Handoffs.** Every deliverable can carry notes addressed to a named colleague.
They are filed in `role_notes`, shown on the Roles page under **Between roles**,
appear in the recipient's room under **From colleagues**, and are read into that
role's next run, which is then told to answer them explicitly. Answering closes
the note. So the Editor-in-chief's verdict on a piece reaches the Social
strategist before it plans the week, without either seat deciding for the other.

**Order of play.** Scheduled runs go CMO, then editor, then social, then guardian.
Each reads the ones before it the same morning, so the day compounds.

## 2. Workspaces cannot influence each other

- `roles.brand_id` is `NOT NULL`. A role belongs to exactly one brand world and
  the app refuses to hire one without a workspace.
- Every read a role makes is scoped to `(owner, brand_id)`: the workspace
  snapshot, the colleague roster, the ledger, handoffs, run history. Migration
  0027 also stamps `brand_id` onto `role_runs` and `role_items`.
- The subscriber count in the scheduled snapshot was previously scoped by owner
  only. Fixed: it is scoped by brand like everything else.
- The system prompt names the workspace and forbids carrying anything over from
  any other brand: audience, positioning, results, examples or copy.
- A linked chat is bound to one workspace at a time, so Hue & Heal and Remedae
  never share a thread.

## 3. Talking to the org from your phone

Telegram, not WhatsApp. WhatsApp's Cloud API needs a Meta app, business
verification, and pre-approved templates for anything sent outside a 24-hour
window, and your Meta developer account is currently flagged. Telegram needs a
bot token and nothing else, sends freely, and costs nothing.

### Setup (about ten minutes, all on your side)

New to Telegram? Full walkthrough in [telegram-setup.md](telegram-setup.md).
Short version, once you have a bot token from `@BotFather`:

```bash
bash scripts/setup-telegram.sh
```

It asks for the token in a hidden prompt, stores it on the edge functions,
mints a webhook secret and registers the webhook. Then pair from Settings →
Channel with `/start CODE`, once per workspace.

### In the chat

```
@cmo plan september        brief a role by name
/roles                     the team, their cadence, what is waiting
/inbox                     requests and experiments awaiting your call
/approve a1b2              approve (or /decline) by the code from /inbox
/digest                    the latest weekly digests
/workspace <name>          point this chat at another workspace
```

Plain text with no `@name` goes to the lead role (the CMO if hired). Scheduled
deliverables and Friday digests are pushed to the linked chat automatically;
turn that off with the toggle in Settings → Channel.

### Security

The bridge only accepts requests carrying Telegram's own secret-token header. An
unknown chat is told nothing except how to pair. Approvals are only accepted from
a chat already bound to that workspace, and a decision made from the phone is the
same decision the roles read in their next run.
