import { useQuery } from '@tanstack/react-query'

const API_URL = 'http://13.50.13.193:5000/api'

export function useAnalytics(options?: {
  startDate?: string
  endDate?: string
  range?: '7days' | '30days' | '90days' | '1year'
}) {
  return useQuery({
    queryKey: ['analytics', options],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (options?.startDate) params.append('startDate', options.startDate)
      if (options?.endDate) params.append('endDate', options.endDate)
      if (options?.range) params.append('range', options.range)

      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const response = await fetch(`${API_URL}/admin/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()
      return data.data
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  })
}