import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs sm:text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#1a73e8] text-white hover:bg-[#1557b0]',
        destructive: 'bg-[#FF0000] text-white hover:bg-[#cc0000]',
        outline:
          'border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-[#3c4043] text-gray-800 dark:text-gray-200',
        secondary:
          'bg-gray-200 dark:bg-[#3c4043] text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-[#484a4d]',
        ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#404244]',
        link: 'text-[#1a73e8] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 sm:h-10 px-3 sm:px-4 py-1.5 sm:py-2',
        sm: 'h-7 sm:h-9 rounded-md px-2 sm:px-3 text-xs',
        lg: 'h-10 sm:h-11 rounded-md px-6 sm:px-8 text-sm sm:text-base',
        icon: 'h-8 w-8 sm:h-10 sm:w-10',
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
