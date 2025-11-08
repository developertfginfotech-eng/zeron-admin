import { useQuery } from '@tanstack/react-query'

const API_URL = 'http://13.50.13.193:5000/api'

export function useTransactions(options?: {
  status?: string
  type?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['transactions', options],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (options?.status) params.append('status', options.status)
      if (options?.type) params.append('type', options.type)
      if (options?.startDate) params.append('startDate', options.startDate)
      if (options?.endDate) params.append('endDate', options.endDate)
      if (options?.limit) params.append('limit', String(options.limit))
      if (options?.offset) params.append('offset', String(options.offset))

      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const response = await fetch(`${API_URL}/admin/transactions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const data = await response.json()
      return data.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
}
