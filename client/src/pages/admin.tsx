import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Shield,
  UserCog,
  Settings,
  Key,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Loader2,
  Users,
  TrendingUp,
  FileText,
  MapPin,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import GroupManagement from "@/components/GroupManagement"

// API Configuration
const API_BASE_URL = 'https://zeron-backend-z5o1.onrender.com'

// Valid role names that backend accepts for admin creation
const VALID_ROLE_NAMES = [
  'admin',
  'super_admin',
  'kyc_officer',
  'property_manager',
  'financial_analyst',
  'compliance_officer'
]

// Helper to check if role name is valid
const isValidRoleName = (roleName: string) => VALID_ROLE_NAMES.includes(roleName)

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
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'API request failed')
  }

  return data
}

// Helper function to decode JWT and get current user info
const getCurrentUser = (): any => {
  try {
    const token = localStorage.getItem('zaron_token') || localStorage.getItem('authToken')
    if (!token) return null

    const parts = token.split('.')
    if (parts.length !== 3) return null

    const decoded = JSON.parse(atob(parts[1]))
    return decoded
  } catch (err) {
    console.error('Error decoding token:', err)
    return null
  }
}

interface AdminUser {
  _id: string
  firstName: string
  lastName: string
  email: string
  role: string
  status?: string
  createdAt: string
  assignedRole?: RoleData
}

interface RegularUser {
  _id: string
  firstName: string
  lastName: string
  email: string
  kycStatus: string
  status: string
  emailVerified: boolean
}

interface Permission {
  resource: string
  actions: string[]
}

interface RoleData {
  _id: string
  name: string
  displayName: string
  description?: string
  permissions: Permission[]
  userCount?: number
  isActive: boolean
  isSystemRole?: boolean
}

interface GroupData {
  _id: string
  name: string
  displayName: string
  description?: string
  permissions: Permission[]
  memberCount: number
  isActive: boolean
  defaultRole?: {
    _id: string
    name: string
    displayName: string
  }
}


