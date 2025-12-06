import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Plus, Minus, Search } from 'lucide-react'

interface Permission {
  resource: string
  actions: string[]
}

interface PermissionManagerProps {
  allPermissions: Permission[]
  selectedPermissions: Permission[]
  onPermissionsChange: (permissions: Permission[]) => void
}

const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'manage', 'export', 'verify', 'archive']

export default function PermissionManager({
  allPermissions,
  selectedPermissions,
  onPermissionsChange,
}: PermissionManagerProps) {
  const [availableSearch, setAvailableSearch] = useState('')
  const [includedSearch, setIncludedSearch] = useState('')
  const [selectedActions, setSelectedActions] = useState<Record<string, string[]>>({})

  // Deduplicate permissions by resource name (keep first occurrence)
  const deduplicatedAllPermissions = allPermissions.reduce((acc, perm) => {
    if (!acc.find((p) => p.resource === perm.resource)) {
      acc.push(perm)
    }
    return acc
  }, [] as Permission[])

  // Get available permissions (not yet selected)
  const availablePerms = deduplicatedAllPermissions.filter(
    (perm) => !selectedPermissions.find((p) => p.resource === perm.resource)
  )

  // Deduplicate selected permissions as well
  const deduplicatedSelectedPermissions = selectedPermissions.reduce((acc, perm) => {
    if (!acc.find((p) => p.resource === perm.resource)) {
      acc.push(perm)
    }
    return acc
  }, [] as Permission[])

  // Filter based on search
  const filteredAvailable = availablePerms.filter((perm) =>
    perm.resource.toLowerCase().includes(availableSearch.toLowerCase())
  )

  const filteredIncluded = deduplicatedSelectedPermissions.filter((perm) =>
    perm.resource.toLowerCase().includes(includedSearch.toLowerCase())
  )

  const handleAddPermission = (permission: Permission) => {
    // Start with empty actions array - user will select specific actions
    const newPermission = { resource: permission.resource, actions: [] }
    const newPermissions = [...deduplicatedSelectedPermissions, newPermission]
    onPermissionsChange(newPermissions)
    setSelectedActions({ ...selectedActions, [permission.resource]: [] })
  }

  const handleRemovePermission = (resource: string) => {
    const newPermissions = selectedPermissions.filter((p) => p.resource !== resource)
    onPermissionsChange(newPermissions)
    const { [resource]: _, ...rest } = selectedActions
    setSelectedActions(rest)
  }

  const handleToggleAction = (resource: string, action: string) => {
    const currentActions = selectedActions[resource] || []
    const newActions = currentActions.includes(action)
      ? currentActions.filter((a) => a !== action)
      : [...currentActions, action]

    setSelectedActions({ ...selectedActions, [resource]: newActions })

    // Update the permission with new actions
    const updatedPermissions = deduplicatedSelectedPermissions.map((p) =>
      p.resource === resource ? { ...p, actions: newActions } : p
    )
    onPermissionsChange(updatedPermissions)
  }

  return (
    <div className="space-y-4">
      {/* Permission Manager Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Available Permissions */}
        <Card className="border-2 border-gray-200 p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-3">
            <h3 className="font-semibold text-blue-900">Available Permissions ({filteredAvailable.length})</h3>
            <p className="text-xs text-blue-700">Click + to add permissions</p>
          </div>

          <div className="p-4 space-y-2">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search permissions..."
                value={availableSearch}
                onChange={(e) => setAvailableSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Available Permissions List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAvailable.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No available permissions</p>
              ) : (
                filteredAvailable.map((perm) => (
                  <div
                    key={perm.resource}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{perm.resource}</p>
                      <p className="text-xs text-gray-500">
                        {perm.actions.length} actions available
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-2 h-8 w-8 p-0 text-blue-600 hover:bg-blue-100"
                      onClick={() => handleAddPermission(perm)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Included Permissions */}
        <Card className="border-2 border-green-200 p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 px-4 py-3">
            <h3 className="font-semibold text-green-900">Included Permissions ({filteredIncluded.length})</h3>
            <p className="text-xs text-green-700">Configure actions and remove with -</p>
          </div>

          <div className="p-4 space-y-2">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search permissions..."
                value={includedSearch}
                onChange={(e) => setIncludedSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Included Permissions List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredIncluded.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No permissions included yet</p>
              ) : (
                filteredIncluded.map((perm) => (
                  <div key={perm.resource} className="bg-green-50 border border-green-200 rounded-lg p-3">
                    {/* Permission Header */}
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm text-green-900">{perm.resource}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-100"
                        onClick={() => handleRemovePermission(perm.resource)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Actions Selector */}
                    <div className="flex flex-wrap gap-2">
                      {ACTIONS.map((action) => (
                        <Badge
                          key={action}
                          variant="outline"
                          className={`cursor-pointer transition-all ${
                            (selectedActions[perm.resource] || perm.actions)?.includes(action)
                              ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                          }`}
                          onClick={() => handleToggleAction(perm.resource, action)}
                        >
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Summary */}
      {deduplicatedSelectedPermissions.length > 0 && (
        <Card className="bg-blue-50 border-blue-200 p-4">
          <p className="text-sm text-blue-900">
            <strong>{deduplicatedSelectedPermissions.length}</strong> permission(s) selected with{' '}
            <strong>
              {deduplicatedSelectedPermissions.reduce((total, perm) => total + (selectedActions[perm.resource] || perm.actions).length, 0)}
            </strong>{' '}
            total action(s)
          </p>
        </Card>
      )}
    </div>
  )
}
