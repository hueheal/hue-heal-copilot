import type { ReactNode } from 'react'
import { useIsMobile } from '../lib/useIsMobile'

interface Props {
  eyebrow: string
  title: string
  subtitle?: string
  action?: ReactNode
}

export default function PageHeader({ eyebrow, title, subtitle, action }: Props) {
  const isMobile = useIsMobile()
  return (
    <header
      style={{
        padding: isMobile ? '20px 16px' : '34px 40px',
        borderBottom: '1px solid var(--hh-line)',
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'flex-end',
        flexWrap: 'wrap',
        rowGap: 14,
        gap: 24,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
          {eyebrow}
        </div>
        <h1
          className="hh-serif"
          style={{ fontWeight: 400, fontSize: 'clamp(28px, 3.4vw, 44px)', letterSpacing: '-0.01em', margin: '8px 0 0' }}
        >
          {title}
        </h1>
        {subtitle && <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: '12px 0 0', maxWidth: '60ch' }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </header>
  )
}

export function PillButton({
  children,
  tone = 'accent',
  onClick,
  disabled = false,
}: {
  children: ReactNode
  tone?: 'accent' | 'ink' | 'ghost'
  onClick?: () => void
  disabled?: boolean
}) {
  const styles =
    tone === 'accent'
      ? { background: 'var(--hh-copper)', color: 'var(--hh-on-accent, #F6EFE4)', border: '1px solid var(--hh-copper)' }
      : tone === 'ink'
      ? { background: 'var(--hh-anthracite)', color: 'var(--text-on-ink)', border: '1px solid var(--hh-anthracite)' }
      : { background: 'transparent', color: 'var(--text-strong)', border: '1px solid var(--hh-line)' }
  return (
    <button
      className="hh-btn"
      onClick={onClick}
      disabled={disabled}
      style={{ ...styles, borderRadius: 999, padding: '11px 22px', fontSize: 13, fontWeight: 500, opacity: disabled ? 0.55 : 1, cursor: disabled ? 'default' : 'pointer' }}
    >
      {children}
    </button>
  )
}
