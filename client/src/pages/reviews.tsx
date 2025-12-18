import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Star,
  MessageSquare,
  Send,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Review, Client, Barber } from "@shared/schema";

interface ReviewWithDetails extends Review {
  client?: Client;
  barber?: Barber;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { [key: number]: number };
}

export default function Reviews() {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  const { data: reviews, isLoading: reviewsLoading } = useQuery<ReviewWithDetails[]>({
    queryKey: ["/api/reviews"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<ReviewStats>({
    queryKey: ["/api/reviews/stats"],
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      await apiRequest("PATCH", `/api/reviews/${id}/reply`, { reply });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({ title: "Resposta enviada" });
    },
  });

  const filteredReviews = reviews?.filter((review) => {
    if (selectedRating === null) return true;
    return review.rating === selectedRating;
  });

  const renderStars = (rating: number, size: "sm" | "md" = "sm") => {
    const sizeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating
                ? "text-yellow-500 fill-yellow-500"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  const handleReply = (reviewId: string) => {
    const reply = replyText[reviewId];
    if (!reply?.trim()) return;
    replyMutation.mutate({ id: reviewId, reply });
    setReplyText((prev) => ({ ...prev, [reviewId]: "" }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-reviews-title">Avaliações</h1>
          <p className="text-muted-foreground">
            Feedback dos seus clientes
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              {statsLoading ? (
                <>
                  <Skeleton className="h-12 w-16 mx-auto mb-2" />
                  <Skeleton className="h-6 w-32 mx-auto" />
                </>
              ) : (
                <>
                  <p className="text-5xl font-bold text-primary" data-testid="text-average-rating">
                    {stats?.averageRating?.toFixed(1) || "0.0"}
                  </p>
                  <div className="flex justify-center my-2">
                    {renderStars(Math.round(stats?.averageRating || 0), "md")}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {stats?.totalReviews || 0} avaliações
                  </p>
                </>
              )}
            </div>

            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats?.ratingDistribution?.[rating] || 0;
                const percentage = stats?.totalReviews
                  ? (count / stats.totalReviews) * 100
                  : 0;
                return (
                  <button
                    key={rating}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      selectedRating === rating
                        ? "bg-primary/10"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() =>
                      setSelectedRating(selectedRating === rating ? null : rating)
                    }
                    data-testid={`button-filter-${rating}`}
                  >
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm font-medium">{rating}</span>
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    </div>
                    <Progress value={percentage} className="flex-1 h-2" />
                    <span className="text-sm text-muted-foreground w-8 text-right">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedRating !== null && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-4"
                onClick={() => setSelectedRating(null)}
                data-testid="button-clear-filter"
              >
                <Filter className="h-4 w-4 mr-2" />
                Limpar Filtro
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedRating
                ? `Avaliações com ${selectedRating} estrela${selectedRating > 1 ? "s" : ""}`
                : "Todas as Avaliações"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {reviewsLoading ? (
              <div className="p-6 space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredReviews && filteredReviews.length > 0 ? (
              <div className="divide-y">
                {filteredReviews.map((review) => (
                  <div key={review.id} className="p-6" data-testid={`card-review-${review.id}`}>
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarImage src={review.client?.photoUrl || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {review.client?.name?.[0]?.toUpperCase() || "C"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{review.client?.name || "Cliente"}</p>
                            {review.barber && (
                              <Badge variant="secondary" size="sm">
                                {review.barber.name}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {review.createdAt && format(new Date(review.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="mb-2">{renderStars(review.rating)}</div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        )}

                        {review.reply && (
                          <div className="mt-4 pl-4 border-l-2 border-primary/30">
                            <p className="text-xs font-medium text-primary mb-1">Resposta da barbearia</p>
                            <p className="text-sm text-muted-foreground">{review.reply}</p>
                          </div>
                        )}

                        {!review.reply && (
                          <div className="mt-4 flex gap-2">
                            <Input
                              placeholder="Escreva uma resposta..."
                              value={replyText[review.id] || ""}
                              onChange={(e) =>
                                setReplyText((prev) => ({
                                  ...prev,
                                  [review.id]: e.target.value,
                                }))
                              }
                              className="flex-1"
                              data-testid={`input-reply-${review.id}`}
                            />
                            <Button
                              size="icon"
                              onClick={() => handleReply(review.id)}
                              disabled={!replyText[review.id]?.trim() || replyMutation.isPending}
                              data-testid={`button-reply-${review.id}`}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {selectedRating
                    ? `Nenhuma avaliação com ${selectedRating} estrela${selectedRating > 1 ? "s" : ""}`
                    : "Nenhuma avaliação ainda"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
