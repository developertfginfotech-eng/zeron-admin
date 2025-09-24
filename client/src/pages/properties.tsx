import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PropertyCard } from "@/components/property-card"
import { PropertyForm } from "@/components/property-form"
import { OTPVerificationPage } from "@/components/otp-verification-page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Search, Filter, Plus, ArrowLeft, Shield, AlertTriangle, Loader2, Clock, User } from "lucide-react"
import { API_ENDPOINTS, apiCall, apiCallWithFiles } from "@/lib/api"

// Backend property interface
interface BackendProperty {
  _id: string;
  title: string;
  titleAr?: string;
  description?: string;
  location: {
    city: string;
    district: string;
    address: string;
    addressAr?: string;
  };
  images: Array<{
    url: string;
    alt: string;
    isPrimary: boolean;
    _id: string;
  } | string>;
  financials: {
    totalValue: number;
    pricePerShare: number;
    availableShares: number;
    projectedYield: number;
    minInvestment: number;
    currentValue: number;
  };
  propertyType: 'residential' | 'commercial' | 'retail';
  status: 'active' | 'upcoming' | 'fully_funded' | 'completed' | 'cancelled' | 'closed';
  investorCount: number;
  fundingProgress: number;
  analytics?: {
    views: number;
    monthlyRevenue: number;
    totalRevenue: number;
    occupancyRate: number;
  };
  isActive: boolean;
  createdAt: string;
}

// Frontend property interface
interface FrontendProperty {
  id: string;
  title: string;
  description: string;
  location: string;
  price: string;
  propertyType: 'residential' | 'commercial' | 'retail';
  yield: string;
  ownershipCap: number;
  status: 'live' | 'upcoming' | 'closed';
  images: string[];
  totalInvestment: string;
  investorCount: number;
  currentOwnership: string;
  monthlyRevenue: string;
  totalRevenue: string;
  occupancyRate: string;
  performance: 'excellent' | 'good' | 'stable';
  lastDividendDate: Date | null;
  deactivationReason: string | null;
  deactivatedAt: Date | null;
  deactivatedBy: string | null;
  createdAt: Date;
}