export default function AdminDashboard() {
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState("overview")
  const [selectedRole, setSelectedRole] = useState("all")
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [regularUsers, setRegularUsers] = useState<RegularUser[]>([])
  const [eligibleUsers, setEligibleUsers] = useState<RegularUser[]>([])
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [roles, setRoles] = useState<RoleData[]>([])
  const [groups, setGroups] = useState<GroupData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateAdminDialog, setShowCreateAdminDialog] = useState(false)
  const [showAdminFunctionsDialog, setShowAdminFunctionsDialog] = useState(false)
  const [selectedEligibleUser, setSelectedEligibleUser] = useState<string | null>(null)
  const [roleCategory, setRoleCategory] = useState<'team_lead' | 'team_member' | null>(null)
  const [selectedAdminRole, setSelectedAdminRole] = useState<string | null>(null)
  const [selectedTeamMemberRole, setSelectedTeamMemberRole] = useState<string | null>(null)
  const [isPromoting, setIsPromoting] = useState(false)
  const [selectedGroupsForUser, setSelectedGroupsForUser] = useState<Set<string>>(new Set())
  const [groupPermissionsForUser, setGroupPermissionsForUser] = useState<Record<string, any[]>>({})
  const [adminDialogMode, setAdminDialogMode] = useState<'promote' | 'create'>('promote')
  const [newAdminForm, setNewAdminForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    password: ''
  })
  const [securitySettings, setSecuritySettings] = useState<any>(null)
  const [showSecuritySettingsDialog, setShowSecuritySettingsDialog] = useState(false)
  const [updatedSecuritySettings, setUpdatedSecuritySettings] = useState<any>(null)
  const [savingSecuritySettings, setSavingSecuritySettings] = useState(false)

  // SubAdmin states
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false)
  const [selectedGroupForMember, setSelectedGroupForMember] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [addMemberRoleCategory, setAddMemberRoleCategory] = useState<'team_lead' | 'team_member' | null>(null)
  const [selectedMemberUserId, setSelectedMemberUserId] = useState<string | null>(null)

  // Fetch all data on mount
  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch roles
      try {
        const rolesResponse = await apiCall('/api/admin/roles')
        console.log('Roles response:', rolesResponse)

        if (rolesResponse.success && rolesResponse.data) {
          setRoles(rolesResponse.data || [])
        }
      } catch (rolesErr) {
        console.warn('Could not fetch roles:', rolesErr)
      }

      // Fetch groups
      try {
        const groupsResponse = await apiCall('/api/admin/groups')
        console.log('Groups response:', groupsResponse)

        if (groupsResponse.success && groupsResponse.data) {
          // Log group structure to debug members
          const groupsData = Array.isArray(groupsResponse.data) ? groupsResponse.data : groupsResponse.data.groups || []
          console.log('Groups with members:', groupsData.map((g: any) => ({
            id: g._id,
            name: g.displayName,
            memberCount: g.members?.length || 0,
            members: g.members
          })))
          setGroups(groupsData || [])
        }
      } catch (groupsErr) {
        console.warn('Could not fetch groups:', groupsErr)
      }

      // Fetch admin users
      const adminResponse = await apiCall('/api/admin/admin-users')
      console.log('Admin users response:', adminResponse)

      if (adminResponse.success && adminResponse.data) {
        setAdminUsers(adminResponse.data.admins || [])
      }

      // Fetch regular users
      const usersResponse = await apiCall('/api/admin/all-users')
      console.log('Regular users response:', usersResponse)

      if (usersResponse.success && usersResponse.data) {
        setRegularUsers(usersResponse.data.users || [])
      }

      // Fetch eligible users for promotion
      try {
        const eligibleResponse = await apiCall('/api/admin/eligible-users')
        console.log('Eligible users response:', eligibleResponse)

        if (eligibleResponse.success && eligibleResponse.data) {
          setEligibleUsers(eligibleResponse.data.users || [])
        }
      } catch (eligibleErr) {
        // Don't fail if eligible users endpoint has permission issues
        console.warn('Could not fetch eligible users:', eligibleErr)
      }

      // Fetch dashboard stats
      const dashboardResponse = await apiCall('/api/admin/dashboard')
      console.log('Dashboard response:', dashboardResponse)

      if (dashboardResponse.success && dashboardResponse.data) {
        setDashboardStats(dashboardResponse.data.overview)
      }

      // Fetch security settings
      try {
        const securityResponse = await apiCall('/api/admin/security-settings')
        console.log('Security settings response:', securityResponse)

        if (securityResponse.success && securityResponse.data) {
          setSecuritySettings(securityResponse.data)
        }
      } catch (securityErr) {
        console.warn('Could not fetch security settings:', securityErr)
      }


    } catch (err: any) {
      console.error('Error fetching admin data:', err)
      setError(err.message || 'Failed to fetch admin data')
      toast({
        title: "Error",
        description: err.message || "Failed to load admin data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Toggle group expansion
  const toggleGroupExpand = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  // Handle creating new admin user
  const handleCreateAdmin = async () => {
    if (!newAdminForm.firstName || !newAdminForm.lastName || !newAdminForm.email || !newAdminForm.password || !roleCategory) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive"
      })
      return
    }

    let finalRole: string | null = null

    if (roleCategory === 'team_lead') {
      finalRole = selectedAdminRole
      if (!selectedGroupsForUser.size) {
        toast({
          title: "Error",
          description: "Please assign the Team Lead to at least one department",
          variant: "destructive"
        })
        return
      }
    } else if (roleCategory === 'team_member') {
      finalRole = selectedTeamMemberRole
      if (!finalRole) {
        toast({
          title: "Error",
          description: "Please select a specific role for the Team Member",
          variant: "destructive"
        })
        return
      }
    }

    // Validate selected role
    if (!finalRole || !isValidRoleName(finalRole)) {
      toast({
        title: "Invalid Role",
        description: `Selected role is not valid. Role must be one of: ${VALID_ROLE_NAMES.join(', ')}`,
        variant: "destructive"
      })
      return
    }

    try {
      setIsPromoting(true)
      const groupIds = Array.from(selectedGroupsForUser)

      const response = await apiCall('/api/admin/admin-users', {
        method: 'POST',
        body: JSON.stringify({
          firstName: newAdminForm.firstName,
          lastName: newAdminForm.lastName,
          email: newAdminForm.email,
          phone: newAdminForm.phone || undefined,
          position: newAdminForm.position || undefined,
          password: newAdminForm.password,
          role: finalRole,
          groupIds: groupIds.length > 0 ? groupIds : undefined
        })
      })

      if (response.success) {
        const roleLabel = roleCategory === 'team_lead' ? 'Team Lead' : 'Team Member'
        toast({
          title: "Success",
          description: `${roleLabel} ${newAdminForm.firstName} ${newAdminForm.lastName} created successfully${selectedGroupsForUser.size > 0 ? ` and added to ${selectedGroupsForUser.size} team(s)` : ''}`,
        })
        // Close dialog and reset state
        setShowCreateAdminDialog(false)
        setNewAdminForm({ firstName: '', lastName: '', email: '', phone: '', position: '', password: '' })
        setRoleCategory(null)
        setSelectedAdminRole(null)
        setSelectedTeamMemberRole(null)
        setSelectedGroupsForUser(new Set())
        setGroupPermissionsForUser({})
        // Refresh admin data
        fetchAllData()
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create admin user",
        variant: "destructive"
      })
    } finally {
      setIsPromoting(false)
    }
  }

  // Handle opening create admin dialog
  const handleOpenCreateAdminDialog = () => {
    setShowCreateAdminDialog(true)
    setRoleCategory(null)
    setSelectedAdminRole(null)
    setSelectedTeamMemberRole(null)
    setSelectedGroupsForUser(new Set())
  }

  // Handle promoting a user to admin role and adding to groups
  const handlePromoteUser = async () => {
    if (!selectedEligibleUser || !selectedAdminRole) {
      toast({
        title: "Error",
        description: "Please select both a user and a role",
        variant: "destructive"
      })
      return
    }

    // Validate selected role
    if (!isValidRoleName(selectedAdminRole)) {
      toast({
        title: "Invalid Role",
        description: `Selected role is not valid. Role must be one of: ${VALID_ROLE_NAMES.join(', ')}`,
        variant: "destructive"
      })
      return
    }

    try {
      setIsPromoting(true)
      const response = await apiCall('/api/admin/promote-user', {
        method: 'POST',
        body: JSON.stringify({
          userId: selectedEligibleUser,
          role: selectedAdminRole
        })
      })

      if (response.success) {
        // If groups are selected, add user to those groups
        if (selectedGroupsForUser.size > 0) {
          for (const groupId of selectedGroupsForUser) {
            const memberPermissions = groupPermissionsForUser[groupId] || []
            try {
              await apiCall(`/api/admin/groups/${groupId}/add-member`, {
                method: 'POST',
                body: JSON.stringify({
                  userId: selectedEligibleUser,
                  memberPermissions
                })
              })
            } catch (groupErr: any) {
              console.warn(`Failed to add user to group ${groupId}:`, groupErr.message)
            }
          }
        }

        toast({
          title: "Success",
          description: `User promoted to ${roles.find(r => r.name === selectedAdminRole)?.displayName || 'admin'}${selectedGroupsForUser.size > 0 ? ` and added to ${selectedGroupsForUser.size} group(s)` : ''}`,
        })
        // Close dialog and reset state
        setShowCreateAdminDialog(false)
        setSelectedEligibleUser(null)
        setSelectedAdminRole(null)
        setSelectedGroupsForUser(new Set())
        setGroupPermissionsForUser({})
        // Refresh admin data
        fetchAllData()
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to promote user",
        variant: "destructive"
      })
    } finally {
      setIsPromoting(false)
    }
  }

  // Handle adding a member to a group
  const handleAddMemberToGroup = async (userId: string, groupId: string, roleCategory?: 'team_lead' | 'team_member') => {
    try {
      // Check permission based on current user role
      const user = currentUser
      const group = groups.find(g => g._id === groupId)

      // Only super admin can add team leads
      if (roleCategory === 'team_lead' && user?.role !== 'super_admin') {
        toast({
          title: "Error",
          description: "Only super admins can add team leads to groups",
          variant: "destructive"
        })
        return
      }

      // Team members can only be added by super admin or team leads
      if (roleCategory === 'team_member') {
        const isTeamLead = user?.role === 'admin' && group?.members?.some((m: any) => {
          const memberId = m.userId?._id?.toString() || m.userId?.toString() || m
          return memberId === user?._id || memberId === user?.id
        })

        if (user?.role !== 'super_admin' && !isTeamLead) {
          toast({
            title: "Error",
            description: "Only super admins or team leads can add team members",
            variant: "destructive"
          })
          return
        }
      }

      const response = await apiCall(`/api/admin/groups/${groupId}/add-member`, {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          memberPermissions: [],
          roleCategory: roleCategory
        })
      })

      if (response.success) {
        toast({
          title: "Success",
          description: `Member added to group successfully as ${roleCategory === 'team_lead' ? 'Team Lead' : 'Team Member'}`,
        })
        setShowAddMemberDialog(false)
        setSelectedGroupForMember(null)
        setSelectedMemberUserId(null)
        setAddMemberRoleCategory(null)

        // Refetch groups to get updated members
        try {
          const groupsResponse = await apiCall('/api/admin/groups')
          if (groupsResponse.success && groupsResponse.data) {
            setGroups(groupsResponse.data || [])
          }
        } catch (err) {
          console.error('Failed to refetch groups:', err)
        }
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add member to group",
        variant: "destructive"
      })
    }
  }

  // Handle deleting a group (Super Admin only)
  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return
    }

    try {
      const response = await apiCall(`/api/admin/groups/${groupId}`, {
        method: 'DELETE'
      })

      if (response.success) {
        toast({
          title: "Success",
          description: "Group deleted successfully",
        })
        fetchAllData()
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete group",
        variant: "destructive"
      })
    }
  }

