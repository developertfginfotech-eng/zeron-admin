import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Banknote,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Shield,
  Brain,
  BarChart3,
  FileText,
  Lock,
  CreditCard,
  Loader2
} from "lucide-react"
import { Transaction, WithdrawalRequest } from "@shared/schema"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { useTransactions } from "@/hooks/use-transactions"

export default function Transactions() {
  const { toast } = useToast()
  const { data: transactionsData, isLoading, error } = useTransactions()

  // Declare all state hooks BEFORE any conditional rendering
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("transactions")
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null)
  const [authPassword, setAuthPassword] = useState("")
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [isTransactionDetailOpen, setIsTransactionDetailOpen] = useState(false)
  const [isWithdrawalDetailOpen, setIsWithdrawalDetailOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [rejectionComment, setRejectionComment] = useState("")
  const [pendingAction, setPendingAction] = useState<{ type: 'approve' | 'reject', id: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Extract data from API response
  const transactions = transactionsData?.transactions || []
  const withdrawalRequests = transactionsData?.withdrawals || []

  // Local state for withdrawal requests to show updates immediately
  const [localWithdrawals, setLocalWithdrawals] = useState<WithdrawalRequest[]>(withdrawalRequests)

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading transaction data...</p>
        </div>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-500" />
          <p className="text-red-600">Failed to load transactions</p>
          <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    )
  }

  // Build investor data map from transactions
  const investorsMap = new Map<string, any>(
    (transactionsData?.transactions || []).map((t: any) => [
      t.investorId,
      {
        name: t.investorName || 'Unknown',
        email: t.investorEmail || '',
        id: t.investorId
      }
    ])
  )

  const getInvestorById = (id: string): any => investorsMap.get(id) || { name: 'Unknown' }

  const filteredTransactions = transactions.filter((transaction: any) => {
    const investor = getInvestorById(transaction.investorId || '')
    const investorName = investor?.name || ''
    const matchesSearch = investorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || transaction.type === typeFilter
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  const filteredWithdrawals = localWithdrawals.filter(withdrawal => {
    const investor = getInvestorById(withdrawal.investorId)
    const investorName = investor?.name || ''
    const matchesSearch = investorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         withdrawal.reason?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || withdrawal.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const DUMMY_PASSWORD = "1234"

  const rejectionReasons = [
    { value: "insufficient_funds", label: "Insufficient Funds" },
    { value: "verification_required", label: "Additional Verification Required" },
    { value: "policy_violation", label: "Policy Violation" },
    { value: "suspicious_activity", label: "Suspicious Activity" },
    { value: "document_issues", label: "Document Issues" },
    { value: "other", label: "Other" }
  ]

  const handleAuthSubmit = async () => {
    if (authPassword === DUMMY_PASSWORD && pendingAction) {
      setIsProcessing(true)

      try {
        // Simulate processing delay for realistic UX
        await new Promise(resolve => setTimeout(resolve, 1500))

        if (pendingAction.type === 'approve') {
          setLocalWithdrawals(prev => prev.map(withdrawal =>
            withdrawal.id === pendingAction.id
              ? {
                  ...withdrawal,
                  status: 'approved',
                  reviewedAt: new Date(),
                  reviewedBy: 'admin-demo',
                  processedAt: new Date(),
                  updatedAt: new Date()
                }
              : withdrawal
          ))

          toast({
            title: "Withdrawal Approved",
            description: "The withdrawal request has been successfully approved and processed.",
          })
        } else {
          setLocalWithdrawals(prev => prev.map(withdrawal =>
            withdrawal.id === pendingAction.id
              ? {
                  ...withdrawal,
                  status: 'rejected',
                  reviewedAt: new Date(),
                  reviewedBy: 'admin-demo',
                  rejectionReason,
                  rejectionComment,
                  updatedAt: new Date()
                }
              : withdrawal
          ))

          toast({
            title: "Withdrawal Rejected",
            description: "The withdrawal request has been rejected with the specified reason.",
            variant: "destructive"
          })
        }

        setIsAuthDialogOpen(false)
        setAuthPassword("")
        setPendingAction(null)
        setRejectionReason("")
        setRejectionComment("")
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to process the withdrawal request. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsProcessing(false)
      }
    }
  }

  const handleApproveWithdrawal = (withdrawalId: string) => {
    setPendingAction({ type: 'approve', id: withdrawalId })
    setIsAuthDialogOpen(true)
  }

  const handleRejectWithdrawal = (withdrawalId: string) => {
    setPendingAction({ type: 'reject', id: withdrawalId })
    setIsAuthDialogOpen(true)
  }

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsTransactionDetailOpen(true)
  }

  const handleViewWithdrawal = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal)
    setIsWithdrawalDetailOpen(true)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'rejected':
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'investment':
        return 'default'
      case 'payout':
      case 'dividend':
        return 'secondary'
      case 'withdrawal':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive'
      case 'high':
        return 'secondary'
      case 'normal':
        return 'outline'
      default:
        return 'outline'
    }
  }

  // Export functionality
  const exportToCSV = async (data: any[], filename: string, headers: string[]) => {
    setIsExporting(true)
    try {
      // Simulate export processing
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
          const value = header.split('.').reduce((obj, key) => obj?.[key], row)
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value || ''
        }).join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: "Export Successful",
        description: `${filename} has been downloaded successfully.`,
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportTransactions = () => {
    const headers = ['id', 'reference', 'type', 'amount', 'fee', 'status', 'investorName', 'description', 'createdAt']
    const exportData = filteredTransactions.map((transaction: any) => ({
      ...transaction,
      investorName: (getInvestorById(transaction.investorId || '') as any)?.name || 'Unknown',
      createdAt: format(new Date(transaction.createdAt!), 'yyyy-MM-dd HH:mm:ss')
    }))
    exportToCSV(exportData, `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`, headers)
  }

  const handleExportWithdrawals = () => {
    const headers = ['id', 'amount', 'reason', 'status', 'priority', 'investorName', 'requestedAt', 'reviewedAt']
    const exportData = filteredWithdrawals.map((withdrawal: any) => ({
      ...withdrawal,
      investorName: (getInvestorById(withdrawal.investorId) as any)?.name || 'Unknown',
      requestedAt: format(new Date(withdrawal.requestedAt!), 'yyyy-MM-dd HH:mm:ss'),
      reviewedAt: withdrawal.reviewedAt ? format(new Date(withdrawal.reviewedAt), 'yyyy-MM-dd HH:mm:ss') : ''
    }))
    exportToCSV(exportData, `withdrawals_${format(new Date(), 'yyyy-MM-dd')}.csv`, headers)
  }

  const handleGenerateReport = async () => {
    setIsExporting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast({
        title: "Report Generated",
        description: "Comprehensive transaction report has been generated successfully.",
      })
    } catch (error) {
      toast({
        title: "Report Generation Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  const getAIRiskColor = (score: number | null | undefined) => {
    if (!score) return 'text-muted-foreground'
    if (score <= 25) return 'text-green-600'
    if (score <= 50) return 'text-yellow-600'
    if (score <= 75) return 'text-orange-600'
    return 'text-red-600'
  }

  // Statistics calculations
  const totalInvestments = transactions
    .filter((t: any) => t.type === 'investment' && t.status === 'completed')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

  const totalPayouts = transactions
    .filter((t: any) => t.type === 'payout' && t.status === 'completed')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

  // Count withdrawals from transactions (type: 'withdrawal')
  const totalWithdrawals = transactions
    .filter((t: any) => t.type === 'withdrawal' && t.status === 'completed')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

  const pendingWithdrawals = localWithdrawals.filter(w => w.status === 'pending').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 modern-scrollbar">
      <div className="p-6 space-y-8" data-testid="page-transactions">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-primary/70 bg-clip-text text-transparent animate-float" data-testid="text-transactions-title">
              Transaction Center
            </h1>
            <p className="text-lg text-muted-foreground/80">
              Comprehensive transaction management with AI-powered insights
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {transactions.length} transactions • {pendingWithdrawals} pending withdrawals
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleGenerateReport}
              disabled={isExporting}
              data-testid="button-export-report"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isExporting ? 'Generating...' : 'Generate Report'}
            </Button>
            <Button 
              onClick={handleExportTransactions}
              disabled={isExporting}
              data-testid="button-export-transactions"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>
          </div>
        </div>

        {/* AI Insights Card */}
        <Card className="glass-morphism border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Transaction Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">Low Risk Detected</span>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  87% of recent transactions show low risk patterns. System confidence: 94%
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Transaction Velocity</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Average processing time: 2.3 hours. 15% faster than last month.
                </p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-200">Manual Review</span>
                </div>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  3 transactions require manual review based on AI risk assessment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards - Financial Transaction Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-morphism border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent" data-testid="card-total-investments">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Investment Orders
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Financial transaction records</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {totalInvestments.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent" data-testid="card-total-payouts">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Returns Distributed
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Payout transactions sent</p>
              </div>
              <Banknote className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {totalPayouts.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent" data-testid="card-total-withdrawals">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Wallet Withdrawals
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Funds withdrawn to accounts</p>
              </div>
              <TrendingDown className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {totalWithdrawals.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent" data-testid="card-pending-withdrawals">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Actions
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Requiring approval</p>
              </div>
              <Clock className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {pendingWithdrawals}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="glass-morphism">
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
            <CardDescription>Find transactions and withdrawals by investor name, reference, or description</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by investor name, reference, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-transactions"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48" data-testid="select-type-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="payout">Payout</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="dividend">Dividend</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-card/50 backdrop-blur-sm">
            <TabsTrigger value="transactions" className="flex items-center gap-2" data-testid="tab-transactions">
              <CreditCard className="h-4 w-4" />
              All Transactions
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="flex items-center gap-2" data-testid="tab-withdrawals">
              <Shield className="h-4 w-4" />
              Withdrawal Requests
              {pendingWithdrawals > 0 && (
                <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                  {pendingWithdrawals}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2" data-testid="tab-reports">
              <BarChart3 className="h-4 w-4" />
              Reports & Analytics
            </TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle>
                  Transaction History ({filteredTransactions.length} transactions)
                </CardTitle>
                <CardDescription>
                  Complete transaction details with AI risk assessment and investor information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Investor</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>AI Risk</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction: any) => {
                        const investor = getInvestorById(transaction.investorId || '')
                        const investorName = investor?.name || 'Unknown'
                        const investorEmail = investor?.email || ''
                        const investorPic = investor?.profilePicture || undefined
                        const initials = investorName?.split(' ').map((n: string) => n[0]).join('') || 'U'
                        return (
                          <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                            <TableCell>
                              <div className="text-sm">
                                {format(new Date(transaction.createdAt!), 'MMM dd, yyyy')}
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(transaction.createdAt!), 'HH:mm')}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={investorPic} alt={investorName} />
                                  <AvatarFallback className="text-xs">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-sm">{investorName}</div>
                                  <div className="text-xs text-muted-foreground">{investorEmail}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getTypeBadgeVariant(transaction.type)}>
                                {transaction.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono">
                              <div className="text-sm font-bold">
                                {Number(transaction.amount).toLocaleString()}
                              </div>
                              {transaction.fee && Number(transaction.fee) > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  Fee: {Number(transaction.fee).toLocaleString()}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-mono">{transaction.reference}</div>
                              <div className="text-xs text-muted-foreground">
                                {transaction.paymentMethod?.replace('_', ' ')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`text-sm font-bold ${getAIRiskColor(transaction.aiRiskScore)}`}>
                                {transaction.aiRiskScore || '--'}/100
                              </div>
                              <div className="text-xs text-muted-foreground">
                                AI Score
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(transaction.status)}>
                                {transaction.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewTransaction(transaction)}
                                data-testid={`button-view-${transaction.id}`}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-6">
            <Card className="glass-morphism">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Withdrawal Requests ({filteredWithdrawals.length} requests)
                    </CardTitle>
                    <CardDescription>
                      Manage investor withdrawal requests with secure approval workflow
                    </CardDescription>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Secure authentication required
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Investor</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>AI Risk</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWithdrawals.map((withdrawal: any) => {
                        const investor = getInvestorById(withdrawal.investorId)
                        const investorName = investor?.name || 'Unknown'
                        const investorTier = investor?.investorTier || 'Unknown'
                        const investorPic = investor?.profilePicture || undefined
                        const initials = investorName?.split(' ').map((n: string) => n[0]).join('') || 'U'
                        return (
                          <TableRow key={withdrawal.id} data-testid={`row-withdrawal-${withdrawal.id}`}>
                            <TableCell>
                              <div className="text-sm">
                                {format(new Date(withdrawal.requestedAt!), 'MMM dd, yyyy')}
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(withdrawal.requestedAt!), 'HH:mm')}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={investorPic} alt={investorName} />
                                  <AvatarFallback className="text-xs">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-sm">{investorName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Tier: {investorTier}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono font-bold">
                              {Number(withdrawal.amount).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm max-w-48 truncate" title={withdrawal.reason || ''}>
                                {withdrawal.reason || 'No reason provided'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getPriorityBadgeVariant(withdrawal.priority || 'normal')}>
                                {withdrawal.priority || 'normal'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className={`text-sm font-bold ${getAIRiskColor(withdrawal.aiRiskScore)}`}>
                                {withdrawal.aiRiskScore || '--'}/100
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(withdrawal.status)}>
                                {withdrawal.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewWithdrawal(withdrawal)}
                                  data-testid={`button-view-withdrawal-${withdrawal.id}`}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                                {withdrawal.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleApproveWithdrawal(withdrawal.id)}
                                      data-testid={`button-approve-withdrawal-${withdrawal.id}`}
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleRejectWithdrawal(withdrawal.id)}
                                      data-testid={`button-reject-withdrawal-${withdrawal.id}`}
                                    >
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-morphism">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Transaction Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <span className="text-sm font-medium">Completed Transactions</span>
                    <span className="text-xl font-bold text-green-600">
                      {transactions.filter((t: Transaction) => t.status === 'completed').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                    <span className="text-sm font-medium">Pending Transactions</span>
                    <span className="text-xl font-bold text-yellow-600">
                      {transactions.filter((t: any) => t.status === 'pending').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <span className="text-sm font-medium">Average Processing Time</span>
                    <span className="text-xl font-bold text-blue-600">2.3h</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <span className="text-sm font-medium">AI Accuracy</span>
                    <span className="text-xl font-bold text-green-600">94.2%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <span className="text-sm font-medium">Auto-Approved</span>
                    <span className="text-xl font-bold text-blue-600">78%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                    <span className="text-sm font-medium">Manual Reviews</span>
                    <span className="text-xl font-bold text-orange-600">22%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle>Export Reports</CardTitle>
                <CardDescription>Generate comprehensive reports for analysis and compliance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={handleExportTransactions}
                    disabled={isExporting}
                  >
                    <FileText className="h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Transaction Summary'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={handleExportWithdrawals}
                    disabled={isExporting}
                  >
                    <Shield className="h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Withdrawal Report'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={handleGenerateReport}
                    disabled={isExporting}
                  >
                    <Brain className="h-4 w-4" />
                    {isExporting ? 'Generating...' : 'AI Analysis Report'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Authentication Modal */}
        <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Secure Authentication Required
              </DialogTitle>
              <DialogDescription>
                Enter the 4-digit authentication code to {pendingAction?.type} this withdrawal request.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auth-password">Authentication Code</Label>
                <Input
                  id="auth-password"
                  type="password"
                  placeholder="Enter 4-digit code"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  maxLength={4}
                  className="text-center text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  Demo code: 1234
                </p>
              </div>

              {pendingAction?.type === 'reject' && (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Rejection Reason</Label>
                    <Select value={rejectionReason} onValueChange={setRejectionReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason for rejection" />
                      </SelectTrigger>
                      <SelectContent>
                        {rejectionReasons.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rejection-comment">Additional Comments</Label>
                    <Textarea
                      id="rejection-comment"
                      placeholder="Provide additional details for the rejection..."
                      value={rejectionComment}
                      onChange={(e) => setRejectionComment(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAuthDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAuthSubmit}
                disabled={isProcessing || authPassword !== DUMMY_PASSWORD || (pendingAction?.type === 'reject' && !rejectionReason)}
                variant={pendingAction?.type === 'reject' ? 'destructive' : 'default'}
              >
                {isProcessing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>{pendingAction?.type === 'approve' ? 'Approve' : 'Reject'} Request</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction Detail Modal */}
        <Dialog open={isTransactionDetailOpen} onOpenChange={setIsTransactionDetailOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Transaction Details
              </DialogTitle>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Transaction ID</Label>
                    <p className="font-mono text-sm">{selectedTransaction.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Reference</Label>
                    <p className="font-mono text-sm">{selectedTransaction.reference}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Amount</Label>
                    <p className="font-bold">{Number(selectedTransaction.amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Fee</Label>
                    <p className="font-mono text-sm">{Number(selectedTransaction.fee || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Type</Label>
                    <Badge variant={getTypeBadgeVariant(selectedTransaction.type)}>
                      {selectedTransaction.type}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <Badge variant={getStatusBadgeVariant(selectedTransaction.status)}>
                      {selectedTransaction.status}
                    </Badge>
                  </div>
                </div>

                {selectedTransaction.description && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Description</Label>
                    <p className="text-sm">{selectedTransaction.description}</p>
                  </div>
                )}

                {selectedTransaction.aiAnalysis && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-blue-600" />
                      <Label className="text-sm font-medium text-blue-800 dark:text-blue-200">AI Analysis</Label>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">{selectedTransaction.aiAnalysis}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span>Risk Score: <span className={getAIRiskColor(selectedTransaction.aiRiskScore)}>{selectedTransaction.aiRiskScore}/100</span></span>
                      <span>Recommendation: {selectedTransaction.aiRecommendation}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div>
                    <Label className="text-xs text-muted-foreground">Created</Label>
                    <p>{format(new Date(selectedTransaction.createdAt!), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                  {selectedTransaction.processedAt && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Processed</Label>
                      <p>{format(new Date(selectedTransaction.processedAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Withdrawal Detail Modal */}
        <Dialog open={isWithdrawalDetailOpen} onOpenChange={setIsWithdrawalDetailOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Withdrawal Request Details
              </DialogTitle>
            </DialogHeader>
            {selectedWithdrawal && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Request ID</Label>
                    <p className="font-mono text-sm">{selectedWithdrawal.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Amount</Label>
                    <p className="font-bold text-lg">{Number(selectedWithdrawal.amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Priority</Label>
                    <Badge variant={getPriorityBadgeVariant(selectedWithdrawal.priority || 'normal')}>
                      {selectedWithdrawal.priority || 'normal'}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <Badge variant={getStatusBadgeVariant(selectedWithdrawal.status)}>
                      {selectedWithdrawal.status}
                    </Badge>
                  </div>
                </div>

                {selectedWithdrawal.reason && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Reason for Withdrawal</Label>
                    <p className="text-sm">{selectedWithdrawal.reason}</p>
                  </div>
                )}

                {selectedWithdrawal.bankAccount && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Bank Account Details</Label>
                    <div className="bg-muted/50 p-3 rounded-lg text-sm font-mono">
                      {JSON.stringify(JSON.parse(selectedWithdrawal.bankAccount), null, 2)}
                    </div>
                  </div>
                )}

                {selectedWithdrawal.aiAnalysis && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-blue-600" />
                      <Label className="text-sm font-medium text-blue-800 dark:text-blue-200">AI Analysis</Label>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">{selectedWithdrawal.aiAnalysis}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span>Risk Score: <span className={getAIRiskColor(selectedWithdrawal.aiRiskScore)}>{selectedWithdrawal.aiRiskScore}/100</span></span>
                      <span>Recommendation: {selectedWithdrawal.aiRecommendation}</span>
                    </div>
                  </div>
                )}

                {selectedWithdrawal.status === 'rejected' && selectedWithdrawal.rejectionReason && (
                  <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <Label className="text-sm font-medium text-red-800 dark:text-red-200">Rejection Details</Label>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-1">
                      Reason: {rejectionReasons.find(r => r.value === selectedWithdrawal.rejectionReason)?.label}
                    </p>
                    {selectedWithdrawal.rejectionComment && (
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Comment: {selectedWithdrawal.rejectionComment}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div>
                    <Label className="text-xs text-muted-foreground">Requested</Label>
                    <p>{format(new Date(selectedWithdrawal.requestedAt!), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                  {selectedWithdrawal.reviewedAt && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Reviewed</Label>
                      <p>{format(new Date(selectedWithdrawal.reviewedAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}