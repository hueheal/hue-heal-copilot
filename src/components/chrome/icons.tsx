/* Chrome icon set: 16px stroke icons in the lucide idiom, hand-kept so the
   chrome has one voice. Decorative (aria-hidden); labels carry the meaning. */

function I({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.split('|').map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

export const IcHome = () => <I d="M3 10.5 12 3l9 7.5|M5 9.5V21h14V9.5|M9.5 21v-6h5v6" />
export const IcCreate = () => <I d="M12 5v14|M5 12h14" />
export const IcClients = () => <I d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8|M22 21v-2a4 4 0 0 0-3-3.85|M16 3.15A4 4 0 0 1 16 11" />
export const IcCalendar = () => <I d="M8 2v4|M16 2v4|M3 9h18|M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2" />
export const IcChart = () => <I d="M3 3v18h18|M8 17v-6|M13 17V7|M18 17v-9" />
export const IcSettings = () => <I d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6|M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09c0-.69-.41-1.3-1.03-1.56a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09c.69 0 1.3-.41 1.56-1.03a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34c.62-.26 1.03-.87 1.03-1.56V3a2 2 0 1 1 4 0v.09c0 .69.41 1.3 1.03 1.56.62.26 1.36.12 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87c.26.62.87 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09c-.69 0-1.3.41-1.56 1.03Z" />
export const IcSearch = () => <I d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16|M21 21l-4.35-4.35" />
export const IcSun = () => <I d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10|M12 1v2|M12 21v2|M4.22 4.22l1.42 1.42|M18.36 18.36l1.42 1.42|M1 12h2|M21 12h2|M4.22 19.78l1.42-1.42|M18.36 5.64l1.42-1.42" />
export const IcMoon = () => <I d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79" />
export const IcMonitor = () => <I d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1|M8 21h8|M12 17v4" />
export const IcPanel = () => <I d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2|M9 3v18" />
export const IcChevronsUpDown = () => <I d="M7 15l5 5 5-5|M7 9l5-5 5 5" />
export const IcDoc = () => <I d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z|M14 2v6h6|M8 13h8|M8 17h5" />
export const IcMail = () => <I d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2|M22 7l-10 6L2 7" />
export const IcImage = () => <I d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2|M8.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5|M21 15l-5-5L5 21" />
export const IcLayers = () => <I d="M12 2 2 7l10 5 10-5-10-5|M2 17l10 5 10-5|M2 12l10 5 10-5" />
export const IcInvoice = () => <I d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z|M14 2v6h6|M9 14l2 2 4-4" />
export const IcRole = () => <I d="M9 7a3 3 0 1 0 6 0 3 3 0 0 0-6 0|M5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1|M17 4.5c1.2.5 2 1.7 2 3|M7 4.5c-1.2.5-2 1.7-2 3" />
