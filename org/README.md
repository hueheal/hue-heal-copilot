# The org

Every department and every seat in the copilot is defined here, as prose.
Edit a file, run `npm run org`, and the app and the edge functions pick it up.

- `departments/` one file per department: mandate, identity, the tools it wants.
- `roles/<dept>/` the seats. `seat: lead` is the person the founder talks to;
  `seat: member` reports to the lead and is briefed by them, never by the founder.
- `roles/experts/<brand>/` the expert team, which is different for every brand.
- `tools/` the registry of tools a department can be granted.

Frontmatter carries the facts; the headings carry the thinking:

```
## Charter      who this seat is and what it is judged on
## Principles   the frameworks it works from, credited to the people it learned them from
## Never        the lines it does not cross
## Plays        one-click briefs, "- **Label**: task"
```

Keep it lean. A seat earns its place by owning something no other seat owns.
