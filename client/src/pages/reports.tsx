import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Download,
  Clock,
} from "lucide-react";
import { format, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReportStats {
  totalRevenue: number;
  totalAppointments: number;
  newClients: number;
  averageTicket: number;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  topBarbers: Array<{ name: string; appointments: number; revenue: number }>;
  peakHours: Array<{ hour: string; count: number }>;
  dailyRevenue: Array<{ date: string; revenue: number }>;
}

export default function Reports() {
  const [period, setPeriod] = useState("month");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: stats, isLoading } = useQuery<ReportStats>({
    queryKey: ["/api/reports", period],
  });

  const formatCurrency = (value: number | string | null) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num || 0);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "week":
        return "Esta semana";
      case "month":
        return "Este mês";
      case "quarter":
        return "Este trimestre";
      case "year":
        return "Este ano";
      default:
        return "";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-reports-title">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise de performance e métricas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Faturamento</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold" data-testid="text-total-revenue">
                    {formatCurrency(stats?.totalRevenue || 0)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{getPeriodLabel()}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Agendamentos</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold" data-testid="text-total-appointments">
                    {stats?.totalAppointments || 0}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{getPeriodLabel()}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Novos Clientes</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold" data-testid="text-new-clients">
                    {stats?.newClients || 0}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{getPeriodLabel()}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold" data-testid="text-average-ticket">
                    {formatCurrency(stats?.averageTicket || 0)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{getPeriodLabel()}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="services" data-testid="tab-services">Serviços</TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team">Equipe</TabsTrigger>
          <TabsTrigger value="hours" data-testid="tab-hours">Horários</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Faturamento Diário</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : stats?.dailyRevenue && stats.dailyRevenue.length > 0 ? (
                <div className="h-64 flex items-end gap-1">
                  {stats.dailyRevenue.slice(-14).map((day, index) => {
                    const maxRevenue = Math.max(...stats.dailyRevenue.map((d) => d.revenue));
                    const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div
                        key={index}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div
                          className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                          style={{ height: `${Math.max(height, 4)}%` }}
                          title={`${format(new Date(day.date), "dd/MM")}: ${formatCurrency(day.revenue)}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(day.date), "dd")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground">Sem dados para exibir</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Serviços Mais Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : stats?.topServices && stats.topServices.length > 0 ? (
                <div className="space-y-4">
                  {stats.topServices.map((service, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground w-6">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {service.count} vendas
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(service.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Sem dados para exibir</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance da Equipe</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : stats?.topBarbers && stats.topBarbers.length > 0 ? (
                <div className="space-y-4">
                  {stats.topBarbers.map((barber, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary w-6">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{barber.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {barber.appointments} atendimentos
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(barber.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Sem dados para exibir</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horários de Pico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : stats?.peakHours && stats.peakHours.length > 0 ? (
                <div className="space-y-3">
                  {stats.peakHours.map((hour, index) => {
                    const maxCount = Math.max(...stats.peakHours.map((h) => h.count));
                    const percentage = maxCount > 0 ? (hour.count / maxCount) * 100 : 0;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-12">{hour.hour}</span>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-16 text-right">
                          {hour.count} agend.
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Sem dados para exibir</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
