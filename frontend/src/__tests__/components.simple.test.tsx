/**
 * Simplified Component Tests
 * Tests basic component rendering
 */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TableSkeleton, PageLoader } from '@/components/LoadingSkeletons'
import Pagination from '@/components/Pagination'

describe('Loading Components', () => {
  test('PageLoader displays message', () => {
    render(<PageLoader message="Loading data..." />)
    expect(screen.getByText('Loading data...')).toBeInTheDocument()
  })

  test('TableSkeleton renders correctly', () => {
    const { container } = render(<TableSkeleton rows={3} columns={4} />)
    expect(container.firstChild).toBeInTheDocument()
  })
})

describe('Pagination Component', () => {
  test('Pagination renders with correct page numbers', () => {
    const handlePageChange = jest.fn()
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={handlePageChange}
        totalCount={50}
        itemsPerPage={10}
      />
    )

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
