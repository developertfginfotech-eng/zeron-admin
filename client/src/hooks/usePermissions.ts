import { useState, useEffect } from 'react';
import { apiCall } from '@/lib/api';

interface Permission {
  resource: string;
  actions: string[];
}

interface UserPermissions {
  userId: string;
  userName: string;
  email: string;
  role: string;
  effectivePermissions: Permission[];
}

/**
 * Hook to fetch and manage user permissions
 * Automatically fetches permissions on mount and provides a function to check permissions
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch permissions on mount
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true);
        const response = await apiCall('/api/admin/my-permissions');

        if (response.success) {
          setPermissions(response.data.effectivePermissions || []);
          setUserRole(response.data.role);
        } else {
          setError('Failed to fetch permissions');
        }
      } catch (err: any) {
        console.error('Error fetching permissions:', err);
        setError(err.message || 'Failed to fetch permissions');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  /**
   * Check if user has a specific permission
   * @param resource - The resource to check (e.g., 'kyc:approval', 'withdrawals', 'properties')
   * @param action - The action to check (e.g., 'approve', 'reject', 'view', 'edit')
   * @returns boolean - true if user has permission, false otherwise
   */
  const hasPermission = (resource: string, action: string): boolean => {
    // Only super admin has all permissions
    if (userRole === 'super_admin') {
      return true;
    }

    // All other users (admin, team_lead, team_member) get permissions from their groups
    // Check if user has the specific permission from their group assignments
    const permission = permissions.find(p => p.resource === resource);
    return permission ? permission.actions.includes(action) : false;
  };

  /**
   * Check if user has any of the specified permissions
   * @param checks - Array of { resource, action } pairs
   * @returns boolean - true if user has at least one permission
   */
  const hasAnyPermission = (checks: Array<{ resource: string; action: string }>): boolean => {
    return checks.some(({ resource, action }) => hasPermission(resource, action));
  };

  /**
   * Check if user has all of the specified permissions
   * @param checks - Array of { resource, action } pairs
   * @returns boolean - true if user has all permissions
   */
  const hasAllPermissions = (checks: Array<{ resource: string; action: string }>): boolean => {
    return checks.every(({ resource, action }) => hasPermission(resource, action));
  };

  return {
    permissions,
    loading,
    error,
    userRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
}
