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

// Configuration - CORRECTED BASE URL
const API_BASE_URL = 'https://zeron-backend-z5o1.onrender.com';

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
  investmentTerms?: {
    targetReturn?: number;
    rentalYieldRate?: number | null;
    appreciationRate?: number | null;
    lockingPeriodYears?: number | null;
    bondMaturityYears?: number | null;
    investmentDurationYears?: number | null;
    earlyWithdrawalPenaltyPercentage?: number | null;
    graduatedPenalties?: Array<{
      year: number;
      penaltyPercentage: number;
    }>;
  };
  managementFees?: {
    percentage: number;
    isActive: boolean;
    deductionType: 'upfront' | 'annual' | 'monthly';
    totalFeesCollected: number;
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
  investmentTerms?: BackendProperty['investmentTerms'];
  managementFees?: BackendProperty['managementFees'];
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
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [authPassword, setAuthPassword] = useState("")
  const [deactivationReason, setDeactivationReason] = useState("")
  const [deactivationComment, setDeactivationComment] = useState("")

  // OTP State - Updated
  const [showOTPPage, setShowOTPPage] = useState(false)
  const [otpOperation, setOtpOperation] = useState<{type: string, data: any} | null>(null)

  // FIXED: Map backend property to frontend format with CORRECTED image URL processing
  const mapBackendToFrontend = (backendProp: BackendProperty): FrontendProperty => {
    const totalInvestmentAmount = (backendProp.financials.totalValue * (backendProp.fundingProgress || 0)) / 100;
    
    // CORRECTED: processImages function with proper URL construction
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
        let imageUrl = '';
        
        // Handle object format with url property
        if (typeof img === 'object' && img.url) {
          imageUrl = img.url;
        }
        // Handle string format
        else if (typeof img === 'string') {
          imageUrl = img;
        }
        else {
          // Fallback for unknown format
          return fallbackImages[backendProp.propertyType] || fallbackImages.residential;
        }
        
        // CORRECTED: Process the URL with the right base URL (no /api needed for images)
        if (imageUrl.startsWith('/uploads/')) {
          const fullUrl = `${API_BASE_URL}${imageUrl}`;
          console.log('Generated image URL:', fullUrl); // Debug log
          return fullUrl;
        }
        
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          return imageUrl;
        }
        
        // If it's a relative path without /uploads/, assume it's from uploads
        if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
          return `${API_BASE_URL}/uploads/${imageUrl}`;
        }
        
        // Fallback if URL processing fails
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
        case 'inactive':
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
      location: backendProp.location
        ? `${backendProp.location.address || backendProp.location.district || ''}, ${backendProp.location.city || 'Riyadh'}`
        : 'Location not specified',
      price: (backendProp.financials?.totalValue || 0).toString(),
      propertyType: backendProp.propertyType,
      yield: (backendProp.financials?.projectedYield || 0).toString(),
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
      // ADDED: Preserve investment terms and management fees for the property form
      investmentTerms: backendProp.investmentTerms,
      managementFees: backendProp.managementFees,
    };
  };

  // FIXED: Map frontend property to backend format with ALL fields including investment terms
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
      _id: frontendProp.id,
      title: frontendProp.title,
      description: frontendProp.description,
      propertyType: frontendProp.propertyType,
      location: frontendProp.location,
      status: mapStatusToBackend(frontendProp.status),
      images: frontendProp.images,
      financials: {
        totalValue: parseFloat(frontendProp.price || '0'),
        currentValue: parseFloat(frontendProp.price || '0'),
        totalShares: 100,
        availableShares: 100,
        pricePerShare: parseFloat(frontendProp.price || '0') / 100,
        projectedYield: parseFloat(frontendProp.yield || '0'),
        monthlyRental: parseFloat(frontendProp.monthlyRevenue || '0'),
        minInvestment: Math.max(1000, parseFloat(frontendProp.price || '0') * 0.01)
      },
      investmentTerms: {
        rentalYieldRate: frontendProp.rentalYieldRate || null,
        appreciationRate: frontendProp.appreciationRate || null,
        lockingPeriodYears: frontendProp.lockingPeriodYears || null,
        earlyWithdrawalPenaltyPercentage: frontendProp.earlyWithdrawalPenalty || null
      }
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
          _id: prop._id,
          images: prop.images
        });
        
        const mapped = mapBackendToFrontend(prop);
        console.log(`Mapped to frontend:`, {
          title: mapped.title,
          frontendStatus: mapped.status,
          id: mapped.id,
          images: mapped.images
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

  // Fetch property for editing - returns raw backend format with all fields
  const fetchPropertyForEdit = async (id: string): Promise<BackendProperty | null> => {
    try {
      const response = await apiCall(API_ENDPOINTS.ADMIN.GET_PROPERTY(id));
      if (response.success && response.data) {
        return response.data; // Return raw backend data with all fields
      }
      return null;
    } catch (error: any) {
      console.error('Error fetching property for edit:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch property for editing.",
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

  const createProperty = async (formData: any) => {
  console.log('Creating property with structured data:', formData);
  console.log('Has image file:', formData.image ? 'YES' : 'NO');

  // Check if we have files to upload
  const hasFiles = formData.image && formData.image instanceof File;

  if (hasFiles) {
    // Use FormData for file uploads
    const uploadData = new FormData();

    // Add basic fields
    uploadData.append('title', formData.title || '');
    uploadData.append('description', formData.description || '');
    uploadData.append('propertyType', formData.propertyType || 'residential');

    // Add OTP if provided
    if (formData.otp) {
      uploadData.append('otp', formData.otp);
    }

    // Handle status mapping
    let backendStatus = 'active';
    if (formData.status) {
      switch (formData.status) {
        case 'live':
          backendStatus = 'active';
          break;
        case 'upcoming':
          backendStatus = 'upcoming';
          break;
        case 'closed':
          backendStatus = 'closed';
          break;
        default:
          backendStatus = 'active';
      }
    }
    uploadData.append('status', backendStatus);

    // Add complex objects as JSON strings (for FormData)
    uploadData.append('location', JSON.stringify(formData.location));
    uploadData.append('financials', JSON.stringify(formData.financials));

    // Add investment terms if provided
    if (formData.investmentTerms) {
      uploadData.append('investmentTerms', JSON.stringify(formData.investmentTerms));
    }

    // Add management fees if provided
    if (formData.managementFees) {
      uploadData.append('managementFees', JSON.stringify(formData.managementFees));
    }

    // Add file - use 'image' field name to match backend multer.single('image')
    if (formData.image instanceof File) {
      uploadData.append('image', formData.image);
      console.log('✓ Appended image file to FormData:', formData.image.name, 'Size:', formData.image.size, 'Type:', formData.image.type);
    }
    
    console.log('FormData contents:');
    for (let [key, value] of uploadData.entries()) {
      console.log(key, value);
    }
    
    const response = await apiCallWithFiles(API_ENDPOINTS.ADMIN.CREATE_PROPERTY, uploadData);
    console.log('Property creation response:', response);
    return response;
    
  } else {
    // Use JSON for requests without files
    const requestData = {
      title: formData.title || '',
      description: formData.description || '',
      propertyType: formData.propertyType || 'residential',
      status: formData.status || 'active',
      location: formData.location,    // Direct object
      financials: formData.financials, // Direct object
      investmentTerms: formData.investmentTerms, // Direct object
      managementFees: formData.managementFees, // Direct object
      otp: formData.otp
    };
    
    // Handle status mapping
    if (formData.status) {
      switch (formData.status) {
        case 'live':
          requestData.status = 'active';
          break;
        case 'upcoming':
          requestData.status = 'upcoming';
          break;
        case 'closed':
          requestData.status = 'closed';
          break;
        default:
          requestData.status = 'active';
      }
    }
    
    console.log('JSON request data:', requestData);
    
    const response = await apiCall(API_ENDPOINTS.ADMIN.CREATE_PROPERTY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    console.log('Property creation response:', response);
    return response;
  }
}

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
    
    // Parse location - handle both string (new property) and object (edit mode)
    let locationAddress = '';
    let locationCity = 'riyadh';
    let locationDistrict = '';

    if (typeof formData.location === 'object' && formData.location !== null) {
      // Location is an object (from backend)
      locationAddress = formData.location.address || '';
      locationCity = formData.location.city || 'riyadh';
      locationDistrict = formData.location.district || '';
    } else {
      // Location is a string (new property)
      const locationParts = (formData.location || '').split(',');
      locationAddress = formData.location || '';
      locationDistrict = locationParts[0]?.trim() || '';
      locationCity = locationParts[1]?.trim() || 'riyadh';
    }

    uploadData.append('location', JSON.stringify({
      address: locationAddress,
      addressAr: locationAddress,
      city: locationCity.toLowerCase(),
      district: locationDistrict,
      coordinates: { latitude: null, longitude: null }
    }));
    
    // Include financial fields - use financials object if provided, otherwise fallback to price/yield
    const totalValue = formData.financials?.totalValue || parseFloat(formData.price || '0');
    const totalShares = formData.financials?.totalShares || 100;
    const availableShares = formData.financials?.availableShares || totalShares;
    const projectedYield = formData.financials?.projectedYield || parseFloat(formData.yield || '0');
    const pricePerShare = formData.financials?.pricePerShare || (totalValue / totalShares);
    const minInvestment = formData.financials?.minimumInvestment || Math.max(1000, totalValue * 0.01);
    const monthlyRental = formData.financials?.monthlyRental || 0;

    uploadData.append('financials', JSON.stringify({
      totalValue: totalValue,
      currentValue: formData.financials?.currentValue || totalValue,
      totalShares: totalShares,
      availableShares: availableShares,
      pricePerShare: pricePerShare,
      minInvestment: minInvestment,
      projectedYield: projectedYield,
      monthlyRental: monthlyRental,
      managementFee: 2.5
    }));

    // Include investment terms if provided
    if (formData.investmentTerms) {
      uploadData.append('investmentTerms', JSON.stringify({
        targetReturn: formData.investmentTerms.targetReturn || 0,
        rentalYieldRate: formData.investmentTerms.rentalYieldRate,
        appreciationRate: formData.investmentTerms.appreciationRate,
        lockingPeriodYears: formData.investmentTerms.lockingPeriodYears,
        bondMaturityYears: formData.investmentTerms.bondMaturityYears,
        investmentDurationYears: formData.investmentTerms.investmentDurationYears,
        earlyWithdrawalPenaltyPercentage: formData.investmentTerms.earlyWithdrawalPenaltyPercentage,
        graduatedPenalties: formData.investmentTerms.graduatedPenalties || []
      }));
    }

    // Include management fees if provided
    if (formData.managementFees) {
      uploadData.append('managementFees', JSON.stringify({
        isActive: formData.managementFees.isActive || false,
        percentage: formData.managementFees.percentage || 0,
        deductionType: formData.managementFees.deductionType || 'upfront',
        totalFeesCollected: formData.managementFees.totalFeesCollected || 0
      }));
    }

    // Add new image if it exists - use 'image' field name to match backend multer.single('image')
    if (formData.image && formData.image instanceof File) {
      uploadData.append('image', formData.image);
      console.log('✓ Appended image file to FormData for update:', formData.image.name, 'Size:', formData.image.size, 'Type:', formData.image.type);
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
    const property = await fetchPropertyForEdit(id);
    if (property) {
      setEditingProperty(property as any); // Store backend format for editing
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
      setLoading(true);

      // Call backend API to deactivate property
      const response = await apiCall(
        `/api/properties/${selectedPropertyId}/deactivate`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            reason: deactivationReason,
            comment: deactivationComment
          })
        }
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to deactivate property");
      }

      // Refresh properties list to get updated data
      await fetchProperties();

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
    } finally {
      setLoading(false);
    }
  }

  const handleCancelDeactivation = () => {
    setIsDeactivateDialogOpen(false)
    setSelectedPropertyId(null)
    setAuthPassword("")
    setDeactivationReason("")
    setDeactivationComment("")
  }

  const handleActivateProperty = (id: string) => {
    setSelectedPropertyId(id)
    setIsActivateDialogOpen(true)
  }

  const handleConfirmActivation = async () => {
    const DUMMY_PASSWORD = "1234";

    if (authPassword !== DUMMY_PASSWORD) {
      toast({
        title: "Invalid Password",
        description: "Please enter the correct 4-digit authentication code.",
        variant: "destructive"
      })
      return
    }

    if (!selectedPropertyId) return

    try {
      setLoading(true);

      // Call backend API to activate property
      const response = await apiCall(
        `/api/properties/${selectedPropertyId}/activate`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to activate property");
      }

      // Refresh properties list to get updated data
      await fetchProperties();

      setIsActivateDialogOpen(false);
      setSelectedPropertyId(null);
      setAuthPassword("");

      toast({
        title: "Property Activated",
        description: "Property has been successfully reactivated.",
      });
    } catch (error: any) {
      console.error('Activation error:', error);
      toast({
        title: "Activation Failed",
        description: error.message || "Failed to activate property.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  const handleCancelActivation = () => {
    setIsActivateDialogOpen(false)
    setSelectedPropertyId(null)
    setAuthPassword("")
  }

  // Form submit with OTP handling
  const handleFormSubmit = async (data: any) => {
    try {
      console.log('Property form submitted:', data);
      
      setLoading(true);
      
      if (editingProperty) {
        const propertyId = editingProperty._id || editingProperty.id;
        console.log('Editing property ID:', propertyId);
        if (!propertyId) {
          throw new Error('Property ID is missing');
        }
        const response = await updateProperty(propertyId, data);
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
        const propertyId = editingProperty!._id || editingProperty!.id;
        console.log('OTP Verify - Property ID:', propertyId);
        if (!propertyId) {
          throw new Error('Property ID is missing in OTP verification');
        }
        await updateProperty(propertyId, dataWithOTP);
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
          initialData={editingProperty}
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
            onActivate={handleActivateProperty}
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

      {/* Activation Dialog */}
      <Dialog open={isActivateDialogOpen} onOpenChange={setIsActivateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Activate Property
            </DialogTitle>
            <DialogDescription>
              This will reactivate the property and mark it as active. This action requires authentication.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">Notice</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                This will make the property active again. Investor data and history will be preserved.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth-password-activate">4-Digit Authentication Code</Label>
              <Input
                id="auth-password-activate"
                type="password"
                placeholder="Enter 4-digit code"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                maxLength={4}
                className="text-center text-lg tracking-widest"
                data-testid="input-activation-password"
              />
              <p className="text-xs text-muted-foreground">
                Demo code: 1234
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelActivation}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmActivation}
              disabled={authPassword !== "1234"}
              variant="default"
              data-testid="button-confirm-activation"
            >
              Activate Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}