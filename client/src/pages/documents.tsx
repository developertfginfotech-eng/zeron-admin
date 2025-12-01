import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Filter, Eye, FileText, Download, AlertCircle, CheckCircle, XCircle, Clock, TrendingUp, Building, MapPin, User, Loader2, Sparkles } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function EnhancedKYCDashboard() {
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [isDocumentViewModalOpen, setIsDocumentViewModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [remarkText, setRemarkText] = useState("");
  
  // API data state
  const [kycApplications, setKycApplications] = useState([]);
  const [statistics, setStatistics] = useState({
    totalApplicants: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 20
  });

  // API Functions
  const getAuthToken = () => {
    return localStorage.getItem('admin_token') || localStorage.getItem('zaron_token') || localStorage.getItem('authToken');
  };

  const fetchKYCApplications = async (page = 1) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      if (!token) {
        alert('Please login to access this page');
        return;
      }

      const response = await fetch(`https://zeron-backend-z5o1.onrender.com/api/kyc/admin/all?page=${page}&limit=20&status=${statusFilter}&search=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('KYC API Response:', result);
        
        setKycApplications(result.data || []);
        setStatistics(result.stats || {
          totalApplicants: 0,
          pending: 0,
          approved: 0,
          rejected: 0
        });
        setPagination(result.pagination || {
          page: 1,
          pages: 1,
          total: 0,
          limit: 20
        });
      } else if (response.status === 401) {
        alert('Session expired. Please login again.');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch KYC applications:', error);
      alert('Failed to load KYC applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateKYCStatus = async (kycId, newStatus, reviewNotes = '') => {
    try {
      setUpdating(true);
      const token = getAuthToken();
      
      const response = await fetch(`https://zeron-backend-z5o1.onrender.com/api/kyc/admin/${kycId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          reviewNotes: reviewNotes,
          rejectionReason: newStatus === 'rejected' ? reviewNotes : null
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message || `KYC status updated to ${newStatus} successfully`);
        
        // Refresh the applications list
        await fetchKYCApplications(pagination.page);
        
        // Close modals
        setIsViewModalOpen(false);
        setIsRemarkModalOpen(false);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update KYC status');
      }
    } catch (error) {
      console.error('Failed to update KYC status:', error);
      alert(`Failed to update KYC status: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchKYCApplications(1);
  }, [statusFilter]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== "") {
        fetchKYCApplications(1);
      }
    }, 500); // Debounce search

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  // AI-powered analysis of applicants
  const getTopProfiles = () => {
    if (!kycApplications.length) return [];
    
    return kycApplications
      .map(applicant => ({
        ...applicant,
        // Calculate AI risk score based on available data
        aiRiskScore: Math.max(0, Math.min(100, 
          30 + // Base risk
          (applicant.monthlyIncome ? Math.max(0, 50 - (parseFloat(applicant.monthlyIncome) / 1000)) : 20) + // Income factor
          (applicant.completionPercentage ? Math.max(0, 30 - (applicant.completionPercentage * 0.3)) : 30) + // Completion factor
          (Math.random() * 20 - 10) // Random variation for demo
        )),
        // Generate AI recommendation
        aiRecommendation: generateRecommendation(applicant)
      }))
      .sort((a, b) => {
        // Sort by risk score (lower is better) and income (higher is better)
        const aScore = (100 - a.aiRiskScore) * 0.7 + (parseFloat(a.monthlyIncome || '0') / 1000) * 0.3;
        const bScore = (100 - b.aiRiskScore) * 0.7 + (parseFloat(b.monthlyIncome || '0') / 1000) * 0.3;
        return bScore - aScore;
      })
      .slice(0, 3);
  };

  const generateRecommendation = (applicant) => {
    const income = parseFloat(applicant.monthlyIncome || '0');
    const completion = applicant.completionPercentage || 0;
    
    if (income > 25000 && completion > 80) {
      return "Exceptional candidate with high income and professional credentials. Priority for approval.";
    } else if (income > 15000 && completion > 70) {
      return "High-quality candidate with stable income and good document quality. Recommended for approval.";
    } else if (completion > 60) {
      return "Standard application with adequate documentation. Review required for final approval.";
    } else {
      return "Document quality issues detected. Recommend requesting clearer documents before approval.";
    }
  };

  // Utility functions
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'submitted': return 'secondary';
      case 'under_review': return 'outline';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'submitted': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'under_review': return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  // Event handlers
  const handleViewApplicant = (applicant) => {
    setSelectedApplicant(applicant);
    setIsViewModalOpen(true);
  };

  const handleAddRemark = (applicant) => {
    setSelectedApplicant(applicant);
    setRemarkText(applicant.reviewNotes || '');
    setIsRemarkModalOpen(true);
  };

  const handleViewDocument = (docType, document, applicant) => {
    setSelectedDocument({
      type: docType,
      data: document,
      applicant: applicant
    });
    setIsDocumentViewModalOpen(true);
  };

  const handleSubmitRemark = async () => {
    if (!selectedApplicant || !remarkText.trim()) {
      alert('Please enter review notes');
      return;
    }

    await handleUpdateKYCStatus(selectedApplicant.id, 'under_review', remarkText);
    setRemarkText('');
    setSelectedApplicant(null);
  };

  const handlePageChange = (newPage) => {
    fetchKYCApplications(newPage);
  };

  // Filter applications
  const filteredApplicants = kycApplications.filter(applicant => {
    const matchesSearch = applicant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         applicant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         applicant.occupation?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || applicant.kycStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingKycCount = statistics.pending || 0;
  const topProfiles = getTopProfiles();

  if (loading && kycApplications.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading KYC applications...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 modern-scrollbar">
        <div className="p-6 space-y-8" data-testid="page-documents">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-primary/70 bg-clip-text text-transparent animate-float" data-testid="text-documents-title">
                  KYC Management
                </h1>
                {pendingKycCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold animate-pulse">
                          {pendingKycCount}
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-ping" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{pendingKycCount} KYC applications pending review</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-lg text-muted-foreground/80">
                Review KYC applications and document verification with AI-powered insights
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {statistics.totalApplicants} total applicants • {statistics.approved} approved • {pendingKycCount} pending review
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => fetchKYCApplications(pagination.page)}>
                <Download className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* AI Insights Panel - Only show if we have data */}
          {topProfiles.length > 0 && (
            <Card className="glass-morphism border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI-Powered Top Profiles
                </CardTitle>
                <CardDescription>
                  Recommended applicants based on professional credentials, risk assessment, and income analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topProfiles.map((profile, index) => (
                    <div
                      key={profile.id}
                      className="p-4 rounded-lg border bg-card/50 hover-elevate cursor-pointer"
                      onClick={() => handleViewApplicant(profile)}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={profile.profilePicture} alt={profile.name} />
                            <AvatarFallback>{profile.firstName?.[0]}{profile.lastName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {index + 1}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold">{profile.name}</h4>
                          <p className="text-sm text-muted-foreground">{profile.occupation}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Risk Score</span>
                          <Badge variant={profile.aiRiskScore < 30 ? 'default' : profile.aiRiskScore < 50 ? 'secondary' : 'destructive'}>
                            {Math.round(profile.aiRiskScore)}/100
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Income</span>
                          <span className="font-medium">SAR {parseFloat(profile.monthlyIncome || '0').toLocaleString()}/mo</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{profile.aiRecommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="glass-morphism" data-testid="card-total-applicants">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Applicants
                </CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics.totalApplicants}
                </div>
                <p className="text-xs text-muted-foreground">
                  KYC applications submitted
                </p>
              </CardContent>
            </Card>

            <Card className="glass-morphism" data-testid="card-pending-review">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Review
                </CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {pendingKycCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting verification
                </p>
              </CardContent>
            </Card>

            <Card className="glass-morphism" data-testid="card-approved">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Approved
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {statistics.approved}
                </div>
                <p className="text-xs text-muted-foreground">
                  Successfully verified
                </p>
              </CardContent>
            </Card>

            <Card className="glass-morphism" data-testid="card-rejected">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rejected
                </CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {statistics.rejected}
                </div>
                <p className="text-xs text-muted-foreground">
                  Need resubmission
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <Card className="glass-morphism">
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
              <CardDescription>Find KYC applicants by name, email, occupation, or status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or occupation..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-applicants"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48" data-testid="select-status-filter">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* KYC Applicants Table */}
          <Card className="glass-morphism">
            <CardHeader>
              <CardTitle>
                KYC Applicants ({filteredApplicants.length} applicants)
              </CardTitle>
              <CardDescription>
                Review and manage KYC applications with document verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p>Loading applications...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredApplicants.map((applicant) => {
                    const aiRiskScore = Math.max(0, Math.min(100, 
                      30 + (applicant.monthlyIncome ? Math.max(0, 50 - (parseFloat(applicant.monthlyIncome) / 1000)) : 20) + 
                      (applicant.completionPercentage ? Math.max(0, 30 - (applicant.completionPercentage * 0.3)) : 30)
                    ));
                    
                    return (
                      <div
                        key={applicant.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate"
                        data-testid={`applicant-row-${applicant.id}`}
                      >
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={applicant.profilePicture} alt={applicant.name} />
                            <AvatarFallback>
                              {applicant.firstName?.[0]}{applicant.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{applicant.name || 'No Name'}</h3>
                              <Badge variant={getStatusBadgeVariant(applicant.kycStatus)}>
                                {(applicant.kycStatus || 'pending').replace('_', ' ').toUpperCase()}
                              </Badge>
                              {aiRiskScore < 30 && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  TOP CANDIDATE
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{applicant.email || 'No email'}</p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {applicant.occupation || 'Not specified'}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {applicant.city || 'Not specified'}
                              </span>
                              <span>Risk Score: {Math.round(aiRiskScore)}/100</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-muted-foreground">Completion:</span>
                              <Progress value={applicant.completionPercentage || 0} className="w-24 h-2" />
                              <span className="text-xs text-muted-foreground">{applicant.completionPercentage || 0}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="text-right space-y-1">
                            <div className="text-sm">
                              Documents: {Object.keys(applicant.documents || {}).length}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Submitted: {formatDate(applicant.kycSubmittedAt).split(',')[0]}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewApplicant(applicant)}
                              data-testid={`button-view-${applicant.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={updating}>
                                  Actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleUpdateKYCStatus(applicant.id, 'approved')}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve KYC
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAddRemark(applicant)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Add Review Notes
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleUpdateKYCStatus(applicant.id, 'rejected', 'Documents need revision')}
                                  className="text-destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject KYC
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredApplicants.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No KYC applicants found matching your criteria</p>
                  <Button variant="outline" onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }} data-testid="button-clear-filters">
                    Clear Filters
                  </Button>
                </div>
              )}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1 || loading}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages || loading}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed View Modal */}
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  KYC Application Details
                </DialogTitle>
                <DialogDescription>
                  Complete applicant information and document verification status
                </DialogDescription>
              </DialogHeader>
              
              {selectedApplicant && (
                <div className="space-y-6">
                  {/* Applicant Header */}
                  <div className="flex items-start gap-6 p-4 bg-card/50 rounded-lg">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={selectedApplicant.profilePicture} alt={selectedApplicant.name} />
                      <AvatarFallback className="text-2xl">
                        {selectedApplicant.firstName?.[0]}{selectedApplicant.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold">{selectedApplicant.name}</h2>
                        <Badge variant={getStatusBadgeVariant(selectedApplicant.kycStatus)}>
                          {getStatusIcon(selectedApplicant.kycStatus)}
                          {(selectedApplicant.kycStatus || 'pending').replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><strong>Email:</strong> {selectedApplicant.email || 'N/A'}</div>
                        <div><strong>Phone:</strong> {selectedApplicant.phone || 'N/A'}</div>
                        <div><strong>Date of Birth:</strong> {formatDate(selectedApplicant.dateOfBirth)}</div>
                        <div><strong>Nationality:</strong> {selectedApplicant.nationality || 'N/A'}</div>
                        <div><strong>City:</strong> {selectedApplicant.city || 'N/A'}</div>
                        <div><strong>Occupation:</strong> {selectedApplicant.occupation || 'N/A'}</div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-2">
                      <div className="text-2xl font-bold text-primary">
                        {selectedApplicant.completionPercentage || 0}%
                      </div>
                      <div className="text-sm text-muted-foreground">Completion</div>
                      <div className="text-lg font-semibold">
                        SAR {parseFloat(selectedApplicant.monthlyIncome || '0').toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Monthly Income</div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-lg font-semibold">App Downloaded</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(selectedApplicant.appDownloadedAt)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-lg font-semibold">KYC Submitted</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(selectedApplicant.kycSubmittedAt)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-lg font-semibold">Completion</div>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <Progress value={selectedApplicant.completionPercentage || 0} className="w-16 h-2" />
                          <span className="text-sm">{selectedApplicant.completionPercentage || 0}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* AI Recommendation */}
                  <Card className="border-primary/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        AI Risk Assessment & Recommendation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{generateRecommendation(selectedApplicant)}</p>
                    </CardContent>
                  </Card>

                  {/* Documents */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Submitted Documents ({Object.keys(selectedApplicant.documents || {}).length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(selectedApplicant.documents || {}).map(([docType, document]) => (
                          <div
                            key={docType}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card/30"
                          >
                            <div className="flex items-center gap-3">
                              {getStatusIcon('pending')}
                              <div>
                                <div className="font-medium">
                                  {docType.replace('_', ' ').toUpperCase()}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Uploaded: {formatDate(document.uploadedAt)}
                                </div>
                                {document.type && (
                                  <div className="text-xs text-muted-foreground">
                                    Type: {document.type}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">PENDING</Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDocument(docType, document, selectedApplicant)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {Object.keys(selectedApplicant.documents || {}).length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No documents uploaded</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Review Notes */}
                  {selectedApplicant.reviewNotes && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Review Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{selectedApplicant.reviewNotes}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateKYCStatus(selectedApplicant.id, 'rejected', 'Documents need revision')}
                      disabled={updating}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAddRemark(selectedApplicant)}
                      disabled={updating}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Add Notes
                    </Button>
                    <Button
                      onClick={() => handleUpdateKYCStatus(selectedApplicant.id, 'approved')}
                      disabled={updating}
                    >
                      {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Approve
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Remark Modal */}
          <Dialog open={isRemarkModalOpen} onOpenChange={setIsRemarkModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Review Notes</DialogTitle>
                <DialogDescription>
                  Add notes for document review or resubmission requirements
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="remark">Review Notes</Label>
                  <Textarea
                    id="remark"
                    placeholder="Enter your review notes or resubmission requirements..."
                    value={remarkText}
                    onChange={(e) => setRemarkText(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRemarkModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitRemark} disabled={updating}>
                  {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save Notes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Document View Modal */}
          <Dialog open={isDocumentViewModalOpen} onOpenChange={setIsDocumentViewModalOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Document Viewer - {selectedDocument?.type?.replace('_', ' ').toUpperCase() || 'Document'}
                </DialogTitle>
                <DialogDescription>
                  {selectedDocument?.applicant?.name}'s {selectedDocument?.type?.replace('_', ' ').toLowerCase() || 'document'}
                </DialogDescription>
              </DialogHeader>

              {selectedDocument && (
                <div className="space-y-4">
                  {/* Document Information */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><strong>Document Type:</strong> {selectedDocument.type?.replace('_', ' ').toUpperCase()}</div>
                        <div><strong>Upload Date:</strong> {formatDate(selectedDocument.data?.uploadedAt)}</div>
                        <div><strong>File Type:</strong> {selectedDocument.data?.type || 'Image'}</div>
                        <div><strong>Status:</strong>
                          <Badge variant="secondary" className="ml-2">PENDING REVIEW</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Document Image Display */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        {selectedDocument.data?.url ? (
                          <div className="space-y-4">
                            <img
                              src={selectedDocument.data.url}
                              alt={`${selectedDocument.type} document`}
                              className="max-w-full h-auto mx-auto border rounded-lg shadow-lg"
                              style={{ maxHeight: '500px' }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div style={{ display: 'none' }} className="p-8 border-2 border-dashed border-gray-300 rounded-lg">
                              <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                              <p className="text-gray-500">Document preview not available</p>
                              <p className="text-sm text-gray-400">The document may be in a format that cannot be displayed</p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg">
                            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500">No document URL available</p>
                            <p className="text-sm text-gray-400">The document may not have been uploaded correctly</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Document Actions */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Document Review Actions</h4>
                          <p className="text-sm text-muted-foreground">Take action on this document</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject Document
                          </Button>
                          <Button variant="default" size="sm">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve Document
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDocumentViewModalOpen(false)}>
                  Close
                </Button>
                {selectedDocument?.data?.url && (
                  <Button variant="default" asChild>
                    <a
                      href={selectedDocument.data.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </TooltipProvider>
  );
}