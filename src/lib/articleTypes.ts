/* Article types and lengths the journal writer understands. Keys must match
   ARTICLE_TYPES / LENGTHS in supabase/functions/generate-journal (the writer
   holds the full briefs; this is the editor's menu). */

export const ARTICLE_TYPES = [
  { key: 'story', label: 'Story-led', hint: 'Opens on a person or moment; evidence arrives later, lightly.' },
  { key: 'explainer', label: 'Explainer', hint: 'One half-known thing, made fully clear.' },
  { key: 'research', label: 'On the research', hint: 'What the studies actually say, honestly.' },
  { key: 'practical', label: 'Practical guide', hint: 'Something to try tonight, with the why.' },
  { key: 'essay', label: 'Essay', hint: 'A point of view, developed on the page.' },
  { key: 'profile', label: 'Profile', hint: 'A portrait of a tradition, place or practice.' },
] as const

export type ArticleTypeKey = (typeof ARTICLE_TYPES)[number]['key']

export const LENGTHS = [
  { key: 'short', label: 'Short', hint: '3 to 4 min' },
  { key: 'medium', label: 'Medium', hint: '5 to 7 min' },
  { key: 'long', label: 'Long read', hint: '8 to 11 min' },
] as const

export type LengthKey = (typeof LENGTHS)[number]['key']
