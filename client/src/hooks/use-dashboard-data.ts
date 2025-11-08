import { useState, useEffect } from 'react';
import { apiCall } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api';

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

        // Set stats
        if (data.stats) {
          setStats({
            totalUsers: data.stats.totalUsers || 0,
            activeProperties: data.stats.activeProperties || 0,
            totalInvestments: data.stats.totalInvestments || 0,
            monthlyRevenue: data.stats.monthlyRevenue || 0,
            userChange: data.stats.userChange || 0,
            propertyChange: data.stats.propertyChange || 0,
            investmentChange: data.stats.investmentChange || 0,
            revenueChange: data.stats.revenueChange || 0
          });
        } else {
          setStats(fallbackStats);
        }

        // Set chart data
        if (data.monthlyInvestments && Array.isArray(data.monthlyInvestments)) {
          setMonthlyInvestments(data.monthlyInvestments);
        }

        if (data.userGrowth && Array.isArray(data.userGrowth)) {
          setUserGrowth(data.userGrowth);
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
        setMonthlyInvestments(fallbackChartData);
        setUserGrowth(fallbackChartData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(errorMessage);
      console.error('Error fetching dashboard data:', err);

      // Set fallback data
      setStats(fallbackStats);
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
    monthlyInvestments,
    userGrowth,
    recentTransactions,
    pendingKyc,
    loading,
    error,
    refetch: fetchDashboardData
  };
}
