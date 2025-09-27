import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
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
  TrendingUp
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// API Configuration
const API_BASE_URL = 'http://13.50.13.193:5000'

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

interface AdminUser {
  _id: string
  firstName: string
  lastName: string
  email: string
  role: string
  status?: string
  createdAt: string
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

export default function AdminDashboard() {
  const { toast } = useToast()
  
  const [selectedRole, setSelectedRole] = useState("all")
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [regularUsers, setRegularUsers] = useState<RegularUser[]>([])
  const [eligibleUsers, setEligibleUsers] = useState<RegularUser[]>([])
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)

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

  const rolePermissions = {
    super_admin: {
      name: 'Super Administrator',
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      permissions: ['All platform access', 'User management', 'System configuration', 'Financial operations', 'Security settings'],
      count: adminUsers.filter(u => u.role === 'super_admin').length
    },
    kyc_officer: {
      name: 'KYC Officer',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      permissions: ['Review KYC documents', 'Approve/reject verifications', 'User compliance', 'Document management'],
      count: adminUsers.filter(u => u.role === 'kyc_officer').length
    },
    property_manager: {
      name: 'Property Manager',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      permissions: ['Property listings', 'Investment tracking', 'Performance monitoring', 'Tenant management'],
      count: adminUsers.filter(u => u.role === 'property_manager').length
    },
    financial_analyst: {
      name: 'Financial Analyst',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      permissions: ['Financial reporting', 'Analytics access', 'Revenue tracking', 'Performance analysis'],
      count: adminUsers.filter(u => u.role === 'financial_analyst').length
    },
    compliance_officer: {
      name: 'Compliance Officer',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      permissions: ['Regulatory compliance', 'Audit trails', 'Risk assessment', 'Legal documentation'],
      count: adminUsers.filter(u => u.role === 'compliance_officer').length
    }
  }

  const filteredAdminUsers = selectedRole === "all"
    ? adminUsers.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : adminUsers.filter(user => 
        user.role === selectedRole &&
        (user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
      )

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
        <Button>
          <UserCog className="h-4 w-4 mr-2" />
          Add Administrator
        </Button>
      </div>

      {/* Dashboard Stats */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.totalProperties || 0}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardStats.activeProperties || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardStats.pendingKyc || 0} pending KYC
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investments</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.totalInvestments || 0}</div>
              <p className="text-xs text-muted-foreground">
                SAR {(dashboardStats.totalInvestmentValue || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
              <UserCog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminUsers.length}</div>
              <p className="text-xs text-muted-foreground">
                {adminUsers.filter(u => u.role === 'super_admin').length} super admins
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Role Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(rolePermissions).map(([roleKey, role]) => (
          <Card 
            key={roleKey} 
            className={`cursor-pointer transition-all hover:shadow-lg ${selectedRole === roleKey ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setSelectedRole(roleKey)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">{role.name}</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <Badge className={role.color}>
                  {role.count} user{role.count !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="space-y-1">
                {role.permissions.slice(0, 3).map((permission, index) => (
                  <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    {permission}
                  </div>
                ))}
                {role.permissions.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{role.permissions.length - 3} more permissions
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search admin users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Admin Users List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Administrator Accounts
                {selectedRole !== "all" && (
                  <Badge className="ml-2">
                    {rolePermissions[selectedRole as keyof typeof rolePermissions]?.name}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedRole === "all" 
                  ? `All administrative users (${filteredAdminUsers.length})`
                  : `Users with ${rolePermissions[selectedRole as keyof typeof rolePermissions]?.name} role (${filteredAdminUsers.length})`
                }
              </CardDescription>
            </div>
            {selectedRole !== "all" && (
              <Button 
                variant="outline" 
                onClick={() => setSelectedRole("all")}
                size="sm"
              >
                Show All Roles
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAdminUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No admin users found</p>
              </div>
            ) : (
              filteredAdminUsers.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {user.firstName[0]}{user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.firstName} {user.lastName}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      <div className="text-xs text-muted-foreground">
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.status && (
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                    )}
                    <Badge className={rolePermissions[user.role as keyof typeof rolePermissions]?.color}>
                      {rolePermissions[user.role as keyof typeof rolePermissions]?.name || user.role}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Regular Users Section */}
      <Card>
        <CardHeader>
          <CardTitle>Regular Users Management</CardTitle>
          <CardDescription>
            Total: {regularUsers.length} users | Eligible for promotion: {eligibleUsers.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {regularUsers.slice(0, 5).map((user) => (
              <div key={user._id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {user.firstName[0]}{user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.firstName} {user.lastName}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.kycStatus === 'approved' ? 'default' : 'secondary'}>
                    KYC: {user.kycStatus}
                  </Badge>
                  {user.emailVerified && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <UserCog className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">Create Admin</div>
                <div className="text-xs text-muted-foreground">Add new administrator</div>
              </div>
            </Button>

            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <Settings className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">Manage Roles</div>
                <div className="text-xs text-muted-foreground">Update admin roles</div>
              </div>
            </Button>

            <Button variant="outline" className="h-24 flex flex-col gap-2">
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
              <Button>
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
                  <Badge variant="outline" className="text-green-600">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Session Timeout</span>
                  <Badge variant="outline">8 hours</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Password Policy</span>
                  <Badge variant="outline" className="text-green-600">Strong</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Login Attempts Limit</span>
                  <Badge variant="outline">5 attempts</Badge>
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
                  <Badge variant="outline" className="text-green-600">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>IP Allowlist</span>
                  <Badge variant="outline">Configured</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Audit Logging</span>
                  <Badge variant="outline" className="text-green-600">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Data Encryption</span>
                  <Badge variant="outline" className="text-green-600">AES-256</Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Configure Security Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}