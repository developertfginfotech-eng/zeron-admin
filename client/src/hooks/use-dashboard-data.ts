import { useState, useEffect } from 'react';
import { apiCall } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api';

export interface DashboardOverview {
  totalProperties: number;
  activeProperties: number;
  totalInvestments: number;
  totalUsers: number;
  pendingKyc: number;
  totalInvestmentValue: number;
  totalReturns?: number;
  projectedReturns?: number;
  averageReturnPercentage?: number;
}

export interface DashboardStats {
  totalUsers: number;
  activeProperties: number;
  totalInvestments: number;
  monthlyRevenue: number;
  userChange: number;
  propertyChange: number;
  investmentChange: number;
  revenueChange: number;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface Transaction {
  id: string;
  user: string;
  property: string;
  amount: number;
  type: 'investment' | 'withdrawal';
  date?: string;
}

export interface KycItem {
  id: string;
  name: string;
  documents: string;
  status: 'pending' | 'review' | 'approved' | 'rejected';
}

interface UseDashboardDataResult {
  stats: DashboardStats | null;
  overview: DashboardOverview | null;
  monthlyInvestments: ChartData[];
  userGrowth: ChartData[];
  recentTransactions: Transaction[];
  pendingKyc: KycItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Fallback data for when API is unavailable
const fallbackStats: DashboardStats = {
  totalUsers: 0,
  activeProperties: 0,
  totalInvestments: 0,
  monthlyRevenue: 0,
  userChange: 0,
  propertyChange: 0,
  investmentChange: 0,
  revenueChange: 0
};

const fallbackChartData: ChartData[] = [
  { name: 'Jan', value: 0 },
  { name: 'Feb', value: 0 },
  { name: 'Mar', value: 0 },
  { name: 'Apr', value: 0 },
  { name: 'May', value: 0 },
  { name: 'Jun', value: 0 },
  { name: 'Jul', value: 0 }
];

export function useDashboardData(): UseDashboardDataResult {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [monthlyInvestments, setMonthlyInvestments] = useState<ChartData[]>(fallbackChartData);
  const [userGrowth, setUserGrowth] = useState<ChartData[]>(fallbackChartData);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [pendingKyc, setPendingKyc] = useState<KycItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard data from API
      const dashboardResponse = await apiCall(API_ENDPOINTS.ADMIN.DASHBOARD);

      if (dashboardResponse.success && dashboardResponse.data) {
        const data = dashboardResponse.data;

        // Extract overview data - the API returns it in data.overview
        if (data.overview) {
          const overviewData = data.overview;
          setOverview(overviewData);

          // Convert overview to stats format for backward compatibility
          setStats({
            totalUsers: overviewData.totalUsers || 0,
            activeProperties: overviewData.activeProperties || 0,
            totalInvestments: overviewData.totalInvestments || 0,
            monthlyRevenue: overviewData.totalInvestmentValue ? Math.floor(overviewData.totalInvestmentValue / 12) : 0,
            userChange: 0, // API doesn't provide this, so default to 0
            propertyChange: 0, // API doesn't provide this, so default to 0
            investmentChange: 0, // API doesn't provide this, so default to 0
            revenueChange: 0 // API doesn't provide this, so default to 0
          });
        } else {
          setStats(fallbackStats);
          setOverview(null);
        }

        // Set chart data - using fallback if not provided by API
        if (data.monthlyInvestments && Array.isArray(data.monthlyInvestments)) {
          setMonthlyInvestments(data.monthlyInvestments);
        } else {
          // Generate chart data from monthly trend if available
          setMonthlyInvestments(fallbackChartData);
        }

        if (data.userGrowth && Array.isArray(data.userGrowth)) {
          setUserGrowth(data.userGrowth);
        } else {
          setUserGrowth(fallbackChartData);
        }

        // Set recent transactions
        if (data.recentTransactions && Array.isArray(data.recentTransactions)) {
          setRecentTransactions(data.recentTransactions);
        }

        // Set pending KYC
        if (data.pendingKyc && Array.isArray(data.pendingKyc)) {
          setPendingKyc(data.pendingKyc);
        }
      } else {
        // Fallback to empty state
        setStats(fallbackStats);
        setOverview(null);
        setMonthlyInvestments(fallbackChartData);
        setUserGrowth(fallbackChartData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(errorMessage);
      console.error('Error fetching dashboard data:', err);

      // Set fallback data
      setStats(fallbackStats);
      setOverview(null);
      setMonthlyInvestments(fallbackChartData);
      setUserGrowth(fallbackChartData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    stats,
    overview,
    monthlyInvestments,
    userGrowth,
    recentTransactions,
    pendingKyc,
    loading,
    error,
    refetch: fetchDashboardData
  };
}
