import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Shield, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiCall, API_ENDPOINTS } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const otpSchema = z.object({
  email: z.string().email("Valid email required"),
  otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d+$/, "OTP must contain only numbers"),
});

type OTPFormData = z.infer<typeof otpSchema>;

interface VerifyOTPPageProps {
  email?: string;
}

export default function AdminVerifyOTPPage({ email: initialEmail }: VerifyOTPPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
  } = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      email: initialEmail || "",
    },
  });

  useEffect(() => {
    // Get email from URL query parameters if available
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      if (emailParam) {
        setValue("email", decodeURIComponent(emailParam));
      } else if (initialEmail) {
        setValue("email", initialEmail);
      }
    }
  }, [initialEmail, setValue]);

  const handleVerifyOTP = async (data: OTPFormData) => {
    setIsLoading(true);

    try {
      const result = await apiCall(API_ENDPOINTS.AUTH.VERIFY_OTP || "/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email: data.email,
          otp: data.otp,
        }),
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Email verified successfully! You can now login to the admin panel.",
        });

        // Redirect to login with email pre-filled after a brief delay
        setTimeout(() => {
          window.location.href = `/?email=${encodeURIComponent(data.email)}`;
        }, 2000);
      } else {
        toast({
          title: "Error",
          description: result.message || "Invalid OTP",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to verify OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    const { email } = getValues();
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email",
        variant: "destructive",
      });
      return;
    }

    setResendLoading(true);
    try {
      const result = await apiCall("/api/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "OTP resent to your email",
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to resend OTP",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to resend OTP",
        variant: "destructive",
      });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              Verify Email
            </h1>
            <p className="text-muted-foreground mt-2">
              Enter the OTP sent to your email
            </p>
          </div>
        </div>

        {/* OTP Form */}
        <Card className="glass-card backdrop-blur-sm border-border/50 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold text-center">
              Email Verification
            </CardTitle>
            <CardDescription className="text-center">
              We've sent a 6-digit OTP to verify your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Check your email for the verification code
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit(handleVerifyOTP)} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="h-11"
                  {...register("email")}
                  disabled={isLoading || resendLoading}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* OTP Field */}
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-sm font-medium">
                  Enter 6-Digit OTP
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  className="h-11 text-center text-2xl font-mono tracking-widest"
                  {...register("otp")}
                  disabled={isLoading || resendLoading}
                />
                {errors.otp && (
                  <p className="text-sm text-destructive">{errors.otp.message}</p>
                )}
              </div>

              {/* Verify Button */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isLoading || resendLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>Verify OTP</>
                )}
              </Button>
            </form>

            {/* Resend OTP */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Didn't receive the OTP?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold text-primary"
                  onClick={handleResendOTP}
                  disabled={resendLoading || isLoading}
                >
                  {resendLoading ? "Resending..." : "Resend OTP"}
                </Button>
              </p>
            </div>

            {/* Info */}
            <div className="text-center text-xs text-muted-foreground space-y-2">
              <p>
                After verification, your account will be pending Super Admin approval to access the admin panel.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          © 2024 Zaron Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
}
