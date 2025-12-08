const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = 'https://zeron-backend-z5o1.onrender.com';
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
    PROFILE: '/api/auth/profile'
  },
  
  // Admin endpoints
  ADMIN: {
    // Admin user management
    GET_ADMIN_USERS: '/api/admin/admin-users',
    GET_PENDING_ADMINS: '/api/admin/admin-users/pending/list',
    CREATE_ADMIN_USER: '/api/admin/admin-users',
    VERIFY_ADMIN: (id: string) => `/api/admin/admin-users/${id}/verify`,
    GET_ADMIN_USER_DETAILS: (id: string) => `/api/admin/admin-users/${id}`,
    UPDATE_ADMIN_USER_DETAILS: (id: string) => `/api/admin/admin-users/${id}/details`,
    DEACTIVATE_ADMIN_USER: (id: string) => `/api/admin/admin-users/${id}/deactivate`,
    REACTIVATE_ADMIN_USER: (id: string) => `/api/admin/admin-users/${id}/reactivate`,

    // Role management
    PROMOTE_TO_SUPER_ADMIN: (id: string) => `/api/admin/admin-users/${id}/promote-super-admin`,
    UPDATE_ADMIN_ROLE: (id: string) => `/api/admin/admin-users/${id}/role`,

    // User promotion
    GET_ELIGIBLE_USERS: '/api/admin/eligible-users',
    PROMOTE_USER_TO_ADMIN: '/api/admin/promote-user',

    // Regular user management
    LIST_USERS: '/api/admin/users',
    LIST_INVESTORS: '/api/admin/investors',
    UPDATE_KYC_STATUS: (userId: string) => `/api/admin/users/${userId}/kyc-status`,
    UPDATE_KYC: (userId: string) => `/api/admin/users/${userId}/kyc`,
    UPLOAD_KYC_DOCUMENT: (userId: string) => `/api/admin/users/${userId}/kyc-documents`,

    // Property management
    LIST_PROPERTIES: '/api/admin/properties',
    CREATE_PROPERTY: '/api/admin/properties',
    GET_PROPERTY: (id: string) => `/api/admin/properties/${id}`,
    UPDATE_PROPERTY: (id: string) => `/api/admin/properties/${id}`,
    DELETE_PROPERTY: (id: string) => `/api/admin/properties/${id}`,
    DEACTIVATE_PROPERTY: (id: string) => `/api/admin/properties/${id}/deactivate`,

    // Reports
    EARNINGS_REPORT: '/api/admin/reports/earnings',
    DASHBOARD: '/api/admin/dashboard',

    // Withdrawal requests
    LIST_WITHDRAWALS: '/api/admin/withdrawal-requests',
    GET_WITHDRAWAL: (id: string) => `/api/admin/withdrawal-requests/${id}`,
    APPROVE_WITHDRAWAL: (id: string) => `/api/admin/withdrawal-requests/${id}/approve`,
    REJECT_WITHDRAWAL: (id: string) => `/api/admin/withdrawal-requests/${id}/reject`
  },
  
  // Public property endpoints
  PROPERTIES: {
    LIST: '/api/properties',
    GET: (id: string) => `/api/properties/${id}`,
    SEARCH: '/api/properties/search'
  },

  // Investment settings endpoints
  INVESTMENTS: {
    GET_SETTINGS: '/api/investments/settings',
    CREATE_SETTINGS: '/api/investments/settings',
    UPDATE_SETTINGS: (id: string) => `/api/investments/settings/${id}`
  }
};

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken') || 
         localStorage.getItem('token') || 
         sessionStorage.getItem('authToken') ||
         sessionStorage.getItem('token');
};

// Regular API call helper
export const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = getAuthToken();
  
  const defaultOptions: RequestInit = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  };

  const finalOptions: RequestInit = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log(`Making API call to: ${fullUrl}`);

  try {
    const response = await fetch(fullUrl, finalOptions);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } else {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
      }
      
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
};

// API call helper for file uploads
export const apiCallWithFiles = async (endpoint: string, formData: FormData, options: RequestInit = {}): Promise<any> => {
  const token = getAuthToken();
  
  const defaultOptions: RequestInit = {
    method: 'POST',
    headers: {
      // Don't set Content-Type for FormData, let browser set it with boundary
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  };

  const finalOptions: RequestInit = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
    body: formData,
  };

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log(`Making file upload API call to: ${fullUrl}`);

  try {
    const response = await fetch(fullUrl, finalOptions);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
      }
      
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error(`File upload API call failed for ${endpoint}:`, error);
    throw error;
  }
};

// Export base URL for direct usage if needed
export { API_BASE_URL };