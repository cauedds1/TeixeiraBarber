import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, Calendar, Clock, User } from "lucide-react";
import type { Barbershop, Service, Barber, Review } from "@shared/schema";

interface BookingState {
  selectedService: Service | null;
  selectedBarber: Barber | null;
  selectedDate: string;
  selectedTime: string;
  clientName: string;
  clientPhone: string;
}

export default function ClientBooking() {
  const [_, params] = useLocation();
  const slug = (params as any)?.slug || "";
  const { toast } = useToast();
  const [bookingState, setBookingState] = useState<BookingState>({
    selectedService: null,
    selectedBarber: null,
    selectedDate: "",
    selectedTime: "",
    clientName: "",
    clientPhone: "",
  });

  const { data: barbershop, isLoading: barbershopLoading } = useQuery<Barbershop>({
    queryKey: [`/api/public/barbershops/${slug}`],
    enabled: !!slug,
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: [`/api/public/barbershops/${slug}/services`],
    enabled: !!slug,
  });

  const { data: barbers = [] } = useQuery<Barber[]>({
    queryKey: [`/api/public/barbershops/${slug}/barbers`],
    enabled: !!slug,
  });

  const { data: reviewsData } = useQuery<{ reviews: Review[]; averageRating: number; totalReviews: number }>({
    queryKey: [`/api/public/barbershops/${slug}/reviews`],
    enabled: !!slug,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/public/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar agendamento");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Agendamento criado!",
        description: "Seu agendamento foi confirmado.",
      });
      setBookingState({
        selectedService: null,
        selectedBarber: null,
        selectedDate: "",
        selectedTime: "",
        clientName: "",
        clientPhone: "",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o agendamento.",
        variant: "destructive",
      });
    },
  });

  const handleBooking = () => {
    if (!bookingState.selectedService || !bookingState.selectedBarber || !bookingState.selectedDate || !bookingState.selectedTime || !bookingState.clientName || !bookingState.clientPhone) {
      toast({
        title: "Preencha todos os campos",
        description: "Selecione o serviço, barbeiro, data, hora e insira seus dados.",
        variant: "destructive",
      });
      return;
    }

    const endTime = calculateEndTime(bookingState.selectedTime, bookingState.selectedService.duration);

    createAppointmentMutation.mutate({
      slug,
      serviceId: bookingState.selectedService.id,
      barberId: bookingState.selectedBarber.id,
      date: bookingState.selectedDate,
      startTime: bookingState.selectedTime,
      endTime,
      clientName: bookingState.clientName,
      clientPhone: bookingState.clientPhone,
    });
  };

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
  };

  const getTomorrowDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  };

  if (barbershopLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-booking" />
      </div>
    );
  }

  if (!barbershop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Barbearia não encontrada</h1>
        <p className="text-muted-foreground">Verifique o link e tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="text-barbershop-name">{barbershop.name}</h1>
          {barbershop.description && <p className="text-muted-foreground">{barbershop.description}</p>}
          {barbershop.phone && (
            <p className="text-sm text-muted-foreground mt-2">
              Telefone: {barbershop.phone}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Services */}
            <section>
              <h2 className="text-2xl font-semibold mb-4" data-testid="text-services">Serviços</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((service) => (
                  <Card
                    key={service.id}
                    className={`p-4 cursor-pointer transition hover-elevate ${
                      bookingState.selectedService?.id === service.id
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                    onClick={() => setBookingState({ ...bookingState, selectedService: service })}
                    data-testid={`card-service-${service.id}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{service.name}</h3>
                        {service.description && (
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        )}
                      </div>
                      <p className="font-bold text-primary">
                        R$ {Number(service.price).toFixed(2)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Duração: {service.duration} min
                    </p>
                  </Card>
                ))}
              </div>
            </section>

            {/* Barbers */}
            <section>
              <h2 className="text-2xl font-semibold mb-4" data-testid="text-barbers">Barbeiros</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {barbers.map((barber) => (
                  <Card
                    key={barber.id}
                    className={`p-4 cursor-pointer transition hover-elevate ${
                      bookingState.selectedBarber?.id === barber.id
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                    onClick={() => setBookingState({ ...bookingState, selectedBarber: barber })}
                    data-testid={`card-barber-${barber.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {barber.photoUrl && (
                        <img
                          src={barber.photoUrl}
                          alt={barber.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold">{barber.name}</h3>
                        {barber.bio && (
                          <p className="text-sm text-muted-foreground">{barber.bio}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>

            {/* Reviews */}
            {reviewsData && reviewsData.totalReviews > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-2xl font-semibold" data-testid="text-reviews">Avaliações</h2>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold" data-testid="text-rating">{reviewsData.averageRating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">
                      ({reviewsData.totalReviews})
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  {reviewsData.reviews.slice(0, 5).map((review) => (
                    <Card key={review.id} className="p-4" data-testid={`card-review-${review.id}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{review.comment?.slice(0, 50) || "Sem comentário"}</p>
                          <div className="flex gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Booking Form */}
          <div>
            <Card className="p-6 sticky top-4">
              <h3 className="text-xl font-semibold mb-4" data-testid="text-booking-form">Agendar Horário</h3>

              <div className="space-y-4">
                {bookingState.selectedService && (
                  <div className="p-3 bg-muted rounded-lg" data-testid="text-selected-service">
                    <p className="text-sm font-semibold">Serviço selecionado</p>
                    <p className="text-sm">{bookingState.selectedService.name}</p>
                  </div>
                )}

                {bookingState.selectedBarber && (
                  <div className="p-3 bg-muted rounded-lg" data-testid="text-selected-barber">
                    <p className="text-sm font-semibold">Barbeiro selecionado</p>
                    <p className="text-sm">{bookingState.selectedBarber.name}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-2" data-testid="label-date">Data</label>
                  <input
                    type="date"
                    value={bookingState.selectedDate}
                    onChange={(e) => setBookingState({ ...bookingState, selectedDate: e.target.value })}
                    min={getTomorrowDate()}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    data-testid="input-date"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" data-testid="label-time">Horário</label>
                  <input
                    type="time"
                    value={bookingState.selectedTime}
                    onChange={(e) => setBookingState({ ...bookingState, selectedTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    data-testid="input-time"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" data-testid="label-name">Seu nome</label>
                  <input
                    type="text"
                    value={bookingState.clientName}
                    onChange={(e) => setBookingState({ ...bookingState, clientName: e.target.value })}
                    placeholder="Digite seu nome"
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    data-testid="input-name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" data-testid="label-phone">Seu telefone</label>
                  <input
                    type="tel"
                    value={bookingState.clientPhone}
                    onChange={(e) => setBookingState({ ...bookingState, clientPhone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    data-testid="input-phone"
                  />
                </div>

                <Button
                  onClick={handleBooking}
                  disabled={createAppointmentMutation.isPending}
                  className="w-full"
                  data-testid="button-confirm-booking"
                >
                  {createAppointmentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Agendando...
                    </>
                  ) : (
                    "Confirmar Agendamento"
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
