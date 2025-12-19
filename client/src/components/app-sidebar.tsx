import { Link, useLocation } from "wouter";
import {
  Calendar,
  Users,
  Scissors,
  LayoutDashboard,
  DollarSign,
  Package,
  Gift,
  Settings,
  BarChart3,
  Clock,
  Star,
  CreditCard,
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
import teixeiraCircleLogoPath from "@assets/image_1766152301102.png";
import teixeiraBarberiaLogoPath from "@assets/logo.png";

const ownerMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Agenda", url: "/appointments", icon: Calendar },
  { title: "Clientes", url: "/clients", icon: Users },
  { title: "Serviços", url: "/services", icon: Scissors },
  { title: "Equipe", url: "/team", icon: Users },
  { title: "Financeiro", url: "/finances", icon: DollarSign },
  { title: "Produtos", url: "/products", icon: Package },
  { title: "Fidelidade", url: "/loyalty", icon: Gift },
  { title: "Planos", url: "/packages", icon: CreditCard },
  { title: "Avaliações", url: "/reviews", icon: Star },
  { title: "Relatórios", url: "/reports", icon: BarChart3 },
  { title: "Configurações", url: "/settings", icon: Settings },
];

const barberMenuItems = [
  { title: "Minha Agenda", url: "/", icon: Calendar },
  { title: "Histórico", url: "/history", icon: Clock },
  { title: "Comissões", url: "/commissions", icon: DollarSign },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isBarber = user?.role === "barber";
  const menuItems = isBarber ? barberMenuItems : ownerMenuItems;

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4 flex flex-col items-center justify-center">
        <img src={teixeiraBarberiaLogoPath} alt="Teixeira Barbearia" className="h-16 w-auto mb-2 opacity-90" />
        <div className="flex flex-col text-center">
          <span className="font-semibold text-sidebar-foreground text-sm">Teixeira</span>
          <span className="text-xs text-muted-foreground">Barbearia</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
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
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.firstName || user?.email || "Usuário"}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {user?.email || ""}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