// Save security settings
  const handleSaveSecuritySettings = async () => {
    try {
      setSavingSecuritySettings(true)

      // Get the actual values from the updated settings, ensuring we have valid numbers
      const sessionTimeoutValue = updatedSecuritySettings?.sessionTimeout ?? securitySettings?.authentication?.sessionTimeout?.hours ?? 8
      const passwordMinLengthValue = updatedSecuritySettings?.passwordMinLength ?? securitySettings?.authentication?.passwordPolicy?.minLength ?? 8
      const loginAttemptsValue = updatedSecuritySettings?.loginAttemptsLimit ?? securitySettings?.authentication?.loginAttempts?.maxAttempts ?? 5
      const apiRateLimitValue = updatedSecuritySettings?.apiRateLimit ?? securitySettings?.accessControl?.apiRateLimiting?.requestsPerMinute ?? 100

      const updatedSettings = {
        authentication: {
          sessionTimeout: {
            hours: sessionTimeoutValue
          },
          passwordPolicy: {
            minLength: passwordMinLengthValue
          },
          loginAttempts: {
            maxAttempts: loginAttemptsValue
          }
        },
        accessControl: {
          apiRateLimiting: {
            requestsPerMinute: apiRateLimitValue
          },
          ipAllowlist: {
            ips: updatedSecuritySettings?.ipAllowlist ? updatedSecuritySettings.ipAllowlist.split(',').map((ip: string) => ip.trim()).filter((ip: string) => ip.length > 0) : securitySettings?.accessControl?.ipAllowlist?.ips || []
          }
        }
      }

      const response = await apiCall('/api/admin/security-settings', {
        method: 'PUT',
        body: JSON.stringify(updatedSettings)
      })

      if (response.success) {
        // Immediately update the display with the saved values
        setSecuritySettings({
          success: true,
          data: {
            authentication: {
              twoFactorAuthentication: securitySettings?.data?.authentication?.twoFactorAuthentication || { enabled: true, status: 'Enabled' },
              sessionTimeout: {
                hours: sessionTimeoutValue,
                status: `${sessionTimeoutValue} hours`
              },
              passwordPolicy: {
                minLength: passwordMinLengthValue,
                status: `${passwordMinLengthValue} characters`
              },
              loginAttempts: {
                maxAttempts: loginAttemptsValue,
                status: `${loginAttemptsValue} attempts`
              }
            },
            accessControl: {
              apiRateLimiting: {
                requestsPerMinute: apiRateLimitValue,
                status: 'Active'
              },
              ipAllowlist: {
                ips: updatedSettings.accessControl.ipAllowlist.ips,
                status: updatedSettings.accessControl.ipAllowlist.ips.length > 0 ? 'Configured' : 'Not configured'
              },
              auditLogging: securitySettings?.data?.accessControl?.auditLogging || { enabled: true, status: 'Enabled' },
              dataEncryption: securitySettings?.data?.accessControl?.dataEncryption || { algorithm: 'AES-256', status: 'AES-256' }
            }
          }
        })

        toast({
          title: "Success",
          description: "Security settings updated successfully",
        })
        setShowSecuritySettingsDialog(false)
        setUpdatedSecuritySettings(null)
      } else {
        throw new Error(response.message || 'Failed to save settings')
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save security settings",
        variant: "destructive"
      })
    } finally {
      setSavingSecuritySettings(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/15 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-destructive font-medium">Error</p>
          </div>
          <p className="text-destructive/80 text-sm mt-1">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={fetchAllData}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Management</h1>
          <p className="text-muted-foreground">Manage administrator access and permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleOpenCreateAdminDialog}>
            <UserCog className="h-4 w-4 mr-2" />
            Add Administrator
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="overview" className="cursor-pointer">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="admins" className="cursor-pointer">
            <UserCog className="h-4 w-4 mr-2" />
            Admins
          </TabsTrigger>
          <TabsTrigger value="teams" className="cursor-pointer">
            <Users className="h-4 w-4 mr-2" />
            Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Dashboard Overview</h2>
              <p className="text-muted-foreground mt-1">System statistics and quick access</p>
            </div>
          </div>

          {/* Key Statistics */}
          {dashboardStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-900">Total Properties</CardTitle>
                  <Shield className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{dashboardStats.totalProperties || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardStats.activeProperties || 0} active
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-900">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{dashboardStats.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardStats.pendingKyc || 0} pending KYC
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-900">Total Investments</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{dashboardStats.totalInvestments || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    SAR {(dashboardStats.totalInvestmentValue || 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-900">Admin Users</CardTitle>
                  <UserCog className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{adminUsers.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {adminUsers.filter(u => u.role === 'super_admin').length} super admins
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions */}
          <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Navigate to manage key system components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  onClick={() => setActiveTab('admins')}
                  className="bg-blue-600 hover:bg-blue-700 h-20 flex flex-col items-center justify-center gap-2"
                >
                  <UserCog className="h-5 w-5" />
                  <span>Manage Admins</span>
                </Button>

                <Button
                  onClick={() => setActiveTab('teams')}
                  className="bg-green-600 hover:bg-green-700 h-20 flex flex-col items-center justify-center gap-2"
                >
                  <Users className="h-5 w-5" />
                  <span>Manage Teams</span>
                </Button>

                <Button
                  onClick={handleOpenCreateAdminDialog}
                  className="bg-indigo-600 hover:bg-indigo-700 h-20 flex flex-col items-center justify-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create Admin</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle>System Summary</CardTitle>
              <CardDescription>Current system statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4">
                  <p className="text-3xl font-bold text-blue-600">{groups.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Active Teams</p>
                </div>
                <div className="text-center p-4">
                  <p className="text-3xl font-bold text-green-600">{adminUsers.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Total Staff</p>
                </div>
                <div className="text-center p-4">
                  <p className="text-3xl font-bold text-purple-600">{roles.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Role Definitions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins" className="space-y-6">
          {/* Admin Management Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Admin Users Management</h2>
              <p className="text-muted-foreground mt-1">Create, manage, and assign admin roles</p>
            </div>
            <Button
              onClick={handleOpenCreateAdminDialog}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Admin
            </Button>
          </div>

          {/* Role Hierarchy Quick Reference */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Role Hierarchy & Team Management
              </CardTitle>
              <CardDescription>Create departments, assign admins, and manage teams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Role Levels */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Super Admin */}
                  <Card className="border-2 border-red-200 bg-red-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4 text-red-600" />
                        Super Admin
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <p className="text-muted-foreground">Full system access</p>
                      <div className="bg-white rounded p-2 space-y-1 text-xs">
                        <p>✓ Create Admin roles</p>
                        <p>✓ Assign departments</p>
                        <p>✓ Manage all teams</p>
                        <p>✓ View reports</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Admin */}
                  <Card className="border-2 border-blue-200 bg-blue-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-blue-600" />
                        Admin (Department Head)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <p className="text-muted-foreground">Manage own department</p>
                      <div className="bg-white rounded p-2 space-y-1 text-xs">
                        <p>✓ Create teams/groups</p>
                        <p>✓ Add Sub-Admins</p>
                        <p>✓ Manage team access</p>
                        <p>✓ Remove members</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sub-Admin */}
                  <Card className="border-2 border-green-200 bg-green-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-600" />
                        Sub-Admin (Team Member)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <p className="text-muted-foreground">Team-specific work</p>
                      <div className="bg-white rounded p-2 space-y-1 text-xs">
                        <p>✓ View assigned tasks</p>
                        <p>✓ Process transactions</p>
                        <p>✓ Approve/reject requests</p>
                        <p>✓ Department limited</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Example Teams */}
                <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">Example Teams</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-blue-50 rounded border border-blue-200">
                      <p className="font-medium text-blue-900">Finance Office Team</p>
                      <p className="text-xs text-muted-foreground mt-1">Admin: Finance Officer</p>
                      <p className="text-xs text-muted-foreground">Work: Approve withdrawals, process payments</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded border border-purple-200">
                      <p className="font-medium text-purple-900">KYC Verification Team</p>
                      <p className="text-xs text-muted-foreground mt-1">Admin: KYC Officer</p>
                      <p className="text-xs text-muted-foreground">Work: Verify users, review documents</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded border border-green-200">
                      <p className="font-medium text-green-900">Property Management Team</p>
                      <p className="text-xs text-muted-foreground mt-1">Admin: Property Manager</p>
                      <p className="text-xs text-muted-foreground">Work: Approve listings, manage properties</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded border border-orange-200">
                      <p className="font-medium text-orange-900">Compliance Team</p>
                      <p className="text-xs text-muted-foreground mt-1">Admin: Compliance Officer</p>
                      <p className="text-xs text-muted-foreground">Work: Monitor activities, generate reports</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-red-50 to-red-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-900">Super Admins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">1</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">Admins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{adminUsers.filter(u => u.role === 'admin' || u.assignedRole?.name === 'admin').length}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-900">Sub-Admins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{adminUsers.filter(u => u.role === 'sub_admin' || u.assignedRole?.name === 'sub_admin').length}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-900">Total Teams</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{groups.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Current Admins List */}
          <Card>
            <CardHeader>
              <CardTitle>Current Admin Users</CardTitle>
              <CardDescription>All administrator and sub-administrator users in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {adminUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No admin users found. Create one using the button above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {adminUsers.map((admin) => (
                    <Card key={admin._id} className="border hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar>
                              <AvatarFallback>{admin.firstName?.[0]}{admin.lastName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{admin.firstName} {admin.lastName}</p>
                              <p className="text-xs text-muted-foreground">{admin.email}</p>
                            </div>
                          </div>
                          <Badge className={admin.role === 'super_admin' ? 'bg-red-600' : admin.role === 'admin' ? 'bg-blue-600' : 'bg-green-600'}>
                            {admin.role === 'super_admin' ? 'Super Admin' : admin.role === 'admin' ? 'Admin' : 'Sub-Admin'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Created: {new Date(admin.createdAt).toLocaleDateString()}</p>
                          <p>Status: <span className="font-medium">{admin.status || 'Active'}</span></p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Teams Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Department Teams & Members</CardTitle>
              <CardDescription>
                View and manage teams by department. Click to expand and see team members.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {groups.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No teams created yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">Go to Groups tab to create your first team</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Group by department/category */}
                  {groups.map((group) => (
                    <div key={group._id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      {/* Group Header - Clickable */}
                      <button
                        onClick={() => toggleGroupExpand(group._id)}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{group.displayName}</h4>
                            <p className="text-sm text-muted-foreground">{group.description || 'No description'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="bg-white">
                            {group.memberCount || 0} members
                          </Badge>
                          {expandedGroups.has(group._id) ? (
                            <ChevronUp className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Content */}
                      {expandedGroups.has(group._id) && (
                        <div className="p-4 bg-white border-t space-y-4">
                          {/* Permissions */}
                          <div>
                            <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Team Permissions
                            </h5>
                            {group.permissions && group.permissions.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {group.permissions.map((perm: any, idx: number) => (
                                  <div key={idx} className="text-xs bg-green-50 border border-green-200 rounded px-2 py-1 flex items-start gap-1">
                                    <span className="text-green-600 mt-0.5">✓</span>
                                    <span>{perm.resource}: {perm.actions.join(', ')}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No specific permissions set</p>
                            )}
                          </div>

                          {/* Team Members */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-semibold text-sm flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Team Members ({group.memberCount || 0})
                              </h5>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setSelectedGroupForMember(group._id)
                                  setShowAddMemberDialog(true)
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Member
                              </Button>
                            </div>

                            {/* Members list placeholder - in real implementation, fetch actual members */}
                            <div className="space-y-2 bg-gray-50 rounded p-3">
                              <p className="text-xs text-muted-foreground italic">Team members will appear here</p>
                              <div className="text-xs space-y-1">
                                <div className="flex items-center justify-between p-2 bg-white rounded border">
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-800">AB</div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm">Admin User</p>
                                      <p className="text-xs text-muted-foreground">admin@example.com</p>
                                    </div>
                                  </div>
                                  <Badge variant="secondary" className="text-xs">Admin</Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Default Role */}
                          {group.defaultRole && (
                            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                              <p className="text-xs text-muted-foreground">Default Role</p>
                              <p className="font-medium">{group.defaultRole.displayName}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium mb-2">💡 Quick Actions</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• Click on a team to expand and see members</li>
                  <li>• Use "Groups" tab to create new teams</li>
                  <li>• Add Sub-Admins to teams to manage workflows</li>
                  <li>• Each team can have different permissions</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          {/* Teams Management Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Teams & Groups Management</h2>
              <p className="text-muted-foreground mt-1">Team Leads (Admins) manage their sub-admin team members</p>
            </div>
          </div>

          {/* Teams Overview Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Teams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{groups.length}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  Team Leads (Admins)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{adminUsers.filter(u => u.role === 'admin').length}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-900 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Members (Sub-Admins)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {groups.reduce((total, group) => total + (group.members?.length || 0), 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department Teams & Team Leads */}
          <Card>
            <CardHeader>
              <CardTitle>Department Teams & Team Leads</CardTitle>
              <CardDescription>View team leads (admins) and their team members (sub-admins)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {groups.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No teams created yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">Use the Team Management section below to create teams</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.map((group) => {
                    // Find admin users who belong to this group (team leads)
                    // Filter by checking if they're in the group's members array
                    // Note: members.userId is populated with user objects from backend
                    const groupMemberIds = group.members?.map((m: any) => {
                      // m.userId could be a populated user object with _id property
                      if (m.userId && typeof m.userId === 'object' && m.userId._id) {
                        return m.userId._id.toString()
                      }
                      // Fallback: m might be just an ID string or have _id property
                      return typeof m === 'string' ? m : (m._id || m.userId)
                    }) || []

                    console.log(`Group "${group.displayName}" members:`, groupMemberIds, 'Admin users:', adminUsers.map(u => ({ id: u._id, name: u.firstName })))

                    const teamLead = adminUsers.find(u => u.role === 'admin' && groupMemberIds.includes(u._id?.toString() || u._id))
                    const teamMembers = adminUsers.filter(u => u.role !== 'super_admin' && u.role !== 'admin' && groupMemberIds.includes(u._id?.toString() || u._id))

                    return (
                      <Card key={group._id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                        <div className="p-4">
                          {/* Team Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold">{group.displayName}</h3>
                              <p className="text-sm text-muted-foreground">{group.description || 'No description'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-600">{teamMembers.length} Members</Badge>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 text-xs"
                                onClick={() => handleDeleteGroup(group._id)}
                              >
                                <Trash className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>

                          {/* Team Lead Section */}
                          {teamLead && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-xs font-semibold text-green-900 mb-2">👨‍💼 Team Lead</p>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback>
                                    {teamLead.firstName?.[0]}{teamLead.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm">{teamLead.firstName} {teamLead.lastName}</p>
                                  <p className="text-xs text-muted-foreground">{teamLead.email}</p>
                                </div>
                                <Badge className="bg-green-600 text-xs">Admin</Badge>
                              </div>
                            </div>
                          )}

                          {/* Team Members (Sub-Admins) Section */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold flex items-center gap-2">
                                👥 Team Members ({teamMembers.length})
                              </p>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    setSelectedGroupForMember(group._id)
                                    setAddMemberRoleCategory('team_lead')
                                    setSelectedMemberUserId(null)
                                    setShowAddMemberDialog(true)
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Team Lead
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                                  onClick={() => {
                                    setSelectedGroupForMember(group._id)
                                    setAddMemberRoleCategory('team_member')
                                    setSelectedMemberUserId(null)
                                    setShowAddMemberDialog(true)
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Team Member
                                </Button>
                              </div>
                            </div>

                            {teamMembers.length === 0 ? (
                              <div className="text-center py-4 bg-gray-50 rounded border border-dashed border-gray-300">
                                <p className="text-xs text-muted-foreground">No team members yet</p>
                                <p className="text-xs text-muted-foreground mt-1">Click "Add Member" to add sub-admins to this team</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {teamMembers.map((member) => (
                                  <div key={member._id} className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-200">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <Avatar className="h-8 w-8">
                                        <AvatarFallback className="text-xs">
                                          {member.firstName?.[0]}{member.lastName?.[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{member.firstName} {member.lastName}</p>
                                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-purple-600 text-xs">Sub-Admin</Badge>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0"
                                        onClick={() => alert('Remove member functionality coming soon')}
                                      >
                                        <Trash className="h-3 w-3 text-red-600" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Management Component */}
          <Card>
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>Create new teams and configure permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <GroupManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Administration Management Section */}
      <Card>
        <CardHeader>
          <CardTitle>Administration Management</CardTitle>
          <CardDescription>
            Manage admin users, roles, and system access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2 hover:bg-blue-50 dark:hover:bg-blue-950 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer"
              onClick={handleOpenCreateAdminDialog}
            >
              <UserCog className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">Create Admin</div>
                <div className="text-xs text-muted-foreground">Add new administrator</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2 hover:bg-purple-50 dark:hover:bg-purple-950 hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer"
              onClick={() => {
                toast({
                  title: "Promote Users",
                  description: "Feature coming soon. Use Teams tab to assign permissions.",
                })
              }}
            >
              <Shield className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">Promote Users</div>
                <div className="text-xs text-muted-foreground">{eligibleUsers.length} eligible</div>
              </div>
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Quick Actions</h4>
                <p className="text-sm text-muted-foreground">Common administrative tasks</p>
              </div>
              <Button
                onClick={() => setShowAdminFunctionsDialog(true)}
              >
                View All Admin Functions
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security & Access Control</CardTitle>
          <CardDescription>System-wide security configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Key className="h-4 w-4" />
                Authentication Settings
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Two-factor Authentication</span>
                  <Badge variant="outline" className="text-green-600">
                    {securitySettings?.authentication?.twoFactorAuthentication?.status || 'Enabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Session Timeout</span>
                  <Badge variant="outline">
                    {securitySettings?.authentication?.sessionTimeout?.status || '8 hours'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Password Policy</span>
                  <Badge variant="outline" className="text-green-600">
                    {securitySettings?.authentication?.passwordPolicy?.status || 'Strong'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Login Attempts Limit</span>
                  <Badge variant="outline">
                    {securitySettings?.authentication?.loginAttempts?.status || '5 attempts'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Access Control
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>API Rate Limiting</span>
                  <Badge variant="outline" className="text-green-600">
                    {securitySettings?.accessControl?.apiRateLimiting?.status || 'Active'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>IP Allowlist</span>
                  <Badge variant="outline">
                    {securitySettings?.accessControl?.ipAllowlist?.status || 'Configured'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Audit Logging</span>
                  <Badge variant="outline" className="text-green-600">
                    {securitySettings?.accessControl?.auditLogging?.status || 'Enabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Data Encryption</span>
                  <Badge variant="outline" className="text-green-600">
                    {securitySettings?.accessControl?.dataEncryption?.status || 'AES-256'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowSecuritySettingsDialog(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Configure Security Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Administrator Dialog */}
      <Dialog open={showCreateAdminDialog} onOpenChange={setShowCreateAdminDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Administrator</DialogTitle>
            <DialogDescription>
              {adminDialogMode === 'promote'
                ? 'Promote a regular user to an administrator role'
                : 'Create a new administrator with all details'}
            </DialogDescription>
          </DialogHeader>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4 border-b">
            <button
              onClick={() => {
                setAdminDialogMode('promote')
                setSelectedEligibleUser(null)
                setNewAdminForm({ firstName: '', lastName: '', email: '', phone: '', position: '', password: '' })
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                adminDialogMode === 'promote'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Promote Existing User
            </button>
            <button
              onClick={() => {
                setAdminDialogMode('create')
                setSelectedEligibleUser(null)
                setNewAdminForm({ firstName: '', lastName: '', email: '', phone: '', position: '', password: '' })
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                adminDialogMode === 'create'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Create New Admin
            </button>
          </div>

          <div className="space-y-4 py-4">
            {/* PROMOTE MODE */}
            {adminDialogMode === 'promote' && (
              <>
                {/* Eligible Users Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select User to Promote</label>
                  <Select value={selectedEligibleUser || ""} onValueChange={setSelectedEligibleUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleUsers.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No eligible users available
                    </div>
                  ) : (
                    eligibleUsers.map((user) => (
                      <SelectItem key={user._id} value={user._id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {user.firstName?.[0]}
                              {user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Selected User Info */}
            {selectedEligibleUser && (
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="text-sm">
                    <div className="font-semibold mb-2">User Details:</div>
                    {eligibleUsers
                      .filter((u) => u._id === selectedEligibleUser)
                      .map((user) => (
                        <div key={user._id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Name:</span>
                            <span className="font-medium">
                              {user.firstName} {user.lastName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-medium">{user.email}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">KYC Status:</span>
                            <Badge variant="outline" className="text-xs">
                              {user.kycStatus}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
              </>
            )}

            {/* CREATE MODE */}
            {adminDialogMode === 'create' && (
              <>
                {/* Admin Details Form */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium">First Name</label>
                    <input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={newAdminForm.firstName}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium">Last Name</label>
                    <input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={newAdminForm.lastName}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={newAdminForm.email}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="+966501234567"
                      value={newAdminForm.phone}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="position" className="text-sm font-medium">Position/Title</label>
                    <input
                      id="position"
                      type="text"
                      placeholder="e.g. KYC Manager"
                      value={newAdminForm.position}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, position: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={newAdminForm.password}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-muted-foreground">Min 8 characters, mix of letters, numbers, and symbols</p>
                </div>
              </>
            )}

            {/* Shared: Role Category Selection */}
            <div className="space-y-2 pt-2 border-t">
              <label className="text-sm font-medium">Select User Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setRoleCategory('team_lead')
                    setSelectedTeamMemberRole(null)
                    setSelectedAdminRole('admin')
                  }}
                  className={`p-3 rounded-lg border-2 transition ${
                    roleCategory === 'team_lead'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">Team Lead</div>
                  <div className="text-xs text-muted-foreground">Manages a department</div>
                </button>
                <button
                  onClick={() => {
                    setRoleCategory('team_member')
                    setSelectedAdminRole(null)
                  }}
                  className={`p-3 rounded-lg border-2 transition ${
                    roleCategory === 'team_member'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">Team Member</div>
                  <div className="text-xs text-muted-foreground">Member with specific role</div>
                </button>
              </div>
            </div>

            {/* Team Lead: Department Selection */}
            {roleCategory === 'team_lead' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign to Department</label>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-3 space-y-2 bg-muted/30">
                  {groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No departments available</p>
                  ) : (
                    groups.map((group) => (
                      <div key={group._id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`dept-${group._id}`}
                          checked={selectedGroupsForUser.has(group._id)}
                          onChange={(e) => {
                            const newGroups = new Set(selectedGroupsForUser)
                            if (e.target.checked) {
                              newGroups.clear()
                              newGroups.add(group._id)
                            } else {
                              newGroups.delete(group._id)
                            }
                            setSelectedGroupsForUser(newGroups)
                          }}
                          className="rounded"
                        />
                        <label htmlFor={`dept-${group._id}`} className="text-sm cursor-pointer flex-1">
                          <div className="font-medium">{group.displayName}</div>
                          <div className="text-xs text-muted-foreground">{group.department || 'Department'}</div>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Team Member: Specific Role Selection */}
            {roleCategory === 'team_member' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Specific Role</label>
                <Select value={selectedTeamMemberRole || ""} onValueChange={setSelectedTeamMemberRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.length > 0 ? (
                      roles.filter(role =>
                        role.name !== 'super_admin' &&
                        role.name !== 'admin' &&
                        isValidRoleName(role.name)
                      ).map((role) => (
                        <SelectItem key={role._id} value={role.name}>
                          <div>
                            <div className="font-medium">{role.displayName}</div>
                            {role.description && (
                              <div className="text-xs text-muted-foreground">
                                {role.description}
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        Loading roles...
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Team Member: Add to Team (Department) */}
            {roleCategory === 'team_member' && (
              <div className="space-y-2 pt-2 border-t">
                <label className="text-sm font-medium">Assign to Team/Department</label>
                <p className="text-xs text-muted-foreground">Select which team this member should join</p>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-3 space-y-2 bg-muted/30">
                  {groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No teams available</p>
                  ) : (
                    groups.map((group) => (
                      <div key={group._id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`team-${group._id}`}
                          checked={selectedGroupsForUser.has(group._id)}
                          onChange={(e) => {
                            const newGroups = new Set(selectedGroupsForUser)
                            if (e.target.checked) {
                              newGroups.add(group._id)
                            } else {
                              newGroups.delete(group._id)
                            }
                            setSelectedGroupsForUser(newGroups)
                          }}
                          className="rounded"
                        />
                        <label htmlFor={`team-${group._id}`} className="text-sm cursor-pointer flex-1">
                          <div className="font-medium">{group.displayName}</div>
                          <div className="text-xs text-muted-foreground">{group.department || 'Team'}</div>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateAdminDialog(false)
                setSelectedEligibleUser(null)
                setSelectedAdminRole(null)
                setSelectedGroupsForUser(new Set())
                setGroupPermissionsForUser({})
                setNewAdminForm({ firstName: '', lastName: '', email: '', phone: '', position: '', password: '' })
              }}
              disabled={isPromoting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (adminDialogMode === 'promote') {
                  handlePromoteUser()
                } else {
                  handleCreateAdmin()
                }
              }}
              disabled={
                isPromoting ||
                !selectedAdminRole ||
                (adminDialogMode === 'promote' ? !selectedEligibleUser :
                  !newAdminForm.firstName || !newAdminForm.lastName || !newAdminForm.email || !newAdminForm.password)
              }
            >
              {isPromoting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {adminDialogMode === 'promote' ? 'Promoting...' : 'Creating...'}
                </>
              ) : (
                adminDialogMode === 'promote' ? 'Promote to Admin' : 'Create Admin User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member to Team Dialog */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {addMemberRoleCategory === 'team_lead' ? 'Add Team Lead' : 'Add Team Member'}
            </DialogTitle>
            <DialogDescription>
              {addMemberRoleCategory === 'team_lead'
                ? 'Select an admin user to add as a team lead for this group'
                : 'Select a sub-admin user to add as a team member for this group'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* User Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {addMemberRoleCategory === 'team_lead' ? 'Available Admins (Team Leads)' : 'Available Sub-Admins (Team Members)'}
              </label>
              <div className="max-h-80 overflow-y-auto border rounded-lg p-3 space-y-2 bg-muted/30">
                {(() => {
                  const filteredUsers =
                    addMemberRoleCategory === 'team_lead'
                      ? adminUsers.filter(u => u.role === 'admin')
                      : adminUsers.filter(u => u.role !== 'super_admin' && u.role !== 'admin')

                  if (filteredUsers.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No {addMemberRoleCategory === 'team_lead' ? 'admin' : 'sub-admin'} users available
                      </p>
                    )
                  }

                  return filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      className={`p-3 rounded border transition cursor-pointer ${
                        selectedMemberUserId === user._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedMemberUserId(user._id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center">
                          {selectedMemberUserId === user._id && (
                            <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
                          )}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <Badge
                          className={user.role === 'admin' ? 'bg-green-600' : 'bg-purple-600'}
                          variant="default"
                        >
                          {user.role === 'admin' ? 'Admin' : 'Sub-Admin'}
                        </Badge>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddMemberDialog(false)
                setSelectedGroupForMember(null)
                setSelectedMemberUserId(null)
                setAddMemberRoleCategory(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedMemberUserId && selectedGroupForMember && addMemberRoleCategory) {
                  handleAddMemberToGroup(selectedMemberUserId, selectedGroupForMember, addMemberRoleCategory)
                }
              }}
              disabled={!selectedMemberUserId || !selectedGroupForMember || !addMemberRoleCategory}
              className={addMemberRoleCategory === 'team_lead' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}
            >
              {addMemberRoleCategory === 'team_lead' ? 'Add Team Lead' : 'Add Team Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Admin Functions Dialog */}
      <Dialog open={showAdminFunctionsDialog} onOpenChange={setShowAdminFunctionsDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Admin Functions</DialogTitle>
            <DialogDescription>
              Comprehensive guide to all available administrative functions and tasks
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* User Management Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">User Management</h3>
              </div>
              <div className="space-y-2 pl-7">
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <h4 className="font-medium text-sm mb-1">Create Admin Users</h4>
                  <p className="text-xs text-muted-foreground">
                    Create new administrator accounts from scratch or promote existing regular users to admin roles. Assign specific roles and group memberships.
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <h4 className="font-medium text-sm mb-1">Manage Admin Users</h4>
                  <p className="text-xs text-muted-foreground">
                    View all administrative users, update their details, change roles, deactivate or reactivate accounts as needed.
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <h4 className="font-medium text-sm mb-1">View Regular Users</h4>
                  <p className="text-xs text-muted-foreground">
                    Monitor all regular platform users, check their KYC status, and manage their account settings.
                  </p>
                </div>
              </div>
            </div>

            {/* Role Management Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-lg">Role Management</h3>
              </div>
              <div className="space-y-2 pl-7">
                <div className="p-3 bg-purple-50 rounded border border-purple-200">
                  <h4 className="font-medium text-sm mb-1">Create Roles</h4>
                  <p className="text-xs text-muted-foreground">
                    Define new administrative roles with custom permission sets. Specify which resources each role can access and what actions they can perform.
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded border border-purple-200">
                  <h4 className="font-medium text-sm mb-1">Update Roles</h4>
                  <p className="text-xs text-muted-foreground">
                    Modify existing role definitions, update permissions, and change role descriptions and display names.
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded border border-purple-200">
                  <h4 className="font-medium text-sm mb-1">Assign Roles to Users</h4>
                  <p className="text-xs text-muted-foreground">
                    Assign predefined roles to users. Users inherit all permissions associated with their assigned role.
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded border border-purple-200">
                  <h4 className="font-medium text-sm mb-1">View Role Permissions</h4>
                  <p className="text-xs text-muted-foreground">
                    See detailed permission matrices for each role. View which users are assigned to each role.
                  </p>
                </div>
              </div>
            </div>

            {/* Group Management Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-lg">Group Management</h3>
              </div>
              <div className="space-y-2 pl-7">
                <div className="p-3 bg-green-50 rounded border border-green-200">
                  <h4 className="font-medium text-sm mb-1">Create Groups</h4>
                  <p className="text-xs text-muted-foreground">
                    Organize users into teams or departments. Create groups with specific purposes (e.g., KYC Team, Property Managers, Finance Team).
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded border border-green-200">
                  <h4 className="font-medium text-sm mb-1">Manage Group Members</h4>
                  <p className="text-xs text-muted-foreground">
                    Add or remove members from groups. Assign individual permission levels to each group member independently.
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded border border-green-200">
                  <h4 className="font-medium text-sm mb-1">Member Permissions</h4>
                  <p className="text-xs text-muted-foreground">
                    Grant granular permissions per member within a group. Assign different permission levels to different members of the same team.
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded border border-green-200">
                  <h4 className="font-medium text-sm mb-1">Group Permissions</h4>
                  <p className="text-xs text-muted-foreground">
                    Set group-level permissions that apply to all members. Define what resources the group can access and what actions they can perform.
                  </p>
                </div>
              </div>
            </div>

            {/* Dashboard & Analytics Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-lg">Dashboard & Analytics</h3>
              </div>
              <div className="space-y-2 pl-7">
                <div className="p-3 bg-orange-50 rounded border border-orange-200">
                  <h4 className="font-medium text-sm mb-1">View Dashboard</h4>
                  <p className="text-xs text-muted-foreground">
                    Monitor overall platform statistics including user counts, transaction volumes, and system health metrics.
                  </p>
                </div>
                <div className="p-3 bg-orange-50 rounded border border-orange-200">
                  <h4 className="font-medium text-sm mb-1">Transaction Reports</h4>
                  <p className="text-xs text-muted-foreground">
                    View detailed transaction history, investment records, and withdrawal requests. Filter by date range and status.
                  </p>
                </div>
                <div className="p-3 bg-orange-50 rounded border border-orange-200">
                  <h4 className="font-medium text-sm mb-1">Earnings Reports</h4>
                  <p className="text-xs text-muted-foreground">
                    Generate earnings reports for properties and investors. Export to CSV or JSON format for further analysis.
                  </p>
                </div>
              </div>
            </div>

            {/* Security & Settings Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-lg">Security & Settings</h3>
              </div>
              <div className="space-y-2 pl-7">
                <div className="p-3 bg-red-50 rounded border border-red-200">
                  <h4 className="font-medium text-sm mb-1">Two-Factor Authentication</h4>
                  <p className="text-xs text-muted-foreground">
                    All admin accounts require 2FA for enhanced security. Manage OTP settings and recovery codes.
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded border border-red-200">
                  <h4 className="font-medium text-sm mb-1">Audit Logging</h4>
                  <p className="text-xs text-muted-foreground">
                    Track all administrative actions and changes. Maintain comprehensive audit trails for compliance.
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded border border-red-200">
                  <h4 className="font-medium text-sm mb-1">API Configuration</h4>
                  <p className="text-xs text-muted-foreground">
                    Manage API keys, rate limiting, and IP whitelisting for secure API access and integration.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAdminFunctionsDialog(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowAdminFunctionsDialog(false)
                setActiveTab('overview')
              }}
            >
              Go to Overview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Settings Configuration Dialog */}
      <Dialog open={showSecuritySettingsDialog} onOpenChange={setShowSecuritySettingsDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Security Settings</DialogTitle>
            <DialogDescription>
              Manage system-wide security policies and configurations
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Authentication Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">Authentication Settings</h3>
              </div>
              <div className="space-y-3 pl-7">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    <span>Two-Factor Authentication</span>
                    <Badge className="text-green-600 bg-green-50" variant="outline">
                      {securitySettings?.authentication?.twoFactorAuthentication?.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </label>
                  <p className="text-xs text-muted-foreground">All admin accounts require 2FA for security</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    <span>Session Timeout</span>
                    <Input
                      type="number"
                      value={updatedSecuritySettings?.sessionTimeout !== undefined ? updatedSecuritySettings.sessionTimeout : (securitySettings?.authentication?.sessionTimeout?.hours ?? 8)}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : 8
                        setUpdatedSecuritySettings(prev => ({ ...prev, sessionTimeout: isNaN(val) ? 8 : val }))
                      }}
                      className="w-20 h-8"
                      min="1"
                      max="24"
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">Hours before session expires</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    <span>Minimum Password Length</span>
                    <Input
                      type="number"
                      value={updatedSecuritySettings?.passwordMinLength !== undefined ? updatedSecuritySettings.passwordMinLength : (securitySettings?.authentication?.passwordPolicy?.minLength ?? 8)}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : 8
                        setUpdatedSecuritySettings(prev => ({ ...prev, passwordMinLength: isNaN(val) ? 8 : val }))
                      }}
                      className="w-20 h-8"
                      min="6"
                      max="20"
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">Minimum characters required for passwords</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    <span>Login Attempts Limit</span>
                    <Input
                      type="number"
                      value={updatedSecuritySettings?.loginAttemptsLimit !== undefined ? updatedSecuritySettings.loginAttemptsLimit : (securitySettings?.authentication?.loginAttempts?.maxAttempts ?? 5)}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : 5
                        setUpdatedSecuritySettings(prev => ({ ...prev, loginAttemptsLimit: isNaN(val) ? 5 : val }))
                      }}
                      className="w-20 h-8"
                      min="3"
                      max="10"
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">Failed attempts before account lockout</p>
                </div>
              </div>
            </div>

            {/* Access Control Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-lg">Access Control</h3>
              </div>
              <div className="space-y-3 pl-7">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    <span>API Rate Limiting</span>
                    <Input
                      type="number"
                      value={updatedSecuritySettings?.apiRateLimit !== undefined ? updatedSecuritySettings.apiRateLimit : (securitySettings?.accessControl?.apiRateLimiting?.requestsPerMinute ?? 100)}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : 100
                        setUpdatedSecuritySettings(prev => ({ ...prev, apiRateLimit: isNaN(val) ? 100 : val }))
                      }}
                      className="w-24 h-8"
                      min="10"
                      max="1000"
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">Requests per minute per API key</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    IP Allowlist
                    <Badge className="ml-2" variant="outline">Configured</Badge>
                  </label>
                  <Input
                    placeholder="Enter IP addresses (comma-separated)"
                    className="text-xs"
                    value={updatedSecuritySettings?.ipAllowlist ?? securitySettings?.accessControl?.ipAllowlist?.ips?.join(', ') ?? ''}
                    onChange={(e) => setUpdatedSecuritySettings(prev => ({ ...prev, ipAllowlist: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Leave empty to allow all IPs</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    <span>Audit Logging</span>
                    <Badge className="text-green-600 bg-green-50" variant="outline">
                      {securitySettings?.accessControl?.auditLogging?.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </label>
                  <p className="text-xs text-muted-foreground">Log all administrative actions for compliance</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    <span>Data Encryption</span>
                    <Badge variant="outline" className="text-green-600">
                      {securitySettings?.accessControl?.dataEncryption?.algorithm || 'AES-256'}
                    </Badge>
                  </label>
                  <p className="text-xs text-muted-foreground">All sensitive data is encrypted in transit and at rest</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSecuritySettingsDialog(false)
                setUpdatedSecuritySettings(null)
              }}
              disabled={savingSecuritySettings}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSecuritySettings}
              disabled={savingSecuritySettings}
            >
              {savingSecuritySettings ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}