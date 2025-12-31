import { useState } from "react";
import { useProductReviews, useReviewStats, useAddReview, useDeleteReview, ProductReview } from "@/hooks/useProductReviews";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, ThumbsUp, Trash2, User, MessageSquare, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProductReviewsProps {
  productId: string;
  productName?: string;
}

// Función para ofuscar email: j***o@email.com
const obfuscateEmail = (email: string): string => {
  if (!email) return "";
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 1) return email;
  const firstChar = localPart[0];
  const lastChar = localPart[localPart.length - 1];
  const asterisks = "*".repeat(Math.max(1, localPart.length - 2));
  return `${firstChar}${asterisks}${lastChar}@${domain}`;
};

const StarRating = ({
  rating,
  size = "sm",
  interactive = false,
  onRatingChange,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const sizeClass = size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onRatingChange?.(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          className={cn(
            "transition-colors",
            interactive && "cursor-pointer hover:scale-110"
          )}
        >
          <Star
            className={cn(
              sizeClass,
              (hoverRating || rating) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
};

const ReviewCard = ({
  review,
  currentUserId,
  onDelete,
}: {
  review: ProductReview;
  currentUserId?: string;
  onDelete: (reviewId: string) => void;
}) => {
  const isOwner = currentUserId === review.user_id;
  const displayName = review.user_email ? obfuscateEmail(review.user_email) : review.user_name;

  return (
    <div className="border-b pb-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="font-medium text-sm text-foreground">
              {displayName}
            </p>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {format(new Date(review.created_at), "MMM d, yyyy", { locale: es })}
            </span>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <StarRating rating={review.rating} size="sm" />
          </div>

          {review.title && (
            <p className="text-sm text-gray-600 mb-1">{review.title}</p>
          )}

          {review.comment && (
            <p className="text-sm text-gray-700 mb-2 line-clamp-3">
              {review.comment}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-foreground transition-colors">
              <ThumbsUp className="h-4 w-4" />
              <span>Útil ({review.helpful_count})</span>
            </button>
            <button className="text-gray-600 hover:text-foreground">
              <span className="text-xl">⋯</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductReviews = ({ productId, productName }: ProductReviewsProps) => {
  const { user } = useAuth();
  const { data: reviews, isLoading } = useProductReviews(productId);
  const stats = useReviewStats(productId);
  const addReview = useAddReview();
  const deleteReview = useDeleteReview();

  const [showForm, setShowForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newTitle, setNewTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRating === 0) return;

    await addReview.mutateAsync({
      product_id: productId,
      rating: newRating,
      title: newTitle || undefined,
      comment: newComment || undefined,
      is_anonymous: isAnonymous,
    });

    // Reset form
    setShowForm(false);
    setNewRating(0);
    setNewTitle("");
    setNewComment("");
    setIsAnonymous(false);
  };

  const handleDelete = (reviewId: string) => {
    deleteReview.mutate({ reviewId, productId });
  };

  // Check if user already reviewed
  const userReview = reviews?.find((r) => r.user_id === user?.id);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-24 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-gray-50 rounded-lg p-4">
      {/* Header con Ver todo y Escribir reseña */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <h3 className="text-xl font-bold text-gray-900">Comentarios</h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.round(stats.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
              ))}
            </div>
            <span className="text-sm text-gray-600">({stats.totalReviews}+)</span>
          </div>
          {user && !userReview && (
            <Button
              onClick={() => setShowForm(true)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Escribir reseña
            </Button>
          )}
        </div>
        
        <button 
          onClick={() => setShowAllReviews(true)}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
        >
          Ver todo <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Summary - Diseño compacto */}
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Rating Promedio */}
          <div className="flex items-start gap-3">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {stats.averageRating.toFixed(2)}
              </div>
              <StarRating rating={stats.averageRating} size="sm" />
            </div>
          </div>

          {/* Atributos de calidad */}
          <div className="flex flex-col gap-2 col-span-2 md:col-span-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Ajuste</span>
              <span className="font-bold text-gray-900">4.23</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Comodidad</span>
              <span className="font-bold text-gray-900">4.40</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Calidad</span>
              <span className="font-bold text-gray-900">4.24</span>
            </div>
          </div>

          {/* Taller/Size info */}
          <div className="col-span-2 md:col-span-1 flex items-center gap-2 text-xs">
            <span>👕</span>
            <span className="text-gray-600">Taller</span>
          </div>
        </div>
      </div>

      {/* Reseñas locales */}
      <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">Reseñas locales</span>
          <span className="font-bold text-gray-900">4.94</span>
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
        </div>
        <button className="text-gray-600 hover:text-gray-900">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Keywords/Chips */}
      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-full text-xs text-gray-700">
          lo volveré a comprar (10)
        </span>
        <span className="px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-full text-xs text-gray-700">
          elaborado con buen material (100+)
        </span>
      </div>

      {/* Add Review Form - shown when user clicks "Escribir reseña" button */}
      {user && !userReview && showForm && (
        <Card>
          <CardContent className="p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Tu calificación *
                    </label>
                    <StarRating
                      rating={newRating}
                      size="lg"
                      interactive
                      onRatingChange={setNewRating}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Título (opcional)
                    </label>
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Resumen de tu experiencia"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Comentario (opcional)
                    </label>
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Cuéntanos más sobre tu experiencia..."
                      rows={3}
                      maxLength={1000}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="anonymous"
                      checked={isAnonymous}
                      onCheckedChange={(checked) => setIsAnonymous(!!checked)}
                    />
                    <label htmlFor="anonymous" className="text-sm text-muted-foreground">
                      Publicar como anónimo
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={newRating === 0 || addReview.isPending}
                    >
                      {addReview.isPending ? "Publicando..." : "Publicar reseña"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowForm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
      )}

      {!user && (
        <p className="text-sm text-muted-foreground text-center py-4">
          <a href="/login" className="text-primary hover:underline">
            Inicia sesión
          </a>{" "}
          para dejar una reseña
        </p>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews && reviews.length > 0 ? (
          <>
            {reviews.slice(0, 3).map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                currentUserId={user?.id}
                onDelete={handleDelete}
              />
            ))}
          </>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              Aún no hay reseñas para este producto
            </p>
          </div>
        )}
      </div>

      {/* Modal de Todos los Comentarios */}
      <Dialog open={showAllReviews} onOpenChange={setShowAllReviews}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              Todos los comentarios ({reviews?.length || 0})
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {reviews && reviews.length > 0 ? (
                reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    currentUserId={user?.id}
                    onDelete={handleDelete}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    Aún no hay reseñas para este producto
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductReviews;
