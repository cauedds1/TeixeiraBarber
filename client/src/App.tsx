import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import OwnerDashboard from "@/pages/owner-dashboard";
import Dashboard from "@/pages/dashboard";
import Appointments from "@/pages/appointments";
import Clients from "@/pages/clients";
import Services from "@/pages/services";
import Team from "@/pages/team";
import Finances from "@/pages/finances";
import Products from "@/pages/products";
import Loyalty from "@/pages/loyalty";
import Packages from "@/pages/packages";
import Reviews from "@/pages/reviews";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Booking from "@/pages/booking";
import teixeiraCircleLogoPath from "@assets/image_1766152301102.png";
import teixeiraBarberiaLogoPath from "@assets/logo.png";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <img src={teixeiraBarberiaLogoPath} alt="Teixeira Barbearia" className="h-10 w-auto" />
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuthenticatedRouter() {
  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/" component={OwnerDashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/appointments" component={Appointments} />
        <Route path="/clients" component={Clients} />
        <Route path="/services" component={Services} />
        <Route path="/team" component={Team} />
        <Route path="/finances" component={Finances} />
        <Route path="/products" component={Products} />
        <Route path="/loyalty" component={Loyalty} />
        <Route path="/packages" component={Packages} />
        <Route path="/reviews" component={Reviews} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/book/:slug" component={Booking} />
      <Route component={NotFound} />
    </Switch>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="space-y-4 text-center">
        <img src={teixeiraCircleLogoPath} alt="Teixeira" className="h-12 w-12 mx-auto rounded-lg" style={{ mixBlendMode: 'multiply' }} />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-3 w-24 mx-auto" />
        </div>
      </div>
    </div>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const isPublicBookingPage = location.startsWith("/book/");

  if (isPublicBookingPage) {
    return <Booking />;
  }

  if (user) {
    return <AuthenticatedRouter />;
  }

  return <PublicRouter />;
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="teixeira-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppRouter />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
