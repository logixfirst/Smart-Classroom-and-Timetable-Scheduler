'use client'

interface NavItem {
  id: string
  label: string
  count?: number
}

interface InContentNavProps {
  items: NavItem[]
  activeItem: string
  onItemClick: (itemId: string) => void
}

export default function InContentNav({ items, activeItem, onItemClick }: InContentNavProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-4 sm:mb-6">
      <nav className="flex space-x-1 overflow-x-auto scrollbar-hide">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            className={`px-3 sm:px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-200 ${
              activeItem === item.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            } rounded-t-lg`}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  activeItem === item.id
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}
