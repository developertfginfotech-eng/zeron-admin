import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { DashboardChart } from "@/components/dashboard-chart"
import { AiChatWidget } from "@/components/ai-chat-widget"
import { AiInsightsPanel } from "@/components/ai-insights-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Building2,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Brain,
  Zap,
  Target,
  AlertCircle,
  Loader2
} from "lucide-react"
import { Link } from "wouter"
import { useDashboardData } from "@/hooks/use-dashboard-data"

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false)
  const { overview, monthlyInvestments, userGrowth, recentTransactions, pendingKyc, loading, error, refetch } = useDashboardData()

  const handleRefresh = async () => {
    setRefreshing(true)
    console.log('Dashboard refresh triggered')
    try {
      await refetch()
    } catch (err) {
      console.error('Failed to refresh dashboard:', err)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 modern-scrollbar">
      <div className="p-6 space-y-8" data-testid="page-dashboard">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-primary/70 bg-clip-text text-transparent animate-float" data-testid="text-dashboard-title">
              Dashboard
            </h1>
            <p className="text-lg text-muted-foreground/80">Welcome to Zaron Admin Panel</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              System is running smoothly
            </div>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing} 
            className="neon-glow hover:scale-105 transition-transform duration-300"
            data-testid="button-refresh-dashboard"
          >
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {loading ? (
          <>
            <div className="col-span-1 md:col-span-2 lg:col-span-5 flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
              <span className="text-muted-foreground">Loading dashboard data...</span>
            </div>
          </>
        ) : error ? (
          <>
            <div className="col-span-1 md:col-span-2 lg:col-span-5 flex items-center justify-center py-8 text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>Failed to load dashboard data. Please try refreshing.</span>
            </div>
          </>
        ) : overview ? (
          <>
            <StatCard
              title="Total Users"
              value={overview.totalUsers?.toLocaleString() || "0"}
              change={`+0% from last month`}
              changeType="positive"
              icon={Users}
            />
            <StatCard
              title="Active Properties"
              value={overview.activeProperties?.toString() || "0"}
              change={`+0 from last month`}
              changeType="positive"
              icon={Building2}
            />
            <StatCard
              title="Total Investments"
              value={`SAR ${(overview.totalInvestmentValue / 1000000).toFixed(1)}M` || "SAR 0"}
              change={`+0% from last month`}
              changeType="positive"
              icon={TrendingUp}
            />
            <StatCard
              title="Projected Returns"
              value={`SAR ${((overview.projectedReturns || 0) / 1000000).toFixed(1)}M`}
              change={`${overview.averageReturnPercentage || 0}% average return`}
              changeType="positive"
              icon={TrendingUp}
            />
            <StatCard
              title="Monthly Revenue"
              value={`SAR ${(overview.totalInvestmentValue / 12 / 1000).toFixed(0)}K` || "SAR 0"}
              change={`+0% from last month`}
              changeType="positive"
              icon={DollarSign}
            />
          </>
        ) : null}
      </div>

      {/* AI Insights Panel */}
      <AiInsightsPanel />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardChart
          title="Monthly Investments"
          description="Investment volume over the last 7 months"
          data={monthlyInvestments}
          type="bar"
          dataKey="value"
        />
        <DashboardChart
          title="User Growth"
          description="New user registrations trend"
          data={userGrowth}
          type="line"
          dataKey="value"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-recent-transactions">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <CardDescription>Latest investment activity</CardDescription>
            </div>
            <Link href="/transactions">
              <Button variant="outline" size="sm" data-testid="button-view-all-transactions">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                  <span className="text-muted-foreground">Loading transactions...</span>
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <p>No recent transactions</p>
                </div>
              ) : (
                recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between" data-testid={`transaction-${transaction.id}`}>
                    <div>
                      <p className="font-medium">{transaction.user}</p>
                      <p className="text-sm text-muted-foreground">{transaction.property}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">SAR {transaction.amount.toLocaleString()}</p>
                      <Badge variant={transaction.type === 'investment' ? 'default' : 'secondary'}>
                        {transaction.type}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-kyc">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Pending KYC Reviews</CardTitle>
              <CardDescription>Documents awaiting verification</CardDescription>
            </div>
            <Link href="/users">
              <Button variant="outline" size="sm" data-testid="button-view-all-kyc">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                  <span className="text-muted-foreground">Loading KYC reviews...</span>
                </div>
              ) : pendingKyc.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <p>No pending KYC reviews</p>
                </div>
              ) : (
                pendingKyc.map((kyc) => (
                  <div key={kyc.id} className="flex items-center justify-between" data-testid={`kyc-${kyc.id}`}>
                    <div>
                      <p className="font-medium">{kyc.name}</p>
                      <p className="text-sm text-muted-foreground">{kyc.documents}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {kyc.status === 'pending' ? (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      )}
                      <Badge variant={kyc.status === 'pending' ? 'secondary' : 'default'}>
                        {kyc.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Chat Widget */}
      <AiChatWidget />
    </div>
  </div>
  )
}