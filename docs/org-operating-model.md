# The org operating model

The copilot runs a suite of businesses as an org of departments. This is how
it is put together and the guarantees it keeps.

## Shape

- **Departments**, defined in `org/departments/*.md`, each with a lead and a
  small team defined in `org/roles/<dept>/*.md`. Growth (sales and
  marketing), Product (research, design, technology), Partnerships, Founder
  office, Finance, Counsel (legal and compliance), Experts (subject matter,
  different per brand: `org/roles/experts/<brand>/`).
- **The founder talks to leads only.** A lead reads the task, decides whether
  it needs the team (`planTask`), briefs members in parallel, compiles and
  signs one deliverable. Members are never briefed by the founder.
- **Seats are prose.** Each markdown file carries the charter, the principles
  credited to the people the seat learns from, the lines it never crosses,
  and one-click plays. `npm run org` compiles them into one generated module
  used by both the app and the edge functions.

## Guarantees

1. **Workspace isolation.** Every role, run, job, note and department state
   row carries `brand_id`; every read is scoped to `(owner, brand_id)`; the
   system prompt walls the seat inside its workspace.
2. **Nothing leaves the building unapproved.** A deliverable declares
   `external: true` when acting on it would publish, send, spend or change a
   price. Such jobs sit in "Needs your approval" until the founder rules;
   rulings are read into every later run.
3. **Colleagues work with, not over, each other.** Remits (owns / defers),
   an org brief before every decision, handoffs filed to the seat that owns
   a thing, and department order on the cadence so the day compounds.

## Learning

Every Friday the scheduler runs `retroDepartment` for each lead whose
department did any work that week. The lead reads the work, the founder's
rulings and the requests, and rewrites the department **playbook**
(`dept_state.playbook`), which is injected into every future run. The founder
can read and edit it, or trigger it early with **Learn now**.

## Tools and budget

`org/tools/*.md` is the registry. A department declares the tools it wants;
the founder grants them per workspace (`dept_state.tools`) and sets a light
monthly budget (`dept_state.budget_pence`, £50 by default). Every model call
is metered (`role_runs.cost_pence`) and shown against the budget. Seats are
told to work in-house first and to ask for a tool as a request with the cost.

## Machinery

- `role-worker`: runs jobs (atomic claim, minute sweep, 15-minute stale
  timeout) and the on-demand retro.
- `role-scheduler`: daily cadence runs through the department path, Friday
  digests and retros.
- `telegram-bridge`: `@growth …` briefs a lead from the phone; `/team`,
  `/inbox`, `/approve`, `/digest`, `/workspace`.
