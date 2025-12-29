import { useState, useMemo, useEffect } from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, CheckCircle, Clock, Eye, XCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { apiCall, API_ENDPOINTS } from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'

interface WithdrawalRequest {
  _id: string
  userId: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  propertyId: {
    _id: string
    title: string
  }
  amount: number
  principalAmount: number
  rentalYieldEarned: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed'
  requestedAt: string
  reviewedAt?: string
  reviewedBy?: {
    firstName: string
    lastName: string
  }
  rejectionReason?: string
  rejectionComment?: string
  groupId?: {
    displayName: string
  }
}

export default function WithdrawalRequests() {
  const { toast } = useToast()
  const { hasPermission, userRole, loading: permissionsLoading } = usePermissions()

  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectComment, setRejectComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Load data on mount and when status filter changes
  useEffect(() => {
    fetchRequests()
  }, [statusFilter])

  // Fetch withdrawal requests
  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await apiCall(
        `${API_ENDPOINTS.ADMIN.LIST_WITHDRAWALS}?status=${statusFilter}`
      )
      setWithdrawalRequests(response?.data || [])
    } catch (error: any) {
      console.error('Error fetching withdrawal requests:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to fetch withdrawal requests',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter requests
  const filteredRequests = useMemo(() => {
    return withdrawalRequests.filter(req => {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        req.userId.firstName.toLowerCase().includes(searchLower) ||
        req.userId.lastName.toLowerCase().includes(searchLower) ||
        req.userId.email.toLowerCase().includes(searchLower) ||
        req.propertyId.title.toLowerCase().includes(searchLower)

      return matchesSearch
    })
  }, [withdrawalRequests, searchQuery])

  // Approve request
  const handleApprove = async () => {
    if (!selectedRequest) return

    try {
      setActionLoading(true)
      const response = await apiCall(
        API_ENDPOINTS.ADMIN.APPROVE_WITHDRAWAL(selectedRequest._id),
        {
          method: 'POST',
          body: JSON.stringify({ action: 'approve' })
        }
      )

      if (response?.success) {
        toast({
          title: 'Success',
          description: `Withdrawal of SAR ${selectedRequest.amount} approved. Money credited to wallet.`
        })
        setShowApproveDialog(false)
        setShowDetailsDialog(false)
        await fetchRequests()
      }
    } catch (error: any) {
      console.error('Error approving request:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to approve withdrawal request',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Reject request
  const handleReject = async () => {
    if (!selectedRequest || !rejectReason) {
      toast({
        title: 'Error',
        description: 'Please select a rejection reason',
        variant: 'destructive'
      })
      return
    }

    try {
      setActionLoading(true)
      const response = await apiCall(
        API_ENDPOINTS.ADMIN.REJECT_WITHDRAWAL(selectedRequest._id),
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'reject',
            rejectionReason: rejectReason,
            rejectionComment: rejectComment
          })
        }
      )

      if (response?.success) {
        toast({
          title: 'Success',
          description: 'Withdrawal request rejected'
        })
        setShowRejectDialog(false)
        setShowDetailsDialog(false)
        setRejectReason('')
        setRejectComment('')
        await fetchRequests()
      }
    } catch (error: any) {
      console.error('Error rejecting request:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to reject withdrawal request',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'approved':
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      case 'rejected':
        return <XCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  // Calculate statistics
  const stats = {
    pending: withdrawalRequests.filter(r => r.status === 'pending').length,
    approved: withdrawalRequests.filter(r => r.status === 'approved').length,
    completed: withdrawalRequests.filter(r => r.status === 'completed').length,
    rejected: withdrawalRequests.filter(r => r.status === 'rejected').length,
    totalAmount: withdrawalRequests.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header with Gradient Background */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Withdrawal Requests</h1>
            <p className="text-blue-100">Manage and approve property investment withdrawals</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-blue-100 text-sm font-medium">Pending Requests</p>
              <p className="text-3xl font-bold mt-1">{stats.pending}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-blue-100 text-sm font-medium">Approved</p>
              <p className="text-3xl font-bold mt-1">{stats.approved}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-blue-100 text-sm font-medium">Completed</p>
              <p className="text-3xl font-bold mt-1">{stats.completed}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-blue-100 text-sm font-medium">Rejected</p>
              <p className="text-3xl font-bold mt-1">{stats.rejected}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-blue-100 text-sm font-medium">Pending Amount</p>
              <p className="text-2xl font-bold mt-1">SAR {(stats.totalAmount / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs for different statuses */}
        <Tabs value={statusFilter} onValueChange={(val) => {
          setStatusFilter(val)
          setSearchQuery('')
        }} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <TabsList className="bg-gray-100 p-1 grid w-full grid-cols-4">
              <TabsTrigger value="pending" className="relative">
                Pending
                {stats.pending > 0 && (
                  <Badge className="ml-2 bg-red-500 hover:bg-red-600">
                    {stats.pending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            {/* Search Bar */}
            <div className="mt-4">
              <Input
                placeholder="Search by investor name, email, or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
          </div>

        {/* Pending Requests Tab */}
        <TabsContent value="pending" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
                <p className="text-gray-600">Loading withdrawal requests...</p>
              </div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4">
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
                <p className="text-gray-700 font-medium">No pending withdrawal requests</p>
                <p className="text-gray-500 text-sm mt-1">All withdrawal requests have been processed</p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => (
              <Card key={request._id} className="bg-white border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Left Section - Investor Info */}
                    <div className="flex-1 border-l-4 border-yellow-400 pl-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Investor</p>
                      <p className="text-lg font-bold text-gray-900">{request.userId.firstName} {request.userId.lastName}</p>
                      <p className="text-sm text-gray-600 mt-1">{request.userId.email}</p>
                      {request.userId.phone && (
                        <p className="text-sm text-gray-500 mt-1">{request.userId.phone}</p>
                      )}
                    </div>

                    {/* Center Section - Property & Amount */}
                    <div className="flex-1">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Property</p>
                          <p className="font-semibold text-gray-900">{request.propertyId.title}</p>
                          {request.groupId && (
                            <Badge className="mt-2 bg-blue-100 text-blue-800 hover:bg-blue-100">{request.groupId.displayName}</Badge>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Withdrawal Amount</p>
                          <p className="text-2xl font-bold text-indigo-600">SAR {request.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Principal: SAR {request.principalAmount.toLocaleString()} | Yield: SAR {request.rentalYieldEarned.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Date & Action */}
                    <div className="flex flex-col items-end justify-between lg:min-w-max">
                      <div className="text-right mb-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Requested On</p>
                        <p className="font-semibold text-gray-900">{new Date(request.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(request.requestedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request)
                          setShowDetailsDialog(true)
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review Request
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Other status tabs */}
        {['approved', 'completed', 'rejected'].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No {status} withdrawal requests</p>
                </CardContent>
              </Card>
            ) : (
              filteredRequests.map((request) => (
                <Card key={request._id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold">{request.userId.firstName} {request.userId.lastName}</span>
                          <Badge className={getStatusColor(request.status)}>
                            {getStatusIcon(request.status)}
                            <span className="ml-1">{request.status}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{request.propertyId.title}</p>
                        <p className="text-sm font-semibold mt-1">SAR {request.amount.toLocaleString()}</p>
                        {request.reviewedBy && (
                          <p className="text-xs text-gray-500 mt-2">
                            Reviewed by {request.reviewedBy.firstName} {request.reviewedBy.lastName} on{' '}
                            {new Date(request.reviewedAt!).toLocaleDateString()}
                          </p>
                        )}
                        {request.rejectionReason && (
                          <div className="mt-2 p-2 bg-red-50 rounded">
                            <p className="text-xs font-semibold text-red-700">Reason: {request.rejectionReason}</p>
                            {request.rejectionComment && (
                              <p className="text-xs text-red-600 mt-1">{request.rejectionComment}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request)
                          setShowDetailsDialog(true)
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
      </div>

      {/* Details Dialog */}
      {selectedRequest && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Withdrawal Request Details</DialogTitle>
              <DialogDescription>
                Review and take action on this withdrawal request
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Investor Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Investor Name</p>
                  <p className="font-semibold">{selectedRequest.userId.firstName} {selectedRequest.userId.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{selectedRequest.userId.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold">{selectedRequest.userId.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge className={`mt-1 ${getStatusColor(selectedRequest.status)}`}>
                    {getStatusIcon(selectedRequest.status)}
                    <span className="ml-1">{selectedRequest.status}</span>
                  </Badge>
                </div>
              </div>

              {/* Withdrawal Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <p className="text-sm text-gray-600">Property</p>
                  <p className="font-semibold">{selectedRequest.propertyId.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-semibold text-lg text-blue-700">SAR {selectedRequest.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Principal Amount</p>
                  <p className="font-semibold">SAR {selectedRequest.principalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rental Yield Earned</p>
                  <p className="font-semibold">SAR {selectedRequest.rentalYieldEarned.toLocaleString()}</p>
                </div>
              </div>

              {/* Reason */}
              <div>
                <p className="text-sm text-gray-600 mb-1">Withdrawal Reason</p>
                <p className="p-3 bg-gray-50 rounded text-sm">{selectedRequest.reason}</p>
              </div>

              {/* Request Timeline */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Requested On</p>
                  <p className="font-semibold">{new Date(selectedRequest.requestedAt).toLocaleString()}</p>
                </div>
                {selectedRequest.reviewedAt && (
                  <div>
                    <p className="text-gray-600">Reviewed On</p>
                    <p className="font-semibold">
                      {new Date(selectedRequest.reviewedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Rejection Details (if rejected) */}
              {selectedRequest.status === 'rejected' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-700 mb-2">Rejection Reason: {selectedRequest.rejectionReason}</p>
                  {selectedRequest.rejectionComment && (
                    <p className="text-sm text-red-600">{selectedRequest.rejectionComment}</p>
                  )}
                </div>
              )}

              {/* Action Buttons - Only show if user has permission */}
              {selectedRequest.status === 'pending' && (
                <DialogFooter className="gap-2">
                  {hasPermission('withdrawals', 'reject') && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setShowDetailsDialog(false)
                        setShowRejectDialog(true)
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Request
                    </Button>
                  )}
                  {hasPermission('withdrawals', 'approve') && (
                    <Button
                      onClick={() => {
                        setShowDetailsDialog(false)
                        setShowApproveDialog(true)
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve & Credit Wallet
                    </Button>
                  )}
                  {!hasPermission('withdrawals', 'approve') && !hasPermission('withdrawals', 'reject') && (
                    <p className="text-sm text-muted-foreground">
                      You don't have permission to approve or reject withdrawal requests
                    </p>
                  )}
                </DialogFooter>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Approve Confirmation Dialog */}
      {selectedRequest && (
        <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Approve Withdrawal Request?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will credit SAR {selectedRequest.amount.toLocaleString()} to {selectedRequest.userId.firstName}'s wallet.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleApprove}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Approve
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Reject Dialog */}
      {selectedRequest && (
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Reject Withdrawal Request
              </DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting this withdrawal request
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                <Select value={rejectReason} onValueChange={setRejectReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insufficient_investment">Insufficient Investment Period</SelectItem>
                    <SelectItem value="maturity_period_active">Maturity Period Still Active</SelectItem>
                    <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                    <SelectItem value="invalid_request">Invalid Request</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rejection-comment">Additional Comments (Optional)</Label>
                <Textarea
                  id="rejection-comment"
                  placeholder="Add any additional details..."
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  className="min-h-24"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason || actionLoading}
              >
                {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reject Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
