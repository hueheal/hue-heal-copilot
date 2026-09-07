---
key: higgsfield
name: Higgsfield
status: connectable
cost: metered, per generation
url: https://docs.higgsfield.ai
mcp: https://mcp.higgsfield.ai/mcp
---
AI image and video generation for post assets when the studio's own templates
cannot carry the idea. Has a public API and a Node SDK, so it can be wired in
as a connector. In-house first: a seat asks for it as a request with the
reason and the estimated cost, and the founder grants it.

Style rules for anything generated for Remedae live in `org/brand/remedae-imagery.md`,
with the prompt parts in `org/brand/remedae-prompt-library.json`. A prompt is
always master, module, subject, surface, negatives, in that order. Every file
gets a sidecar JSON with the prompt, tool, seed, date and approver.

The MCP endpoint is OAuth-protected. It is added to a Claude Code session with
`claude mcp add --transport http higgsfield https://mcp.higgsfield.ai/mcp`, then
authorised with `/mcp` in that session.

