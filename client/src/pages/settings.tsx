import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Globe,
  Database,
  Mail,
  Smartphone,
  Save,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useInvestmentSettings } from "@/hooks/use-investment-settings"

export default function Settings() {
  const { toast } = useToast()
  const { settings: investmentSettings, loading: investmentLoading, error: investmentError, updateSettings: updateInvestmentSettings } = useInvestmentSettings()

  const [settings, setSettings] = useState({
    // General Settings
    platformName: 'Zaron',
    defaultLanguage: 'en',
    timezone: 'Asia/Riyadh',
    dateFormat: 'DD/MM/YYYY',
    currency: 'SAR',

    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    weeklyReports: true,

    // Security Settings
    twoFactorAuth: true,
    sessionTimeout: '8',
    passwordPolicy: 'strong',
    ipWhitelist: true,

    // Business Settings
    minimumInvestment: '10000',
    maximumInvestment: '1000000',
    platformFee: '2.5',
    kycRequirement: true,
    autoApproval: false,

    // Integration Settings
    emailProvider: 'sendgrid',
    smsProvider: 'twilio',
    paymentGateway: 'stripe',
    storageProvider: 'aws_s3'
  })

  const [isSaving, setIsSaving] = useState(false)
  const [investmentSettingsLocal, setInvestmentSettingsLocal] = useState({
    rentalYieldPercentage: 8,
    appreciationRatePercentage: 3,
    maturityPeriodYears: 5,
    investmentDurationYears: 5,
    earlyWithdrawalPenaltyPercentage: 5,
    platformFeePercentage: 2.5,
    minInvestmentAmount: 10000,
    maxInvestmentAmount: 1000000
  })
  const [isSavingInvestmentSettings, setIsSavingInvestmentSettings] = useState(false)

  // Update local state when API data loads
  useEffect(() => {
    if (investmentSettings) {
      setInvestmentSettingsLocal({
        rentalYieldPercentage: investmentSettings.rentalYieldPercentage || 8,
        appreciationRatePercentage: investmentSettings.appreciationRatePercentage || 3,
        maturityPeriodYears: investmentSettings.maturityPeriodYears || 5,
        investmentDurationYears: investmentSettings.investmentDurationYears || 5,
        earlyWithdrawalPenaltyPercentage: investmentSettings.earlyWithdrawalPenaltyPercentage || 5,
        platformFeePercentage: investmentSettings.platformFeePercentage || 2.5,
        minInvestmentAmount: investmentSettings.minInvestmentAmount || 10000,
        maxInvestmentAmount: investmentSettings.maxInvestmentAmount || 1000000
      })
    }
  }, [investmentSettings])

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleInvestmentSettingChange = (key: string, value: any) => {
    setInvestmentSettingsLocal(prev => ({ ...prev, [key]: parseFloat(value) || value }))
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    console.log('Saving settings:', settings)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    toast({
      title: "Settings Saved",
      description: "All settings have been successfully updated.",
    })

    setIsSaving(false)
  }

  const handleSaveInvestmentSettings = async () => {
    setIsSavingInvestmentSettings(true)
    try {
      await updateInvestmentSettings({
        ...investmentSettings,
        ...investmentSettingsLocal,
        _id: investmentSettings?._id
      })

      toast({
        title: "Investment Settings Saved",
        description: "Investment settings have been successfully updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save investment settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSavingInvestmentSettings(false)
    }
  }

  const handleResetToDefaults = () => {
    console.log('Reset to defaults triggered')
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to default values.",
    })
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-settings">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-settings-title">Platform Settings</h1>
          <p className="text-muted-foreground">Configure platform-wide settings and preferences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetToDefaults} data-testid="button-reset-settings">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSaveSettings} disabled={isSaving} data-testid="button-save-settings">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card data-testid="card-general-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              General Settings
            </CardTitle>
            <CardDescription>Basic platform configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platformName">Platform Name</Label>
              <Input
                id="platformName"
                value={settings.platformName}
                onChange={(e) => handleSettingChange('platformName', e.target.value)}
                data-testid="input-platform-name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultLanguage">Default Language</Label>
                <Select value={settings.defaultLanguage} onValueChange={(value) => handleSettingChange('defaultLanguage', value)}>
                  <SelectTrigger data-testid="select-default-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={settings.timezone} onValueChange={(value) => handleSettingChange('timezone', value)}>
                  <SelectTrigger data-testid="select-timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Riyadh">Asia/Riyadh</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select value={settings.dateFormat} onValueChange={(value) => handleSettingChange('dateFormat', value)}>
                  <SelectTrigger data-testid="select-date-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={settings.currency} onValueChange={(value) => handleSettingChange('currency', value)}>
                  <SelectTrigger data-testid="select-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">SAR (Saudi Riyal)</SelectItem>
                    <SelectItem value="USD">USD (US Dollar)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card data-testid="card-notification-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notification Settings
            </CardTitle>
            <CardDescription>Configure notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Email Notifications</Label>
                <div className="text-sm text-muted-foreground">Send notifications via email</div>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                data-testid="switch-email-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">SMS Notifications</Label>
                <div className="text-sm text-muted-foreground">Send notifications via SMS</div>
              </div>
              <Switch
                checked={settings.smsNotifications}
                onCheckedChange={(checked) => handleSettingChange('smsNotifications', checked)}
                data-testid="switch-sms-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Push Notifications</Label>
                <div className="text-sm text-muted-foreground">Send push notifications to mobile apps</div>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
                data-testid="switch-push-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Weekly Reports</Label>
                <div className="text-sm text-muted-foreground">Send weekly analytics reports</div>
              </div>
              <Switch
                checked={settings.weeklyReports}
                onCheckedChange={(checked) => handleSettingChange('weeklyReports', checked)}
                data-testid="switch-weekly-reports"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card data-testid="card-security-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security Settings
            </CardTitle>
            <CardDescription>Platform security configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Two-Factor Authentication</Label>
                <div className="text-sm text-muted-foreground">Require 2FA for admin access</div>
              </div>
              <Switch
                checked={settings.twoFactorAuth}
                onCheckedChange={(checked) => handleSettingChange('twoFactorAuth', checked)}
                data-testid="switch-2fa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
              <Select value={settings.sessionTimeout} onValueChange={(value) => handleSettingChange('sessionTimeout', value)}>
                <SelectTrigger data-testid="select-session-timeout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="8">8 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordPolicy">Password Policy</Label>
              <Select value={settings.passwordPolicy} onValueChange={(value) => handleSettingChange('passwordPolicy', value)}>
                <SelectTrigger data-testid="select-password-policy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic (8+ characters)</SelectItem>
                  <SelectItem value="strong">Strong (12+ chars, mixed case, numbers)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (16+ chars, symbols required)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">IP Whitelist</Label>
                <div className="text-sm text-muted-foreground">Restrict access to approved IPs</div>
              </div>
              <Switch
                checked={settings.ipWhitelist}
                onCheckedChange={(checked) => handleSettingChange('ipWhitelist', checked)}
                data-testid="switch-ip-whitelist"
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Settings */}
        <Card data-testid="card-business-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Business Settings
            </CardTitle>
            <CardDescription>Investment and business rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimumInvestment">Minimum Investment (SAR)</Label>
                <Input
                  id="minimumInvestment"
                  type="number"
                  value={settings.minimumInvestment}
                  onChange={(e) => handleSettingChange('minimumInvestment', e.target.value)}
                  data-testid="input-minimum-investment"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maximumInvestment">Maximum Investment (SAR)</Label>
                <Input
                  id="maximumInvestment"
                  type="number"
                  value={settings.maximumInvestment}
                  onChange={(e) => handleSettingChange('maximumInvestment', e.target.value)}
                  data-testid="input-maximum-investment"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platformFee">Platform Fee (%)</Label>
              <Input
                id="platformFee"
                type="number"
                step="0.1"
                value={settings.platformFee}
                onChange={(e) => handleSettingChange('platformFee', e.target.value)}
                data-testid="input-platform-fee"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">KYC Requirement</Label>
                <div className="text-sm text-muted-foreground">Require KYC verification for investments</div>
              </div>
              <Switch
                checked={settings.kycRequirement}
                onCheckedChange={(checked) => handleSettingChange('kycRequirement', checked)}
                data-testid="switch-kyc-requirement"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-Approval</Label>
                <div className="text-sm text-muted-foreground">Automatically approve small investments</div>
              </div>
              <Switch
                checked={settings.autoApproval}
                onCheckedChange={(checked) => handleSettingChange('autoApproval', checked)}
                data-testid="switch-auto-approval"
              />
            </div>
          </CardContent>
        </Card>

        {/* Investment Settings */}
        <Card data-testid="card-investment-settings" className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Investment Settings
              </CardTitle>
              <CardDescription>Configure dynamic investment rates and parameters</CardDescription>
            </div>
            {investmentError && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                Error loading settings
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {investmentLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                <span className="text-muted-foreground">Loading investment settings...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rentalYield">Rental Yield Percentage (%)</Label>
                    <Input
                      id="rentalYield"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={investmentSettingsLocal.rentalYieldPercentage}
                      onChange={(e) => handleInvestmentSettingChange('rentalYieldPercentage', e.target.value)}
                      data-testid="input-rental-yield"
                    />
                    <p className="text-xs text-muted-foreground">Annual rental income percentage</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appreciation">Appreciation Rate Percentage (%)</Label>
                    <Input
                      id="appreciation"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={investmentSettingsLocal.appreciationRatePercentage}
                      onChange={(e) => handleInvestmentSettingChange('appreciationRatePercentage', e.target.value)}
                      data-testid="input-appreciation-rate"
                    />
                    <p className="text-xs text-muted-foreground">Property appreciation per year</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maturityPeriod">Maturity Period (Years)</Label>
                    <Input
                      id="maturityPeriod"
                      type="number"
                      step="1"
                      min="1"
                      max="50"
                      value={investmentSettingsLocal.maturityPeriodYears}
                      onChange={(e) => handleInvestmentSettingChange('maturityPeriodYears', e.target.value)}
                      data-testid="input-maturity-period"
                    />
                    <p className="text-xs text-muted-foreground">Investment maturity period</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="earlyWithdrawalPenalty">Early Withdrawal Penalty (%)</Label>
                    <Input
                      id="earlyWithdrawalPenalty"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={investmentSettingsLocal.earlyWithdrawalPenaltyPercentage}
                      onChange={(e) => handleInvestmentSettingChange('earlyWithdrawalPenaltyPercentage', e.target.value)}
                      data-testid="input-early-withdrawal-penalty"
                    />
                    <p className="text-xs text-muted-foreground">Penalty for early withdrawal</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="platformFeeInvestment">Platform Fee Percentage (%)</Label>
                    <Input
                      id="platformFeeInvestment"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={investmentSettingsLocal.platformFeePercentage}
                      onChange={(e) => handleInvestmentSettingChange('platformFeePercentage', e.target.value)}
                      data-testid="input-platform-fee-investment"
                    />
                    <p className="text-xs text-muted-foreground">Platform transaction fee</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="investmentDuration">Investment Duration (Years)</Label>
                    <Input
                      id="investmentDuration"
                      type="number"
                      step="1"
                      min="1"
                      max="50"
                      value={investmentSettingsLocal.investmentDurationYears}
                      onChange={(e) => handleInvestmentSettingChange('investmentDurationYears', e.target.value)}
                      data-testid="input-investment-duration"
                    />
                    <p className="text-xs text-muted-foreground">Default investment duration</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minInvestment">Minimum Investment Amount (SAR)</Label>
                    <Input
                      id="minInvestment"
                      type="number"
                      step="1000"
                      min="0"
                      value={investmentSettingsLocal.minInvestmentAmount}
                      onChange={(e) => handleInvestmentSettingChange('minInvestmentAmount', e.target.value)}
                      data-testid="input-min-investment"
                    />
                    <p className="text-xs text-muted-foreground">Minimum investment per transaction</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxInvestment">Maximum Investment Amount (SAR)</Label>
                    <Input
                      id="maxInvestment"
                      type="number"
                      step="1000"
                      min="0"
                      value={investmentSettingsLocal.maxInvestmentAmount}
                      onChange={(e) => handleInvestmentSettingChange('maxInvestmentAmount', e.target.value)}
                      data-testid="input-max-investment"
                    />
                    <p className="text-xs text-muted-foreground">Maximum investment per transaction</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    onClick={handleSaveInvestmentSettings}
                    disabled={isSavingInvestmentSettings}
                    data-testid="button-save-investment-settings"
                  >
                    {isSavingInvestmentSettings ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Investment Settings
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Integration Settings */}
      <Card data-testid="card-integration-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Integration Settings
          </CardTitle>
          <CardDescription>Third-party service configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="emailProvider">Email Provider</Label>
              <Select value={settings.emailProvider} onValueChange={(value) => handleSettingChange('emailProvider', value)}>
                <SelectTrigger data-testid="select-email-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                  <SelectItem value="ses">Amazon SES</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smsProvider">SMS Provider</Label>
              <Select value={settings.smsProvider} onValueChange={(value) => handleSettingChange('smsProvider', value)}>
                <SelectTrigger data-testid="select-sms-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="nexmo">Nexmo</SelectItem>
                  <SelectItem value="local">Local SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentGateway">Payment Gateway</Label>
              <Select value={settings.paymentGateway} onValueChange={(value) => handleSettingChange('paymentGateway', value)}>
                <SelectTrigger data-testid="select-payment-gateway">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="local_bank">Local Banking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storageProvider">Storage Provider</Label>
              <Select value={settings.storageProvider} onValueChange={(value) => handleSettingChange('storageProvider', value)}>
                <SelectTrigger data-testid="select-storage-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aws_s3">AWS S3</SelectItem>
                  <SelectItem value="google_cloud">Google Cloud</SelectItem>
                  <SelectItem value="azure">Azure Storage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card data-testid="card-system-status">
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current system health and service status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">Database</div>
                <div className="text-sm text-muted-foreground">Connected</div>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Healthy
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">Email Service</div>
                <div className="text-sm text-muted-foreground">SendGrid</div>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Active
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">File Storage</div>
                <div className="text-sm text-muted-foreground">AWS S3</div>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Online
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">Payment Gateway</div>
                <div className="text-sm text-muted-foreground">Stripe</div>
              </div>
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                Maintenance
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}