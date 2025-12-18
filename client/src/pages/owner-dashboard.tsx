import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  CreditCard,
  AlertCircle,
  ArrowRight,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mock data - replace with API calls
const mockDashboardData = {
  dailyRevenue: 850.50,
  monthlyRevenue: 12450.75,
  weeklyRevenue: 2800.00,
  totalClients: 156,
  appointmentsToday: 8,
  appointmentsWeek: 42,
  pendingAppointments: 3,

  revenueChart: [
    { date: "Seg", revenue: 1200, expenses: 300 },
    { date: "Ter", revenue: 1900, expenses: 400 },
    { date: "Qua", revenue: 1600, expenses: 350 },
    { date: "Qui", revenue: 2100, expenses: 450 },
    { date: "Sex", revenue: 2400, expenses: 500 },
    { date: "Sáb", revenue: 1800, expenses: 400 },
    { date: "Dom", revenue: 450, expenses: 100 },
  ],

  barberPerformance: [
    { name: "Fran", revenue: 3200, clients: 45, efficiency: 92 },
    { name: "Jefferson", revenue: 2950, clients: 38, efficiency: 88 },
    { name: "Jean", revenue: 2800, clients: 42, efficiency: 85 },
  ],

  paymentMethods: [
    { name: "PIX", value: 4500, fill: "#D4A574" },
    { name: "Dinheiro", value: 3200, fill: "#E8DCC4" },
    { name: "Débito", value: 2150, fill: "#B8956A" },
    { name: "Crédito", value: 1600, fill: "#2A2A2A" },
  ],

  recentTransactions: [
    { id: 1, type: "service", barber: "Fran", service: "Corte Masculino", amount: 55.00, method: "PIX", time: "14:30" },
    { id: 2, type: "service", barber: "Jefferson", service: "Corte e Barba", amount: 92.00, method: "Dinheiro", time: "13:15" },
    { id: 3, type: "expense", category: "Produto", description: "Tônico Capilar", amount: 120.00, method: "Débito", time: "10:45" },
    { id: 4, type: "service", barber: "Jean", service: "Corte Masculino", amount: 55.00, method: "Crédito", time: "15:50" },
  ],

  weeklyComparison: [
    { week: "Sem 1", revenue: 9500, expenses: 2100, profit: 7400 },
    { week: "Sem 2", revenue: 11200, expenses: 2500, profit: 8700 },
    { week: "Sem 3", revenue: 10800, expenses: 2300, profit: 8500 },
    { week: "Sem 4", revenue: 12450, expenses: 2700, profit: 9750 },
  ],
};

const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
  <Card className="p-4 md:p-6 hover-elevate">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <p className="text-2xl md:text-3xl font-bold text-foreground mt-2">{value}</p>
      </div>
      <div className={`p-3 rounded-lg bg-${color}/10`}>
        <Icon className={`w-5 h-5 md:w-6 md:h-6 text-${color}`} />
      </div>
    </div>
    {trend && (
      <div className="mt-3 flex items-center gap-1 text-sm">
        {trend.positive ? (
          <TrendingUp className="w-4 h-4 text-green-600" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-600" />
        )}
        <span className={trend.positive ? "text-green-600" : "text-red-600"}>
          {trend.value}
        </span>
        <span className="text-muted-foreground">vs. semana passada</span>
      </div>
    )}
  </Card>
);

export default function OwnerDashboard() {
  const data = mockDashboardData;
  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 capitalize">{today}</p>
        </div>
        <Button variant="outline" data-testid="button-settings">
          <Settings className="w-4 h-4 mr-2" />
          Configurações
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          icon={DollarSign}
          label="Faturamento Hoje"
          value={`R$ ${data.dailyRevenue.toFixed(2)}`}
          trend={{ value: "+12%", positive: true }}
          color="primary"
        />
        <StatCard
          icon={TrendingUp}
          label="Faturamento Mês"
          value={`R$ ${data.monthlyRevenue.toFixed(2)}`}
          trend={{ value: "+8%", positive: true }}
          color="accent"
        />
        <StatCard
          icon={Calendar}
          label="Agendamentos"
          value={data.appointmentsToday}
          trend={{ value: `${data.appointmentsWeek} na semana`, positive: true }}
          color="primary"
        />
        <StatCard
          icon={Users}
          label="Clientes"
          value={data.totalClients}
          trend={{ value: "+5 novo", positive: true }}
          color="accent"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Faturamento Semanal</h2>
              <p className="text-sm text-muted-foreground mt-1">Receita vs. Despesas</p>
            </div>
            <Badge variant="secondary">Esta Semana</Badge>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                }}
                labelStyle={{ color: "var(--foreground)" }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Receita" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Despesas" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Payment Methods */}
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Formas de Pagamento</h2>
            <p className="text-sm text-muted-foreground mt-1">Distribuição esta semana</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.paymentMethods}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.paymentMethods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Barber Performance and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Barber Performance */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Performance dos Barbeiros</h2>
              <p className="text-sm text-muted-foreground mt-1">Semana atual</p>
            </div>
            <Button size="sm" variant="ghost" data-testid="button-view-barbers">
              Ver Mais <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <div className="space-y-4">
            {data.barberPerformance.map((barber) => (
              <div key={barber.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate">
                <div>
                  <p className="font-semibold text-foreground">{barber.name}</p>
                  <p className="text-sm text-muted-foreground">{barber.clients} clientes • {barber.efficiency}% eficiência</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">R$ {barber.revenue.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Últimas Transações</h2>
              <p className="text-sm text-muted-foreground mt-1">Hoje</p>
            </div>
            <Button size="sm" variant="ghost" data-testid="button-view-transactions">
              Ver Tudo <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <div className="space-y-3">
            {data.recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${tx.type === "service" ? "bg-green-100" : "bg-red-100"}`}>
                    {tx.type === "service" ? (
                      <CreditCard className="w-4 h-4 text-green-700" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-700" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">
                      {tx.type === "service" ? `${tx.barber} - ${tx.service}` : tx.description}
                    </p>
                    <p className="text-xs text-muted-foreground">{tx.method} • {tx.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.type === "service" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type === "service" ? "+" : "-"}R$ {tx.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Weekly Comparison */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground">Comparativo Semanal</h2>
          <p className="text-sm text-muted-foreground mt-1">Últimas 4 semanas</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.weeklyComparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="week" stroke="var(--muted-foreground)" />
            <YAxis stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
              }}
              labelStyle={{ color: "var(--foreground)" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              name="Receita"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))" }}
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="hsl(var(--accent))"
              name="Lucro"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--accent))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button variant="outline" className="h-12 text-sm" data-testid="button-new-appointment">
          + Novo Agendamento
        </Button>
        <Button variant="outline" className="h-12 text-sm" data-testid="button-new-client">
          + Novo Cliente
        </Button>
        <Button variant="outline" className="h-12 text-sm" data-testid="button-financial-report">
          Relatório Financeiro
        </Button>
        <Button variant="outline" className="h-12 text-sm" data-testid="button-send-reminder">
          Enviar Lembretes
        </Button>
      </div>
    </div>
  );
}
