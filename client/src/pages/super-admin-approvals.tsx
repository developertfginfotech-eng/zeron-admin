import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  Briefcase,
  CalendarDays,
  Search,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// API Configuration
const API_BASE_URL = 'https://zeron-backend-z5o1.onrender.com'

interface PendingUser {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  position?: string
  status: string
  createdAt: string
}

// Helper to display role names nicely
const getRoleDisplayName = (role: string): string => {
  const roleNames: Record<string, string> = {
    'admin': 'Admin',
    'kyc_officer': 'KYC Officer',
    'property_manager': 'Property Manager',
    'financial_analyst': 'Financial Analyst',
    'compliance_officer': 'Compliance Officer',
    'team_lead': 'Team Lead',
    'team_member': 'Team Member',
    'super_admin': 'Super Admin'
  }
  return roleNames[role] || role
}

// Helper to get role badge color
const getRoleBadgeColor = (role: string): string => {
  const colors: Record<string, string> = {
    'admin': 'bg-blue-100 text-blue-800',
    'kyc_officer': 'bg-purple-100 text-purple-800',
    'property_manager': 'bg-green-100 text-green-800',
    'financial_analyst': 'bg-yellow-100 text-yellow-800',
    'compliance_officer': 'bg-red-100 text-red-800',
    'team_lead': 'bg-indigo-100 text-indigo-800',
    'team_member': 'bg-gray-100 text-gray-800',
    'super_admin': 'bg-pink-100 text-pink-800'
  }
  return colors[role] || 'bg-gray-100 text-gray-800'
}

// Helper function for API calls
const apiCall = async (endpoint: string, options?: RequestInit) => {
  const token = localStorage.getItem('zaron_token') || localStorage.getItem('authToken')

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
    ...options,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, defaultOptions)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'API request failed')
  }

  return response.json()
}

