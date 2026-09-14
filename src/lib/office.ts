/* The office dioramas: one render per department plus the meeting room,
   founder-approved, kept in public/office. A missing file falls back to a
   department-tinted placeholder handled in the component. */
export const officeImage = (key: string): string => `/office/${key}.jpg`
