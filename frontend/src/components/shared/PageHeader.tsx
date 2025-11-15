interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 truncate">
          {title}
        </h1>
        {description && (
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mt-1">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </div>
  )
}
