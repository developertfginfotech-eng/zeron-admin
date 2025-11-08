import { useState, useEffect } from 'react';
import { apiCall } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api';

export interface InvestmentSettings {
  _id?: string;
  rentalYieldPercentage: number;
  appreciationRatePercentage: number;
  maturityPeriodYears: number;
  investmentDurationYears?: number;
  earlyWithdrawalPenaltyPercentage: number;
  platformFeePercentage?: number;
  minInvestmentAmount?: number;
  maxInvestmentAmount?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface UseInvestmentSettingsResult {
  settings: InvestmentSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (settings: InvestmentSettings) => Promise<void>;
  createSettings: (settings: InvestmentSettings) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useInvestmentSettings(): UseInvestmentSettingsResult {
  const [settings, setSettings] = useState<InvestmentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall(API_ENDPOINTS.INVESTMENTS.GET_SETTINGS);

      if (response.data) {
        setSettings(response.data);
      } else if (Array.isArray(response) && response.length > 0) {
        // If API returns array, get the active one or first one
        const activeSetting = response.find((s: any) => s.isActive) || response[0];
        setSettings(activeSetting);
      } else {
        setSettings(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch investment settings';
      setError(errorMessage);
      console.error('Error fetching investment settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updatedSettings: InvestmentSettings) => {
    try {
      setLoading(true);
      setError(null);

      if (updatedSettings._id) {
        await apiCall(API_ENDPOINTS.INVESTMENTS.UPDATE_SETTINGS(updatedSettings._id), {
          method: 'PUT',
          body: JSON.stringify(updatedSettings)
        });
      } else {
        await apiCall(API_ENDPOINTS.INVESTMENTS.CREATE_SETTINGS, {
          method: 'POST',
          body: JSON.stringify(updatedSettings)
        });
      }

      setSettings(updatedSettings);
      await fetchSettings(); // Refetch to get latest data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update investment settings';
      setError(errorMessage);
      console.error('Error updating investment settings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createSettings = async (newSettings: InvestmentSettings) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiCall(API_ENDPOINTS.INVESTMENTS.CREATE_SETTINGS, {
        method: 'POST',
        body: JSON.stringify(newSettings)
      });

      setSettings(response.data || newSettings);
      await fetchSettings(); // Refetch to get latest data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create investment settings';
      setError(errorMessage);
      console.error('Error creating investment settings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    updateSettings,
    createSettings,
    refetch: fetchSettings
  };
}
