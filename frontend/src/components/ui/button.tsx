import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium cursor-pointer disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-primary)] text-[var(--color-text-inverse)] border border-transparent rounded-[var(--radius-md)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-[var(--color-border-focus)] focus-visible:outline-offset-2 transition-colors duration-100',
        destructive:
          'bg-[var(--color-danger)] text-[var(--color-text-inverse)] border border-transparent rounded-[var(--radius-md)] hover:brightness-90 focus-visible:outline-2 focus-visible:outline-[var(--color-border-focus)] focus-visible:outline-offset-2 transition-colors duration-100',
        outline:
          'bg-[var(--color-bg-surface)] text-[var(--color-primary)] border border-[var(--color-border)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--color-border-focus)] focus-visible:outline-offset-2 transition-colors duration-100',
        secondary:
          'bg-[var(--color-bg-surface-2)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-surface-3)] focus-visible:outline-2 focus-visible:outline-[var(--color-border-focus)] focus-visible:outline-offset-2 transition-colors duration-100',
        ghost:
          'bg-transparent text-[var(--color-text-secondary)] border border-transparent rounded-[var(--radius-md)] hover:bg-[var(--color-bg-surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--color-border-focus)] focus-visible:outline-offset-2 transition-colors duration-100',
        link:
          'text-[var(--color-text-link)] underline-offset-4 hover:underline bg-transparent border-none rounded-none',
      },
      size: {
        default: 'h-9 px-4 text-[14px]',
        sm:      'h-8 px-3 text-[13px] rounded-[var(--radius-md)]',
        lg:      'h-10 px-6 text-[14px]',
        icon:    'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
