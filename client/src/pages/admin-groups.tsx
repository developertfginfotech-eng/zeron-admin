import { useEffect } from "react"
import { useLocation } from "wouter"
import { Card, CardContent } from "@/components/ui/card"
import GroupManagement from "@/components/GroupManagement"
import { useToast } from "@/hooks/use-toast"

// Helper to get current user from localStorage
const getCurrentUser = () => {
  if (typeof window === 'undefined') return null

  try {
    const userData = localStorage.getItem('userData')
    if (userData) {
      return JSON.parse(userData)
    }
    return null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export default function AdminGroupsPage() {
  const { toast } = useToast()
  const [, setLocation] = useLocation()

  // Check user permissions on mount
  useEffect(() => {
    const currentUser = getCurrentUser()

    // Only allow super_admin, admin, and team_lead to access this page
    if (!currentUser || currentUser.role === 'team_member' || currentUser.role === 'user') {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access Group Management"
      })
      setLocation('/')
      return
    }
  }, [toast, setLocation])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Group Management</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage permission groups, assign team leads and members
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6">
          <GroupManagement />
        </CardContent>
      </Card>
    </div>
  )
}
