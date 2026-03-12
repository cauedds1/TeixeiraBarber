import { Link, useLocation } from "wouter";
import {
  Users,
  Scissors,
  Package,
  LayoutDashboard,
  Settings,
  CalendarDays,
} from "lucide-react";
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
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import teixeiraBarberiaLogoPath from "@assets/logo.png";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Funcionários", url: "/team", icon: Users },
  { title: "Serviços", url: "/services", icon: Scissors },
  { title: "Produtos", url: "/products", icon: Package },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar className="border-r border-white/5 bg-[#0e0e0e]">
      <SidebarHeader className="border-b border-white/5 p-4 flex flex-col items-center justify-center">
        <img src={teixeiraBarberiaLogoPath} alt="Teixeira Barbearia" className="h-14 w-auto mb-2 opacity-90" />
        <span className="text-[#C9A24D] text-xs font-semibold tracking-widest uppercase">Gestão</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/30 text-xs uppercase tracking-wider px-4">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-menu-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
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
      <SidebarFooter className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
            <AvatarFallback className="bg-[#C9A24D]/10 text-[#C9A24D] text-sm font-bold">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium text-white truncate">
              {user?.firstName || user?.email || "Usuário"}
            </span>
            <span className="text-xs text-white/30 truncate">
              {user?.email || ""}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
