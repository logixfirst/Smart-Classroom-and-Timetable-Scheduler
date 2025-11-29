import { useState, useEffect, useCallback } from 'react'

interface UsePaginatedDataOptions<T> {
  fetchFn: (page: number, pageSize: number, search: string) => Promise<any>
  initialPageSize?: number
  enableSearch?: boolean
}

export function usePaginatedData<T>({
  fetchFn,
  initialPageSize = 25,
  enableSearch = true
}: UsePaginatedDataOptions<T>) {
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(initialPageSize)

  const fetchData = useCallback(async () => {
    if (currentPage > 1) setIsTableLoading(true)
    else setIsLoading(true)
    setError(null)

    try {
      const response = await fetchFn(currentPage, itemsPerPage, searchTerm)
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        const responseData = response.data
        setData(responseData.results || responseData)
        setTotalCount(responseData.count || 0)
        if (responseData.count) {
          setTotalPages(Math.ceil(responseData.count / itemsPerPage))
        }
      }
    } catch (err) {
      setError('Failed to fetch data')
    } finally {
      setIsLoading(false)
      setIsTableLoading(false)
    }
  }, [currentPage, itemsPerPage, searchTerm, fetchFn])

  // Debounced search
  useEffect(() => {
    if (!enableSearch) return
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchData()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, enableSearch])

  // Fetch on page/pageSize change
  useEffect(() => {
    fetchData()
  }, [currentPage, itemsPerPage])

  return {
    data,
    isLoading,
    isTableLoading,
    error,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    totalPages,
    totalCount,
    itemsPerPage,
    setItemsPerPage,
    refetch: fetchData
  }
}
