const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isDevelopment ? 'http://localhost:5000' : 'http://13.53.177.188:5000';

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
    // User management
    LIST_USERS: '/api/admin/users',
    UPDATE_KYC: (userId: string) => `/api/admin/users/${userId}/kyc`,
    
    // Property management
    LIST_PROPERTIES: '/api/admin/properties',
    CREATE_PROPERTY: '/api/admin/properties',
    GET_PROPERTY: (id: string) => `/api/admin/properties/${id}`,
    UPDATE_PROPERTY: (id: string) => `/api/admin/properties/${id}`,
    DELETE_PROPERTY: (id: string) => `/api/admin/properties/${id}`,
    DEACTIVATE_PROPERTY: (id: string) => `/api/admin/properties/${id}/deactivate`,
    
    // Reports
    EARNINGS_REPORT: '/api/admin/reports/earnings',
    DASHBOARD: '/api/admin/dashboard'
  },
  
  // Public property endpoints
  PROPERTIES: {
    LIST: '/api/properties',
    GET: (id: string) => `/api/properties/${id}`,
    SEARCH: '/api/properties/search'
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