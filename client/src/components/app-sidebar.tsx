import { 
  Building2, 
  UserCheck,
  TrendingUp, 
  FileText, 
  Bell, 
  BarChart3,
  Home,
  Shield,
  Settings
} from "lucide-react"
import { Link, useLocation } from "wouter"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar"

// Menu items
const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Investors",
    url: "/investors",
    icon: UserCheck,
  },
  {
    title: "Properties",
    url: "/properties",
    icon: Building2,
  },
  {
    title: "Transactions",
    url: "/transactions",
    icon: TrendingUp,
  },
  {
    title: "KYC Documents",
    url: "/documents",
    icon: FileText,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
  }
]

const adminItems = [
  {
    title: "Admin Roles",
    url: "/admin",
    icon: Shield,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  }
]

export function AppSidebar() {
  const [location] = useLocation()

  return (
    <Sidebar className="glass-card border-r-0">
      <SidebarHeader className="border-b border-sidebar-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3 px-6 py-5">
          <div className="p-2 rounded-xl bg-primary/10 backdrop-blur-sm neon-glow">
            <Building2 className="h-6 w-6 text-primary animate-pulse-slow" />
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Zaron
            </span>
            <div className="text-xs text-muted-foreground/80">Admin Panel</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}