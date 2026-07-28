type Props = {
  className?: string
  tone?: 'light' | 'dark'
  variant?: 'horizontal' | 'compact'
}

function GridMark({ tone }: Pick<Props, 'tone'>) {
  const variant = tone === 'dark' ? '-dark' : ''
  return <img className="brand-logo__mark" src={`${import.meta.env.BASE_URL}brand/logo-mark${variant}.svg`} alt=""/>
}

export function BrandLogo({ className = '', tone = 'light', variant = 'horizontal' }: Props) {
  const wordmark = <span className="brand-logo__wordmark">SudoCoach</span>
  return <span className={`brand-logo brand-logo--${tone} brand-logo--${variant} ${className}`.trim()}>{variant === 'compact' ? <><GridMark tone={tone}/><span className="sr-only">SudoCoach</span></> : <><GridMark tone={tone}/>{wordmark}</>}</span>
}
