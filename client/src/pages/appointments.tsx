import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Clock,
  Phone,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  X,
  Check,
} from "lucide-react";
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Appointment, Service, Barber, Client } from "@shared/schema";

interface AppointmentWithDetails extends Appointment {
  client?: Client;
  barber?: Barber;
  service?: Service;
}

export default function Appointments() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<AppointmentWithDetails[]>({
    queryKey: ["/api/appointments", format(selectedDate, "yyyy-MM-dd")],
  });

  const { data: barbers } = useQuery<Barber[]>({
    queryKey: ["/api/barbers"],
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/appointments/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Status atualizado" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "completed":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "cancelled":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      case "no_show":
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmado";
      case "pending":
        return "Pendente";
      case "completed":
        return "Concluído";
      case "cancelled":
        return "Cancelado";
      case "no_show":
        return "Faltou";
      default:
        return status;
    }
  };

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minutes = i % 2 === 0 ? "00" : "30";
    return `${hour.toString().padStart(2, "0")}:${minutes}`;
  }).filter((time) => {
    const hour = parseInt(time.split(":")[0]);
    return hour >= 8 && hour < 20;
  });

  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
    end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
  });

  const filteredAppointments = appointments?.filter((apt) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      apt.clientName?.toLowerCase().includes(query) ||
      apt.client?.name?.toLowerCase().includes(query) ||
      apt.barber?.name?.toLowerCase().includes(query)
    );
  });

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num || 0);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-appointments-title">Agenda</h1>
          <p className="text-muted-foreground">
            Gerencie os agendamentos da sua barbearia
          </p>
        </div>
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-appointment">
              <Plus className="h-4 w-4 mr-2" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cliente</label>
                <Select>
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Barbeiro</label>
                <Select>
                  <SelectTrigger data-testid="select-barber">
                    <SelectValue placeholder="Selecione um barbeiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers?.map((barber) => (
                      <SelectItem key={barber.id} value={barber.id}>
                        {barber.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Serviço</label>
                <Select>
                  <SelectTrigger data-testid="select-service">
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services?.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - {formatCurrency(service.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data</label>
                  <Input type="date" data-testid="input-date" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Horário</label>
                  <Select>
                    <SelectTrigger data-testid="select-time">
                      <SelectValue placeholder="Horário" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button data-testid="button-save-appointment">Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            data-testid="button-prev-day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[200px] text-center">
            <p className="font-semibold">
              {format(selectedDate, "EEEE", { locale: ptBR })}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            data-testid="button-next-day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="day" data-testid="tab-day">
                <CalendarDays className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="week" data-testid="tab-week">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {appointmentsLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : filteredAppointments && filteredAppointments.length > 0 ? (
            <div className="divide-y">
              {filteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center gap-4 p-4 hover-elevate"
                  data-testid={`row-appointment-${appointment.id}`}
                >
                  <div className="w-20 text-center">
                    <p className="text-lg font-semibold">{appointment.startTime}</p>
                    <p className="text-xs text-muted-foreground">{appointment.endTime}</p>
                  </div>
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(appointment.clientName || appointment.client?.name || "C")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {appointment.clientName || appointment.client?.name || "Cliente"}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{appointment.service?.name || "Serviço"}</span>
                      {appointment.clientPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {appointment.clientPhone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(appointment.price)}</p>
                    <p className="text-xs text-muted-foreground">
                      {appointment.barber?.name || "Barbeiro"}
                    </p>
                  </div>
                  <Badge className={getStatusColor(appointment.status || "pending")} size="sm">
                    {getStatusLabel(appointment.status || "pending")}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {appointment.status === "pending" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: "confirmed" })}
                          data-testid={`button-confirm-${appointment.id}`}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: "cancelled" })}
                          data-testid={`button-cancel-${appointment.id}`}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                    {appointment.status === "confirmed" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: "completed" })}
                        data-testid={`button-complete-${appointment.id}`}
                      >
                        <Check className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarDays className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum agendamento encontrado</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsNewDialogOpen(true)}
                data-testid="button-empty-new"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Agendamento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
