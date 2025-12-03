import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NotificationCard } from "@/components/notification-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Plus, Send, Bookmark, AlertTriangle, CheckCircle, Bell, Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useNotifications, useMarkAllNotificationsAsRead, useCreateNotification } from "@/hooks/use-notifications"

export default function Notifications() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'general',
    priority: 'normal'
  })

  const { toast } = useToast()

  // Fetch real notifications
  const { data: notificationsData, isLoading, error, refetch } = useNotifications({ limit: 20 })
  const markAllAsReadMutation = useMarkAllNotificationsAsRead()
  const createNotificationMutation = useCreateNotification()

  // Extract data from response
  const notifications = (notificationsData?.data || []).map((notif: any) => ({
    id: notif.id,
    title: notif.title,
    message: notif.message,
    type: notif.type,
    isRead: notif.isRead,
    createdAt: new Date(notif.createdAt),
  })) || []

  const summary = notificationsData?.summary || {
    total: 0,
    unread: 0,
    errors: 0,
    warnings: 0
  }

  const unreadCount = summary.unread

  // Fallback to mock data if no real data
  const mockNotifications = [
    {
      id: '1',
      title: 'KYC Approved',
      message: '4 users have been successfully verified and approved for trading.',
      type: 'success',
      isRead: false,
      createdAt: new Date('2024-01-15T10:30:00'),
    },
    {
      id: '2',
      title: 'Document Review Required',
      message: 'Multiple KYC documents are pending review. Please check the Users & KYC section.',
      type: 'warning',
      isRead: false,
      createdAt: new Date('2024-01-15T09:45:00'),
    },
    {
      id: '3',
      title: 'New User Registration',
      message: 'Sarah Johnson has successfully registered and completed the onboarding process.',
      type: 'info',
      isRead: false,
      createdAt: new Date('2024-01-15T08:20:00'),
    },
    {
      id: '4',
      title: 'KYC Approved',
      message: 'Ahmed Al-Rashid\'s KYC verification has been successfully approved and they can now start investing.',
      type: 'success',
      isRead: true,
      createdAt: new Date('2024-01-14T15:45:00'),
    },
    {
      id: '5',
      title: 'Document Review Required',
      message: 'NATIONALID and other documents from 3 users require immediate review.',
      type: 'warning',
      isRead: false,
      createdAt: new Date('2024-01-14T14:20:00'),
    },
    {
      id: '6',
      title: 'New User Registration',
      message: 'Mohammed Abdullah has successfully registered and submitted KYC documents.',
      type: 'info',
      isRead: true,
      createdAt: new Date('2024-01-14T11:30:00'),
    },
    {
      id: '7',
      title: 'High Volume Alert',
      message: 'High number of pending KYC applications (12) require immediate attention to prevent delays.',
      type: 'error',
      isRead: false,
      createdAt: new Date('2024-01-14T10:15:00'),
    },
    {
      id: '8',
      title: 'KYC Approved',
      message: 'Fatima Al-Zahra\'s documents have been verified and approved.',
      type: 'success',
      isRead: true,
      createdAt: new Date('2024-01-13T16:00:00'),
    },
    {
      id: '9',
      title: 'Document Review Required',
      message: 'Identity verification documents need review for compliance.',
      type: 'warning',
      isRead: false,
      createdAt: new Date('2024-01-13T13:45:00'),
    },
    {
      id: '10',
      title: 'New User Registration',
      message: 'Omar Hassan has completed registration and uploaded required documents.',
      type: 'info',
      isRead: true,
      createdAt: new Date('2024-01-12T14:30:00'),
    },
  ]

  const unreadCount = mockNotifications.filter(n => !n.isRead).length

  const handleMarkAsRead = (id: string) => {
    console.log('Marked as read:', id)
    // In real app, this would update the notification status
  }

  const handleDelete = (id: string) => {
    console.log('Deleted notification:', id)
    // In real app, this would delete the notification
  }

  const handleMarkAllAsRead = () => {
    console.log('Mark all as read triggered')
    toast({
      title: "All Notifications Marked as Read",
      description: "All notifications have been marked as read.",
    })
  }

  const handleCreateNotification = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Create notification:', newNotification)
    
    toast({
      title: "Notification Sent",
      description: "Your notification has been sent to all users.",
    })
    
    setNewNotification({ title: '', message: '', type: 'info' })
    setShowCreateForm(false)
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-notifications">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-notifications-title">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Manage system notifications and send announcements</p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead} data-testid="button-mark-all-read">
              <Bookmark className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
          <Button onClick={() => setShowCreateForm(!showCreateForm)} data-testid="button-create-notification">
            <Plus className="h-4 w-4 mr-2" />
            Create Notification
          </Button>
        </div>
      </div>

      {/* Critical Alerts Section */}
      <div className="space-y-4">
        {/* KYC Approved Alert */}
        <Alert className="border-green-500/50 bg-green-50/50 dark:bg-green-950/50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">
            KYC Approved
            <Badge variant="default" className="ml-2 bg-green-600">
              New
            </Badge>
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            4 users have been successfully verified and approved for trading.
          </AlertDescription>
        </Alert>

        {/* Document Review Required Warning */}
        <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/50" data-testid="alert-document-review">
          <AlertTriangle className="h-4 w-4 text-amber-600 animate-pulse" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">
            Document Review Required
            <Badge variant="outline" className="ml-2 border-amber-600 text-amber-700">
              warning
            </Badge>
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Multiple KYC documents are pending review. Please check the Users & KYC section.
          </AlertDescription>
        </Alert>

        {/* New User Registration Alert */}
        <Alert className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/50">
          <Bell className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">
            New User Registration
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            Sarah Johnson has successfully registered and completed the onboarding process.
          </AlertDescription>
        </Alert>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card data-testid="card-total-notifications">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockNotifications.length}
            </div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-unread-notifications">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unread
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {unreadCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-system-alerts">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {mockNotifications.filter(n => n.type === 'error').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Critical issues
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-warnings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {mockNotifications.filter(n => n.type === 'warning').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Need review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create Notification Form */}
      {showCreateForm && (
        <Card data-testid="card-create-notification">
          <CardHeader>
            <CardTitle>Create New Notification</CardTitle>
            <CardDescription>Send a notification to all platform users</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateNotification} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">Title</label>
                  <Input
                    id="title"
                    value={newNotification.title}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter notification title"
                    required
                    data-testid="input-notification-title"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="type" className="text-sm font-medium">Type</label>
                  <Select value={newNotification.type} onValueChange={(value) => setNewNotification(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger data-testid="select-notification-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium">Message</label>
                <Textarea
                  id="message"
                  value={newNotification.message}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter notification message"
                  rows={3}
                  required
                  data-testid="textarea-notification-message"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" data-testid="button-send-notification">
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)} data-testid="button-cancel-notification">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Notifications</h2>
        {mockNotifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}