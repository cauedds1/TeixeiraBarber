import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import OwnerDashboard from "@/pages/owner-dashboard";
import Services from "@/pages/services";
import Team from "@/pages/team";
import Products from "@/pages/products";
import Settings from "@/pages/settings";
import Booking from "@/pages/booking";
import ClientBooking from "@/pages/client-booking";
import teixeiraCircleLogoPath from "@assets/image_1766152301102.png";
import teixeiraBarberiaLogoPath from "@assets/logo.png";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-[#0e0e0e]">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-3 border-b border-white/5 bg-[#0e0e0e]/95 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="text-white/60 hover:text-white" />
              <img
                src={teixeiraBarberiaLogoPath}
                alt="Teixeira Barbearia"
                className="h-10 w-auto opacity-80 hidden sm:block"
              />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
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
        <Route path="/services" component={Services} />
        <Route path="/team" component={Team} />
        <Route path="/products" component={Products} />
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
      <Route path="/agendar/:slug" component={ClientBooking} />
      <Route component={NotFound} />
    </Switch>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e]">
      <div className="space-y-4 text-center">
        <img src={teixeiraCircleLogoPath} alt="Teixeira" className="h-12 w-12 mx-auto rounded-lg" />
        <div className="space-y-2">
          <div className="h-4 w-32 mx-auto bg-white/10 rounded animate-pulse" />
          <div className="h-3 w-24 mx-auto bg-white/5 rounded animate-pulse" />
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

  const isPublicBookingPage = location.startsWith("/book/") || location.startsWith("/agendar/");

  if (isPublicBookingPage) {
    return (
      <Switch>
        <Route path="/book/:slug" component={Booking} />
        <Route path="/agendar/:slug" component={ClientBooking} />
        <Route component={NotFound} />
      </Switch>
    );
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
