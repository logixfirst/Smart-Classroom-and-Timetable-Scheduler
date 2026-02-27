import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef } from 'react'

const badgeVariants = cva(
  'inline-flex items-center whitespace-nowrap font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'badge badge-primary',
        secondary:
          'badge badge-neutral',
        destructive:
          'badge badge-danger',
        outline:
          'badge border border-[var(--color-border)] text-[var(--color-text-secondary)] bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(({ className, variant, ...props }, ref) => {
  return <div ref={ref} className={badgeVariants({ variant, className })} {...props} />
})
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
