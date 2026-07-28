/* One shared type system across surfaces. The role vocabulary is identical
   everywhere (so "H2" means the same tier on a social slide and in a newsletter);
   only the pixel value differs per medium: social canvases export at 1080px wide,
   email renders at real screen sizes. Slider/custom sizes remain available for
   off-scale tuning. */
export const TYPE_ROLES = ['Headline', 'H1', 'H2', 'Subtitle', 'Body', 'Small'] as const
export type TypeRole = (typeof TYPE_ROLES)[number]

/** Social canvas px (on a 1080-wide export). Matches the template scale. */
export const CANVAS_TYPE_SIZE: Record<TypeRole, number> = {
  Headline: 104, H1: 84, H2: 68, Subtitle: 44, Body: 30, Small: 22,
}

/** Email px (rendered at real screen size in inboxes). */
export const EMAIL_TYPE_SIZE: Record<TypeRole, number> = {
  Headline: 32, H1: 27, H2: 22, Subtitle: 18, Body: 15, Small: 12.5,
}
