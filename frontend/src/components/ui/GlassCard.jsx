/** Base translucent panel. `hover` adds a subtle lift; `pad` controls the padding. */
export default function GlassCard({ as: Tag = 'div', hover = false, pad = 'p-5 sm:p-6', className = '', children, ...rest }) {
  return (
    <Tag className={`glass ${hover ? 'glass-hover' : ''} ${pad} ${className}`} {...rest}>
      {children}
    </Tag>
  )
}
