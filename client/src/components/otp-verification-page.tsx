// Create a new file: components/otp-verification-page.tsx

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Shield, Mail, Clock, ArrowLeft, Loader2 } from "lucide-react"

interface OTPVerificationPageProps {
  operation: 'create' | 'update' | 'delete'
  propertyTitle: string
  onVerify: (otp: string) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function OTPVerificationPage({ 
  operation, 
  propertyTitle, 
  onVerify, 
  onCancel,
  loading = false 
}: OTPVerificationPageProps) {
  const [otp, setOtp] = useState('')
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes
  const { toast } = useToast()

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter all 6 digits",
        variant: "destructive"
      })
      return
    }

    try {
      await onVerify(otp)
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP code",
        variant: "destructive"
      })
    }
  }

  const handleOtpChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 6)
    setOtp(numericValue)
  }

  const operationTexts = {
    create: 'Create Property',
    update: 'Update Property', 
    delete: 'Delete Property'
  }

  const operationColors = {
    create: 'bg-green-600',
    update: 'bg-orange-600',
    delete: 'bg-red-600'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <Button 
            variant="ghost" 
            onClick={onCancel}
            className="absolute top-4 left-4"
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className={`w-16 h-16 rounded-full ${operationColors[operation]} flex items-center justify-center mx-auto mb-4`}>
            <Shield className="h-8 w-8 text-white" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900">
            OTP Verification Required
          </h1>
          <p className="text-gray-600 mt-2">
            {operationTexts[operation]}: {propertyTitle}
          </p>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Check Your Email
            </CardTitle>
            <CardDescription>
              We've sent a 6-digit verification code to the super admin's email
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Timer */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-blue-900">Time Remaining</span>
              </div>
              <div className="text-2xl font-mono font-bold text-blue-700">
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Instructions */}
            <Alert className="border-orange-200 bg-orange-50">
              <AlertDescription className="text-orange-800">
                <div className="space-y-2">
                  <p><strong>Step 1:</strong> Go to the super admin</p>
                  <p><strong>Step 2:</strong> Ask: "What is the OTP for {operation} operation?"</p>
                  <p><strong>Step 3:</strong> Enter the 6-digit code below</p>
                </div>
              </AlertDescription>
            </Alert>

            {/* OTP Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-sm font-medium">
                  Enter 6-digit OTP code:
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                  maxLength={6}
                  autoFocus
                  disabled={loading}
                />
                <p className="text-xs text-gray-600 text-center">
                  {otp.length}/6 digits entered
                </p>
              </div>

              {/* Validation */}
              {otp.length > 0 && otp.length < 6 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Please enter all 6 digits of the OTP
                  </AlertDescription>
                </Alert>
              )}

              {timeLeft === 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    OTP has expired. Please try the operation again.
                  </AlertDescription>
                </Alert>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={loading || otp.length !== 6 || timeLeft === 0}
                  className={`flex-1 ${operationColors[operation]} hover:opacity-90`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    `Verify & ${operationTexts[operation]}`
                  )}
                </Button>
              </div>
            </form>

            {/* Development Note */}
            <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-600">
              <p><strong>Development Mode:</strong> Check your Node.js console for the OTP code (it will be printed there since we're not sending real emails yet).</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}