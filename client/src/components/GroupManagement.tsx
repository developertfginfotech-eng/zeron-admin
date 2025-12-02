import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Loader2,
  X,
  Check,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const API_BASE_URL = "https://zeron-backend-z5o1.onrender.com"

const apiCall = async (endpoint: string, options?: RequestInit) => {
  const token =
    localStorage.getItem("zaron_token") || localStorage.getItem("authToken")

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
    ...options,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, defaultOptions)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || "API request failed")
  }

  return data
}

interface Permission {
  resource: string
  actions: string[]
}

interface GroupData {
  _id: string
  name: string
  displayName: string
  description?: string
  department?: string
  permissions: Permission[]
  members: Array<{
    _id: string
    firstName: string
    lastName: string
    email: string
  }>
  memberCount: number
  isActive: boolean
  defaultRole?: {
    _id: string
    name: string
    displayName: string
  }
}

interface User {
  _id: string
  firstName: string
  lastName: string
  email: string
}

const DEPARTMENTS = [
  { value: "kyc", label: "KYC" },
  { value: "finance", label: "Finance" },
  { value: "compliance", label: "Compliance" },
  { value: "operations", label: "Operations" },
  { value: "property-management", label: "Property Management" },
  { value: "user-management", label: "User Management" },
  { value: "analytics", label: "Analytics" },
  { value: "admin", label: "Admin" },
  { value: "other", label: "Other" },
]

const PERMISSION_RESOURCES = [
  { category: "KYC", resources: ["kyc", "kyc:verification", "kyc:approval", "kyc:documents"] },
  { category: "Finance", resources: ["finance", "finance:reports", "finance:investments", "finance:payouts", "finance:audits"] },
  { category: "Compliance", resources: ["compliance", "compliance:monitoring", "compliance:reports", "compliance:approvals", "compliance:policies"] },
  { category: "Operations", resources: ["operations", "operations:properties", "operations:transactions", "operations:support", "operations:maintenance"] },
  { category: "Properties", resources: ["properties", "properties:create", "properties:edit", "properties:manage", "properties:documents"] },
  { category: "Users", resources: ["users", "users:create", "users:edit", "users:deactivate", "users:reports"] },
  { category: "Investments & Transactions", resources: ["investments", "transactions", "transactions:manage", "transactions:approve", "transactions:dispute"] },
  { category: "Documents", resources: ["documents", "documents:upload", "documents:verify", "documents:archive"] },
  { category: "Analytics", resources: ["analytics", "analytics:view", "analytics:export", "analytics:generate"] },
  { category: "System", resources: ["notifications", "settings", "admin", "admin:users", "admin:roles", "admin:groups", "admin:security", "admin:logs"] },
]

const ACTIONS = ["view", "create", "edit", "delete", "approve", "reject", "manage", "export", "verify", "archive"]

