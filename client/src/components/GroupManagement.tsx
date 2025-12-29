import { useState, useEffect, useRef } from "react"
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
import { Label } from "@/components/ui/label"
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader2,
  X,
  Check,
  BarChart3,
  UserPlus,
  Shield,
  Crown,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import PermissionManager from "@/components/PermissionManager"
import { usePermissions } from "@/hooks/usePermissions"

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
    memberPermissions?: Permission[]
  }>
  memberCount: number
  isActive: boolean
  parentGroupId?: string
  overriddenPermissions?: Permission[]
  subGroups?: GroupData[]
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
  role?: string
  status?: string
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

// Minimized Essential Permissions - Only core actions
const PERMISSION_RESOURCES = [
  { category: "KYC", resources: ["kyc:verification", "kyc:approval"] },
  { category: "Finance", resources: ["finance:reports", "finance:investments"] },
  { category: "Operations", resources: ["operations:properties", "operations:transactions"] },
  { category: "Properties", resources: ["properties:manage"] },
  { category: "Users", resources: ["users:manage"] },
  { category: "Documents", resources: ["documents:verify"] },
  { category: "Admin", resources: ["admin:groups", "admin:users"] },
]

const ACTIONS = ["view", "create", "edit", "delete", "approve", "manage"]

const TAB_OPTIONS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "create", label: "Create Group", icon: Plus },
  { id: "sub-groups", label: "Sub-groups", icon: Users },
  { id: "team-leads", label: "Team Leads", icon: Users },
  { id: "team-members", label: "Team Members", icon: UserPlus },
  { id: "permissions", label: "Permissions", icon: Shield },
]

