import { HUE_HEAL_LOGO_PATH, HUE_HEAL_LOGO_VIEWBOX, HUE_HEAL_LOGO_RATIO } from '../lib/logoPath'

/* Hue & Heal — "Studio" wordmark lockup.
   Inlined so it recolours via `color` (fill=currentColor): cream on the ink
   sidebar, anthracite on light surfaces. Source: brand MAIN LOGO/hue&heal_ Studio.svg */
export default function Logo({ height = 20, title = 'Hue & Heal Studio', style }: { height?: number; title?: string; style?: React.CSSProperties }) {
  const width = HUE_HEAL_LOGO_RATIO * height
  return (
    <svg
      width={width}
      height={height}
      viewBox={HUE_HEAL_LOGO_VIEWBOX}
      fill="none"
      role="img"
      aria-label={title}
      style={{ display: 'block', ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <path fill="currentColor" d={HUE_HEAL_LOGO_PATH} />
    </svg>
  )
}