export default function Properties() {
  const { toast } = useToast()
  
  // API State
  const [properties, setProperties] = useState<FrontendProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // UI State
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<FrontendProperty | null>(null)
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [authPassword, setAuthPassword] = useState("")
  const [deactivationReason, setDeactivationReason] = useState("")
  const [deactivationComment, setDeactivationComment] = useState("")

  // OTP State - Updated
  const [showOTPPage, setShowOTPPage] = useState(false)
  const [otpOperation, setOtpOperation] = useState<{type: string, data: any} | null>(null)

  // FIXED: Map backend property to frontend format with correct status handling
  const mapBackendToFrontend = (backendProp: BackendProperty): FrontendProperty => {
    const totalInvestmentAmount = (backendProp.financials.totalValue * (backendProp.fundingProgress || 0)) / 100;
    
    const processImages = (images: any[]): string[] => {
      const fallbackImages = {
        residential: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=300&fit=crop',
        commercial: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
        retail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop'
      };
      
      if (!images || images.length === 0) {
        return [fallbackImages[backendProp.propertyType] || fallbackImages.residential];
      }
      
      return images.map(img => {
        if (typeof img === 'object' && img.url) {
          if (img.url.startsWith('/uploads/')) {
            return `http://localhost:5000${img.url}`;
          }
          if (img.url.startsWith('http')) {
            return img.url;
          }
          return fallbackImages[backendProp.propertyType] || fallbackImages.residential;
        }
        
        if (typeof img === 'string') {
          if (img.startsWith('/uploads/')) {
            return `http://localhost:5000${img}`;
          }
          if (img.startsWith('http')) {
            return img;
          }
          return fallbackImages[backendProp.propertyType] || fallbackImages.residential;
        }
        
        return fallbackImages[backendProp.propertyType] || fallbackImages.residential;
      });
    };
    
    // FIXED: Comprehensive status mapping function
    const mapStatus = (backendStatus: string): 'live' | 'upcoming' | 'closed' => {
      switch (backendStatus.toLowerCase()) {
        case 'active':
          return 'live';
        case 'upcoming':
          return 'upcoming';
        case 'fully_funded':
          return 'upcoming';
        case 'completed':
        case 'cancelled':
        case 'closed':
        case 'draft':
          return 'closed';
        default:
          console.warn(`Unknown backend status: ${backendStatus}, defaulting to 'closed'`);
          return 'closed';
      }
    };
    
    return {
      id: backendProp._id,
      title: backendProp.title,
      description: backendProp.description || backendProp.titleAr || 'Property description not available',
      location: `${backendProp.location.address || backendProp.location.district || ''}, ${backendProp.location.city}`,
      price: backendProp.financials.totalValue.toString(),
      propertyType: backendProp.propertyType,
      yield: backendProp.financials.projectedYield.toString(),
      ownershipCap: Math.round(backendProp.fundingProgress || 0),
      status: mapStatus(backendProp.status), // Use the improved mapping function
      images: processImages(backendProp.images),
      totalInvestment: totalInvestmentAmount.toString(),
      investorCount: backendProp.investorCount || 0,
      currentOwnership: (backendProp.fundingProgress || 0).toString(),
      monthlyRevenue: backendProp.analytics?.monthlyRevenue?.toString() || '0',
      totalRevenue: backendProp.analytics?.totalRevenue?.toString() || '0',
      occupancyRate: backendProp.analytics?.occupancyRate?.toString() || '0',
      performance: (backendProp.fundingProgress || 0) > 80 ? 'excellent' : 
                  (backendProp.fundingProgress || 0) > 50 ? 'good' : 'stable',
      lastDividendDate: null,
      deactivationReason: null,
      deactivatedAt: null,
      deactivatedBy: null,
      createdAt: new Date(backendProp.createdAt),
    };
  };

  // FIXED: Map frontend property to backend format with correct status handling
  const mapFrontendToBackend = (frontendProp: FrontendProperty) => {
    const locationParts = frontendProp.location.split(',');
    const district = locationParts[0]?.trim() || '';
    const city = locationParts[1]?.trim() || 'riyadh';
    
    // FIXED: Handle frontend to backend status mapping
    const mapStatusToBackend = (frontendStatus: string): string => {
      switch (frontendStatus) {
        case 'live':
          return 'active';
        case 'upcoming':
          return 'upcoming';
        case 'closed':
          return 'closed';
        default:
          return 'active';
      }
    };
    
    return {
      title: frontendProp.title,
      description: frontendProp.description,
      propertyType: frontendProp.propertyType,
      location: frontendProp.location,
      price: frontendProp.price,
      yield: frontendProp.yield,
      status: mapStatusToBackend(frontendProp.status),
      existingImages: frontendProp.images
    };
  };

  // Fetch properties from backend
  const fetchProperties = async (filters?: any) => {
    try {
      setLoading(true);
      setError(null);
      
      let url = API_ENDPOINTS.ADMIN.LIST_PROPERTIES;
      if (filters && Object.keys(filters).length > 0) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value as string);
        });
        url += `?${params.toString()}`;
      }
      
      console.log('Fetching properties from:', url);
      const response = await apiCall(url);
      console.log('Raw backend response:', response);
      
      const backendProperties = response.data.properties || [];
      console.log('Backend properties count:', backendProperties.length);
      
      const mappedProperties = backendProperties.map((prop: BackendProperty, index: number) => {
        console.log(`Mapping property ${index + 1}:`, {
          title: prop.title,
          backendStatus: prop.status,
          _id: prop._id
        });
        
        const mapped = mapBackendToFrontend(prop);
        console.log(`Mapped to frontend:`, {
          title: mapped.title,
          frontendStatus: mapped.status,
          id: mapped.id
        });
        
        return mapped;
      });
      
      console.log('Final mapped properties:', mappedProperties.length);
      setProperties(mappedProperties);
    } catch (err: any) {
      console.error('Error fetching properties:', err);
      setError(err.message);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch single property by ID
  const fetchPropertyById = async (id: string): Promise<FrontendProperty | null> => {
    try {
      const response = await apiCall(API_ENDPOINTS.ADMIN.GET_PROPERTY(id));
      if (response.success && response.data) {
        return mapBackendToFrontend(response.data);
      }
      return null;
    } catch (error: any) {
      console.error('Error fetching property by ID:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch property details.",
        variant: "destructive"
      });
      return null;
    }
  };

  // Search properties
  const searchProperties = async (searchParams: any) => {
    try {
      setLoading(true);
      setError(null);
      
      let url = API_ENDPOINTS.ADMIN.LIST_PROPERTIES;
      const params = new URLSearchParams();
      
      if (searchParams.q) params.append('search', searchParams.q);
      if (searchParams.status) params.append('status', searchParams.status);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await apiCall(url);
      const backendProperties = response.data.properties || [];
      const mappedProperties = backendProperties.map(mapBackendToFrontend);
      setProperties(mappedProperties);
    } catch (err: any) {
      setError(err.message);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Create new property with correct status mapping
  const createProperty = async (formData: any) => {
    const uploadData = new FormData();
    
    console.log('Creating property with form data:', formData);
    
    // Add basic property data
    uploadData.append('title', formData.title || '');
    uploadData.append('description', formData.description || '');
    uploadData.append('propertyType', formData.propertyType || 'residential');
    
    // Add OTP if provided
    if (formData.otp) {
      uploadData.append('otp', formData.otp);
    }
    
    // FIXED: Handle status mapping for creation
    let backendStatus = 'active';
    if (formData.status) {
      switch (formData.status) {
        case 'live':
          backendStatus = 'active';
          break;
        case 'upcoming':
          backendStatus = 'upcoming'; // Fixed: was 'fully_funded'
          break;
        case 'closed':
          backendStatus = 'closed';
          break;
        default:
          backendStatus = 'active';
      }
    }
    uploadData.append('status', backendStatus);
    console.log('Backend status being sent:', backendStatus);
    
    // Parse location
    const locationParts = (formData.location || '').split(',');
    const district = locationParts[0]?.trim() || '';
    const city = locationParts[1]?.trim() || 'riyadh';
    
    uploadData.append('location', JSON.stringify({
      address: formData.location || '',
      addressAr: formData.location || '',
      city: city.toLowerCase(),
      district: district,
      coordinates: { latitude: null, longitude: null }
    }));
    
    // Add financials
    const totalValue = parseFloat(formData.price || '0');
    const totalShares = 100;
    
    uploadData.append('financials', JSON.stringify({
      totalValue: totalValue,
      currentValue: totalValue,
      totalShares: totalShares,
      availableShares: totalShares,
      pricePerShare: totalValue / totalShares,
      minInvestment: Math.max(1000, totalValue * 0.01),
      projectedYield: parseFloat(formData.yield || '0'),
      managementFee: 2.5
    }));
    
    // Add images if they exist
    if (formData.images && formData.images.length > 0) {
      formData.images.forEach((image: File) => {
        uploadData.append('images', image);
      });
    }
    
    const response = await apiCallWithFiles(API_ENDPOINTS.ADMIN.CREATE_PROPERTY, uploadData);
    console.log('Property creation response:', response);
    return response;
  };

  // FIXED: Update property with correct status mapping
  const updateProperty = async (propertyId: string, formData: any) => {
    const uploadData = new FormData();
    
    console.log('Updating property with form data:', formData);
    
    // Add basic property data
    uploadData.append('title', formData.title || '');
    uploadData.append('description', formData.description || '');
    uploadData.append('propertyType', formData.propertyType || 'residential');
    
    // Add OTP if provided
    if (formData.otp) {
      uploadData.append('otp', formData.otp);
    }
    
    // FIXED: Handle status mapping from frontend to backend
    let backendStatus = 'active';
    if (formData.status) {
      switch (formData.status) {
        case 'live':
          backendStatus = 'active';
          break;
        case 'upcoming':
          backendStatus = 'upcoming'; // Fixed: was 'fully_funded'
          break;
        case 'closed':
          backendStatus = 'closed';
          break;
        default:
          backendStatus = 'active';
      }
    }
    uploadData.append('status', backendStatus);
    console.log('Backend status being sent for update:', backendStatus);
    
    // Parse location
    const locationParts = (formData.location || '').split(',');
    const district = locationParts[0]?.trim() || '';
    const city = locationParts[1]?.trim() || 'riyadh';
    
    uploadData.append('location', JSON.stringify({
      address: formData.location || '',
      addressAr: formData.location || '',
      city: city.toLowerCase(),
      district: district,
      coordinates: { latitude: null, longitude: null }
    }));
    
    // Include financial fields
    const totalValue = parseFloat(formData.price || '0');
    const totalShares = 100;
    
    uploadData.append('financials', JSON.stringify({
      totalValue: totalValue,
      currentValue: totalValue,
      totalShares: totalShares,
      availableShares: totalShares,
      pricePerShare: totalValue / totalShares,
      minInvestment: Math.max(1000, totalValue * 0.01),
      projectedYield: parseFloat(formData.yield || '0'),
      managementFee: 2.5
    }));
    
    // Add new images if they exist
    if (formData.images && formData.images.length > 0) {
      formData.images.forEach((image: any) => {
        if (image instanceof File) {
          uploadData.append('images', image);
        }
      });
    }
    
    const response = await apiCallWithFiles(API_ENDPOINTS.ADMIN.UPDATE_PROPERTY(propertyId), uploadData, {
      method: 'PATCH'
    });
    
    console.log('Property update response:', response);
    return response;
  };

  // Delete property
  const deleteProperty = async (propertyId: string, formData?: any) => {
    const requestBody: any = {};
    
    // Add OTP if provided
    if (formData?.otp) {
      requestBody.otp = formData.otp;
    }
    
    const response = await apiCall(API_ENDPOINTS.ADMIN.DELETE_PROPERTY(propertyId), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined
    });
    return response;
  };

  // Initial load
  useEffect(() => {
    fetchProperties();
  }, []);

  // FIXED: Debounced search effect with correct status mapping
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm || statusFilter !== "all") {
        const filters: any = {};
        if (searchTerm) filters.q = searchTerm;
        if (statusFilter !== "all") {
          // Map frontend filter values to backend values
          switch (statusFilter) {
            case "live":
              filters.status = "active";
              break;
            case "upcoming":
              filters.status = "upcoming,fully_funded"; // Handle both backend statuses
              break;
            case "closed":
              filters.status = "closed,completed,cancelled,draft";
              break;
          }
        }
        
        if (Object.keys(filters).length > 0) {
          searchProperties(filters);
        } else {
          fetchProperties();
        }
      } else {
        fetchProperties();
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, statusFilter]);

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || property.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleAddProperty = () => {
    setEditingProperty(null)
    setShowForm(true)
  }

  const handleEditProperty = async (id: string) => {
    const property = await fetchPropertyById(id);
    if (property) {
      setEditingProperty(property);
      setShowForm(true);
    }
  }

  const handleDeleteProperty = async (id: string) => {
    const property = properties.find(p => p.id === id);
    if (!property) return;

    // Only allow deletion of non-live properties without investments
    if (property.status === 'live' || Number(property.totalInvestment || 0) > 0) {
      toast({
        title: "Cannot Delete Property",
        description: "Live properties with investments cannot be deleted. Use deactivate instead.",
        variant: "destructive"
      });
      return;
    }

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete "${property.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Set up for OTP flow
      setOtpOperation({type: 'delete', data: { propertyId: id, property }});
      
      // Try deletion (this will trigger OTP request)
      const response = await deleteProperty(id);
      
      // If response indicates OTP required, show OTP page
      if (response.data?.step === 'otp_required') {
        setShowOTPPage(true);
        return;
      }
      
      // If successful without OTP (shouldn't happen with our system)
      setProperties(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Property Deleted",
        description: "Property has been successfully deleted.",
      });
    } catch (error: any) {
      console.error('Delete property error:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete property.",
        variant: "destructive"
      });
    }
  };

  const handleDeactivateProperty = (id: string) => {
    setSelectedPropertyId(id)
    setIsDeactivateDialogOpen(true)
  }

  const handleConfirmDeactivation = async () => {
    const DUMMY_PASSWORD = "1234";
    
    if (authPassword !== DUMMY_PASSWORD) {
      toast({
        title: "Invalid Password",
        description: "Please enter the correct 4-digit authentication code.",
        variant: "destructive"
      })
      return
    }

    if (!deactivationReason) {
      toast({
        title: "Reason Required",
        description: "Please select a reason for deactivation.",
        variant: "destructive"
      })
      return
    }

    if (!selectedPropertyId) return

    try {
      // This would be a separate deactivation API call
      // For now, just update local state
      setProperties(prev => prev.map(property => 
        property.id === selectedPropertyId 
          ? {
              ...property,
              status: 'closed' as const,
              deactivationReason,
              deactivatedAt: new Date(),
              deactivatedBy: 'admin-current'
            }
          : property
      ));

      setIsDeactivateDialogOpen(false);
      setSelectedPropertyId(null);
      setAuthPassword("");
      setDeactivationReason("");
      setDeactivationComment("");

      toast({
        title: "Property Deactivated",
        description: "Property has been successfully deactivated and marked as closed.",
      });
    } catch (error: any) {
      console.error('Deactivation error:', error);
      toast({
        title: "Deactivation Failed",
        description: error.message || "Failed to deactivate property.",
        variant: "destructive"
      });
    }
  }

  const handleCancelDeactivation = () => {
    setIsDeactivateDialogOpen(false)
    setSelectedPropertyId(null)
    setAuthPassword("")
    setDeactivationReason("")
    setDeactivationComment("")
  }

  // Form submit with OTP handling
  const handleFormSubmit = async (data: any) => {
    try {
      console.log('Property form submitted:', data);
      
      setLoading(true);
      
      if (editingProperty) {
        const response = await updateProperty(editingProperty.id, data);
        console.log('Update response:', response);
        
        // If response indicates OTP required, show OTP page
        if (response.data?.step === 'otp_required') {
          setOtpOperation({type: 'update', data});
          setShowOTPPage(true);
          setLoading(false);
          return;
        }
        
        toast({
          title: "Property Updated",
          description: "Property has been successfully updated.",
        });
      } else {
        const response = await createProperty(data);
        console.log('Create response:', response);
        
        // If response indicates OTP required, show OTP page  
        if (response.data?.step === 'otp_required') {
          setOtpOperation({type: 'create', data});
          setShowOTPPage(true);
          setLoading(false);
          return;
        }
        
        toast({
          title: "Property Created", 
          description: "Property has been successfully created.",
        });
      }
      
      setShowForm(false);
      setEditingProperty(null);
      await fetchProperties();
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save property.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // OTP verification handler
  const handleOTPVerify = async (otp: string) => {
    if (!otpOperation) return;

    try {
      setLoading(true);
      
      const dataWithOTP = { ...otpOperation.data, otp };
      
      if (otpOperation.type === 'create') {
        await createProperty(dataWithOTP);
        toast({
          title: "Property Created",
          description: "Property has been successfully created.",
        });
        setShowForm(false);
        setEditingProperty(null);
      } else if (otpOperation.type === 'update') {
        await updateProperty(editingProperty!.id, dataWithOTP);
        toast({
          title: "Property Updated", 
          description: "Property has been successfully updated.",
        });
        setShowForm(false);
        setEditingProperty(null);
      } else if (otpOperation.type === 'delete') {
        await deleteProperty(otpOperation.data.propertyId, { otp });
        
        // Remove from local state
        setProperties(prev => prev.filter(p => p.id !== otpOperation.data.propertyId));
        
        toast({
          title: "Property Deleted",
          description: "Property has been successfully deleted.",
        });
      }
      
      setShowOTPPage(false);
      setOtpOperation(null);
      await fetchProperties();
      
    } catch (error: any) {
      console.error('OTP verification error:', error);
      throw new Error(error.message || "Invalid OTP or operation failed");
    } finally {
      setLoading(false);
    }
  };

  // OTP cancellation handler
  const handleOTPCancel = () => {
    setShowOTPPage(false);
    setOtpOperation(null);
    setLoading(false);
  };

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingProperty(null)
  }

  const deactivationReasons = [
    { value: "maintenance_required", label: "Maintenance Required" },
    { value: "market_conditions", label: "Unfavorable Market Conditions" },
    { value: "regulatory_issues", label: "Regulatory Issues" },
    { value: "investor_request", label: "Investor Request" },
    { value: "performance_issues", label: "Performance Issues" },
    { value: "strategic_decision", label: "Strategic Business Decision" },
    { value: "other", label: "Other" }
  ]

  // OTP Page Render
  if (showOTPPage && otpOperation) {
    return (
      <OTPVerificationPage
        operation={otpOperation.type as 'create' | 'update' | 'delete'}
        propertyTitle={otpOperation.data.title || otpOperation.data.property?.title || 'Property'}
        onVerify={handleOTPVerify}
        onCancel={handleOTPCancel}
        loading={loading}
      />
    );
  }

  // Loading state
  if (loading && properties.length === 0) {
    return (
      <div className="p-6 space-y-6" data-testid="page-properties-loading">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Property Management</h1>
            <p className="text-muted-foreground">Manage property listings and track investment opportunities</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-muted-foreground">Loading properties...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error && properties.length === 0) {
    return (
      <div className="p-6 space-y-6" data-testid="page-properties-error">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Property Management</h1>
            <p className="text-muted-foreground">Manage property listings and track investment opportunities</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-8 w-8 text-destructive mb-4" />
            <p className="text-destructive mb-4">Error loading properties: {error}</p>
            <Button onClick={() => fetchProperties()} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="p-6 space-y-6" data-testid="page-property-form">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleFormCancel} data-testid="button-back-to-properties">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Button>
          <h1 className="text-3xl font-bold">
            {editingProperty ? 'Edit Property' : 'Add New Property'}
          </h1>
        </div>
        <PropertyForm
          initialData={editingProperty ? mapFrontendToBackend(editingProperty) : null}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-properties">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-properties-title">Property Management</h1>
          <p className="text-muted-foreground">Manage property listings and track investment opportunities</p>
        </div>
        <Button onClick={handleAddProperty} data-testid="button-add-property">
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>

      

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find properties by title, location, or status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-properties"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            Properties ({filteredProperties.length})
          </h2>
          <div className="flex gap-2">
            <Badge variant="outline">
              {properties.filter(p => p.status === 'live').length} Live
            </Badge>
            <Badge variant="outline">
              {properties.filter(p => p.status === 'upcoming').length} Upcoming
            </Badge>
            <Badge variant="outline">
              {properties.filter(p => p.status === 'closed').length} Closed
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProperties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onEdit={handleEditProperty}
            onDelete={handleDeleteProperty}
            onDeactivate={handleDeactivateProperty}
          />
        ))}
      </div>

      {filteredProperties.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No properties found matching your criteria</p>
            <Button variant="outline" onClick={() => {
              setSearchTerm("")
              setStatusFilter("all")
            }} data-testid="button-clear-filters">
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Deactivation Dialog */}
      <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              Deactivate Property
            </DialogTitle>
            <DialogDescription>
              This will deactivate the property and mark it as closed. This action requires authentication and a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800 dark:text-orange-200">Warning</span>
              </div>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                This property has active investments. Deactivating will mark it as closed but preserve investor data and history.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth-password">4-Digit Authentication Code</Label>
              <Input
                id="auth-password"
                type="password"
                placeholder="Enter 4-digit code"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                maxLength={4}
                className="text-center text-lg tracking-widest"
                data-testid="input-deactivation-password"
              />
              <p className="text-xs text-muted-foreground">
                Demo code: 1234
              </p>
            </div>

            <div className="space-y-2">
              <Label>Deactivation Reason</Label>
              <Select value={deactivationReason} onValueChange={setDeactivationReason}>
                <SelectTrigger data-testid="select-deactivation-reason">
                  <SelectValue placeholder="Select reason for deactivation" />
                </SelectTrigger>
                <SelectContent>
                  {deactivationReasons.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deactivation-comment">Additional Comments (Optional)</Label>
              <Textarea
                id="deactivation-comment"
                placeholder="Provide additional details about the deactivation..."
                value={deactivationComment}
                onChange={(e) => setDeactivationComment(e.target.value)}
                rows={3}
                data-testid="textarea-deactivation-comment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDeactivation}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmDeactivation}
              disabled={authPassword !== "1234" || !deactivationReason}
              variant="destructive"
              data-testid="button-confirm-deactivation"
            >
              Deactivate Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}