// Format date helper
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function SuperAdminApprovals() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('admins')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null)
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch pending users based on role
  const fetchPendingUsers = async (role: string) => {
    setLoading(true)
    try {
      const response = await apiCall(`/api/admin/admin-users/pending/list`)

      // Handle different API response formats
      let allUsers: PendingUser[] = []

      if (Array.isArray(response)) {
        allUsers = response
      } else if (response.data?.pendingAdmins && Array.isArray(response.data.pendingAdmins)) {
        allUsers = response.data.pendingAdmins.map((user: any) => {
          const mappedUser: PendingUser = {
            _id: user.id || user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            position: user.position || '',
            status: 'pending_verification',
            createdAt: user.createdAt
          }
          return mappedUser
        })
        console.log('Mapped users from API:', allUsers)
      } else if (response.data && Array.isArray(response.data)) {
        allUsers = response.data
      } else if (response.pending && Array.isArray(response.pending)) {
        allUsers = response.pending
      } else if (response.users && Array.isArray(response.users)) {
        allUsers = response.users
      }

      // Filter by role type
      let filtered = allUsers
      if (role === 'team_lead') {
        filtered = allUsers.filter((u: PendingUser) => u.role === 'team_lead')
      } else if (role === 'team_member') {
        filtered = allUsers.filter((u: PendingUser) => u.role === 'team_member')
      } else {
        // For 'admins' tab, show all non-team roles
        filtered = allUsers.filter((u: PendingUser) =>
          u.role !== 'team_lead' && u.role !== 'team_member'
        )
      }

      console.log(`Filtered users for role '${role}':`, filtered)
      setPendingUsers(filtered)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch pending users"
      })
      setPendingUsers([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch data when tab changes
  useEffect(() => {
    fetchPendingUsers(activeTab)
  }, [activeTab])

  // Handle approve action
  const handleApprove = async () => {
    if (!selectedUser) return

    setActionLoading(true)
    try {
      const userId = selectedUser._id
      console.log('Approving user with ID:', userId)

      await apiCall(`/api/admin/admin-users/${userId}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          adminId: userId,
          approved: true
        })
      })

      toast({
        title: "Success",
        description: `${selectedUser.firstName} ${selectedUser.lastName} has been approved and can now access the system.`,
        className: "bg-green-50 border-green-200"
      })

      setShowApproveDialog(false)
      setSelectedUser(null)

      // Refresh the list
      fetchPendingUsers(activeTab)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to approve user"
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Handle reject action
  const handleReject = async () => {
    if (!selectedUser) return

    setActionLoading(true)
    try {
      const userId = selectedUser._id
      console.log('Rejecting user with ID:', userId)

      await apiCall(`/api/admin/admin-users/${userId}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          adminId: userId,
          approved: false
        })
      })

      toast({
        title: "Success",
        description: `${selectedUser.firstName} ${selectedUser.lastName}'s registration has been rejected and their account has been removed.`,
        className: "bg-green-50 border-green-200"
      })

      setShowRejectDialog(false)
      setSelectedUser(null)

      // Refresh the list
      fetchPendingUsers(activeTab)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reject user"
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Filter users based on search query
  const filteredUsers = pendingUsers.filter(user =>
    user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone.includes(searchQuery)
  )

  return (
    <div className="flex-1 space-y-6 p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Admin Approvals
              </h1>
              <p className="text-slate-600 text-lg">
                Review and approve pending admin registrations
              </p>
            </div>
            <div className="hidden md:block">
              <div className="text-right">
                <p className="text-sm text-slate-600">Total Pending</p>
                <p className="text-3xl font-bold text-blue-600">{pendingUsers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 inline-flex">
            <TabsList className="bg-transparent border-none gap-0">
              <TabsTrigger
                value="admins"
                className="cursor-pointer rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white text-slate-700 px-6 py-3 font-semibold transition-all"
              >
                <span className="mr-2">👤</span>
                Admins
              </TabsTrigger>
              <TabsTrigger
                value="team_lead"
                className="cursor-pointer rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white text-slate-700 px-6 py-3 font-semibold transition-all"
              >
                <span className="mr-2">👥</span>
                Team Leads
              </TabsTrigger>
              <TabsTrigger
                value="team_member"
                className="cursor-pointer rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-slate-700 px-6 py-3 font-semibold transition-all"
              >
                <span className="mr-2">👤</span>
                Team Members
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <TabsContent value={activeTab} className="space-y-6 mt-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 rounded-lg border-slate-200 focus:border-blue-400 focus:ring-blue-50 bg-white shadow-sm"
              />
            </div>

            {/* Stats Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Pending Approvals</p>
                    <p className="text-4xl font-bold text-blue-600 mt-1">{filteredUsers.length}</p>
                    <p className="text-xs text-slate-600 mt-2">
                      {filteredUsers.length === 0 ? 'All users reviewed' : 'Awaiting your review'}
                    </p>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-300 rounded-full blur-xl opacity-30"></div>
                    <Clock className="relative h-16 w-16 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Users List */}
            {loading ? (
              <div className="flex items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
                <div className="text-center space-y-3">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto" />
                  <p className="text-slate-600 font-medium">Loading pending approvals...</p>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center py-20 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="text-center space-y-4">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 bg-green-200 rounded-full blur-xl opacity-40"></div>
                    <CheckCircle className="relative h-20 w-20 text-green-500 mx-auto" />
                  </div>
                  <div>
                    <p className="text-slate-900 font-bold text-lg">No pending approvals</p>
                    <p className="text-slate-600 text-sm mt-1">All users have been reviewed ✓</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredUsers.map((user) => (
                  <Card
                    key={user._id}
                    className="bg-white border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 overflow-hidden group"
                  >
                    <CardContent className="pt-6 pb-6">
                      <div className="space-y-5">
                        {/* User Info Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="relative">
                              <div className="absolute inset-0 bg-blue-200 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity"></div>
                              <Avatar className="relative h-14 w-14 border-2 border-blue-100">
                                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold text-base">
                                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg text-slate-900 truncate">
                                {user.firstName} {user.lastName}
                              </h3>
                              <p className="text-sm text-slate-600 mt-1">{user.position || 'No position specified'}</p>
                              <div className="flex items-center gap-2 mt-3 flex-wrap">
                                <Badge className={`${getRoleBadgeColor(user.role)} font-semibold`}>
                                  {getRoleDisplayName(user.role)}
                                </Badge>
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 font-semibold">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* User Details Grid */}
                        <div className="grid grid-cols-2 gap-4 py-4 px-4 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <Mail className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</p>
                                <p className="text-sm text-slate-900 font-medium truncate">{user.email}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Phone className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone</p>
                                <p className="text-sm text-slate-900 font-medium">{user.phone}</p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <CalendarDays className="h-4 w-4 text-purple-500 mt-1 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Registered</p>
                                <p className="text-sm text-slate-900 font-medium">{formatDate(user.createdAt)}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Briefcase className="h-4 w-4 text-orange-500 mt-1 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</p>
                                <p className="text-sm text-slate-900 font-medium capitalize">{user.status}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 justify-end pt-2">
                          <Button
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 font-semibold transition-all"
                            onClick={() => {
                              setSelectedUser(user)
                              setShowRejectDialog(true)
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                          <Button
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                            onClick={() => {
                              setSelectedUser(user)
                              setShowApproveDialog(true)
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Approve Admin Registration
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to approve {selectedUser?.firstName} {selectedUser?.lastName}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <p className="font-medium text-green-900">Upon approval:</p>
              <ul className="text-sm text-green-800 space-y-1 ml-4">
                <li>✓ Account status will change to "Active"</li>
                <li>✓ User will be able to log in immediately</li>
                <li>✓ Access will be granted based on their role ({getRoleDisplayName(selectedUser?.role || '')})</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Reject Registration
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject {selectedUser?.firstName} {selectedUser?.lastName}'s registration?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
              <p className="font-medium text-red-900">This action will:</p>
              <ul className="text-sm text-red-800 space-y-1 ml-4">
                <li>✗ Delete the user account permanently</li>
                <li>✗ Prevent user from logging in</li>
                <li>✗ Remove all associated data (cannot be undone)</li>
              </ul>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This action is irreversible. The user will need to register again.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
