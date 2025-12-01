import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, User, Mail, Phone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiCall, API_ENDPOINTS } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const adminRegistrationSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  phone: z.string()
    .min(1, "Phone number is required")
    .regex(/^(\+966|966|0)?[5-9]\d{8}$/, "Valid Saudi phone number required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, "Password must contain uppercase, lowercase, number and special character"),
  role: z.enum(["kyc_officer", "property_manager", "financial_analyst", "compliance_officer", "admin"], {
    errorMap: () => ({ message: "Please select a valid role" })
  }),
  position: z.string().optional(),
});

type AdminRegistrationFormData = z.infer<typeof adminRegistrationSchema>;

export default function AdminRegistrationPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AdminRegistrationFormData>({
    resolver: zodResolver(adminRegistrationSchema),
  });

  const selectedRole = watch("role");

  const roleDescriptions = {
    kyc_officer: "Responsible for KYC verification and document approval",
    property_manager: "Manages properties and related operations",
    financial_analyst: "Analyzes financial data and reports",
    compliance_officer: "Ensures regulatory compliance",
    admin: "General administrator with limited permissions",
  };

  const handleRegisterAdmin = async (data: AdminRegistrationFormData) => {
    setIsLoading(true);
    setSuccessMessage(null);

    try {
      // Debug: Log the data being sent
      console.log("📤 Registering admin with data:", data);

      const result = await apiCall(API_ENDPOINTS.ADMIN.CREATE_ADMIN_USER, {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (result.success) {
        setSuccessMessage(`Admin "${data.firstName} ${data.lastName}" (${data.role}) registered successfully!`);
        toast({
          title: "Success",
          description: `${data.firstName} ${data.lastName} has been registered. Please verify your email with OTP.`,
        });

        // Redirect to OTP verification page after 1 second
        setTimeout(() => {
          window.location.href = `/admin/verify-otp?email=${encodeURIComponent(data.email)}`;
        }, 1000);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to register admin",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              Register Admin User
            </h1>
            <p className="text-muted-foreground mt-2">
              Create a new administrator account with specific role and permissions
            </p>
          </div>
        </div>

        {/* Registration Form */}
        <Card className="glass-card backdrop-blur-sm border-border/50 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold text-center">
              Add New Administrator
            </CardTitle>
            <CardDescription className="text-center">
              Register a new admin user with specific role and permissions (pending Super Admin approval)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {successMessage && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(handleRegisterAdmin)} className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    First Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Ahmed"
                      className="pl-10 h-12"
                      {...register("firstName")}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Last Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Al-Khalid"
                      className="pl-10 h-12"
                      {...register("lastName")}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              {/* Email and Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="kyc@zaron.com"
                      className="pl-10 h-12"
                      {...register("email")}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+966501234567"
                      className="pl-10 h-12"
                      {...register("phone")}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium">
                  Role
                </Label>
                <Select onValueChange={(value) => setValue("role", value as any)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kyc_officer">KYC Officer</SelectItem>
                    <SelectItem value="property_manager">Property Manager</SelectItem>
                    <SelectItem value="financial_analyst">Financial Analyst</SelectItem>
                    <SelectItem value="compliance_officer">Compliance Officer</SelectItem>
                    <SelectItem value="admin">General Admin</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-destructive">{errors.role.message}</p>
                )}
                {selectedRole && roleDescriptions[selectedRole as keyof typeof roleDescriptions] && (
                  <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                    {roleDescriptions[selectedRole as keyof typeof roleDescriptions]}
                  </p>
                )}
              </div>

              {/* Position (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="position" className="text-sm font-medium">
                  Position / Department (Optional)
                </Label>
                <Input
                  id="position"
                  type="text"
                  placeholder="e.g., Senior KYC Officer, Head of Compliance"
                  className="h-12"
                  {...register("position")}
                  disabled={isLoading}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter a secure password"
                    className="pl-4 pr-10 h-12"
                    {...register("password")}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Password must contain uppercase, lowercase, number and special character (@$!%*?&)
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Register Admin
                  </>
                )}
              </Button>
            </form>

            {/* Additional Info */}
            <div className="border-t pt-6 space-y-2">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> This page is only accessible to Super Administrators. New admins will receive login credentials via email.
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