export default function GroupManagement() {
  const { toast } = useToast()
  const [groups, setGroups] = useState<GroupData[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false)
  const [selectedGroupForMember, setSelectedGroupForMember] = useState<string | null>(null)
  const [editingGroup, setEditingGroup] = useState<GroupData | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [selectedPermissions, setSelectedPermissions] = useState<Array<{ resource: string; actions: string[] }>>([])
  const [selectedMemberPermissions, setSelectedMemberPermissions] = useState<Array<{ resource: string; actions: string[] }>>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showEditMemberPermissionsDialog, setShowEditMemberPermissionsDialog] = useState(false)
  const [editingMember, setEditingMember] = useState<any>(null)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [addMemberRoleCategory, setAddMemberRoleCategory] = useState<'team_lead' | 'team_member' | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [groupsRes, adminUsersRes] = await Promise.all([
        apiCall("/api/admin/groups"),
        apiCall("/api/admin/admin-users"),
      ])

      if (groupsRes.success) setGroups(groupsRes.data || [])

      // Only load admin users (not regular users)
      if (adminUsersRes.success && adminUsersRes.data) {
        const adminUsers = adminUsersRes.data.admins || []
        // Filter to show only admin and sub-admin users
        const filteredUsers = adminUsers.filter((u: any) => u.role !== 'super_admin')
        setUsers(filteredUsers)
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async (formData: any) => {
    try {
      // Generate name from displayName if not provided (convert to lowercase with underscores)
      const groupName = formData.name || formData.displayName.toLowerCase().replace(/\s+/g, '_')

      const response = await apiCall("/api/admin/groups", {
        method: "POST",
        body: JSON.stringify({
          name: groupName,
          displayName: formData.displayName,
          description: formData.description,
          department: formData.department,
          permissions: selectedPermissions,
        }),
      })

      if (response.success) {
        toast({
          title: "Success",
          description: "Group created successfully",
        })
        setShowCreateDialog(false)
        setSelectedPermissions([])
        fetchData()
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create group",
        variant: "destructive",
      })
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return

    try {
      const response = await apiCall(`/api/admin/groups/${groupId}`, {
        method: "DELETE",
      })

      if (response.success) {
        toast({
          title: "Success",
          description: "Group deleted successfully",
        })
        fetchData()
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete group",
        variant: "destructive",
      })
    }
  }

  const handleAddUserToGroup = async (groupId: string, userId: string, memberPermissions: any[] = []) => {
    try {
      const response = await apiCall(
        `/api/admin/groups/${groupId}/add-member`,
        {
          method: "POST",
          body: JSON.stringify({ userId, memberPermissions }),
        }
      )

      if (response.success) {
        toast({
          title: "Success",
          description: "User added to group with permissions",
        })
        setShowAddMemberDialog(false)
        setSelectedUserId(null)
        setSelectedMemberPermissions([])
        fetchData()
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add user",
        variant: "destructive",
      })
    }
  }

  const handleRemoveUserFromGroup = async (groupId: string, userId: string) => {
    try {
      const response = await apiCall(
        `/api/admin/groups/${groupId}/remove-member/${userId}`,
        {
          method: "DELETE",
        }
      )

      if (response.success) {
        toast({
          title: "Success",
          description: "User removed from group",
        })
        fetchData()
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to remove user",
        variant: "destructive",
      })
    }
  }

  const toggleExpanded = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const handleAddPermission = (resource: string) => {
    const exists = selectedPermissions.some((p) => p.resource === resource)
    if (!exists) {
      setSelectedPermissions([
        ...selectedPermissions,
        { resource, actions: ["view"] },
      ])
    }
  }

  const handleRemovePermission = (resource: string) => {
    setSelectedPermissions(
      selectedPermissions.filter((p) => p.resource !== resource)
    )
  }

  const handleToggleAction = (resource: string, action: string) => {
    setSelectedPermissions(
      selectedPermissions.map((p) => {
        if (p.resource === resource) {
          const actions = p.actions.includes(action)
            ? p.actions.filter((a) => a !== action)
            : [...p.actions, action]
          return { ...p, actions }
        }
        return p
      })
    )
  }

  const filteredGroups = groups.filter((group) => {
    const matchesSearch =
      group.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment =
      !selectedDepartment || group.department === selectedDepartment
    return matchesSearch && matchesDepartment
  })

  const groupsByDepartment = DEPARTMENTS.reduce((acc, dept) => {
    const deptGroups = filteredGroups.filter((g) => g.department === dept.value)
    if (deptGroups.length > 0) {
      acc.push({ department: dept, groups: deptGroups })
    }
    return acc
  }, [] as Array<{ department: typeof DEPARTMENTS[0]; groups: GroupData[] }>)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Permission Groups</h2>
          <p className="text-muted-foreground">
            Manage department groups and assign users
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
              <DialogDescription>
                Define group details, permissions, and assign users
              </DialogDescription>
            </DialogHeader>

            <CreateGroupForm
              onSubmit={handleCreateGroup}
              onPermissionChange={(resource, isSelected) => {
                if (isSelected) {
                  handleAddPermission(resource)
                } else {
                  handleRemovePermission(resource)
                }
              }}
              onActionChange={handleToggleAction}
              selectedPermissions={selectedPermissions}
            />
          </DialogContent>
        </Dialog>

        {/* Add Member with Permissions Dialog */}
        <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {addMemberRoleCategory === 'team_lead' ? 'Add Team Lead to Group' : 'Add Team Member to Group'}
              </DialogTitle>
              <DialogDescription>
                {addMemberRoleCategory === 'team_lead'
                  ? 'Select an admin user and assign specific permissions for this group'
                  : 'Select a sub-admin user and assign specific permissions for this group'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* User Selection */}
              <div>
                <Label htmlFor="memberSelect">
                  {addMemberRoleCategory === 'team_lead' ? 'Select Admin User' : 'Select Sub-Admin User'}
                </Label>
                <select
                  id="memberSelect"
                  value={selectedUserId || ""}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Choose a user...</option>
                  {(() => {
                    const filteredUsers =
                      addMemberRoleCategory === 'team_lead'
                        ? users.filter((u: any) => u.role === 'admin')
                        : users.filter((u: any) => u.role !== 'super_admin' && u.role !== 'admin')

                    return filteredUsers.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))
                  })()}
                </select>
              </div>

              {/* Permission Selection */}
              <div>
                <Label>Member Permissions</Label>
                <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {PERMISSION_RESOURCES.map((category) => (
                    <div key={category.category}>
                      <h4 className="text-sm font-semibold mb-2">{category.category}</h4>
                      <div className="space-y-2 ml-2">
                        {category.resources.map((resource) => {
                          const permission = selectedMemberPermissions.find(
                            (p) => p.resource === resource
                          )
                          return (
                            <div key={resource}>
                              <div className="flex items-center gap-2 mb-1">
                                <Checkbox
                                  id={`member-${resource}`}
                                  checked={!!permission}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedMemberPermissions([
                                        ...selectedMemberPermissions,
                                        { resource, actions: ["view"] },
                                      ])
                                    } else {
                                      setSelectedMemberPermissions(
                                        selectedMemberPermissions.filter(
                                          (p) => p.resource !== resource
                                        )
                                      )
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`member-${resource}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {resource}
                                </label>
                              </div>
                              {permission && (
                                <div className="ml-6 flex flex-wrap gap-1 mb-2">
                                  {ACTIONS.map((action) => (
                                    <Badge
                                      key={action}
                                      variant={
                                        permission.actions.includes(action)
                                          ? "default"
                                          : "outline"
                                      }
                                      className="cursor-pointer text-xs"
                                      onClick={() => {
                                        setSelectedMemberPermissions(
                                          selectedMemberPermissions.map((p) => {
                                            if (p.resource === resource) {
                                              const actions = p.actions.includes(action)
                                                ? p.actions.filter((a) => a !== action)
                                                : [...p.actions, action]
                                              return { ...p, actions }
                                            }
                                            return p
                                          })
                                        )
                                      }}
                                    >
                                      {action}
                                      {permission.actions.includes(action) && (
                                        <Check className="h-2 w-2 ml-1" />
                                      )}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddMemberDialog(false)
                    setSelectedUserId(null)
                    setSelectedMemberPermissions([])
                    setAddMemberRoleCategory(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedUserId && selectedGroupForMember) {
                      // Get the group to access its permissions
                      const group = groups.find(g => g._id === selectedGroupForMember)
                      // Use selected member permissions, or fall back to group permissions
                      const permissionsToAssign = selectedMemberPermissions.length > 0
                        ? selectedMemberPermissions
                        : (group?.permissions || [])

                      handleAddUserToGroup(
                        selectedGroupForMember,
                        selectedUserId,
                        permissionsToAssign
                      )
                    }
                  }}
                  disabled={!selectedUserId}
                  className={addMemberRoleCategory === 'team_lead' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}
                >
                  {addMemberRoleCategory === 'team_lead' ? 'Add Team Lead' : 'Add Team Member'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Member Permissions Dialog */}
        <Dialog open={showEditMemberPermissionsDialog} onOpenChange={setShowEditMemberPermissionsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Member Permissions</DialogTitle>
              <DialogDescription>
                Update permissions for {editingMember?.userId?.firstName || editingMember?.firstName || 'member'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Permission Selection */}
              <div>
                <Label>Member Permissions</Label>
                <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {PERMISSION_RESOURCES.map((category) => (
                    <div key={category.category}>
                      <h4 className="text-sm font-semibold mb-2">{category.category}</h4>
                      <div className="space-y-2 ml-2">
                        {category.resources.map((resource) => {
                          const permission = selectedMemberPermissions.find(
                            (p) => p.resource === resource
                          )
                          return (
                            <div key={resource}>
                              <div className="flex items-center gap-2 mb-1">
                                <Checkbox
                                  id={`edit-member-${resource}`}
                                  checked={!!permission}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedMemberPermissions([
                                        ...selectedMemberPermissions,
                                        { resource, actions: ["view"] },
                                      ])
                                    } else {
                                      setSelectedMemberPermissions(
                                        selectedMemberPermissions.filter(
                                          (p) => p.resource !== resource
                                        )
                                      )
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`edit-member-${resource}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {resource}
                                </label>
                              </div>
                              {permission && (
                                <div className="ml-6 flex flex-wrap gap-1 mb-2">
                                  {ACTIONS.map((action) => (
                                    <Badge
                                      key={action}
                                      variant={
                                        permission.actions.includes(action)
                                          ? "default"
                                          : "outline"
                                      }
                                      className="cursor-pointer text-xs"
                                      onClick={() => {
                                        setSelectedMemberPermissions(
                                          selectedMemberPermissions.map((p) => {
                                            if (p.resource === resource) {
                                              const actions = p.actions.includes(action)
                                                ? p.actions.filter((a) => a !== action)
                                                : [...p.actions, action]
                                              return { ...p, actions }
                                            }
                                            return p
                                          })
                                        )
                                      }}
                                    >
                                      {action}
                                      {permission.actions.includes(action) && (
                                        <Check className="h-2 w-2 ml-1" />
                                      )}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="flex gap-2 justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditMemberPermissionsDialog(false)
                      setEditingMember(null)
                      setEditingGroupId(null)
                      setSelectedMemberPermissions([])
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      // Remove all permissions
                      if (editingMember && editingGroupId) {
                        setSelectedMemberPermissions([])
                        toast({
                          title: "Success",
                          description: "All permissions removed",
                        })
                      }
                    }}
                  >
                    Remove All
                  </Button>
                </div>
                <Button
                  onClick={async () => {
                    // Save permissions via API
                    if (editingMember && editingGroupId) {
                      try {
                        const response = await apiCall(
                          `/api/admin/groups/${editingGroupId}/members/${editingMember.userId._id || editingMember.userId}/permissions`,
                          {
                            method: 'PUT',
                            body: JSON.stringify({ memberPermissions: selectedMemberPermissions })
                          }
                        )

                        if (response.success) {
                          toast({
                            title: "Success",
                            description: "Member permissions updated successfully",
                          })
                          setShowEditMemberPermissionsDialog(false)
                          setEditingMember(null)
                          setEditingGroupId(null)
                          setSelectedMemberPermissions([])
                          fetchData() // Refresh data
                        } else {
                          throw new Error(response.message || 'Failed to update permissions')
                        }
                      } catch (error: any) {
                        toast({
                          title: "Error",
                          description: error.message || "Failed to update member permissions",
                          variant: "destructive"
                        })
                      }
                    }
                  }}
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Add Department Groups - Always Available */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Quick Setup: Create Department Groups</CardTitle>
            <CardDescription>
              Set up commonly used department groups in seconds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <QuickAddGroupCard
                dept={{ value: "kyc", label: "KYC Department" }}
                permissions={[
                  { resource: "kyc:verification", actions: ["view", "create", "edit"] },
                  { resource: "kyc:approval", actions: ["view", "approve", "reject"] },
                  { resource: "kyc:documents", actions: ["view", "edit"] },
                ]}
                onAdd={() => {
                  setSelectedPermissions([
                    { resource: "kyc:verification", actions: ["view", "create", "edit"] },
                    { resource: "kyc:approval", actions: ["view", "approve", "reject"] },
                    { resource: "kyc:documents", actions: ["view", "edit"] },
                  ])
                  setShowCreateDialog(true)
                }}
              />
              <QuickAddGroupCard
                dept={{ value: "finance", label: "Finance Team" }}
                permissions={[
                  { resource: "finance:reports", actions: ["view", "export", "generate"] },
                  { resource: "finance:investments", actions: ["view", "manage"] },
                  { resource: "finance:payouts", actions: ["view", "approve"] },
                ]}
                onAdd={() => {
                  setSelectedPermissions([
                    { resource: "finance:reports", actions: ["view", "export", "generate"] },
                    { resource: "finance:investments", actions: ["view", "manage"] },
                    { resource: "finance:payouts", actions: ["view", "approve"] },
                  ])
                  setShowCreateDialog(true)
                }}
              />
              <QuickAddGroupCard
                dept={{ value: "compliance", label: "Compliance Officer" }}
                permissions={[
                  { resource: "compliance:monitoring", actions: ["view", "manage"] },
                  { resource: "compliance:reports", actions: ["view", "export", "generate"] },
                  { resource: "compliance:approvals", actions: ["view", "approve"] },
                ]}
                onAdd={() => {
                  setSelectedPermissions([
                    { resource: "compliance:monitoring", actions: ["view", "manage"] },
                    { resource: "compliance:reports", actions: ["view", "export", "generate"] },
                    { resource: "compliance:approvals", actions: ["view", "approve"] },
                  ])
                  setShowCreateDialog(true)
                }}
              />
              <QuickAddGroupCard
                dept={{ value: "operations", label: "Operations Team" }}
                permissions={[
                  { resource: "operations:properties", actions: ["view", "manage"] },
                  { resource: "operations:transactions", actions: ["view", "manage"] },
                  { resource: "operations:support", actions: ["view", "manage"] },
                ]}
                onAdd={() => {
                  setSelectedPermissions([
                    { resource: "operations:properties", actions: ["view", "manage"] },
                    { resource: "operations:transactions", actions: ["view", "manage"] },
                    { resource: "operations:support", actions: ["view", "manage"] },
                  ])
                  setShowCreateDialog(true)
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Or click "Create Group" to set up custom groups with specific permissions
            </p>
          </CardContent>
        </Card>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedDepartment === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDepartment(null)}
          >
            All Departments
          </Button>
          {DEPARTMENTS.slice(0, 3).map((dept) => (
            <Button
              key={dept.value}
              variant={
                selectedDepartment === dept.value ? "default" : "outline"
              }
              size="sm"
              onClick={() => setSelectedDepartment(dept.value)}
            >
              {dept.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Groups by Department */}
      <div className="space-y-6">
        {groupsByDepartment.map(({ department, groups: deptGroups }) => (
          <div key={department.value}>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-1 w-6 bg-gradient-to-r from-blue-500 to-blue-400"></div>
              <h3 className="text-base font-semibold">{department.label}</h3>
              <Badge className="ml-auto">{deptGroups.length} group{deptGroups.length !== 1 ? 's' : ''}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deptGroups.map((group) => (
                <Card key={group._id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">
                            {group.displayName}
                          </CardTitle>
                          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-100">
                            {group.memberCount} members
                          </Badge>
                          {!group.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        {group.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {group.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(group._id)}
                        >
                          {expandedGroups.has(group._id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {expandedGroups.has(group._id) && (
                    <>
                      <CardContent className="pt-0 space-y-4">
                        {/* Permissions */}
                        <div>
                          <h4 className="font-semibold text-sm mb-2">
                            Permissions
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {group.permissions.map((perm, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {perm.resource}: {perm.actions.join(", ")}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Members with Permissions */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-sm">Members ({group.members?.length || 0})</h4>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="text-xs bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setSelectedGroupForMember(group._id)
                                  setAddMemberRoleCategory('team_lead')
                                  setSelectedUserId(null)
                                  // Auto-populate with group's permissions as default
                                  setSelectedMemberPermissions(group.permissions || [])
                                  setShowAddMemberDialog(true)
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Team Lead
                              </Button>
                              <Button
                                size="sm"
                                className="text-xs bg-purple-600 hover:bg-purple-700"
                                onClick={() => {
                                  setSelectedGroupForMember(group._id)
                                  setAddMemberRoleCategory('team_member')
                                  setSelectedUserId(null)
                                  // Auto-populate with group's permissions as default
                                  setSelectedMemberPermissions(group.permissions || [])
                                  setShowAddMemberDialog(true)
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Team Member
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {group.members && group.members.length > 0 ? (
                              group.members.map((member: any) => (
                                <div
                                  key={member._id || member.userId}
                                  className="p-3 border rounded-lg bg-muted/30 space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-xs">
                                          {(member.userId?.firstName?.[0] || member.firstName?.[0]) || 'U'}
                                          {(member.userId?.lastName?.[0] || member.lastName?.[0]) || 'U'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <div className="font-medium text-sm">
                                          {(member.userId?.firstName || member.firstName) || 'Unknown'} {(member.userId?.lastName || member.lastName) || 'User'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {(member.userId?.email || member.email) || 'No email'}
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const userId = typeof member.userId === 'object' ? member.userId._id : member.userId
                                        handleRemoveUserFromGroup(group._id, userId)
                                      }}
                                    >
                                      <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>

                                  {/* Member Permissions */}
                                  <div className="mt-2 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs font-semibold text-muted-foreground">Permissions:</p>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs h-6 px-2"
                                        onClick={() => {
                                          setEditingMember(member)
                                          setEditingGroupId(group._id)
                                          setSelectedMemberPermissions(member.memberPermissions || [])
                                          setShowEditMemberPermissionsDialog(true)
                                        }}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                        <span className="ml-1">Edit</span>
                                      </Button>
                                    </div>
                                    {member.memberPermissions && member.memberPermissions.length > 0 ? (
                                      <div className="space-y-1">
                                        <div className="flex flex-wrap gap-1">
                                          {member.memberPermissions.map((perm: any, idx: number) => (
                                            <Badge
                                              key={idx}
                                              variant="outline"
                                              className="text-xs bg-blue-50 dark:bg-blue-950 flex items-center gap-1"
                                            >
                                              {perm.resource}
                                              <span className="text-xs ml-0.5">
                                                ({perm.actions?.length || 0})
                                              </span>
                                            </Badge>
                                          ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Actions: {member.memberPermissions.flatMap((p: any) => p.actions || []).join(', ')}
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">
                                        No specific permissions assigned
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-muted-foreground text-center py-2">
                                No members yet. Click "Add Member" to get started.
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Groups Found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first group to organize users and manage permissions
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function CreateGroupForm({
  onSubmit,
  onPermissionChange,
  onActionChange,
  selectedPermissions,
}: {
  onSubmit: (data: any) => void
  onPermissionChange: (resource: string, isSelected: boolean) => void
  onActionChange: (resource: string, action: string) => void
  selectedPermissions: Array<{ resource: string; actions: string[] }>
}) {
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
    department: "other",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            placeholder="e.g., KYC Team"
            value={formData.displayName}
            onChange={(e) =>
              setFormData({ ...formData, displayName: e.target.value })
            }
            required
          />
        </div>
        <div>
          <Label htmlFor="department">Department</Label>
          <select
            id="department"
            value={formData.department}
            onChange={(e) =>
              setFormData({ ...formData, department: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept.value} value={dept.value}>
                {dept.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="Group description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Permissions</Label>
        <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-3">
          {PERMISSION_RESOURCES.map((category) => (
            <div key={category.category}>
              <h4 className="text-sm font-semibold mb-2">{category.category}</h4>
              <div className="space-y-2 ml-2">
                {category.resources.map((resource) => {
                  const permission = selectedPermissions.find(
                    (p) => p.resource === resource
                  )
                  return (
                    <div key={resource}>
                      <div className="flex items-center gap-2 mb-1">
                        <Checkbox
                          id={resource}
                          checked={!!permission}
                          onCheckedChange={(checked) =>
                            onPermissionChange(resource, !!checked)
                          }
                        />
                        <label
                          htmlFor={resource}
                          className="text-sm cursor-pointer"
                        >
                          {resource}
                        </label>
                      </div>
                      {permission && (
                        <div className="ml-6 flex flex-wrap gap-1 mb-2">
                          {ACTIONS.map((action) => (
                            <Badge
                              key={action}
                              variant={
                                permission.actions.includes(action)
                                  ? "default"
                                  : "outline"
                              }
                              className="cursor-pointer text-xs"
                              onClick={() => onActionChange(resource, action)}
                            >
                              {action}
                              {permission.actions.includes(action) && (
                                <Check className="h-2 w-2 ml-1" />
                              )}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button type="submit">Create Group</Button>
      </DialogFooter>
    </form>
  )
}

function QuickAddGroupCard({
  dept,
  permissions,
  onAdd,
}: {
  dept: { value: string; label: string }
  permissions: Array<{ resource: string; actions: string[] }>
  onAdd: () => void
}) {
  return (
    <button
      onClick={onAdd}
      className="p-4 border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left group"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm group-hover:text-blue-700 dark:group-hover:text-blue-300">
          {dept.label}
        </h4>
        <Plus className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400" />
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {permissions.length} permission{permissions.length !== 1 ? "s" : ""} set up
      </p>
      <div className="flex flex-wrap gap-1">
        {permissions.slice(0, 2).map((perm, idx) => (
          <Badge
            key={idx}
            variant="secondary"
            className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
          >
            {perm.resource}
          </Badge>
        ))}
        {permissions.length > 2 && (
          <Badge
            variant="outline"
            className="text-xs bg-blue-50 dark:bg-blue-950"
          >
            +{permissions.length - 2}
          </Badge>
        )}
      </div>
    </button>
  )
}
