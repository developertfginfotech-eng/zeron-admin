import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileLayout } from "@/components/mobile-layout";

// Admin Pages
import Dashboard from "@/pages/dashboard";
import Investors from "@/pages/investors";
import Properties from "@/pages/properties";
import Transactions from "@/pages/transactions";
import Documents from "@/pages/documents";
import Analytics from "@/pages/analytics";
import Notifications from "@/pages/notifications";
import Admin from "@/pages/admin";
import AdminRegistration from "@/pages/admin-registration";
import AdminVerifyOTP from "@/pages/admin-verify-otp";
import SuperAdminApprovals from "@/pages/super-admin-approvals";
import WithdrawalRequests from "@/pages/withdrawal-requests";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

// Mobile Pages
import MobileDashboard from "@/pages/mobile/dashboard";
import MobileProperties from "@/pages/mobile/properties";
import MobilePortfolio from "@/pages/mobile/portfolio";
import MobileProfile from "@/pages/mobile/profile";
import LoginPage from "@/pages/login";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/investors" component={Investors} />
      <Route path="/properties" component={Properties} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/documents" component={Documents} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/withdrawal-requests" component={WithdrawalRequests} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/register" component={AdminRegistration} />
      <Route path="/admin/verify-otp" component={AdminVerifyOTP} />
      <Route path="/admin/approvals" component={SuperAdminApprovals} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function MobileRouter() {
  return (
    <Switch>
      <Route path="/mobile" component={MobileDashboard} />
      <Route path="/mobile/properties" component={MobileProperties} />
      <Route path="/mobile/portfolio" component={MobilePortfolio} />
      <Route path="/mobile/profile" component={MobileProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const [location] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = location.startsWith('/mobile');

  // Check authentication on app load
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show login/register page if not authenticated (except for register and verify-otp pages)
  const isRegisterPage = location === '/admin/register';
  const isVerifyOTPPage = location === '/admin/verify-otp';
  const isPublicPage = isRegisterPage || isVerifyOTPPage;

  if (!isAuthenticated && !isPublicPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="zaron-theme">
          <LanguageProvider defaultLanguage="en" storageKey="zaron-language">
            <TooltipProvider>
              <LoginPage
                onLoginSuccess={(data) => {
                  setIsAuthenticated(true);
                }}
              />
              <Toaster />
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  // Show registration/OTP verification pages for unauthenticated users
  if (isPublicPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="zaron-theme">
          <LanguageProvider defaultLanguage="en" storageKey="zaron-language">
            <TooltipProvider>
              <Switch>
                <Route path="/admin/register" component={AdminRegistration} />
                <Route path="/admin/verify-otp" component={AdminVerifyOTP} />
                <Route component={NotFound} />
              </Switch>
              <Toaster />
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  // Custom sidebar width for better content display
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="zaron-theme">
        <LanguageProvider defaultLanguage="en" storageKey="zaron-language">
          <TooltipProvider>
            {isMobile ? (
              <MobileLayout>
                <MobileRouter />
              </MobileLayout>
            ) : (
              <SidebarProvider style={style as React.CSSProperties}>
                <div className="flex h-screen w-full">
                  <AppSidebar />
                  <div className="flex flex-col flex-1">
                    <header className="flex items-center justify-between p-4 border-b border-sidebar-border/50 glass-card backdrop-blur-xl">
                      <div className="flex items-center gap-4">
                        <SidebarTrigger 
                          className="hover:bg-primary/10 transition-colors duration-300" 
                          data-testid="button-sidebar-toggle" 
                        />
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <div className="text-sm font-medium bg-gradient-to-r from-foreground to-primary/80 bg-clip-text text-transparent">
                            Zaron Admin Panel
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground/60">
                          {new Date().toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                        <ThemeToggle />
                        <button
                          onClick={() => {
                            localStorage.removeItem('authToken');
                            localStorage.removeItem('userData');
                            setIsAuthenticated(false);
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Logout
                        </button>
                      </div>
                    </header>
                    <main className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-primary/3 modern-scrollbar">
                      <AdminRouter />
                    </main>
                  </div>
                </div>
              </SidebarProvider>
            )}
            <Toaster />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}