import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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

// API Configuration
const API_BASE_URL = 'https://zeron-backend-z5o1.onrender.com'

// Valid role names that backend accepts for admin creation
const VALID_ROLE_NAMES = [
  'admin',
  'super_admin',
  'kyc_officer',
  'property_manager',
  'financial_analyst',
  'compliance_officer',
  'team_lead',
  'team_member'
]

// Role hierarchy and available transitions
const getAvailableRolesForChange = (currentRole: string): string[] => {
  // Only allow Team Lead and Team Member roles
  return ['team_lead', 'team_member']
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
    cache: 'no-store', // Prevent browser caching
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
    // First try to get user data from localStorage (includes role)
    const userDataStr = localStorage.getItem('userData')
    if (userDataStr) {
      const userData = JSON.parse(userDataStr)
      if (userData && userData.role) {
        return userData
      }
    }

    // Fallback to decoding token if userData not available
    const token = localStorage.getItem('zaron_token') || localStorage.getItem('authToken')
    if (!token) return null

    const parts = token.split('.')
    if (parts.length !== 3) return null

    const decoded = JSON.parse(atob(parts[1]))
    return decoded
  } catch (err) {
    console.error('Error getting current user:', err)
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
  members?: Array<{
    _id: string
    userId?: any
  }>
  parentGroupId?: string
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
  const [roleCategory, setRoleCategory] = useState<'admin' | 'team_lead' | 'team_member' | null>(null)
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

  // Change Role states
  const [showChangeRoleDialog, setShowChangeRoleDialog] = useState(false)
  const [selectedAdminForRoleChange, setSelectedAdminForRoleChange] = useState<AdminUser | null>(null)
  const [newRoleForAdmin, setNewRoleForAdmin] = useState<string>('')

  // OTP Verification states
  const [showOTPDialog, setShowOTPDialog] = useState(false)
  const [otpValue, setOtpValue] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [pendingRoleChange, setPendingRoleChange] = useState<{ adminId: string; newRole: string } | null>(null)
  const [pendingAdminCreation, setPendingAdminCreation] = useState<any | null>(null)
  const [otpContext, setOtpContext] = useState<'role_change' | 'admin_creation'>('role_change')

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
      try {
        const adminResponse = await apiCall('/api/admin/admin-users')
        console.log('Admin users response:', adminResponse)

        if (adminResponse.success && adminResponse.data) {
          setAdminUsers(adminResponse.data.admins || [])
        }
      } catch (adminErr) {
        console.warn('Could not fetch admin users:', adminErr)
        setAdminUsers([])
      }

      // Fetch regular users
      let usersResponse: any = null
      try {
        usersResponse = await apiCall('/api/admin/all-users')
        console.log('Regular users response:', usersResponse)

        if (usersResponse.success && usersResponse.data) {
          setRegularUsers(usersResponse.data.users || [])
        }
      } catch (usersErr) {
        console.warn('Could not fetch regular users:', usersErr)
        setRegularUsers([])
      }

      // Fetch eligible users for promotion
      try {
        const eligibleResponse = await apiCall('/api/admin/eligible-users')
        console.log('Eligible users response:', eligibleResponse)

        if (eligibleResponse.success && eligibleResponse.data && eligibleResponse.data.users && eligibleResponse.data.users.length > 0) {
          setEligibleUsers(eligibleResponse.data.users || [])
        } else {
          // Fallback: use regular users as eligible for promotion
          console.warn('No eligible users from endpoint, using regular users as fallback')
          if (usersResponse && usersResponse.success && usersResponse.data) {
            setEligibleUsers(usersResponse.data.users || [])
          }
        }
      } catch (eligibleErr) {
        // Fallback: use regular users as eligible for promotion
        console.warn('Could not fetch eligible users, using regular users as fallback:', eligibleErr)
        if (usersResponse && usersResponse.success && usersResponse.data) {
          setEligibleUsers(usersResponse.data.users || [])
        }
      }

      // Fetch dashboard stats
      try {
        const dashboardResponse = await apiCall('/api/admin/dashboard')
        console.log('Dashboard response:', dashboardResponse)

        if (dashboardResponse.success && dashboardResponse.data) {
          setDashboardStats(dashboardResponse.data.overview)
        }
      } catch (dashboardErr) {
        console.warn('Could not fetch dashboard stats:', dashboardErr)
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

    if (roleCategory === 'admin') {
      finalRole = selectedAdminRole
      if (!finalRole) {
        toast({
          title: "Error",
          description: "Please select a specific admin role",
          variant: "destructive"
        })
        return
      }
    } else if (roleCategory === 'team_lead') {
      finalRole = selectedAdminRole
    } else if (roleCategory === 'team_member') {
      finalRole = 'team_member'
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

    const groupIds = Array.from(selectedGroupsForUser)
    const adminData = {
      firstName: newAdminForm.firstName,
      lastName: newAdminForm.lastName,
      email: newAdminForm.email,
      phone: newAdminForm.phone || undefined,
      position: newAdminForm.position || undefined,
      password: newAdminForm.password,
      role: finalRole,
      groupIds: groupIds.length > 0 ? groupIds : undefined
    }

    // Check if OTP is required based on current user role
    const currentUserRole = currentUser?.role
    const requiresOTP = currentUserRole !== 'super_admin'

    if (requiresOTP) {
      // Store pending admin creation data and request OTP
      try {
        setIsPromoting(true)

        // Request OTP from backend
        const otpResponse = await apiCall('/api/admin/admin-users/request-otp', {
          method: 'POST',
          body: JSON.stringify({
            action: 'create_admin',
            adminData
          })
        })

        if (otpResponse.success) {
          setPendingAdminCreation(adminData)
          setOtpContext('admin_creation')
          setShowOTPDialog(true)
          setShowCreateAdminDialog(false)
          toast({
            title: "OTP Required",
            description: "An OTP has been sent to the Super Admin's email. Please enter it to continue.",
          })
        }
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to request OTP",
          variant: "destructive"
        })
      } finally {
        setIsPromoting(false)
      }
      return
    }

    // Super admin doesn't need OTP - create directly
    try {
      setIsPromoting(true)

      const response = await apiCall('/api/admin/admin-users', {
        method: 'POST',
        body: JSON.stringify(adminData)
      })

      if (response.success) {
        const roleLabel = roleCategory === 'team_lead' ? 'Team Lead' : roleCategory === 'team_member' ? 'Team Member' : 'Admin'
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

  const handleOpenAddTeamLeadDialog = async () => {
    try {
      // Refresh admin users to ensure we have the latest data
      const adminResponse = await apiCall('/api/admin/admin-users')
      if (adminResponse.success && adminResponse.data) {
        setAdminUsers(adminResponse.data.admins || [])
      }
    } catch (err) {
      console.warn('Could not refresh admin users:', err)
    }
    setAddMemberRoleCategory('team_lead')
    setSelectedMemberUserId(null)
    setShowAddMemberDialog(true)
  }

  const handleOpenAddTeamMemberDialog = async () => {
    try {
      // Refresh admin users to ensure we have the latest data
      const adminResponse = await apiCall('/api/admin/admin-users')
      if (adminResponse.success && adminResponse.data) {
        setAdminUsers(adminResponse.data.admins || [])
      }
    } catch (err) {
      console.warn('Could not refresh admin users:', err)
    }
    setAddMemberRoleCategory('team_member')
    setSelectedMemberUserId(null)
    setShowAddMemberDialog(true)
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

  // Handle deleting an admin user (Super Admin only)
  const handleDeleteAdminUser = async (adminId: string, adminName: string) => {
    try {
      const currentUserRole = getCurrentUser()?.role
      if (currentUserRole !== 'super_admin') {
        toast({
          title: "Error",
          description: "Only Super Admins can remove admin users",
          variant: "destructive"
        })
        return
      }

      console.log('Deleting admin user:', adminId)
      const response = await apiCall(`/api/admin/admin-users/${adminId}`, {
        method: 'DELETE'
      })

      console.log('Delete response:', response)

      // Remove user from state immediately for better UX
      setAdminUsers(adminUsers.filter(u => u._id !== adminId))

      if (response.success || response.status === 200 || response.data) {
        toast({
          title: "Success",
          description: `${adminName} has been removed from admin users`
        })
      } else {
        toast({
          title: "Success",
          description: `${adminName} has been removed from admin users`
        })
      }

      // Refresh admin users list in the background
      await fetchAllData()
    } catch (err: any) {
      console.error('Delete error:', err)
      toast({
        title: "Error",
        description: err.message || "Failed to remove admin user",
        variant: "destructive"
      })
    }
  }

  const handleVerifyOTP = async () => {
    if (!otpValue) {
      toast({
        title: "Error",
        description: "Please enter OTP code",
        variant: "destructive"
      })
      return
    }

    try {
      setOtpLoading(true)

      if (otpContext === 'role_change') {
        // Handle role change OTP verification
        if (!pendingRoleChange) {
          toast({
            title: "Error",
            description: "No pending role change found",
            variant: "destructive"
          })
          return
        }

        // Check if current user is super admin (use different endpoint)
        const currentUserRole = currentUser?.role
        const isSuperAdmin = currentUserRole === 'super_admin'

        const verificationResponse = isSuperAdmin
          ? await apiCall(`/api/admin/admin-users/${pendingRoleChange.adminId}/role`, {
              method: 'PUT',
              body: JSON.stringify({ role: pendingRoleChange.newRole, otp: otpValue })
            })
          : await apiCall('/api/admin/admin-users/verify-role-change-otp', {
              method: 'POST',
              body: JSON.stringify({
                adminId: pendingRoleChange.adminId,
                newRole: pendingRoleChange.newRole,
                otp: otpValue
              })
            })

        if (verificationResponse.success) {
          toast({
            title: "Success",
            description: `Admin role has been changed to ${getRoleDisplayName(pendingRoleChange.newRole)}`
          })
          setShowOTPDialog(false)
          setOtpValue('')
          setPendingRoleChange(null)
          setShowChangeRoleDialog(false)
          setSelectedAdminForRoleChange(null)
          setNewRoleForAdmin('')
          fetchAllData()
        } else {
          toast({
            title: "Error",
            description: verificationResponse.message || "Failed to verify OTP",
            variant: "destructive"
          })
        }
      } else if (otpContext === 'admin_creation') {
        // Handle admin creation OTP verification
        if (!pendingAdminCreation) {
          toast({
            title: "Error",
            description: "No pending admin creation found",
            variant: "destructive"
          })
          return
        }

        // Check if current user is super admin
        const currentUserRole = currentUser?.role
        const isSuperAdmin = currentUserRole === 'super_admin'

        const verificationResponse = await apiCall('/api/admin/admin-users/verify-otp', {
          method: 'POST',
          body: JSON.stringify({
            adminData: pendingAdminCreation,
            otp: otpValue,
            createPending: !isSuperAdmin // Create pending registration if not super admin
          })
        })

        if (verificationResponse.success) {
          const roleLabel = pendingAdminCreation.role === 'team_lead' ? 'Team Lead' :
                           pendingAdminCreation.role === 'team_member' ? 'Team Member' : 'Admin'

          // Different messages based on whether it's a pending registration or direct creation
          if (isSuperAdmin) {
            toast({
              title: "Success",
              description: `${roleLabel} ${pendingAdminCreation.firstName} ${pendingAdminCreation.lastName} created successfully`
            })
          } else {
            toast({
              title: "Pending Approval",
              description: `${roleLabel} registration for ${pendingAdminCreation.firstName} ${pendingAdminCreation.lastName} has been submitted and is awaiting Super Admin approval.`,
              className: "bg-blue-50 border-blue-200"
            })
          }

          setShowOTPDialog(false)
          setOtpValue('')
          setPendingAdminCreation(null)
          setNewAdminForm({ firstName: '', lastName: '', email: '', phone: '', position: '', password: '' })
          setRoleCategory(null)
          setSelectedAdminRole(null)
          setSelectedTeamMemberRole(null)
          setSelectedGroupsForUser(new Set())
          setGroupPermissionsForUser({})
          fetchAllData()
        } else {
          toast({
            title: "Error",
            description: verificationResponse.message || "Failed to verify OTP",
            variant: "destructive"
          })
        }
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to verify OTP",
        variant: "destructive"
      })
    } finally {
      setOtpLoading(false)
    }
  }

  // Keep for backward compatibility
  const handleVerifyOTPForRoleChange = handleVerifyOTP

  const handleChangeRole = async (adminId: string, newRole: string) => {
    try {
      const currentUserRole = getCurrentUser()?.role

      if (!newRole) {
        toast({
          title: "Error",
          description: "Please select a new role",
          variant: "destructive"
        })
        return
      }

      // Check if OTP is required based on current user role
      const requiresOTP = currentUserRole !== 'super_admin'

      if (requiresOTP) {
        // Admin or Team Lead changing a role - request OTP
        try {
          const otpResponse = await apiCall('/api/admin/admin-users/request-role-change-otp', {
            method: 'POST',
            body: JSON.stringify({
              adminId,
              newRole
            })
          })

          if (otpResponse.success) {
            setPendingRoleChange({ adminId, newRole })
            setOtpContext('role_change')
            setShowOTPDialog(true)
            setShowChangeRoleDialog(false)
            toast({
              title: "OTP Required",
              description: "An OTP has been sent to the Super Admin's email. Please enter it to continue.",
            })
          }
        } catch (err: any) {
          toast({
            title: "Error",
            description: err.message || "Failed to request OTP for role change",
            variant: "destructive"
          })
        }
        return
      }

      // Super admin doesn't need OTP - change role directly
      // Step 1: Send role change request without OTP (triggers OTP email if backend requires it)
      const initialResponse = await apiCall(`/api/admin/admin-users/${adminId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      })

      // Step 2: If OTP is required by backend, show OTP input dialog
      if (initialResponse.data?.step === 'otp_required') {
        // Store the pending role change and show OTP dialog
        setPendingRoleChange({ adminId, newRole })
        setOtpContext('role_change')
        setShowOTPDialog(true)
      } else if (initialResponse.success) {
        toast({
          title: "Success",
          description: `Admin role has been changed to ${getRoleDisplayName(newRole)}`
        })
        setShowChangeRoleDialog(false)
        setSelectedAdminForRoleChange(null)
        setNewRoleForAdmin('')
        fetchAllData()
      } else {
        toast({
          title: "Error",
          description: initialResponse.message || "Failed to change admin role",
          variant: "destructive"
        })
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to change admin role",
        variant: "destructive"
      })
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
                {/* Role Levels - 4 Tier Hierarchy */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Super Admin */}
                  <Card className="border-2 border-red-300 bg-red-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Shield className="h-4 w-4 text-red-600" />
                        Super Admin
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                      <p className="text-muted-foreground font-medium">Global Access</p>
                      <div className="bg-white rounded p-2 space-y-0.5 text-xs">
                        <p>✓ Create Admins</p>
                        <p>✓ Manage system</p>
                        <p>✓ View all reports</p>
                        <p>✓ Full control</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Admin */}
                  <Card className="border-2 border-blue-300 bg-blue-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-blue-600" />
                        Admin
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                      <p className="text-muted-foreground font-medium">Department Head</p>
                      <div className="bg-white rounded p-2 space-y-0.5 text-xs">
                        <p>✓ Create Team Leads</p>
                        <p>✓ Manage groups</p>
                        <p>✓ Approve groups</p>
                        <p>✓ View team reports</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Team Lead */}
                  <Card className="border-2 border-green-300 bg-green-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-600" />
                        Team Lead
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                      <p className="text-muted-foreground font-medium">Group Manager</p>
                      <div className="bg-white rounded p-2 space-y-0.5 text-xs">
                        <p>✓ Create sub-groups</p>
                        <p>✓ Assign members</p>
                        <p>✓ Manage access</p>
                        <p>✓ View group data</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Team Member */}
                  <Card className="border-2 border-purple-300 bg-purple-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-600" />
                        Team Member
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                      <p className="text-muted-foreground font-medium">Group Worker</p>
                      <div className="bg-white rounded p-2 space-y-0.5 text-xs">
                        <p>✓ View assigned tasks</p>
                        <p>✓ Execute work</p>
                        <p>✓ Submit reports</p>
                        <p>✓ Group limited</p>
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

          {/* Admin Statistics - 4 Tier Hierarchy */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-900 flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Super Admins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">1</div>
                <p className="text-xs text-red-600 mt-1">Global Access</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-1">
                  <UserCog className="h-4 w-4" />
                  Admins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{adminUsers.filter(u => u.role === 'admin' || u.assignedRole?.name === 'admin').length}</div>
                <p className="text-xs text-blue-600 mt-1">Dept Heads</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Team Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{adminUsers.filter(u => u.role !== 'super_admin' && u.role !== 'admin').length}</div>
                <p className="text-xs text-green-600 mt-1">Group Managers</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-900 flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Total Groups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{groups.length}</div>
                <p className="text-xs text-purple-600 mt-1">With Sub-Groups</p>
              </CardContent>
            </Card>
          </div>

          {/* Current Admins List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Manage Admin Users</CardTitle>
                <CardDescription>All administrators and team leads in the system</CardDescription>
              </div>
              {getCurrentUser()?.role === 'super_admin' && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleOpenCreateAdminDialog}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Admin
                  </Button>
                  <Button
                    onClick={handleOpenAddTeamLeadDialog}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Team Lead
                  </Button>
                  <Button
                    onClick={handleOpenAddTeamMemberDialog}
                    className="bg-orange-600 hover:bg-orange-700"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Team Member
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {adminUsers.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-lg">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground font-medium">No admin users found</p>
                  <p className="text-sm text-muted-foreground mt-1">Create one using the button above to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Group by role */}
                  {[
                    { role: 'super_admin', label: 'Super Admins', color: 'red', icon: '👑' },
                    { role: 'admin', label: 'Admins', color: 'blue', icon: '🔐' },
                    { role: 'team_lead', label: 'Team Leads', color: 'green', icon: '👥' },
                    { role: 'team_member', label: 'Team Members', color: 'purple', icon: '👤' }
                  ].map((roleGroup) => {
                    const usersInRole = adminUsers.filter(u => u.role === roleGroup.role)
                    if (usersInRole.length === 0) return null

                    return (
                      <div key={roleGroup.role} className="space-y-2">
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                          <span className="text-lg">{roleGroup.icon}</span>
                          <h4 className="font-semibold text-sm flex-1">{roleGroup.label} ({usersInRole.length})</h4>
                          <Badge variant="outline" className={`bg-${roleGroup.color}-100 text-${roleGroup.color}-700`}>
                            {usersInRole.length}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-2">
                          {usersInRole.map((admin) => (
                            <div
                              key={admin._id}
                              className={`p-3 rounded-lg border-2 border-${roleGroup.color}-200 bg-${roleGroup.color}-50 hover:shadow-md transition-all`}
                            >
                              <div className="flex items-start gap-3 mb-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs font-bold">
                                    {admin.firstName?.[0]}{admin.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm truncate">{admin.firstName} {admin.lastName}</p>
                                  <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                                </div>
                              </div>

                              <div className="space-y-1 text-xs border-t pt-2">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Created:</span>
                                  <span className="font-medium">{new Date(admin.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Status:</span>
                                  <Badge
                                    variant="outline"
                                    className={
                                      admin.status === 'active'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }
                                  >
                                    {admin.status || 'Active'}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex gap-1 mt-3 pt-2 border-t">
                                {getCurrentUser()?.role === 'super_admin' ? (
                                  <>
                                    {admin.role !== 'super_admin' && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="flex-1 h-7 text-xs"
                                          onClick={() => {
                                            setSelectedAdminForRoleChange(admin)
                                            setNewRoleForAdmin(admin.role)
                                            setShowChangeRoleDialog(true)
                                          }}
                                        >
                                          Change Role
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 px-2 text-red-600 hover:bg-red-100"
                                          onClick={() => {
                                            if (confirm(`Remove ${admin.firstName} ${admin.lastName} from admin users?`)) {
                                              handleDeleteAdminUser(admin._id, `${admin.firstName} ${admin.lastName}`)
                                            }
                                          }}
                                        >
                                          <Trash className="h-3 w-3" />
                                        </Button>
                                      </>
                                    )}
                                    {admin.role === 'super_admin' && (
                                      <span className="text-xs text-muted-foreground px-2 py-1">
                                        Cannot modify Super Admin
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground px-2 py-1">
                                    View only
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
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
                  {/* Only show parent groups (not subgroups) */}
                  {groups.filter((g) => !g.parentGroupId).map((group) => {
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

                    // Get subgroups for this parent group
                    const subgroups = groups.filter((sg) => sg.parentGroupId === group._id)

                    return (
                      <div key={group._id} className="space-y-2">
                        {/* Parent Group Card */}
                        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                        <div className="p-4">
                          {/* Team Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold">{group.displayName}</h3>
                              <p className="text-sm text-muted-foreground">{group.description || 'No description'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const adminCount = adminUsers.filter(u => u.role === 'admin' && groupMemberIds.includes(u._id?.toString() || u._id)).length;
                                const teamLeadCount = teamMembers.filter((m: any) => m.role === 'team_lead').length;
                                const teamMemberCount = teamMembers.filter((m: any) => m.role === 'team_member').length;
                                const totalCount = adminCount + teamLeadCount + teamMemberCount;

                                return (
                                  <div className="flex gap-1 flex-wrap">
                                    {adminCount > 0 && <Badge className="bg-green-600 text-xs">{adminCount} Admin{adminCount > 1 ? 's' : ''}</Badge>}
                                    {teamLeadCount > 0 && <Badge className="bg-blue-600 text-xs">{teamLeadCount} Team Lead{teamLeadCount > 1 ? 's' : ''}</Badge>}
                                    {teamMemberCount > 0 && <Badge className="bg-purple-600 text-xs">{teamMemberCount} Member{teamMemberCount > 1 ? 's' : ''}</Badge>}
                                    {totalCount === 0 && <Badge variant="outline" className="text-xs">0 members</Badge>}
                                  </div>
                                );
                              })()}
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

                      {/* Subgroups - Nested with indentation */}
                      {subgroups.length > 0 && (
                        <div className="ml-8 space-y-2">
                          {subgroups.map((subgroup) => {
                            const subgroupMemberIds = subgroup.members?.map((m: any) => {
                              if (m.userId && typeof m.userId === 'object' && m.userId._id) {
                                return m.userId._id.toString()
                              }
                              return typeof m === 'string' ? m : (m._id || m.userId)
                            }) || []

                            const subgroupTeamLead = adminUsers.find(u => u.role === 'admin' && subgroupMemberIds.includes(u._id?.toString() || u._id))
                            const subgroupTeamMembers = adminUsers.filter(u => u.role !== 'super_admin' && u.role !== 'admin' && subgroupMemberIds.includes(u._id?.toString() || u._id))

                            return (
                              <Card key={subgroup._id} className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow bg-purple-50/50 dark:bg-purple-950/20">
                                <div className="p-4">
                                  {/* Subgroup Header */}
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-purple-500 font-bold">└─</span>
                                        <h3 className="text-lg font-semibold">{subgroup.displayName}</h3>
                                        <Badge variant="secondary" className="text-xs">Sub-group</Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground ml-5">{subgroup.description || 'No description'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {(() => {
                                        const adminCount = adminUsers.filter(u => u.role === 'admin' && subgroupMemberIds.includes(u._id?.toString() || u._id)).length;
                                        const teamLeadCount = subgroupTeamMembers.filter((m: any) => m.role === 'team_lead').length;
                                        const teamMemberCount = subgroupTeamMembers.filter((m: any) => m.role === 'team_member').length;
                                        const totalCount = adminCount + teamLeadCount + teamMemberCount;

                                        return (
                                          <div className="flex gap-1 flex-wrap">
                                            {adminCount > 0 && <Badge className="bg-green-600 text-xs">{adminCount} Admin{adminCount > 1 ? 's' : ''}</Badge>}
                                            {teamLeadCount > 0 && <Badge className="bg-blue-600 text-xs">{teamLeadCount} Team Lead{teamLeadCount > 1 ? 's' : ''}</Badge>}
                                            {teamMemberCount > 0 && <Badge className="bg-purple-600 text-xs">{teamMemberCount} Member{teamMemberCount > 1 ? 's' : ''}</Badge>}
                                            {totalCount === 0 && <Badge variant="outline" className="text-xs">0 members</Badge>}
                                          </div>
                                        );
                                      })()}
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="h-8 text-xs"
                                        onClick={() => handleDeleteGroup(subgroup._id)}
                                      >
                                        <Trash className="h-3 w-3 mr-1" />
                                        Delete
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Subgroup Team Lead Section */}
                                  {subgroupTeamLead && (
                                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg ml-5">
                                      <p className="text-xs font-semibold text-green-900 mb-2">👨‍💼 Team Lead</p>
                                      <div className="flex items-center gap-3">
                                        <Avatar>
                                          <AvatarFallback>
                                            {subgroupTeamLead.firstName?.[0]}{subgroupTeamLead.lastName?.[0]}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-semibold text-sm">{subgroupTeamLead.firstName} {subgroupTeamLead.lastName}</p>
                                          <p className="text-xs text-muted-foreground">{subgroupTeamLead.email}</p>
                                        </div>
                                        <Badge className="bg-green-600 text-xs">Admin</Badge>
                                      </div>
                                    </div>
                                  )}

                                  {/* Subgroup Team Members Section */}
                                  <div className="ml-5">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-sm font-semibold flex items-center gap-2">
                                        👥 Team Members ({subgroupTeamMembers.length})
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                          onClick={() => {
                                            setSelectedGroupForMember(subgroup._id)
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
                                            setSelectedGroupForMember(subgroup._id)
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

                                    {subgroupTeamMembers.length === 0 ? (
                                      <div className="text-center py-4 bg-gray-50 rounded border border-dashed border-gray-300">
                                        <p className="text-xs text-muted-foreground">No team members yet</p>
                                        <p className="text-xs text-muted-foreground mt-1">Click "Add Member" to add sub-admins to this sub-group</p>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {subgroupTeamMembers.map((member) => (
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
                    </div>
                    )
                  })}
                </div>
              )}
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
                  <div className="text-sm space-y-3">
                    <div>
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

                    {/* Promotion Role Selection */}
                    <div className="pt-3 border-t">
                      <label className="text-sm font-medium mb-2 block">Promote To Role</label>
                      <Select value={selectedAdminRole || ""} onValueChange={setSelectedAdminRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kyc_officer">
                            <div>
                              <div className="font-medium">KYC Officer</div>
                              <div className="text-xs text-muted-foreground">Sub-Admin Role</div>
                            </div>
                          </SelectItem>
                          <SelectItem value="property_manager">
                            <div>
                              <div className="font-medium">Property Manager</div>
                              <div className="text-xs text-muted-foreground">Sub-Admin Role</div>
                            </div>
                          </SelectItem>
                          <SelectItem value="financial_analyst">
                            <div>
                              <div className="font-medium">Financial Analyst</div>
                              <div className="text-xs text-muted-foreground">Sub-Admin Role</div>
                            </div>
                          </SelectItem>
                          <SelectItem value="compliance_officer">
                            <div>
                              <div className="font-medium">Compliance Officer</div>
                              <div className="text-xs text-muted-foreground">Sub-Admin Role</div>
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div>
                              <div className="font-medium">Admin (Team Lead)</div>
                              <div className="text-xs text-muted-foreground">Full Team Management</div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Assign to Groups */}
                    {selectedAdminRole === 'admin' && (
                      <div className="pt-3 border-t">
                        <label className="text-sm font-medium mb-2 block">Assign to Teams (Optional)</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2 bg-white">
                          {groups.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No teams available</p>
                          ) : (
                            groups.map(group => (
                              <div key={group._id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`promote-group-${group._id}`}
                                  checked={selectedGroupsForUser.has(group._id)}
                                  onCheckedChange={e => {
                                    const newGroups = new Set(selectedGroupsForUser)
                                    if (e) {
                                      newGroups.add(group._id)
                                    } else {
                                      newGroups.delete(group._id)
                                    }
                                    setSelectedGroupsForUser(newGroups)
                                  }}
                                />
                                <label htmlFor={`promote-group-${group._id}`} className="text-sm cursor-pointer flex-1">
                                  {group.displayName}
                                </label>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
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
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setRoleCategory('admin')
                    setSelectedAdminRole('admin')
                    setSelectedTeamMemberRole(null)
                  }}
                  className={`p-3 rounded-lg border-2 transition ${
                    roleCategory === 'admin'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">Admin</div>
                  <div className="text-xs text-muted-foreground">Full system access</div>
                </button>
                <button
                  onClick={() => {
                    setRoleCategory('team_lead')
                    setSelectedTeamMemberRole(null)
                    setSelectedAdminRole('team_lead')
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

            {/* Admin: Role Selection */}
            {roleCategory === 'admin' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Admin Role Type</label>
                <Select value={selectedAdminRole || ""} onValueChange={setSelectedAdminRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose admin role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div>
                        <div className="font-medium">Admin</div>
                        <div className="text-xs text-muted-foreground">Full system access</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="kyc_officer">
                      <div>
                        <div className="font-medium">KYC Officer</div>
                        <div className="text-xs text-muted-foreground">Manage KYC processes</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="property_manager">
                      <div>
                        <div className="font-medium">Property Manager</div>
                        <div className="text-xs text-muted-foreground">Manage properties</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="financial_analyst">
                      <div>
                        <div className="font-medium">Financial Analyst</div>
                        <div className="text-xs text-muted-foreground">Analyze financials</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="compliance_officer">
                      <div>
                        <div className="font-medium">Compliance Officer</div>
                        <div className="text-xs text-muted-foreground">Ensure compliance</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
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
                (roleCategory !== 'team_member' && !selectedAdminRole) ||
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
            {/* Group Selection - only show if no group is pre-selected */}
            {!selectedGroupForMember && groups.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Group</label>
                <Select value={selectedGroupForMember || ''} onValueChange={setSelectedGroupForMember}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group._id} value={group._id}>
                        {group.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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

      {/* Change Role Dialog */}
      <Dialog open={showChangeRoleDialog} onOpenChange={setShowChangeRoleDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              Change Role for {selectedAdminForRoleChange?.firstName} {selectedAdminForRoleChange?.lastName}
            </DialogTitle>
            <DialogDescription>
              Select a new role for this admin user. Current role: <span className="font-semibold">{getRoleDisplayName(selectedAdminForRoleChange?.role || '')}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedAdminForRoleChange && getAvailableRolesForChange(selectedAdminForRoleChange.role).length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                This user role cannot be changed
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">New Role</label>
                <Select value={newRoleForAdmin} onValueChange={setNewRoleForAdmin}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedAdminForRoleChange &&
                      getAvailableRolesForChange(selectedAdminForRoleChange.role).map((role) => (
                        <SelectItem key={role} value={role}>
                          {getRoleDisplayName(role)}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowChangeRoleDialog(false)
                setSelectedAdminForRoleChange(null)
                setNewRoleForAdmin('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAdminForRoleChange) {
                  handleChangeRole(selectedAdminForRoleChange._id, newRoleForAdmin)
                }
              }}
              disabled={!newRoleForAdmin}
            >
              Change Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OTP Verification Dialog */}
      <Dialog open={showOTPDialog} onOpenChange={setShowOTPDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Verify OTP</DialogTitle>
            <DialogDescription>
              {otpContext === 'role_change'
                ? `Enter the OTP code sent to Super Admin's email to confirm the role change for ${pendingRoleChange ? getRoleDisplayName(pendingRoleChange.newRole) : 'admin'}.`
                : `Enter the OTP code sent to Super Admin's email to confirm the creation of ${pendingAdminCreation ? `${pendingAdminCreation.firstName} ${pendingAdminCreation.lastName}` : 'new admin user'}.`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* OTP Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">OTP Code</label>
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.toUpperCase())}
                maxLength={10}
                className="text-center text-lg font-mono tracking-widest"
              />
              <p className="text-xs text-muted-foreground mt-2">
                📧 The OTP has been sent to the Super Admin's email. Please check the email for the code.
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900">
                <strong>No email?</strong> Check the backend/Render logs for the OTP code that was logged to console due to SMTP connection issues.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowOTPDialog(false)
                setOtpValue('')
                if (otpContext === 'role_change') {
                  setPendingRoleChange(null)
                } else {
                  setPendingAdminCreation(null)
                  setShowCreateAdminDialog(true) // Re-open the create admin dialog
                }
              }}
              disabled={otpLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyOTP}
              disabled={!otpValue || otpLoading}
            >
              {otpLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify OTP'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}