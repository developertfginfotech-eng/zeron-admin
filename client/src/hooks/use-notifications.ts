import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const API_URL = 'https://zeron-backend-z5o1.onrender.com/api'

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  priority: string
  isRead: boolean
  createdAt: string
  status: string
}

export interface NotificationsResponse {
  data: Notification[]
  summary: {
    total: number
    unread: number
    errors: number
    warnings: number
  }
}

export function useNotifications(options?: {
  limit?: number
  offset?: number
  type?: string
  status?: string
}) {
  return useQuery({
    queryKey: ['notifications', options],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (options?.limit) params.append('limit', options.limit.toString())
      if (options?.offset) params.append('offset', options.offset.toString())
      if (options?.type) params.append('type', options.type)
      if (options?.status) params.append('status', options.status)

      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const response = await fetch(`${API_URL}/admin/notifications?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const result = await response.json()
      return result.data as NotificationsResponse
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every 60 seconds
    retry: 2,
  })
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const response = await fetch(`${API_URL}/admin/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const response = await fetch(`${API_URL}/admin/notifications/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useCreateNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      title: string
      message: string
      type?: string
      priority?: string
      targetUsers?: string[]
    }) => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const response = await fetch(`${API_URL}/admin/notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create notification')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
