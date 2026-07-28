type Props = {
  className?: string
  tone?: 'auto' | 'light' | 'dark'
  variant?: 'horizontal' | 'compact'
}

function GridMark({ tone }: Pick<Props, 'tone'>) {
  if (tone === 'auto') return <>
    <img className="brand-logo__mark brand-logo__mark--light" src={`${import.meta.env.BASE_URL}brand/logo-mark.svg`} alt=""/>
    <img className="brand-logo__mark brand-logo__mark--dark" src={`${import.meta.env.BASE_URL}brand/logo-mark-dark.svg`} alt=""/>
  </>

  const variant = tone === 'dark' ? '-dark' : ''
  return <img className="brand-logo__mark" src={`${import.meta.env.BASE_URL}brand/logo-mark${variant}.svg`} alt=""/>
}

export function BrandLogo({ className = '', tone = 'auto', variant = 'horizontal' }: Props) {
  const wordmark = <span className="brand-logo__wordmark">SudoCoach</span>
  return <span className={`brand-logo brand-logo--${tone} brand-logo--${variant} ${className}`.trim()}>{variant === 'compact' ? <><GridMark tone={tone}/><span className="sr-only">SudoCoach</span></> : <><GridMark tone={tone}/>{wordmark}</>}</span>
}