export default function GroupManagement() {
  const { toast } = useToast()
  const { userRole } = usePermissions()

  // Get current user ID
  const getCurrentUserId = () => {
    try {
      const userData = localStorage.getItem('userData')
      if (userData) {
        const user = JSON.parse(userData)
        return user.id || user._id
      }
    } catch (error) {
      console.error('Error getting user ID:', error)
    }
    return null
  }

  const currentUserId = getCurrentUserId()

  // Check if current user is a member of a group
  const isUserMemberOfGroup = (group: GroupData) => {
    if (!currentUserId || !group.members) return false
    return group.members.some((member: any) => {
      // Handle nested structure: member.userId._id or member.userId or member._id
      const userData = member.userId || member
      const memberId = userData._id || userData
      return memberId === currentUserId
    })
  }

  const [activeTab, setActiveTab] = useState("overview")
  const [groups, setGroups] = useState<GroupData[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const tabsContainerRef = useRef<HTMLDivElement>(null)

  // Create Group Form States
  const [createFormData, setCreateFormData] = useState({
    name: "",
    displayName: "",
    description: "",
    department: "other",
    parentGroupId: "",
  })
  const [selectedPermissions, setSelectedPermissions] = useState<Array<{ resource: string; actions: string[] }>>([])
  const [selectedGroupAdmin, setSelectedGroupAdmin] = useState<string>("")

  // Team Management States
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null)
  const [selectedUserForGroup, setSelectedUserForGroup] = useState<string | null>(null)
  const [memberPermissions, setMemberPermissions] = useState<Array<{ resource: string; actions: string[] }>>([])
  const [memberRole, setMemberRole] = useState<'team_lead' | 'team_member'>('team_member')

  // Sub-group Creation States
  const [showSubgroupForm, setShowSubgroupForm] = useState(false)
  const [selectedParentForSubgroup, setSelectedParentForSubgroup] = useState<string | null>(null)
  const [subgroupFormData, setSubgroupFormData] = useState({
    displayName: "",
    description: "",
    department: "other",
  })
  const [selectedSubgroupTeamLead, setSelectedSubgroupTeamLead] = useState<string>("")

  // Sub-group Management States
  const [editingSubgroupId, setEditingSubgroupId] = useState<string | null>(null)
  const [selectedSubgroupForMember, setSelectedSubgroupForMember] = useState<string | null>(null)
  const [editingSubgroupPermissions, setEditingSubgroupPermissions] = useState<Array<{ resource: string; actions: string[] }>>([])
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false)

  // Swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX)
    handleSwipe()
  }

  const handleSwipe = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = TAB_OPTIONS.findIndex(t => t.id === activeTab)

      if (isLeftSwipe && currentIndex < TAB_OPTIONS.length - 1) {
        setActiveTab(TAB_OPTIONS[currentIndex + 1].id)
      } else if (isRightSwipe && currentIndex > 0) {
        setActiveTab(TAB_OPTIONS[currentIndex - 1].id)
      }
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const organizeGroupsHierarchy = (flatGroups: GroupData[]) => {
    const groupMap = new Map<string, GroupData>()
    flatGroups.forEach(group => {
      groupMap.set(group._id, { ...group, subGroups: [] })
    })

    const parentGroups: GroupData[] = []
    const subGroupsByParent = new Map<string, GroupData[]>()

    flatGroups.forEach(group => {
      if (group.parentGroupId) {
        if (!subGroupsByParent.has(group.parentGroupId)) {
          subGroupsByParent.set(group.parentGroupId, [])
        }
        subGroupsByParent.get(group.parentGroupId)!.push(group)
      } else {
        parentGroups.push(group)
      }
    })

    parentGroups.forEach(parent => {
      const subs = subGroupsByParent.get(parent._id) || []
      parent.subGroups = subs
    })

    return parentGroups
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [groupsRes, adminUsersRes] = await Promise.all([
        apiCall("/api/admin/groups"),
        apiCall("/api/admin/admin-users"),
      ])

      if (groupsRes.success) {
        const flatGroups = groupsRes.data || []
        const nestedGroups = organizeGroupsHierarchy(flatGroups)
        setGroups(nestedGroups)
      }

      if (adminUsersRes.success && adminUsersRes.data) {
        const adminUsers = adminUsersRes.data.admins || []
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

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const groupName = createFormData.name || createFormData.displayName.toLowerCase().replace(/\s+/g, '_')

      const response = await apiCall("/api/admin/groups", {
        method: "POST",
        body: JSON.stringify({
          name: groupName,
          displayName: createFormData.displayName,
          description: createFormData.description,
          department: createFormData.department,
          permissions: selectedPermissions,
          ...(createFormData.parentGroupId && { parentGroupId: createFormData.parentGroupId }),
          ...(selectedGroupAdmin && { groupAdminId: selectedGroupAdmin }),
        }),
      })

      if (response.success) {
        toast({
          title: "Success",
          description: "Group created successfully",
        })
        setCreateFormData({
          name: "",
          displayName: "",
          description: "",
          department: "other",
          parentGroupId: "",
        })
        setSelectedPermissions([])
        setSelectedGroupAdmin("")
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

  const handleAddUserToGroup = async () => {
    if (!selectedGroup || !selectedUserForGroup) {
      toast({
        title: "Error",
        description: "Please select a group and user",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await apiCall(
        `/api/admin/groups/${selectedGroup._id}/add-member`,
        {
          method: "POST",
          body: JSON.stringify({
            userId: selectedUserForGroup,
            memberPermissions: memberPermissions.length > 0 ? memberPermissions : selectedGroup.permissions,
          }),
        }
      )

      if (response.success) {
        toast({
          title: "Success",
          description: `${memberRole === 'team_lead' ? 'Team Lead' : 'Team Member'} added successfully`,
        })
        setSelectedUserForGroup(null)
        setMemberPermissions([])
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
    if (!confirm("Remove this user from the group?")) return

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

  const handleAddUserToSubgroup = async (subgroupId: string, userId: string) => {
    if (!subgroupId || !userId) {
      toast({
        title: "Error",
        description: "Please select both a sub-group and user",
        variant: "destructive",
      })
      return
    }

    try {
      const subgroup = groups
        .flatMap((g) => [...(g.subGroups || []), g])
        .find((sg) => sg._id === subgroupId)

      if (!subgroup) {
        throw new Error("Sub-group not found")
      }

      const response = await apiCall(
        `/api/admin/groups/${subgroupId}/add-member`,
        {
          method: "POST",
          body: JSON.stringify({
            userId,
            memberPermissions: subgroup.permissions || [],
          }),
        }
      )

      if (response.success) {
        toast({
          title: "Success",
          description: "Member added to sub-group successfully",
        })
        setSelectedSubgroupForMember(null)
        setSelectedUserForGroup(null)

        // Fetch fresh data to get updated member information
        fetchData()
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add user to sub-group",
        variant: "destructive",
      })
    }
  }

  const handleUpdateSubgroupPermissions = async (subgroupId: string, permissions: Array<{ resource: string; actions: string[] }>) => {
    if (!subgroupId) {
      toast({
        title: "Error",
        description: "Sub-group ID not found",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await apiCall(
        `/api/admin/groups/${subgroupId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            permissions,
          }),
        }
      )

      if (response.success) {
        toast({
          title: "Success",
          description: "Sub-group permissions updated successfully",
        })
        setEditingSubgroupId(null)
        fetchData()
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update permissions",
        variant: "destructive",
      })
    }
  }

  const handleCreateSubgroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedParentForSubgroup) return

    try {
      const subgroupName = subgroupFormData.displayName.toLowerCase().replace(/\s+/g, '_')
      const parentGroup = filteredGroups.find(g => g._id === selectedParentForSubgroup)

      const response = await apiCall("/api/admin/groups", {
        method: "POST",
        body: JSON.stringify({
          name: subgroupName,
          displayName: subgroupFormData.displayName,
          description: subgroupFormData.description,
          department: subgroupFormData.department || parentGroup?.department,
          parentGroupId: selectedParentForSubgroup,
          permissions: parentGroup?.permissions || [],
          ...(selectedSubgroupTeamLead && { teamLeadId: selectedSubgroupTeamLead }),
        }),
      })

      if (response.success) {
        toast({
          title: "Success",
          description: `Sub-group "${subgroupFormData.displayName}" created successfully`,
        })
        setShowSubgroupForm(false)
        setSelectedParentForSubgroup(null)
        setSubgroupFormData({ displayName: "", description: "", department: "other" })
        setSelectedSubgroupTeamLead("")
        fetchData()
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create sub-group",
        variant: "destructive",
      })
    }
  }

  const filteredGroups = groups.filter((group) => {
    if (group.parentGroupId) return false

    const matchesSearch =
      group.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment =
      !selectedDepartment || group.department === selectedDepartment
    return matchesSearch && matchesDepartment
  })

  // Flatten all groups (including subgroups) for dropdowns where we need to show all groups
  const allGroupsFlattened = groups.reduce((acc: GroupData[], group) => {
    acc.push(group)
    if (group.subGroups && group.subGroups.length > 0) {
      acc.push(...group.subGroups)
    }
    return acc
  }, [])

  const groupStats = {
    total: filteredGroups.length,
    totalMembers: filteredGroups.reduce((sum, g) => sum + (g.memberCount || 0), 0),
    byDepartment: DEPARTMENTS.map(dept => ({
      ...dept,
      count: filteredGroups.filter(g => g.department === dept.value).length
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Modern Tab Navigation */}
      <div
        ref={tabsContainerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="w-full"
      >
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory scrollbar-hide">
          <div className="flex gap-2 min-w-full md:min-w-auto md:flex-wrap">
            {TAB_OPTIONS
              .filter((tab) => {
                // Hide certain tabs for team_lead and team_member
                if (userRole === 'team_lead' || userRole === 'team_member') {
                  // Team leads and members cannot create groups, manage sub-groups, or assign team leads
                  if (tab.id === 'create' || tab.id === 'sub-groups' || tab.id === 'team-leads') {
                    return false
                  }
                }
                return true
              })
              .map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-lg md:rounded-xl font-medium transition-all duration-300 whitespace-nowrap snap-center ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105"
                  }`}
                >
                  <Icon className={`h-4 w-4 md:h-5 md:w-5 transition-transform ${isActive ? "scale-110" : ""}`} />
                  <span className="text-xs md:text-sm lg:text-base">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Indicator Line */}
        <div className="h-0.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full mb-6 transition-all duration-300" />
      </div>

      {/* TAB CONTENT */}
      <div className="animate-fadeIn">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{groupStats.total}</div>
                <p className="text-xs text-muted-foreground mt-2">Active permission groups</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{groupStats.totalMembers}</div>
                <p className="text-xs text-muted-foreground mt-2">Across all groups</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Departments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{groupStats.byDepartment.filter(d => d.count > 0).length}</div>
                <p className="text-xs text-muted-foreground mt-2">With active groups</p>
              </CardContent>
            </Card>
          </div>

          {/* Department Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Groups by Department</CardTitle>
              <CardDescription>Distribution of groups across departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {groupStats.byDepartment.map(dept => (
                  <div key={dept.value} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-medium w-32">{dept.label}</span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                          style={{ width: `${(dept.count / Math.max(...groupStats.byDepartment.map(d => d.count), 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant="outline">{dept.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Groups List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Groups</CardTitle>
                  <CardDescription>View and manage all permission groups</CardDescription>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant={selectedDepartment === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDepartment(null)}
                >
                  All
                </Button>
                {DEPARTMENTS.slice(0, 3).map((dept) => (
                  <Button
                    key={dept.value}
                    variant={selectedDepartment === dept.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDepartment(dept.value)}
                  >
                    {dept.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <Card key={group._id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-lg">{group.displayName}</CardTitle>
                              {isUserMemberOfGroup(group) && (
                                <Badge className="bg-green-600 text-white text-xs">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Your Group
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="mt-1">{group.description}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            {/* Only super_admin and admin can create sub-groups */}
                            {(userRole === 'super_admin' || userRole === 'admin') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedParentForSubgroup(group._id)
                                  setShowSubgroupForm(true)
                                }}
                                className="text-blue-600 hover:text-blue-700"
                                title="Create a sub-group"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Only super_admin and admin can delete groups */}
                            {(userRole === 'super_admin' || userRole === 'admin') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteGroup(group._id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Badge>{group.department}</Badge>
                          <Badge variant="outline">{group.memberCount} members</Badge>
                          {group.subGroups && group.subGroups.length > 0 && (
                            <Badge variant="secondary">{group.subGroups.length} sub-groups</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Permissions: {group.permissions.length}</p>
                          <div className="flex flex-wrap gap-1">
                            {group.permissions.slice(0, 3).map((perm, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{perm.resource}</Badge>
                            ))}
                            {group.permissions.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{group.permissions.length - 3}</Badge>
                            )}
                          </div>
                        </div>
                        {group.subGroups && group.subGroups.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Sub-groups:</p>
                            <div className="flex flex-wrap gap-1">
                              {group.subGroups.map((subgroup) => (
                                <Badge
                                  key={subgroup._id}
                                  variant="outline"
                                  className={`text-xs ${isUserMemberOfGroup(subgroup) ? 'bg-green-100 dark:bg-green-950 border-green-600' : 'bg-blue-50 dark:bg-blue-950'}`}
                                >
                                  {isUserMemberOfGroup(subgroup) && <Crown className="h-3 w-3 mr-1 text-green-600" />}
                                  └ {subgroup.displayName}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No groups found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Create Sub-group Modal/Card */}
          {showSubgroupForm && selectedParentForSubgroup && (
            <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Create Sub-group</CardTitle>
                    <CardDescription className="text-blue-100 mt-1">
                      Creating sub-group for: <span className="font-semibold">{filteredGroups.find(g => g._id === selectedParentForSubgroup)?.displayName}</span>
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowSubgroupForm(false)
                      setSelectedParentForSubgroup(null)
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleCreateSubgroup} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="subgroupName" className="text-sm font-semibold mb-2 block">
                        Sub-group Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="subgroupName"
                        placeholder="e.g., KYC Verification Sub-team"
                        value={subgroupFormData.displayName}
                        onChange={(e) =>
                          setSubgroupFormData({ ...subgroupFormData, displayName: e.target.value })
                        }
                        required
                        className="border-2 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="subgroupDept" className="text-sm font-semibold mb-2 block">
                        Department
                      </Label>
                      <select
                        id="subgroupDept"
                        value={subgroupFormData.department}
                        onChange={(e) =>
                          setSubgroupFormData({ ...subgroupFormData, department: e.target.value })
                        }
                        className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-900"
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
                    <Label htmlFor="subgroupDesc" className="text-sm font-semibold mb-2 block">
                      Description <span className="text-slate-400">(Optional)</span>
                    </Label>
                    <Input
                      id="subgroupDesc"
                      placeholder="Describe this sub-group..."
                      value={subgroupFormData.description}
                      onChange={(e) =>
                        setSubgroupFormData({ ...subgroupFormData, description: e.target.value })
                      }
                      className="border-2 focus:border-blue-500"
                    />
                  </div>

                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <span className="font-semibold">✓ Note:</span> This sub-group will inherit permissions from its parent group
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={!subgroupFormData.displayName}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create Sub-group
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowSubgroupForm(false)
                        setSelectedParentForSubgroup(null)
                        setSubgroupFormData({ displayName: "", description: "", department: "other" })
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
        )}

        {/* CREATE GROUP TAB */}
        {activeTab === "create" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <h2 className="text-2xl font-bold mb-2">Create New Permission Group</h2>
            <p className="text-blue-100">Set up a new group with custom permissions and member assignments</p>
          </div>

          <form onSubmit={handleCreateGroup} className="space-y-6">
            {/* Basic Information Card */}
            <Card className="border-2 border-blue-100 dark:border-blue-900">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-t-lg">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">1</div>
                  Basic Information
                </CardTitle>
                <CardDescription>Group name, department, and description</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="displayName" className="text-sm font-semibold mb-2 block">
                      Display Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="displayName"
                      placeholder="e.g., KYC Verification Team"
                      value={createFormData.displayName}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, displayName: e.target.value })
                      }
                      required
                      className="mt-2 border-2 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="department" className="text-sm font-semibold mb-2 block">
                      Department <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="department"
                      value={createFormData.department}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, department: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-lg text-sm mt-2 focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-900"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept.value} value={dept.value}>
                          {dept.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <Label htmlFor="description" className="text-sm font-semibold mb-2 block">
                    Description <span className="text-slate-400">(Optional)</span>
                  </Label>
                  <Input
                    id="description"
                    placeholder="Describe the purpose and responsibilities of this group..."
                    value={createFormData.description}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, description: e.target.value })
                    }
                    className="mt-2 border-2 focus:border-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sub-group Configuration Card */}
            <Card className="border-2 border-purple-100 dark:border-purple-900">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-t-lg">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">2</div>
                  Sub-group Configuration
                </CardTitle>
                <CardDescription>Make this a sub-group of an existing group (optional)</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div>
                  <Label htmlFor="parentGroup" className="text-sm font-semibold mb-2 block">
                    Parent Group <span className="text-slate-400">(Optional)</span>
                  </Label>
                  <select
                    id="parentGroup"
                    value={createFormData.parentGroupId}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, parentGroupId: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-purple-500 focus:outline-none bg-white dark:bg-slate-900"
                  >
                    <option value="">No parent group - Create as root group</option>
                    {filteredGroups
                      .filter((g) => !g.parentGroupId)
                      .map((group) => (
                        <option key={group._id} value={group._id}>
                          {group.displayName} ({group.department})
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    💡 Sub-groups inherit permissions from their parent group and can override them
                  </p>
                </div>

                {createFormData.parentGroupId && (
                  <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950 border-l-4 border-purple-600 rounded">
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      <span className="font-semibold">✓ Sub-group Mode:</span> This group will be created as a child of{" "}
                      <span className="font-semibold">
                        {filteredGroups.find((g) => g._id === createFormData.parentGroupId)?.displayName}
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assign Group Admin Card */}
            {!createFormData.parentGroupId && (
              <Card className="border-2 border-green-100 dark:border-green-900">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-t-lg">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">3</div>
                    Assign Group Admin
                  </CardTitle>
                  <CardDescription>Select an admin who will manage this group and create sub-groups</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div>
                    <Label htmlFor="groupAdmin" className="text-sm font-semibold mb-2 block">
                      Group Admin <span className="text-slate-400">(Optional)</span>
                    </Label>
                    <select
                      id="groupAdmin"
                      value={selectedGroupAdmin}
                      onChange={(e) => setSelectedGroupAdmin(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-green-500 focus:outline-none bg-white dark:bg-slate-900"
                    >
                      <option value="">No admin assigned - You can assign later</option>
                      {users
                        .filter((u: any) => u.role === 'admin' && u.status === 'active')
                        .map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.firstName} {user.lastName} ({user.email})
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      💡 The assigned admin will have full control over this group and can create sub-groups
                    </p>
                  </div>

                  {selectedGroupAdmin && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 border-l-4 border-green-600 rounded">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        <span className="font-semibold">✓ Group Admin Selected:</span>{" "}
                        {users.find((u: any) => u._id === selectedGroupAdmin)?.firstName}{" "}
                        {users.find((u: any) => u._id === selectedGroupAdmin)?.lastName} will manage this group
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Permissions Card */}
            <Card className="border-2 border-indigo-100 dark:border-indigo-900">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950 rounded-t-lg">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">{!createFormData.parentGroupId ? '4' : '3'}</div>
                  Assign Permissions
                </CardTitle>
                <CardDescription>Select which resources and actions this group can access</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 border-2 border-dashed border-indigo-200 dark:border-indigo-800">
                  <PermissionManager
                    allPermissions={PERMISSION_RESOURCES.flatMap((cat) =>
                      cat.resources.map((resource) => ({
                        resource,
                        actions: ACTIONS,
                      }))
                    )}
                    selectedPermissions={selectedPermissions}
                    onPermissionsChange={setSelectedPermissions}
                  />
                </div>
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <span className="font-semibold">Selected Permissions:</span> {selectedPermissions.length > 0 ? selectedPermissions.length : "No permissions selected"} resource{selectedPermissions.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              <Button
                type="submit"
                disabled={!createFormData.displayName}
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-2.5 h-auto"
              >
                <Plus className="h-5 w-5" />
                Create Group
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateFormData({
                    name: "",
                    displayName: "",
                    description: "",
                    department: "other",
                    parentGroupId: "",
                  })
                  setSelectedPermissions([])
                  setSelectedGroupAdmin("")
                }}
                className="gap-2 font-semibold px-6 py-2.5 h-auto"
              >
                Clear Form
              </Button>
            </div>
          </form>
        </div>
        )}

        {/* SUB-GROUPS TAB */}
        {activeTab === "sub-groups" && (
        <div className="space-y-6">
          {/* Create Sub-group Card */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Sub-group
              </CardTitle>
              <CardDescription>Add a sub-group to an existing main group</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreateSubgroup} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="parentGroupSelect" className="text-sm font-semibold mb-2 block">
                      Select Parent Group <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="parentGroupSelect"
                      value={selectedParentForSubgroup || ""}
                      onChange={(e) => setSelectedParentForSubgroup(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-900"
                    >
                      <option value="">Choose a group...</option>
                      {filteredGroups.map((group) => (
                        <option key={group._id} value={group._id}>
                          {group.displayName} ({group.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="subgroupNameCreate" className="text-sm font-semibold mb-2 block">
                      Sub-group Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="subgroupNameCreate"
                      placeholder="e.g., Approval Team"
                      value={subgroupFormData.displayName}
                      onChange={(e) =>
                        setSubgroupFormData({ ...subgroupFormData, displayName: e.target.value })
                      }
                      className="border-2 focus:border-blue-500"
                      disabled={!selectedParentForSubgroup}
                    />
                  </div>

                  <div>
                    <Label htmlFor="subgroupDeptCreate" className="text-sm font-semibold mb-2 block">
                      Department
                    </Label>
                    <select
                      id="subgroupDeptCreate"
                      value={subgroupFormData.department}
                      onChange={(e) =>
                        setSubgroupFormData({ ...subgroupFormData, department: e.target.value })
                      }
                      className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-900"
                      disabled={!selectedParentForSubgroup}
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
                  <Label htmlFor="subgroupDescCreate" className="text-sm font-semibold mb-2 block">
                    Description <span className="text-slate-400">(Optional)</span>
                  </Label>
                  <Input
                    id="subgroupDescCreate"
                    placeholder="Describe this sub-group..."
                    value={subgroupFormData.description}
                    onChange={(e) =>
                      setSubgroupFormData({ ...subgroupFormData, description: e.target.value })
                    }
                    className="border-2 focus:border-blue-500"
                    disabled={!selectedParentForSubgroup}
                  />
                </div>

                {/* Assign Team Lead */}
                <div className="p-4 bg-green-50 dark:bg-green-950 border-2 border-green-200 dark:border-green-800 rounded-lg">
                  <Label htmlFor="subgroupTeamLead" className="text-sm font-semibold mb-2 block">
                    Assign Team Lead <span className="text-slate-400">(Optional)</span>
                  </Label>
                  <select
                    id="subgroupTeamLead"
                    value={selectedSubgroupTeamLead}
                    onChange={(e) => setSelectedSubgroupTeamLead(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-green-500 focus:outline-none bg-white dark:bg-slate-900"
                    disabled={!selectedParentForSubgroup}
                  >
                    <option value="">No team lead assigned - Assign later</option>
                    {users
                      .filter((u: any) => u.role === 'team_lead' && u.status === 'active')
                      .map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                    💡 The team lead will manage this sub-group and can add team members
                  </p>
                  {selectedSubgroupTeamLead && (
                    <div className="mt-3 p-3 bg-white dark:bg-slate-900 border-l-4 border-green-600 rounded">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        <span className="font-semibold">✓ Team Lead Selected:</span>{" "}
                        {users.find((u: any) => u._id === selectedSubgroupTeamLead)?.firstName}{" "}
                        {users.find((u: any) => u._id === selectedSubgroupTeamLead)?.lastName} will head this sub-group
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={!selectedParentForSubgroup || !subgroupFormData.displayName}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Sub-group
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Manage Sub-groups Card */}
          <Card>
            <CardHeader>
              <CardTitle>Manage Sub-groups & Permissions</CardTitle>
              <CardDescription>View, edit permissions, and delete sub-groups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groups.flatMap((group) =>
                  (group.subGroups || []).map((subgroup) => (
                    <div key={subgroup._id}>
                      <Card className="border-l-4 border-purple-500 hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <CardTitle className="text-base">{subgroup.displayName}</CardTitle>
                                <Badge variant="secondary" className="text-xs">Sub-group</Badge>
                                {isUserMemberOfGroup(subgroup) && (
                                  <Badge className="bg-green-600 text-white text-xs">
                                    <Crown className="h-3 w-3 mr-1" />
                                    Your Group
                                  </Badge>
                                )}
                              </div>
                              <CardDescription className="text-sm">
                                Parent: <span className="font-semibold text-foreground">{group.displayName}</span>
                                {subgroup.description && <p className="mt-1">{subgroup.description}</p>}
                              </CardDescription>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGroup(subgroup._id)}
                              className="text-destructive hover:text-destructive"
                              title="Delete sub-group"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Department</p>
                              <Badge>{subgroup.department || "other"}</Badge>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Members</p>
                              <p className="text-lg font-bold text-blue-600">{subgroup.memberCount || 0}</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Permissions</p>
                              <p className="text-lg font-bold text-purple-600">{subgroup.permissions?.length || 0}</p>
                            </div>
                          </div>

                          <div className="border-t pt-3">
                            <p className="text-sm font-semibold text-muted-foreground mb-3">📋 Assigned Resources & Permissions:</p>
                            {(subgroup.permissions || []).length > 0 ? (
                              <div className="space-y-2">
                                {(subgroup.permissions || []).map((perm, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded">
                                    <span className="font-medium text-sm">{perm.resource}</span>
                                    <div className="flex flex-wrap gap-1">
                                      {perm.actions.map((action) => (
                                        <Badge key={action} variant="outline" className="text-xs">
                                          {action}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No permissions assigned</p>
                            )}
                          </div>

                          <div className="pt-3 border-t space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-muted-foreground mb-2">👥 Team Members:</p>
                              {(subgroup.members || []).length > 0 ? (
                                <div className="space-y-2">
                                  {(subgroup.members || []).map((member: any) => {
                                    // Extract user data from nested structure
                                    // Backend returns member with userId object containing actual user data
                                    const userData = member.userId || member
                                    const memberUserId = userData._id || member._id

                                    // Try multiple sources: nested userId object, direct member object, or users list
                                    const userFromList = users.find((u: any) => u._id === memberUserId)

                                    const firstName = userData.firstName || member.firstName || userFromList?.firstName
                                    const lastName = userData.lastName || member.lastName || userFromList?.lastName
                                    const email = userData.email || member.email || userFromList?.email

                                    return (
                                      <div key={memberUserId} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <Avatar className="h-8 w-8 flex-shrink-0 bg-blue-500">
                                            <AvatarFallback className="text-xs font-bold text-white bg-blue-500">
                                              {firstName?.[0]?.toUpperCase()}{lastName?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="min-w-0 flex-1">
                                            <p className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">
                                              {firstName} {lastName}
                                            </p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                              {email}
                                            </p>
                                          </div>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleRemoveUserFromGroup(subgroup._id, memberUserId)}
                                          className="text-destructive hover:text-destructive hover:bg-red-100 dark:hover:bg-red-950 flex-shrink-0"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground italic">No members added</p>
                              )}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full gap-2"
                              onClick={() => setSelectedSubgroupForMember(subgroup._id)}
                            >
                              <Plus className="h-4 w-4" />
                              Add Member
                            </Button>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950 mt-3"
                            onClick={() => setEditingSubgroupId(subgroup._id)}
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit Permissions
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Add Member Modal for this subgroup */}
                      {selectedSubgroupForMember === subgroup._id && (
                        <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950 relative z-50 mt-2">
                          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-lg">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">Add Member to {subgroup.displayName}</CardTitle>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedSubgroupForMember(null)}
                                className="text-white hover:bg-white/20"
                              >
                                <X className="h-5 w-5" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor={`user-select-${subgroup._id}`} className="text-sm font-semibold mb-2 block">
                                  Select User <span className="text-red-500">*</span>
                                </Label>
                                <select
                                  id={`user-select-${subgroup._id}`}
                                  value={selectedUserForGroup || ""}
                                  onChange={(e) => setSelectedUserForGroup(e.target.value)}
                                  className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-green-500 focus:outline-none bg-white dark:bg-slate-900"
                                >
                                  <option value="">Choose a team member...</option>
                                  {users
                                    .filter((u: any) => u.role !== 'super_admin' && u.role !== 'admin' && u.status === 'active')
                                    .map((user) => (
                                      <option key={user._id} value={user._id}>
                                        {user.firstName} {user.lastName} ({user.email})
                                      </option>
                                    ))}
                                </select>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  onClick={() => {
                                    if (selectedUserForGroup && selectedSubgroupForMember) {
                                      handleAddUserToSubgroup(selectedSubgroupForMember, selectedUserForGroup)
                                    }
                                  }}
                                  disabled={!selectedUserForGroup}
                                  className="bg-green-600 hover:bg-green-700 text-white font-semibold gap-2"
                                >
                                  <Plus className="h-4 w-4" />
                                  Add to Sub-group
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedSubgroupForMember(null)
                                    setSelectedUserForGroup(null)
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Edit Permissions Modal for this subgroup */}
                      {editingSubgroupId === subgroup._id && (
                        <Card className="border-2 border-orange-500 bg-orange-50 dark:bg-orange-950 relative z-50 mt-2">
                          <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-t-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg">Edit Permissions - {subgroup.displayName}</CardTitle>
                                <CardDescription className="text-orange-100 mt-1">
                                  Modify permissions for this sub-group
                                </CardDescription>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingSubgroupId(null)
                                  setEditingSubgroupPermissions([])
                                }}
                                className="text-white hover:bg-white/20"
                              >
                                <X className="h-5 w-5" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div className="bg-orange-100 dark:bg-orange-950 p-4 rounded-lg border-l-4 border-orange-600">
                                <p className="text-sm text-orange-800 dark:text-orange-200">
                                  <span className="font-semibold">💡 Note:</span> You can override the parent group's permissions or keep them as inherited
                                </p>
                              </div>

                              <div>
                                <Label className="text-sm font-semibold mb-3 block">Permission Manager</Label>
                                <PermissionManager
                                  allPermissions={PERMISSION_RESOURCES.flatMap((cat) =>
                                    cat.resources.map((resource) => ({
                                      resource,
                                      actions: ACTIONS,
                                    }))
                                  )}
                                  selectedPermissions={editingSubgroupPermissions.length > 0 ? editingSubgroupPermissions : (
                                    subgroup.permissions || []
                                  )}
                                  onPermissionsChange={setEditingSubgroupPermissions}
                                />
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  onClick={() => {
                                    setIsUpdatingPermissions(true)
                                    const permissionsToSave = editingSubgroupPermissions.length > 0 ? editingSubgroupPermissions : (
                                      subgroup.permissions || []
                                    )
                                    handleUpdateSubgroupPermissions(subgroup._id, permissionsToSave).finally(() => {
                                      setIsUpdatingPermissions(false)
                                    })
                                  }}
                                  disabled={isUpdatingPermissions}
                                  className="bg-orange-600 hover:bg-orange-700 text-white font-semibold gap-2"
                                >
                                  {isUpdatingPermissions ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                  {isUpdatingPermissions ? "Saving..." : "Save Permissions"}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setEditingSubgroupId(null)
                                    setEditingSubgroupPermissions([])
                                  }}
                                  disabled={isUpdatingPermissions}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ))
                )}
                {groups.flatMap((g) => g.subGroups || []).length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground font-semibold">No sub-groups yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Create one using the form above
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
        )}

        {/* TEAM LEADS TAB */}
        {activeTab === "team-leads" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Team Lead Form */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Add Team Lead</CardTitle>
                <CardDescription>Assign admin users to groups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="groupSelect">Select Group</Label>
                  <select
                    id="groupSelect"
                    value={selectedGroup?._id || ""}
                    onChange={(e) => {
                      const group = filteredGroups.find(g => g._id === e.target.value)
                      setSelectedGroup(group || null)
                      setMemberPermissions(group?.permissions || [])
                    }}
                    className="w-full px-3 py-2 border rounded-md text-sm mt-2"
                  >
                    <option value="">Choose a group...</option>
                    {filteredGroups.map((group) => (
                      <option key={group._id} value={group._id}>
                        {group.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedGroup && (
                  <>
                    <div>
                      <Label htmlFor="userSelect">Select Team Lead</Label>
                      <select
                        id="userSelect"
                        value={selectedUserForGroup || ""}
                        onChange={(e) => setSelectedUserForGroup(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md text-sm mt-2"
                      >
                        <option value="">Choose a user...</option>
                        {users
                          .filter((u: any) => u.role === 'team_lead' && u.status === 'active')
                          .map((user) => (
                            <option key={user._id} value={user._id}>
                              {user.firstName} {user.lastName} ({user.email})
                            </option>
                          ))}
                      </select>
                    </div>

                    <Button
                      onClick={() => {
                        setMemberRole('team_lead')
                        handleAddUserToGroup()
                      }}
                      disabled={!selectedUserForGroup}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Team Lead
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Team Leads List */}
            <div className="lg:col-span-2 space-y-4">
              {selectedGroup ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedGroup.displayName} - Team Leads</CardTitle>
                      <CardDescription>{selectedGroup.memberCount} members</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedGroup.members && selectedGroup.members.length > 0 ? (
                        <div className="space-y-2">
                          {selectedGroup.members.map((member) => (
                            <div key={member._id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarFallback className="text-xs">
                                    {member.firstName?.[0]}{member.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">{member.firstName} {member.lastName}</p>
                                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveUserFromGroup(selectedGroup._id, member._id)}
                                className="text-destructive hover:text-destructive hover:bg-red-100 dark:hover:bg-red-950 flex-shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center py-8 text-muted-foreground">No team leads added yet</p>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Select a group to view and manage team leads</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
        )}

        {/* TEAM MEMBERS TAB */}
        {activeTab === "team-members" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Team Member Form */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Add Team Member</CardTitle>
                <CardDescription>Assign sub-admin users to groups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="groupSelectMember">Select Group</Label>
                  <select
                    id="groupSelectMember"
                    value={selectedGroup?._id || ""}
                    onChange={(e) => {
                      const group = allGroupsFlattened.find(g => g._id === e.target.value)
                      setSelectedGroup(group || null)
                      setMemberPermissions(group?.permissions || [])
                    }}
                    className="w-full px-3 py-2 border rounded-md text-sm mt-2"
                  >
                    <option value="">Choose a group...</option>
                    {allGroupsFlattened.map((group) => (
                      <option key={group._id} value={group._id}>
                        {group.parentGroupId ? `  ↳ ${group.displayName}` : group.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedGroup && (
                  <>
                    <div>
                      <Label htmlFor="userSelectMember">Select Team Member</Label>
                      <select
                        id="userSelectMember"
                        value={selectedUserForGroup || ""}
                        onChange={(e) => setSelectedUserForGroup(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md text-sm mt-2"
                      >
                        <option value="">Choose a user...</option>
                        {users
                          .filter((u: any) => u.role === 'team_member' && u.status === 'active')
                          .map((user) => (
                            <option key={user._id} value={user._id}>
                              {user.firstName} {user.lastName} ({user.email})
                            </option>
                          ))}
                      </select>
                    </div>

                    <Button
                      onClick={() => {
                        setMemberRole('team_member')
                        handleAddUserToGroup()
                      }}
                      disabled={!selectedUserForGroup}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Team Member
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Team Members List */}
            <div className="lg:col-span-2 space-y-4">
              {selectedGroup ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedGroup.displayName} - Team Members</CardTitle>
                      <CardDescription>{selectedGroup.memberCount} members</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedGroup.members && selectedGroup.members.length > 0 ? (
                        <div className="space-y-2">
                          {selectedGroup.members.map((member) => (
                            <div key={member._id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarFallback className="text-xs">
                                    {member.firstName?.[0]}{member.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">{member.firstName} {member.lastName}</p>
                                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveUserFromGroup(selectedGroup._id, member._id)}
                                className="text-destructive hover:text-destructive hover:bg-red-100 dark:hover:bg-red-950 flex-shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center py-8 text-muted-foreground">No team members added yet</p>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Select a group to view and manage team members</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
        )}

        {/* PERMISSIONS TAB */}
        {activeTab === "permissions" && (
        <div className="space-y-6">
          {/* User Role and Info Card */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Your Permissions</h2>
                <p className="text-blue-100">View your role and assigned permissions</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-xs text-blue-100 mb-1">Your Role</p>
                <p className="text-xl font-bold">{userRole?.replace(/_/g, ' ').toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* User's Groups and Permissions */}
          <Card>
            <CardHeader>
              <CardTitle>Your Group Memberships & Permissions</CardTitle>
              <CardDescription>Groups you belong to and the permissions you have through them</CardDescription>
            </CardHeader>
            <CardContent>
              {groups.length > 0 ? (
                <div className="space-y-4">
                  {groups.flatMap((group) => {
                    const userGroups = []

                    // Check if user is in parent group
                    if (isUserMemberOfGroup(group)) {
                      userGroups.push(group)
                    }

                    // Check if user is in any subgroups
                    if (group.subGroups) {
                      group.subGroups.forEach((subgroup) => {
                        if (isUserMemberOfGroup(subgroup)) {
                          userGroups.push(subgroup)
                        }
                      })
                    }

                    return userGroups
                  }).map((userGroup) => (
                    <Card key={userGroup._id} className="border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Crown className="h-5 w-5 text-green-600" />
                            <div>
                              <CardTitle className="text-lg">{userGroup.displayName}</CardTitle>
                              <CardDescription className="text-sm mt-1">
                                {userGroup.parentGroupId ? (
                                  <Badge variant="secondary" className="text-xs">Sub-group</Badge>
                                ) : (
                                  <Badge className="text-xs">{userGroup.department}</Badge>
                                )}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge className="bg-green-600 text-white">
                            {userGroup.permissions?.length || 0} Permissions
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {userGroup.permissions && userGroup.permissions.length > 0 ? (
                          <div className="space-y-3">
                            {userGroup.permissions.map((perm, idx) => (
                              <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="font-semibold text-sm text-green-700 dark:text-green-300">
                                    {perm.resource}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {perm.actions.map((action) => (
                                    <Badge key={action} variant="outline" className="text-xs bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-700">
                                      ✓ {action}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No permissions assigned to this group</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {groups.flatMap((group) => {
                    const userGroups = []
                    if (isUserMemberOfGroup(group)) userGroups.push(group)
                    if (group.subGroups) {
                      group.subGroups.forEach((subgroup) => {
                        if (isUserMemberOfGroup(subgroup)) userGroups.push(subgroup)
                      })
                    }
                    return userGroups
                  }).length === 0 && (
                    <div className="text-center py-12">
                      <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground font-semibold">No Group Memberships</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        You are not assigned to any groups yet. Contact your administrator to be added to a group.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No groups available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Your Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">
                  {groups.flatMap((group) => {
                    const userGroups = []
                    if (isUserMemberOfGroup(group)) userGroups.push(group)
                    if (group.subGroups) {
                      group.subGroups.forEach((subgroup) => {
                        if (isUserMemberOfGroup(subgroup)) userGroups.push(subgroup)
                      })
                    }
                    return userGroups
                  }).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Groups you belong to</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-indigo-600">
                  {groups.flatMap((group) => {
                    const userGroups = []
                    if (isUserMemberOfGroup(group)) userGroups.push(group)
                    if (group.subGroups) {
                      group.subGroups.forEach((subgroup) => {
                        if (isUserMemberOfGroup(subgroup)) userGroups.push(subgroup)
                      })
                    }
                    return userGroups
                  }).reduce((sum, g) => sum + (g.permissions?.length || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Permission resources assigned</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Your Role Level</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-purple-600">
                  {userRole === 'super_admin' ? 'Full Access' : userRole === 'admin' ? 'Admin' : userRole === 'team_lead' ? 'Lead' : 'Member'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Access level</p>
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
