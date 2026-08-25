# Hue & Heal Copilot — Master Product & UI Redesign Prompt
## For Claude Code Implementation

---

## Executive Summary

Transform the existing **Hue & Heal Studio Copilot** (https://copilotadmin.hueandheal.com/) into a mature, premium, AI-native creator and business operating system.

This is an **evolution, not a rebuild**. All existing functionality, data, workflows, and integrations must be preserved while substantially upgrading the information architecture, interaction model, creator experience, and visual design system.

The experience should combine principles from **Apple** (simplicity, restraint, hierarchy), **Runway** (prompt-first creation, canvas-led workflows), **Linear** (speed, precision, discipline), and **Hue & Heal's** own philosophy (warmth, humanity, emotional intelligence).

---

## 0. PHASE 0 — AUDIT & DISCOVERY (BEFORE IMPLEMENTATION)

### Purpose
Map existing functionality, data structures, integrations, and potential risks before writing new code.

### Required Audit Outputs

**0.1 Application Architecture**
- Current tech stack (framework, build tool, dependencies)
- Hosting/deployment setup
- Authentication/auth service
- Database (schema for companies, workspaces, users, content)
- API routes and integrations

**0.2 Existing Features**
List all currently working features including:
- Workspace/company management
- Content creation types (journal, social, proposals, invoices, documents)
- Document templates
- AI integration points and models used
- Export/publishing capabilities
- User roles/permissions
- Existing reusable components

**0.3 Current Navigation/Routes**
- App structure and URL hierarchy
- Current page/component organization
- Sidebar/menu structure
- How users currently switch between companies

**0.4 Data Model**
- Company/workspace structure
- User relationships to companies
- How content is stored (are proposals/journals separate tables?)
- How versions are tracked (if at all)
- Asset/file storage

**0.5 Existing AI Integrations**
- Which Claude models are currently used
- System prompts in use
- API endpoints and rate limiting
- Cost/token tracking
- Where generation happens (frontend vs. backend)

**0.6 Reusable Components**
- Existing component library
- Styling approach (Tailwind? CSS Modules? shadcn?)
- Design tokens or variables already defined
- Accessibility implementation

**0.7 Functionality at Risk During Redesign**
- Which workflows must not break
- Critical user journeys
- Performance-sensitive operations
- Data that must be preserved exactly

**0.8 Components/Code to Retain**
- Backend logic suitable for reuse
- API calls that are working well
- Database queries to preserve
- Authentication/authorization code

**0.9 Components to Refactor**
- UI components that need redesign
- Navigation that should be restructured
- Styling that should be unified
- Pages that need architecture changes

**0.10 Proposed Migration Sequence**
- Which features migrate first
- What to build before moving existing code
- How to run parallel systems if needed
- Rollout strategy (full cutover vs. beta toggle vs. parallel UI)

### Deliverable
Return a structured audit document (2–4 pages) addressing each section above. Do not begin implementation until this audit is complete and reviewed.

---

## 1. PRODUCT VISION

Copilot should feel like:

> **One intelligent creative operating system for every company I build.**

The platform exists above individual brands. The user enters Copilot and moves between distinct company worlds while retaining one coherent operating environment.

Each company workspace should understand:
- Brand identity, visual system, and tone of voice
- Audience and positioning
- Products/services and pricing
- Existing documents, templates, and previous content
- Strategic context and business model
- Uploaded assets and frequently used formats
- Creation history and patterns

The experience should move away from:
```
dashboard → form → generate → download
```

Toward:
```
enter workspace → express intent → create → refine → reuse → publish/export
```

AI should feel embedded in the environment, not bolted on as a separate chatbot.

---

## 2. NON-NEGOTIABLE PRINCIPLE — PRESERVE EXISTING PRODUCT

Before making structural changes:

1. **Audit** the current application (see Phase 0)
2. **Identify** all existing routes, pages, databases, API connections, components, workflows
3. **Document** functionality associated with each
4. **Preserve** existing working functionality unless explicitly replaced by an improved equivalent
5. **Do not delete** database fields, routes, integrations, or content merely because the interface is changing
6. **Refactor incrementally** rather than rebuilding blindly

The redesign must not cause regression in:
- Workspace management and company switching
- Content creation (journal, social, proposals, invoices, documents)
- Proposal and document generation
- Invoice creation and management
- Social media content creation
- Existing saved content and versioning
- Existing user/company information
- Existing AI integrations and generation workflows

**Migration Rule:** If existing backend logic is working, reuse it. Only replace UI and orchestration layers.

---

## 3. PRIMARY PRODUCT ARCHITECTURE

Reorganize Copilot around five core concepts:

### **Home**
The intelligent starting point. Shows current workspace, quick-create composer, recent work, and suggested actions.

### **Workspaces**
Individual companies and brand worlds. Workspace selector, workspace-specific navigation, and brand context.

### **Create**
Universal creation environment. Single entry point for all content types with intent-led prompting.

### **Library**
Everything created, uploaded, or saved. Unified search, filtering, asset browsing, and project organization.

### **Intelligence**
Brand knowledge, context, and AI understanding. Workspace-specific brand settings, knowledge base, and content guidelines.

**Secondary destinations** (sidebar footer):
- Settings / Account controls
- Search / Command bar
- Notifications (if applicable)

Avoid creating dozens of top-level destinations. Keep navigation minimal and purposeful.

---

## 4. GLOBAL COPILOT SHELL

Create one consistent product shell that exists across all company workspaces.

**Visual Principles:**
- The UI should feel extremely calm and editorial
- Content and whitespace are the primary interface
- Minimize cognitive load

**Avoid:**
- Large dashboard cards everywhere
- Excessive borders, gradients, rounded SaaS panels
- Permanent toolbars full of controls
- Dense tables (unless genuinely required)
- Multiple competing CTA colors
- Excessive icons
- "AI sparkle" visual clichés
- Anything that feels like an admin dashboard

**Use:**
- Generous whitespace
- Clear hierarchy through typography and spacing
- Minimal color (accents only where meaningful)
- Intentional details rather than decorative styling

---

## 5. NAVIGATION

### Global Sidebar
Use a **compact collapsible shadcn Sidebar component**, defaulting to lightweight visual state.

**Structure:**

```
┌─────────────────────┐
│      [H&H logo]     │   ← Copilot branding
├─────────────────────┤
│  + New              │   ← Universal create action
├─────────────────────┤
│  🏠 Home            │
│  ✎ Create          │
│  📚 Library        │
│   🗂️  Workspaces    │
├─────────────────────┤
│  🏢 Hue & Heal     │   ← User's workspace list
│  🏢 Her Comeback Club│
│  🏢 LUME            │
│  🏢 Remedae         │
│  🏢 [Other]         │
├─────────────────────┤
│  🔍 Search / Cmd   │
│  🔔 Notifications   │   ← Optional; only if needed
│  ⚙️  Settings       │
│  👤 Profile         │
└─────────────────────┘
```

- Sidebar should collapse into an **icon rail** at <768px (use `collapsible="icon"` from shadcn)
- Use tooltips when collapsed
- Active state highlighted subtly
- Do not create an oversized sidebar

### Workspace Navigation
When a workspace is selected, show workspace-specific sections:
- **Overview** — workspace home/dashboard
- **Create** — workspace-specific creator access
- **Projects** — project management
- **Library** — workspace assets
- **Brand** — brand settings and intelligence
- **Knowledge** — company information and context

---

## 6. COMPANY WORKSPACES

A company should feel like entering a **brand world**, not opening a folder.

**Workspace Identity:**
- Workspace name and optional brand mark (small, 32–48px)
- Subtle brand accent color (optional, used sparingly)
- Workspace-specific header or badge

**Visual Approach:**
Do not completely recolor the application for each workspace. The Copilot shell should remain consistent.

Instead, allow subtle brand expression through:
- Accent color (optional, in buttons, active states, borders)
- Workspace mark/icon
- Selected states
- Template previews and content imagery
- Typography samples where appropriate (on brand settings pages)

This keeps Copilot coherent while allowing each company to feel distinct.

---

## 7. WORKSPACE HOME / OVERVIEW

Replace traditional analytics dashboards with an intelligent, intent-led workspace home.

**Feeling:**
> I can immediately continue working.

**Layout (Desktop):**

```
[Workspace name + mark]                            [···]

[Primary creation composer]

[What would you like to create?]
[+ Reference]  [Create]

─────────────────────────────────────────

Continue working

[Large visual project cards - recent edits]

[Project 1]  [Project 2]  [Project 3]

─────────────────────────────────────────

Suggested actions (sparse, ~3 items)

□ Continue July Comeback Edit
□ Turn journal into social posts
□ Create proposal from previous template
```

### Primary Creation Composer
- Prominent but restrained
- Accepts natural-language intent
- Contextual action pills (Document, Social, Journal, Proposal, Invoice, Campaign, Visual, Other)
- Should feel like the main interaction point

### Continue Working
- Surface 3–6 most recently edited projects
- Use large visual previews (thumbnails) rather than rows
- Show project title, workspace, and last edited date

### Suggested Actions
- 2–4 contextual suggestions based on workspace history
- Examples: "Turn journal into social," "Create next month's invoice," "Adapt campaign for Instagram"
- Do not overwhelm; keep it sparse and relevant

---

## 8. UNIVERSAL CREATE EXPERIENCE

Creation should be the heart of Copilot.

### Entry Point
When user clicks "+ New" or "Create," open the **Create** environment.

**Initial State:**
- Large, clean canvas
- Centered or bottom-floating intelligent composer
- Clear heading: "What do you want to create?"

### Intent Recognition
User writes natural language describing what they want to make:

Examples:
- "Create a proposal for a new Hue & Heal hospitality client based on the Cloud Twelve structure"
- "Create the next Her Comeback Club Instagram carousel around financial confidence"
- "Turn this journal article into LinkedIn and Instagram content"
- "Generate next month's invoice for LUME"

Copilot should:
1. Recognize intent and creation type
2. Gather necessary context (workspace, references, format)
3. Determine optimal workflow
4. Transition to appropriate creator canvas

**Do not require** the user to manually choose AI model, template, or format upfront.

---

## 9. CREATION TYPES

Retain all current creators but unify them under the Create environment.

### Document Creators
- Proposal
- Strategy document
- Report
- Presentation/content deck
- Brief
- Invoice
- Client document
- Internal document

### Editorial Creators
- Journal
- Article
- Newsletter
- Thought leadership
- Long-form post

### Social Creators
- Instagram carousel
- Instagram caption
- LinkedIn post
- Campaign
- Story content
- Short-form copy

### Brand Creators
- Creative concept
- Moodboard direction
- Campaign direction
- Photography brief
- Brand copy
- Messaging framework

### Visual Creators
- Image generation (if applicable)
- Creative asset generation
- Reference-based creation

**Extensibility:**
Structure the system so new creation types can be added without refactoring the core Create flow.

---

## 10. CREATOR CANVAS

After creation begins, do not move the user to a generic form/result page.

Open the asset within a persistent **Creator Canvas**.

### Desktop Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [Sidebar]  [Document Title]                    [Share] [···]   │
├────────┬──────────────────────────────────────────────────────┤
│        │                                                      │
│  Nav   │         PRIMARY CREATIVE CANVAS                     │
│ (icon  │                                                      │
│  rail) │         [Document / Social / Proposal]              │
│        │                                                      │
│        │                                                      │
├────────┴──────────────────────────────────────────────────────┤
│                                                                 │
│  [Ask Copilot to change anything…]  [+ Reference]  [↑ Create]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

- **Canvas dominates:** Primary creative work takes 70–80% of viewport
- **UI disappears:** Navigation should feel invisible around the work
- **Right sidebar optional:** Context inspector appears only when needed (select text → show formatting options)
- **Floating composer:** AI interaction happens in a bottom-floating or bottom-slide component
- **Contextual controls:** When user selects content, show transformation options near selection, not in permanent sidebars

---

## 11. DOCUMENT CREATOR

For proposals, journals, strategy documents, and similar content.

Use a polished **document-editor experience** that resembles a high-end editorial document, not a CMS form.

### Supported Features
- **Inline editing** — Click to edit text directly
- **Rich text formatting** — Headings, bold, italic, lists
- **Sections** — Organize content with collapsible sections
- **Images** — Insert and position images
- **Drag/reorder** — Reorder sections/blocks
- **AI transformations** — Rewrite, expand, shorten, change tone, generate alternatives
- **Brand alignment** — AI awareness of workspace brand
- **Comments/notes** — Optional annotation layer
- **Version history** — Track changes, revert to previous versions
- **Export** — Download as PDF, Word, HTML

### Interaction Model
When user selects text or places cursor:
- Show contextual transformation options (Rewrite, Expand, Shorten, Change tone) as a floating popover
- Do not use permanent sidebars for editing controls
- Inline editing should feel natural and document-like

### Design
- Typography-driven hierarchy (use font size, weight, color — not boxes)
- Generous margins and breathing room
- Subtle visual separation between sections
- Clean preview of final output

---

## 12. SOCIAL CREATOR

Upgrade social creation to a **campaign-level workflow**.

Do not make users repeatedly generate isolated social posts.

### Workflow: Campaign → Content → Adaptation

A social project should support:
- **Campaign idea** — High-level creative direction
- **Concept** — Strategy and messaging framework
- **Multiple pieces of content** — Carousel, individual slides, caption
- **Platform adaptation** — Auto-adapt campaign for LinkedIn, Instagram Stories, TikTok
- **Visual generation** — Auto-generate or source visual assets
- **Asset management** — Keep all campaign materials in one project

### Project Container

A single social project can contain:
- Campaign name and brief
- Hero concept and creative direction
- Carousel (multiple slides)
- Individual slide edits
- Captions and copy variations
- LinkedIn adaptation
- Story content (if applicable)
- Visual assets and references
- Notes and version history

### Visual Presentation
- Show assets visually (thumbnails, previews) rather than text lists
- Allow drag/reorder to arrange slides
- Side-by-side preview of how content looks on each platform
- One-click adaptation ("Also create for LinkedIn," "Create story version")

### Experience
Social creation should feel like a **mini content studio**, not a form-filling exercise.

---

## 13. JOURNAL / LONG-FORM CREATOR

Preserve existing journal functionality but significantly upgrade the editorial experience.

### Supported Features
- **Title & Subtitle** — Main headline and deck
- **Hero image** — Featured image
- **Article body** — Rich-text article content
- **Pull quotes** — Highlighted excerpts
- **Sections** — Organize with H2/H3 headings
- **SEO/meta** — Title, description, keywords (where currently used)
- **Author** — Byline
- **Publishing state** — Draft, published, scheduled

### AI Support
- **Research direction** — AI helps outline research needs
- **Structure** — Auto-generate article outline from topic
- **Draft** — Write initial draft from outline
- **Rewrite** — Rewrite sections for clarity, tone
- **Tone adjustment** — Adapt voice (more conversational, more formal, etc.)
- **Extract key ideas** — Auto-generate summary or key takeaways
- **Create social derivatives** — Turn article into carousel, LinkedIn post, social quote
- **Create newsletter version** — Auto-adapt for newsletter format

### Cross-Format Workflow
User should move fluidly from:
**Journal → Social → Newsletter**

without leaving project context. One article should spawn multiple content formats automatically.

### Editorial Design
- Emphasis on typography and readability
- Large comfortable margins
- Subtle styling (no noisy UI)
- Preview shows how article will look when published
- Comments/notes layer for feedback

---

## 14. PROPOSAL CREATOR

Proposal creation should become **visually sophisticated and workflow-rich**.

Do not treat proposals as text forms.

### Workflow

**Step 1: Context**
- Choose existing proposal as reference
- Start from company template
- Describe the opportunity
- Upload/reference client information

**Step 2: Generation**
- AI generates proposal structure based on context
- Show outline for review and editing
- User confirms structure

**Step 3: Editing**
- Edit individual sections inline
- Insert pricing and project phases
- Add imagery and case studies
- Adjust tone and positioning
- Save reusable sections for future use

**Step 4: Preview & Export**
- Preview final proposal design
- Brand template automatically applied
- Export as PDF (formatted professionally) or Word

### Features
- **Visual previews** — See how proposal looks as user edits
- **Reusable sections** — Save common sections (discovery, timeline, pricing) for reuse
- **Case study integration** — Link to or embed previous case studies
- **Dynamic pricing** — Update pricing, see totals update automatically
- **Brand application** — Proposal design automatically inherits company brand (colors, typography, logo)
- **Version history** — Track changes and revert if needed

### Design Principle
Proposals should feel like a **professional design deliverable**, not an admin form.

---

## 15. INVOICE CREATOR

Keep invoice creation **extremely simple and functional**.

Invoices are operational, not creative.

### Workflow

**Structured Form** (minimal, clean):
- Client (dropdown from company contacts)
- Invoice number (auto-generated or manual)
- Issue date (date picker)
- Due date (date picker)
- Line items (add/edit/remove rows)
- Tax/discounts (optional)
- Notes (optional)
- Payment details (auto-filled from workspace settings)

**Preview:**
- Show actual formatted invoice next to or below the form
- User sees exactly what will be sent

### Implementation
- Use existing invoice logic/data wherever possible
- Pre-fill defaults from company profile
- Brand template consistent with company (logo, colors)
- Allow PDF export
- No unnecessary design flourishes

---

## 16. PROJECT MODEL

Introduce or strengthen the concept of **Projects**.

A project is more meaningful than an individual generation.

### What is a Project?

Examples of projects:
- Cloud Twelve Proposal
- July Comeback Edit
- Remedae Investor Story
- LUME GLL Pilot
- Hue & Heal Website Journal
- Instagram Campaign — Wellness Series

A project is a container for related work on a single initiative.

### Project Contents

A project can contain:
- **Primary asset** (proposal, journal, social campaign, etc.)
- **Related assets** (derivatives, variations, complementary pieces)
- **References** (images, PDFs, existing Copilot assets, external URLs)
- **Uploads** (client briefs, research, reference materials)
- **AI conversations/instructions** (what the user told Copilot to do)
- **Versions** (track changes and iterations)
- **Notes** (context, decisions, feedback)
- **Related outputs** (if article becomes social posts, link them)

### Benefits

- Work evolves naturally without creating fragmented files everywhere
- Full context is retained (what was referenced, what was tried, what was decided)
- Reuse becomes easier (related assets are grouped)
- Collaboration is clearer (everyone sees project history)
- Search is more powerful (can search projects instead of individual assets)

### Data Model (to be confirmed during Phase 1 audit)

```
Project
├── id (UUID)
├── workspace_id (FK to workspace)
├── name (string)
├── description (optional text)
├── created_at
├── updated_at
├── primary_asset_id (FK to asset)
├── status (draft/active/archived)
├── metadata (JSON — custom data per project type)
│
└─ HasMany: assets (journal, proposal, social content, etc.)
└─ HasMany: references (images, PDFs, URLs)
└─ HasMany: versions (change history)
└─ HasMany: notes/comments
```

---

## 17. LIBRARY

Create one **strong, unified Library** for all created and stored content.

### What Goes in Library
- Generated content (proposals, journals, social posts)
- Uploaded documents and images
- Templates (proposal, invoice, journal, social campaign)
- Published assets
- Archived work
- Previous versions

### Organization & Filtering

Allow filtering by:
- **Workspace** — Show only assets from selected company
- **Project** — Show only assets within a project
- **Asset type** — Document, image, social, journal, invoice, etc.
- **Date** — Created, modified, published
- **Status** — Draft, published, archived

**Search:**
- Text search is prominent (Cmd/Ctrl + K or persistent search bar)
- Future enhancement: semantic search ("Show proposals where we positioned Hue & Heal around hospitality")

### Visual Presentation
- **Thumbnails over tables** — Show visual previews of assets, not database-style rows
- **Card-based layout** — Asset cards with image, title, type, date, status
- **Hover actions** — Reveal contextual actions (edit, share, delete, use in campaign) on hover
- **Empty states** — When filtered results are empty, suggest related filters or show 2–3 starter examples

### Metadata Display
Show on each asset card:
- Thumbnail/preview
- Asset title
- Asset type (icon + label)
- Workspace/project context (small badge)
- Last modified date
- Status (draft/published/archived)

---

## 18. BRAND INTELLIGENCE

This should become one of Copilot's most important differentiators.

Each workspace should have a **Brand** section containing structured brand context.

### Brand Information Architecture

**Brand Overview**
- Brand name
- Brand mission / purpose
- Brand story / description

**Market Position**
- Target audience (description)
- Positioning statement
- Key differentiators
- Competitors (optional reference)

**Voice & Messaging**
- Brand voice description (e.g., "warm, editorial, intelligent, minimalist")
- Tone principles (e.g., "conversational but authoritative, never corporate")
- Messaging pillars (3–5 key messages)
- Words to use (brand language)
- Words to avoid (terminology to exclude)
- Examples of strong content (reference pieces)

**Visual Identity**
- Primary colors (with hex codes)
- Secondary colors (with hex codes)
- Typography (font names, usage)
- Logo assets (file uploads)
- Photography style description (e.g., "editorial, minimalist, candid, bright")
- Visual rules / composition guidelines
- Pattern or texture examples (if applicable)

**Audience & Tone Examples**
- Example of ideal social post
- Example of ideal proposal excerpt
- Example of ideal journal entry
- Tone samples (formal vs. casual versions of the same message)

**Content Guidelines**
- Typical content themes
- Audience pain points / interests
- Call-to-action preferences
- Format preferences (carousel vs. single image, long-form vs. snappy, etc.)

### How Brand is Used

Copilot should automatically use this information when generating:
- System prompt includes brand context
- Generated content inherently matches brand voice
- Proposed colors/imagery respect brand identity
- User should not have to repeatedly say "Make this sound like Hue & Heal" or "Use our brand colors"

### Brand Setup Flow

When a user creates/edits a workspace Brand:

**Option 1: Structured Form**
- Step-by-step form with fields for each section
- Color picker for visual identity
- File uploads for logos and assets
- Examples and tooltips throughout

**Option 2: Paste Existing Brand Guide**
- Text area where user pastes brand guide or existing documentation
- AI parses and structures the information into the brand fields
- User reviews and adjusts parsed results

**Option 3: Reference Existing Assets**
- User selects past Copilot assets as examples of "what good looks like"
- AI analyzes tone, visual style, and patterns
- Suggestions are pre-filled based on historical work

---

## 19. KNOWLEDGE

Create a **Knowledge** layer distinct from visual brand settings.

This is company/operational context that helps AI generation be more accurate and useful.

### Knowledge Information Architecture

**Business Model**
- Description of services/products
- Pricing (if relevant)
- Revenue model
- Business stage / maturity

**Team & Organization**
- Key team members (names, roles)
- Org structure (optional)
- Decision makers

**Clients & Case Studies**
- List of past/current clients
- Case studies or past project examples
- Common client types
- Industry/verticals served

**Products & Services**
- Detailed description of offerings
- Feature/benefit lists
- Typical use cases
- Pricing tiers (if relevant)

**Strategy & Goals**
- Company mission
- Current strategic priorities
- Growth goals (if shareable)
- Key initiatives
- Investor deck or strategy documents (uploaded)

**FAQs & Documentation**
- Frequently asked questions
- Internal processes (if relevant)
- Standard definitions or terminology
- Brand guidelines or compliance requirements

**Market Context**
- Industry/market description
- Competitive positioning
- Market size/opportunity
- Relevant trends

**Research & Resources**
- Uploaded research documents
- Blog posts or thought leadership
- Market research
- Customer insights

### How Knowledge is Used

Generated content should reference this knowledge:
- Proposals mention relevant case studies
- Social posts reference product features accurately
- Messaging aligns with stated positioning
- Content respects pricing/availability constraints

This transforms Copilot from a generic AI generator into an actual **company copilot** that understands the business.

### Knowledge Setup Flow

**Option 1: Structured Form**
- Fields for each knowledge section
- Optionally upload documents (PDFs, etc.)
- Free-text areas for longer content

**Option 2: Upload & Parse**
- User uploads company deck, website content, existing docs
- AI extracts and structures knowledge automatically
- User reviews and confirms

---

## 20. GLOBAL COMMAND BAR

Implement a **Cmd/Ctrl + K command palette** using shadcn's Command component.

Allows fast navigation and action triggering.

### Actions

- Create journal
- Create proposal
- Create social campaign
- Create invoice
- Switch to [Workspace Name]
- Open recent project
- Search library
- Upload asset
- Open brand settings
- Open knowledge settings
- Go to home
- Go to library
- Go to create
- Open settings
- Open profile

### Behavior
- Available globally (appears over any page)
- Searchable/filterable
- Shows recent/frequent actions first
- Keyboard-navigable (arrow keys, enter to select)
- Power users should be able to navigate almost entirely via keyboard

### UX
- Fast to open (Cmd+K or Ctrl+K)
- Fuzzy search matching
- Show categories (Create, Navigate, Settings)
- Show keyboard shortcuts for common actions

---

## 21. AI INTERACTION PHILOSOPHY

**Avoid** creating a separate "AI Chat" destination unless there is a strong use case.

**AI should appear where the user is working**, not as a separate tool.

### Contextual AI Interactions

**When editing text:**
```
User selects paragraph
↓
Floating menu appears near selection: [ Rewrite | Expand | Shorten | Change tone ]
↓
User clicks "Rewrite"
↓
AI generates alternative in-place
```

**When viewing an image:**
```
User hovers over asset
↓
Contextual menu: [ Create variation | Download | Delete | Use in... ]
↓
AI generates variant with same subject/style
```

**When reviewing a proposal:**
```
User opens proposal
↓
Floating composer at bottom: "Ask Copilot to change anything…"
↓
User types: "Make the pricing section more competitive"
↓
AI rewrites pricing section
```

**When browsing content:**
```
User opens journal article
↓
Floating button: "Turn into social" or "Create video script"
↓
AI generates derivative in new asset
```

### Principle

The AI layer should feel like an **intelligent creative collaborator**, not a separate tool. The user should not need to think about *which AI feature* to use — they should express intent and Copilot should do it.

---

## 22. PROGRESSIVE DISCLOSURE

Do not expose every option immediately.

**Initial interfaces should be extraordinarily simple.**

Reveal controls when context requires them.

### Example: Create Composer

**Default state:**
```
What would you like to create?
[            ]
[+ Reference]  [Create]
```

**Advanced state** (after user clicks, enters prompt, or clicks "Advanced"):
```
What would you like to create?
[                                              ]

Format: [ Proposal ▼ ]
Workspace: [ Hue & Heal ▼ ]
Template: [ Cloud Twelve ▼ ]
Tone: [ Professional ▼ ]
Audience: [ Potential Client ▼ ]

[+ Reference]  [Create]
```

**Approach:**
- Start simple
- Reveal controls based on user actions or explicit "Advanced" toggle
- Never overwhelm the first interaction
- Power users can discover advanced options without them cluttering the default view

---

## 23. VISUAL DESIGN SYSTEM

Use **shadcn/ui** as the underlying accessible component architecture.

Do not leave components looking like default shadcn.

Create a **custom Hue & Heal Copilot theme** that feels premium, editorial, and intentional.

### Overall Aesthetic

**Premium**
- Polish and refinement in every detail
- Generous whitespace
- Careful typography hierarchy
- Restrained use of color

**Editorial**
- Content-first layout
- Typography as primary design tool
- Minimal decorative elements
- Emphasis on readability

**Warm**
- Soft neutral palettes
- Avoiding cold/sterile aesthetics
- Human-friendly interactions
- Personality in copy and micro-interactions

**Quiet**
- Calm interface that doesn't shout
- Unnecessary UI hidden by default
- Subtle animations
- Focus on content over UI chrome

**Modern**
- Clean lines and contemporary proportions
- Contemporary typography (grotesk/geometric)
- Efficient use of space
- Accessibility first

**Human**
- Writing that speaks naturally
- Thoughtful micro-interactions
- Forgiving error states
- Emotional resonance

**Precise**
- Intentional hierarchy
- Consistent spacing
- Clear states (active, hover, disabled)
- Pixel-perfect alignment

---

## 24. LIGHT THEME

Default light environment palette:

**Background:**
- Primary: `#F7F7F5` (warm off-white)
- Alternative: `#FAFAF8`

**Surfaces:**
- Primary surface: `#FFFFFF` (white)
- Elevated surface: `#FFFAF8` (very subtle warm tint)
- Subtle background variation: `#F9F8F6`

**Text:**
- Primary text: `#151515` (near-black, not pure #000)
- Secondary text: `#6B6B6B` (soft neutral grey)
- Tertiary/muted: `#999999` (lighter grey)

**Borders & Dividers:**
- Default border: `rgba(0, 0, 0, 0.06)` (very subtle)
- Stronger border: `rgba(0, 0, 0, 0.08)` (when more definition needed)
- Dividers: `rgba(0, 0, 0, 0.04)` (extremely subtle)

**Accents:**
- Workspace accent: Customizable per workspace (derived from brand)
- Interactive: `#0066CC` (or workspace accent)
- Success: `#00AA33`
- Warning: `#FF9933`
- Error: `#CC3333`

**Visual Rules:**
- Avoid visible borders unless they create necessary hierarchy
- Use tonal layering (slight background shifts) instead of borders where possible
- Minimal use of color — accents only where meaningful

---

## 25. DARK THEME

Dark mode should feel like **premium graphite** rather than gaming software.

**Background:**
- Primary: `#1A1918` (deep charcoal)
- Alternative: `#1F1E1D`

**Surfaces:**
- Primary surface: `#242321` (dark grey, elevated from background)
- Elevated surface: `#2A2926` (further elevated)
- Highlight: `#333028` (when maximum elevation needed)

**Text:**
- Primary text: `#F0EFED` (warm off-white)
- Secondary text: `#A8A8A8` (soft grey)
- Tertiary/muted: `#707070` (lighter grey)

**Borders & Dividers:**
- Default border: `rgba(255, 255, 255, 0.08)`
- Stronger border: `rgba(255, 255, 255, 0.12)`
- Dividers: `rgba(255, 255, 255, 0.04)`

**Accents:**
- Same accent strategy as light theme
- Workspace accent: Same color as light theme (consistent across modes)
- Interactive, success, warning, error: Same as light theme

**Visual Rules:**
- No pure #000000 backgrounds (feels flat and harsh)
- Soft elevation via tonal shifts, not harsh shadows
- Warm-leaning palette (charcoal + off-white, not cool greys)
- Minimal glowing effects or neon accents

---

## 26. TYPOGRAPHY

### Font Selection

**Primary (Interface Typography):**
- First choice: **Geist** (modern, clean, contemporary grotesk)
- Fallback: **Inter** (widely available, professional)
- System fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

**Content (Editorial):**
- Consider a serif for journal/editorial content (e.g., **Fraunces**, **Recoleta**)
- Or use Geist throughout for cohesion

### Type Scale

Use consistent, hierarchy-based sizing:

| Use | Size | Weight | Line Height |
|-----|------|--------|------------|
| Page heading | 32–40px | 600 (semibold) | 1.2 |
| Section title | 20–24px | 600 (semibold) | 1.3 |
| Subsection | 16–18px | 600 (semibold) | 1.4 |
| Body text | 14–16px | 400 (regular) | 1.6 |
| Small text | 12–13px | 400 (regular) | 1.5 |
| Micro text (metadata) | 11–12px | 400 (regular) | 1.4 |

### Weight Usage

- Use **restrained weights**
- Avoid bold text everywhere
- Hierarchy should come from size, spacing, and color — not weight
- 400 (regular) for body
- 500 (medium) for slightly emphasized elements
- 600 (semibold) for headings and primary labels
- Avoid 700+ (bold) unless specifically needed for warnings/errors

### Letter Spacing

- Default: normal (0px)
- Headings: -0.02em (slight tightening for premium feel)
- All caps labels: +0.05em (openness)
- Do not add excess letter spacing without purpose

---

## 27. SPACING

Use an **8px-based spacing system**.

All spacing should be multiples of 8px: 8, 16, 24, 32, 40, 48, 56, 64, 72, 80.

### Spacing Scale

| Scale | Use Case |
|-------|----------|
| 8px | Padding in tight components (buttons, small pills) |
| 16px | Internal padding in cards; gap between small items |
| 24px | Padding inside major containers; gap between sections on dense pages |
| 32px | Gap between major sections; workspace padding |
| 40px | Large canvas padding (left/right on desktop) |
| 48px | Space between major page regions |
| 56–64px | Large top-level spacing (rarely needed) |

### Specific Recommendations

- **Sidebar:** 24px internal padding
- **Canvas:** 40px padding left/right (desktop), 24px (tablet), 16px (mobile)
- **Cards/Containers:** 24px padding
- **Button padding:** 12px horizontal, 8px vertical
- **Section gaps:** 32–48px
- **Between sections on home:** 48px

**Principle:** Favor generous space between major regions. Do not fill every available area with components. **Empty space is intentional.**

---

## 28. CORNERS (BORDER RADIUS)

Use restrained rounded corners.

| Element | Radius | When |
|---------|--------|------|
| UI components (buttons, inputs, dropdowns) | 8px | Standard controls |
| Modals, sheets, popovers | 12–14px | Floating UI |
| Large containers, cards | 12px | Major content regions |
| Pills, badges, status | 16–20px | Semantic status indicators |
| Canvas elements | 0–4px | Content-focused areas can be square or minimal radius |

**Rules:**
- Avoid making every object a large pill (only use large radius for semantic status elements)
- Keep most UI at 8px (feels modern, not soft/rounded)
- Cards and containers can range 8–12px
- Do not use excessive radius inconsistently

---

## 29. DEPTH & ELEVATION

Prioritize **tonal layering** over shadows.

Use minimal, tasteful shadows only when elevation is functionally necessary.

### Layering Strategy

**Layering rather than shadows:**
1. Base background: `#F7F7F5` (light) or `#1A1918` (dark)
2. Primary surface: Slightly lighter/darker shift
3. Elevated surface: Further tonal shift
4. Allow user to perceive depth through color alone

**When shadows are needed:**

**Subtle shadow** (modals, floating actions):
```css
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
/* or in dark mode */
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.24);
```

**Moderate shadow** (context menus, popovers):
```css
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
```

**Ambient separation** (very subtle):
```css
box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.04);
```

**Rules:**
- Avoid heavy drop shadows (makes interface feel dated)
- Use shadow primarily for layering order, not visual drama
- Prefer border + tonal shift over shadow
- Test shadows in both light and dark modes

---

## 30. MOTION & ANIMATION

Motion should **communicate cause and effect**.

Use roughly **150–250ms transitions** with appropriate easing.

### Easing

- **Standard ease:** `cubic-bezier(0.4, 0, 0.2, 1)` (enter animations)
- **Decelerate:** `cubic-bezier(0, 0, 0.2, 1)` (exit animations)
- **Accelerate:** `cubic-bezier(0.4, 0, 1, 1)` (quick responses)
- **Bounce (sparingly):** `cubic-bezier(0.68, -0.55, 0.265, 1.55)` (playful moments)

### Animation Targets

Animate:
- **Sidebar collapse/expand** (150–200ms)
- **Inspector reveal** (200ms)
- **Canvas transitions** (200ms for content changes)
- **Popover/menu appearance** (150ms)
- **Generation states** (progressive appearance as content streams in)
- **Asset replacement** (200ms fade + scale)
- **Button hover/press** (100–150ms)
- **Focus ring appearance** (150ms)

### Avoid

- Decorative animation (unnecessary motion)
- Long, attention-seeking animations
- Animation that delays user action
- Animations that can't be disabled for accessibility

### Reduced Motion

Always respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 31. BUTTON SYSTEM

Reduce the number of visually dominant buttons.

### Button Variants

| Variant | Use | Appearance |
|---------|-----|-----------|
| **Primary** | One main CTA per context | Filled, workspace accent color |
| **Secondary** | Important secondary action | Outlined border, neutral text |
| **Ghost** | Tertiary actions, navigation | Transparent, hover reveals subtle background |
| **Destructive** | Dangerous actions (delete) | Red/error color, filled or outlined |
| **Icon** | Icon-only actions | Minimal, hover reveals background |

### Rules

- **One primary action per context** — Do not have multiple filled buttons competing
- **Secondary actions:** Use outline or ghost variants
- **Icon-only buttons:** Must have tooltip
- **Text buttons:** Only for low-emphasis actions
- **Button sizing:** Standard 40–44px height (comfortable touch target)
- **Padding:** 12px horizontal, 8px vertical (maintains consistent height)

### Icon Usage

- Use icons **only for universally understood actions** (back, forward, search, menu, add, close, etc.)
- **All unfamiliar icons must have tooltips**
- Avoid icon overload (each icon should have clear meaning)
- Prefer text labels + icon when meaning is ambiguous

---

## 32. GENERATION STATES

AI generation must feel **premium and intentional**.

Avoid basic loading spinners whenever a richer state is available.

### Generation Indicators

**For fast generation** (< 2 seconds):
- Skeleton content showing structure
- Placeholder text/layout
- Progressive appearance as content fills in

**For medium generation** (2–10 seconds):
- Labeled stages: "Understanding brief" → "Using brand context" → "Building proposal" → "Preparing preview"
- Subtle animated dots or progress indicator
- Show what's happening in plain language

**For long generation** (> 10 seconds):
- Stage labels with timestamps
- Optional: "You can close this and come back to it" messaging
- Completion percentage if backend provides it
- Do NOT fabricate detailed progress if backend doesn't provide it

### Example Generation Flow

```
Creating social campaign…

⌛ Understanding brief
⏳ Analyzing brand context
⏳ Generating content
⏳ Creating visuals

[Close]
```

As each stage completes, mark with ✓:

```
✓ Understanding brief
✓ Analyzing brand context
⏳ Generating content
⏳ Creating visuals
```

### Completion

- Smooth transition to generated content
- No jarring appearance
- Perhaps brief success feedback (toast or inline)

---

## 33. EMPTY STATES

Empty states should **teach without looking like onboarding screens**.

### Approach

**Simple, scannable layout:**
- Heading: "Nothing here yet"
- Brief explanation: "Start creating and your projects will appear here."
- Optional CTA: `[Create something]`
- Optional: 2–3 tasteful starter examples

### Example

```
┌────────────────────────────────────┐
│                                    │
│      Nothing here yet              │
│                                    │
│  Start creating and your projects  │
│  will appear here.                 │
│                                    │
│  [Create something]                │
│                                    │
│  ─ or try these                    │
│                                    │
│  • Cloud Twelve Proposal           │
│  • Social Campaign Brief           │
│  • Journal Article                 │
│                                    │
└────────────────────────────────────┘
```

### Rules

- Do not make empty states look like full onboarding screens
- Keep them simple and informative
- Show examples or starter content if helpful
- Include a CTA to get started

---

## 34. CREATION HISTORY & VERSIONING

Do not treat generations as disposable.

**Maintain visible history within projects.**

### Version Model

A project should maintain versions:
- V1 (first generation)
- V2 (user edited or regenerated)
- V3 (refined further)

### Interface

Version history should be:
- **Accessible but unobtrusive** — Not cluttering the main canvas
- **Contextual menu/panel** — Reveal on demand (e.g., `···` menu → "View history")
- **Comparison view** — Allow side-by-side comparison of versions
- **Easy revert** — One-click restore to previous version
- **Lightweight preview** — Show thumbnail and timestamp for each version

### Example Interaction

```
[Document Title]                              [···]

[main document canvas]

Menu → "Version history"
↓
Version panel appears:
- V3 (current)  ← You are here
  ├ V2 (edited 2 hours ago)
  ├ V1 (generated 1 day ago)
  
Click on V2 → "Preview" or "Restore"
```

---

## 35. DERIVATIVE CREATION

Make **reuse a central product behavior**.

Any relevant output should expose contextual actions that generate derivatives.

### Contextual Actions

When viewing any asset, show:
- **Use in campaign** — Add this to a social campaign
- **Turn into social** — Convert to Instagram/LinkedIn post
- **Create visual** — Generate image based on content
- **Create variation** — Generate alternative version
- **Create presentation** — Turn into slides
- **Turn into proposal** — Use as proposal section
- **Summarize** — Create condensed version
- **Duplicate** — Copy for new project
- **Move to project** — Relocate to different initiative

### Discovery

These actions should be:
- Visible as a floating menu when hovering asset
- Available in contextual menu (right-click or `···` menu)
- Suggested in the AI composer ("Create social from this journal?")

### User Flow

User should **never manually copy content** between Copilot tools.

Instead:
```
View journal article
↓
[Turn into social] button visible
↓
Click → AI generates Instagram carousel
↓
Carousel appears as new asset in same project
↓
User can edit, share, or further adapt
```

---

## 36. REFERENCES

Allow users to add references directly into creation contexts.

### Reference Types

- Images
- PDFs or documents
- Existing Copilot assets
- Previous projects
- External URLs
- Brand assets

### Implementation

**Reference input:**
- Button: `+ Reference`
- Opens modal/sheet to select or upload reference
- Can paste URL or select from library

**Reference display:**
- Show thumbnails/previews
- Display reference title/source
- Easy removal/reordering (drag, or delete button)
- References visible in context (right sidebar or floating panel)

**Integration:**
- References become part of project context
- AI system prompt includes reference summaries
- Subsequent generation can reference uploaded materials

### Example

```
┌─────────────────────────────────────┐
│ References (3)                  [+] │
├─────────────────────────────────────┤
│                                     │
│  [thumbnail] Previous proposal      │
│              Cloud Twelve v2        │
│                                     │
│  [thumbnail] Brand guidelines PDF   │
│              H&H Brand.pdf          │
│                                     │
│  [thumbnail] Client inspiration    │
│              hospitality-mood.jpg   │
│                                     │
└─────────────────────────────────────┘
```

---

## 37. TEMPLATES

Templates should remain available but should not dominate the workflow.

### Usage Patterns

User can start creation via:
1. **AI intent** — "Create a proposal for…"
2. **Template** — Choose from library of templates
3. **Reuse project** — Start from previous similar project

### Template Structure

Templates can include:
- Proposal (different structures: discovery, solution, pricing)
- Invoice (different currencies, tax handling)
- Journal (different structures: narrative, bullet, interview)
- Social campaign (different platform mixes)
- Strategy document
- Creative brief

### Template Organization

- **Global Copilot templates** — Default templates for all workspaces
- **Workspace templates** — Custom templates per company

### Discovery

Templates should NOT dominate homepage or create flow.

Instead:
- Available via create menu or command bar
- Show as option in composer: `[Use template]` vs. `[Create from description]`
- Can be discovered via search

---

## 38. RESPONSIVE DESIGN

Prioritize **desktop** (this is a professional creation environment).

Tablet and mobile should support specific use cases, not full parity.

### Desktop (≥1200px)
- Full-featured UI
- All creation types fully supported
- Canvas takes majority of screen
- Sidebar visible by default
- Inspector/context panels visible alongside

### Tablet (768px–1199px)
- Highly functional
- All features available but compact
- Sidebar collapses to icon rail
- Canvas remains primary
- Inspector appears as sheet when needed
- Touch-friendly targets (44px minimum)

### Mobile (< 768px)
- Priority on review and quick edits
- In-scope:
  - Workspace switching
  - Library browsing/search
  - Project access
  - Small text edits
  - Generation triggers
  - Asset preview
  - Approval actions

- Out-of-scope (Phase 1):
  - Full document editing
  - Complex proposal workflows
  - Visual asset creation
  - Deep brand/knowledge configuration

### Implementation

- Use CSS media queries to adapt layout
- Do not force desktop UI onto mobile (use drawer/sheet for sidebar)
- Touch targets minimum 44×44px
- Readable text (≥16px) at default zoom
- Test on actual devices

---

## 39. COMPONENT ARCHITECTURE

Use **reusable, composable components**.

Prefer shadcn/ui primitives as foundation.

### shadcn/ui Core Components

Use and customize:
- **Layout:** `Sidebar`, `Sheet`, `Drawer`
- **Navigation:** `Tabs`, `Breadcrumb`, `Command`
- **Inputs:** `Button`, `Input`, `Textarea`, `Select`, `DropdownMenu`
- **Data display:** `Table`, `ScrollArea`, `Skeleton`
- **Feedback:** `Dialog`, `Popover`, `Tooltip`, `ContextMenu`
- **Forms:** Input, Label, Checkbox, Radio
- **Layout utilities:** `Resizable`, `Separator`

### Custom Higher-Level Components

Create reusable custom components:
- `WorkspaceSwitcher` — Workspace selection in sidebar
- `CreateComposer` — Primary creation input with contextual actions
- `CreationCanvas` — Container for document/social/proposal editors
- `ProjectCard` — Visual card representing a project (with thumbnail, metadata)
- `AssetCard` — Visual card for library assets
- `ContextInspector` — Right-sidebar panel for properties/formatting
- `BrandContextBadge` — Visual indicator showing which workspace context is active
- `ReferenceTray` — Panel for managing references
- `VersionHistory` — Version comparison and rollback UI
- `CreateMenu` — Dropdown menu for creation types
- `DocumentCanvas` — Rich text editor for proposals/journals
- `SocialCanvas` — Multi-slide editor for social campaigns
- `InvoicePreview` — Side-by-side form + preview for invoices
- `ProposalCanvas` — Proposal editor with section management

### Principles

- **Do not repeat custom markup** — Use shared components consistently
- **Compose from primitives** — Build custom components from shadcn primitives
- **Prop-based configuration** — Allow customization via props, not copies
- **Consistent patterns** — Similar interactions should use identical components

---

## 40. DESIGN TOKENS

Define tokens globally rather than adding arbitrary styles to individual pages.

Use CSS custom properties (variables) at root level.

### Token Categories

**Colors**
```css
--background: #F7F7F5;
--surface: #FFFFFF;
--surface-elevated: #FFFAF8;
--foreground: #151515;
--foreground-muted: #6B6B6B;
--border-subtle: rgba(0, 0, 0, 0.06);
--border-strong: rgba(0, 0, 0, 0.12);

--workspace-accent: #0066CC; /* Customizable per workspace */
--success: #00AA33;
--warning: #FF9933;
--error: #CC3333;
```

**Typography**
```css
--font-family: "Geist", "Inter", sans-serif;
--font-size-base: 16px;
--font-size-sm: 14px;
--font-size-xs: 12px;
--font-size-lg: 20px;
--font-size-xl: 28px;
--font-size-2xl: 36px;

--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;

--line-height-tight: 1.2;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

**Spacing**
```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
--spacing-2xl: 48px;
--spacing-3xl: 64px;
```

**Radii**
```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;
```

**Elevation & Shadow**
```css
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
```

**Layout**
```css
--sidebar-width: 280px;
--sidebar-width-collapsed: 80px;
--canvas-max-width: 1200px;
--canvas-padding: 40px;
```

**Animation**
```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-normal: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
```

### Usage

```jsx
// Instead of:
<div style={{ backgroundColor: '#F7F7F5', padding: '16px' }}>

// Use:
<div style={{ 
  backgroundColor: 'var(--background)', 
  padding: 'var(--spacing-md)' 
}}>

// Or with Tailwind (if using Tailwind + CSS variables):
<div className="bg-background p-md">
```

### Semantic Tokens

Create higher-level semantic tokens:
```css
--color-primary: var(--workspace-accent);
--color-secondary: var(--foreground-muted);
--color-text-default: var(--foreground);
--color-text-muted: var(--foreground-muted);

--space-section: var(--spacing-2xl);
--space-component: var(--spacing-md);
```

---

## 41. ACCESSIBILITY

Maintain **professional accessibility standards**.

All interactive elements must be accessible to keyboard and screen reader users.

### Core Requirements

- **Keyboard navigation** — All functionality accessible via Tab, Arrow keys, Enter
- **Visible focus states** — Clear focus ring (minimum 2px, contrast ≥ 3:1)
- **Color contrast** — Text contrast ≥ 4.5:1 (AA standard)
- **Semantic markup** — Correct HTML elements (button, input, heading, etc.)
- **Form accessibility** — Labels associated with inputs, error messaging clear
- **Icon labeling** — All icons without text have `aria-label` or visible tooltip
- **ARIA attributes** — Proper roles, aria-expanded, aria-current where needed
- **Reduced motion** — Respect `prefers-reduced-motion` media query

### Implementation

- Test with keyboard only (no mouse)
- Test with screen reader (e.g., NVDA, JAWS)
- Verify color contrast (use WebAIM checker)
- Validate HTML (use W3C validator)
- Test with reduced-motion enabled

### Example

```jsx
// Bad:
<div onClick={() => setOpen(!open)}>Menu</div>

// Good:
<button 
  aria-expanded={open}
  aria-label="Open menu"
  onClick={() => setOpen(!open)}
>
  Menu
  <ChevronDown aria-hidden="true" />
</button>
```

---

## 42. UX COPY

Use **concise, intelligent language**.

Avoid generic SaaS terminology.

### Principles

- **Be direct** — Cut unnecessary words
- **Be human** — Write like a person, not a manual
- **Be warm** — Show personality, not corporate speak
- **Be scannable** — Short sentences, clear structure
- **Be active** — Use active voice when possible

### Examples

| Instead of | Say |
|-----------|-----|
| "Generate AI Content" | "Create" |
| "Enter your prompt below" | "What would you like to create?" |
| "Recent activity dashboard" | "Continue working" |
| "Brand configuration settings" | "Brand" |
| "Click here to proceed" | "Create" |
| "Error: Invalid input format" | "Please enter a valid email" |
| "AI is processing your request" | "Understanding brief…" |
| "Successfully created" | "Done" |
| "Are you sure you want to delete?" | "Delete proposal? This can't be undone." |

### Tone

Copilot's voice should be:
- **Warm but professional** — Human and approachable, not stiff
- **Knowledgeable** — Show you understand their work
- **Encouraging** — Support users in being creative
- **Respectful** — Value their time and expertise

---

## 43. PHASE 1 AUDIT — REQUIRED OUTPUTS

Before implementation begins, provide:

1. **Architecture audit** (existing tech stack, structure, integrations)
2. **Feature inventory** (all currently working features, mapped to components)
3. **Route map** (current URL structure, page organization)
4. **Data model review** (company, workspace, user, content schemas)
5. **AI integration audit** (models, prompts, API calls, rate limiting)
6. **Component inventory** (existing reusable components, styling approach)
7. **Risk assessment** (functionality at risk, dependencies, potential breakage)
8. **Retention strategy** (which components/logic to preserve, which to refactor)
9. **Migration roadmap** (phased approach to update existing features)
10. **Unknown unknowns** (things discovered during audit that need resolution)

**Deliverable:** Structured audit document, 2–4 pages, ready for review before Phase 2 starts.

---

## 44. PHASE 2 — DESIGN SYSTEM SETUP

Set up the design system foundation.

### Tasks

- Install/configure shadcn/ui (if not present)
- Create design tokens file (CSS variables)
- Implement light theme colors
- Implement dark theme colors
- Set up typography scale
- Create spacing/sizing utilities
- Define button system variants
- Create basic component overwrites (Button, Input, etc.) to match Hue & Heal aesthetic
- Verify Tailwind config (if using Tailwind) includes design tokens

### Output

- Design tokens file (`tokens.css` or similar)
- Component overrides (customized shadcn components)
- Theme provider/context (if needed for workspace accent colors)
- Demo/storybook showing tokens in use

---

## 45. PHASE 3 — GLOBAL SHELL

Replace current navigation/layout with new Copilot shell while preserving page functionality.

### Tasks

- Implement new Sidebar component (collapsible to icon rail)
- Create workspace switcher dropdown
- Move settings/profile to sidebar footer
- Create command palette (Cmd/Ctrl + K)
- Build workspace header (showing current workspace name + mark)
- Preserve all existing page routes/content
- Add new primary navigation (Home, Create, Library, Workspaces)

### Testing

- All existing pages remain functional
- Navigation works (can switch between pages)
- Workspace switching works (preserves user state)
- Sidebar collapses without breaking layout
- Command palette opens and closes smoothly

---

## 46. PHASE 4 — WORKSPACE MODEL

Improve company switching and workspace identity.

### Tasks

- Audit existing workspace/company data model
- Ensure workspace switching preserves user context
- Add workspace mark/icon to database (if not present)
- Create workspace badge component
- Display workspace branding in header
- Implement workspace-specific accent color (optional brand color)
- Create workspace settings page (if not present)

### Testing

- Can switch between workspaces without losing data
- Current workspace visually indicated in UI
- Workspace-specific branding appears correctly

---

## 47. PHASE 5 — HOME

Create the new intent-led homepage.

### Tasks

- Build workspace home/overview page
- Create primary creation composer component
- Show recent projects with visual thumbnails
- Add suggested actions section
- Implement "Continue working" projects list
- Remove old dashboard analytics (if present)
- Make composer the focal point

### Layout

- Generous whitespace
- Composer centered or at top
- Recent projects as large cards (visual thumbnails)
- Sparse, contextual suggestions below

### Testing

- Homepage loads quickly
- Composer is clearly the primary CTA
- Recent projects display visually
- Can create directly from homepage

---

## 48. PHASE 6 — CREATE

Unify creation entry points into a single universal create environment.

### Tasks

- Build main Create page/modal
- Create intent-detection logic (user input → determine creation type)
- Add creation type selector (Document, Social, Journal, Proposal, Invoice, etc.)
- Show contextual options based on creation type (template, references, etc.)
- Implement progressive disclosure (simple first, advanced on demand)
- Add reference attachment capability
- Build generation flow (show creation progress/stages)

### Transitions

- From Create, transition user into appropriate creator canvas
- Pass context (workspace, references, intent, AI model) to creator

### Testing

- Can create a document, social post, journal, proposal, invoice
- Intent detection works (user describes what they want, system chooses right creator)
- References can be attached
- Generation shows appropriate stages/feedback

---

## 49. PHASE 7 — CREATOR EXPERIENCES

Migrate existing creators into the improved canvas architecture.

### Subtasks

#### 7a. Document Creator
- Implement rich-text document editor
- Support inline editing, headings, sections
- Add AI transformation options (rewrite, expand, etc.)
- Test with existing proposal and journal creation

#### 7b. Social Creator
- Implement multi-asset social campaign editor
- Support carousel, individual slides, captions
- Add platform adaptation (Instagram, LinkedIn, Stories)
- Show assets visually

#### 7c. Journal Creator
- Upgrade to editorial-focused interface
- Support title, hero image, body, pull quotes, sections
- Add AI transformations and derivative creation
- Test with existing journal content

#### 7d. Proposal Creator
- Implement proposal builder with sections
- Add template selection
- Show visual preview as user edits
- Support pricing/phases

#### 7e. Invoice Creator
- Keep simple and functional
- Structured form with preview
- Auto-fill from company profile
- Support PDF export

**For each creator:**
- Ensure existing functionality is preserved
- Migrate existing content into new interface (if schema change)
- Test generation, editing, export/save

### Testing

- Can edit existing content in new interface
- All existing features still work
- New interface feels more polished and capable

---

## 50. PHASE 8 — LIBRARY & PROJECTS

Create cohesive asset/project organization.

### Tasks

- Implement project model (if not present)
- Build Library page with filtering
- Add project creation/management UI
- Implement asset cards with thumbnails
- Add search functionality
- Implement filtering (by workspace, asset type, date, status)
- Add contextual actions (edit, share, delete, use in…)
- Create project details page

### Testing

- Can browse all assets visually
- Search works
- Filtering works (by workspace, type, etc.)
- Can view project details and related assets

---

## 51. PHASE 9 — BRAND INTELLIGENCE

Connect generation with workspace brand context.

### Tasks

- Create Brand settings page
- Implement structured form for brand information
- Add file upload for brand assets (logo, imagery)
- Implement knowledge base setup
- Create AI system prompt that includes brand context
- Test that generated content respects brand context
- (Optional) Add upload/parse for existing brand guides

### Testing

- Brand settings are saved per workspace
- Generated content reflects workspace brand voice
- Colors/imagery from brand settings influence generation

---

## 52. PHASE 10 — REFINEMENT & POLISH

Final pass on motion, loading states, empty states, accessibility, and responsiveness.

### Tasks

- Add all transitions/animations (sidebar, inspector, generation)
- Implement skeleton loaders and progressive appearance
- Polish empty states (all pages)
- Verify accessibility (keyboard navigation, focus states, contrast)
- Test responsive layout (tablet, mobile)
- Polish error states and messaging
- Refine micro-interactions (hover states, click feedback)
- User testing and iteration

### Testing

- All animations feel purposeful and smooth
- Loading states feel premium
- Empty states are helpful and on-brand
- Keyboard-only navigation works throughout
- Responsive design works on all breakpoints
- Color contrast meets WCAG AA standard

---

## 53. ROLLOUT STRATEGY

Define how to launch the redesign.

### Options

**Option A: Full Cutover**
- Replace old UI entirely with new UI
- Faster, cleaner, but riskier
- Requires very thorough testing beforehand
- Good if existing product has limited users/data

**Option B: Parallel UI with Beta Toggle**
- New UI available as opt-in beta
- Users can switch between old and new
- Lower risk, better feedback collection
- Requires maintaining both interfaces temporarily

**Option C: Phased Rollout by Feature**
- Deploy new navigation, then home, then create, etc.
- Reduces blast radius
- Can iterate based on user feedback
- Longer timeline to full launch

### Recommendation

**Option B (Beta Toggle)** is recommended for this redesign:
- Allows existing users to stay on old interface initially
- Builds confidence before full migration
- Gives implementers chance to collect feedback
- Reduces risk of business disruption

---

## 54. SUCCESS CRITERIA

The redesign succeeds when Copilot no longer feels like an internal collection of generators.

It should feel like a **single mature creator platform**.

### Qualitative Criteria

- Founder can enter any company and immediately inherit its brand context
- Describe intent in natural language and create professional work
- Refine work intelligently without leaving the project
- Turn one piece of work into another seamlessly
- Find everything again later without friction
- Move fluidly between strategic, operational, and creative work
- All without thinking about which underlying AI tool is performing the task

### Quantitative Targets (to be validated)

- Average creation time: < 3 minutes (measure from intent to first draft)
- 70% of projects contain 3+ related assets (showing reuse/derivative workflow is working)
- 40%+ of navigation actions use command bar (showing keyboard power-user adoption)
- Search used for 30%+ of content discovery (showing library is discoverable)
- < 5% regression in existing feature usage (showing nothing broke)

### Emotional Criteria

- Users describe it as "my creative operating system"
- Users don't think about which creation type to choose; intent is enough
- Users feel the product understands their brand and company
- Interface feels calm, not overwhelming
- Feels credible enough to eventually be a commercial product

---

## 55. BEFORE WRITING ANY CODE

**Stop here.**

1. **Review audit** (Phase 0 outputs)
2. **Confirm phasing** — Do the phases make sense for your codebase?
3. **Identify blockers** — Are there technical constraints the audit revealed?
4. **Schedule sync** — If audit raises questions, schedule discussion
5. **Green-light Phase 2** — Confirm design system approach before building

Do not skip the audit. Do not begin implementation without these outputs.

---

## 56. TECHNICAL CONSTRAINTS & CLARIFICATIONS

(To be filled in during Phase 0 audit)

**Will be determined:**

- Existing React version and compatibility with latest shadcn
- Current state management approach (Redux, Zustand, Context, etc.)
- API rate limits and how to scale for more generation
- Whether to use Claude API directly or existing backend wrapper
- Database migration strategy (if data model changes)
- Authentication/SSO details
- Current performance metrics and targets for new UI
- SEO/SSR requirements
- Analytics/tracking approach

---

## 57. DEFINITION OF DONE FOR EACH PHASE

### Phase 0 (Audit)
✅ Comprehensive audit document delivered
✅ All 10 audit sections completed
✅ No unknown unknowns remain (or documented as known unknowns)
✅ Reviewed and approved before Phase 2 starts

### Phase 1–10 (Implementation)
For each phase:
✅ Tasks completed as defined
✅ Existing functionality preserved (no regressions)
✅ Manual testing passed
✅ Code reviewed
✅ Documentation updated
✅ Ready for next phase

### Final (Launch)
✅ All 10 phases complete
✅ User testing conducted
✅ Feedback incorporated
✅ Accessibility audit passed
✅ Performance targets met
✅ Rollout strategy executed
✅ Success metrics defined and baseline established

---

## 58. NEXT STEPS

1. **Share this prompt with Claude Code**
2. **Request Phase 0 Audit** — Ask Claude Code to inspect the repo and return audit findings
3. **Review audit findings** (with Maz if possible)
4. **Confirm blockers and unknowns**
5. **Green-light Phase 2** when audit is approved
6. **Begin iterative implementation** — Phase 2, then Phase 3, etc.
7. **Test continuously** — Every phase includes testing gates
8. **Iterate on design** — This prompt is a guide; refine based on learnings

---

## 59. KEY PRINCIPLES TO REMEMBER

**Throughout implementation:**

- **Preserve first** — Existing functionality must keep working
- **Simplify first** — Start simple, reveal complexity only when needed
- **Canvas first** — User's work is always the hero; UI should disappear
- **Brand smart** — AI should know the company; don't make users repeat context
- **Create fast** — Reduce friction between intent and execution
- **Polish last** — Get the flow right, then refine animation/polish
- **Test early** — Don't wait until Phase 10 to test; test each phase
- **Document as you go** — Future you will thank you

---

## 60. CONTACT & FEEDBACK

If questions arise during implementation:

1. Review this brief (answers are likely here)
2. Check Phase 0 audit (specifics about existing product)
3. Return to Phase descriptions (implementation sequence may clarify)
4. Document assumptions and decisions (update brief if needed)
5. Escalate blockers (don't guess; ask)

**This brief is living.** As implementation reveals new information, update this document to reflect learnings.

---

**Last Updated:** August 25, 2026
**Prepared for:** Claude Code Implementation
**Status:** Ready for Phase 0 Audit
