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
import { Star, ThumbsUp, Trash2, User, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProductReviewsProps {
  productId: string;
  productName?: string;
}

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

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={review.user_avatar} />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium text-sm text-foreground">
                  {review.user_name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StarRating rating={review.rating} size="sm" />
                  {review.is_verified_purchase && (
                    <span className="text-xs text-green-600 font-medium">
                      ✓ Compra verificada
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(review.created_at), "d MMM yyyy", { locale: es })}
              </span>
            </div>

            {review.title && (
              <h4 className="font-semibold text-sm mt-2">{review.title}</h4>
            )}
            {review.comment && (
              <p className="text-sm text-muted-foreground mt-1">
                {review.comment}
              </p>
            )}

            <div className="flex items-center gap-3 mt-3">
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ThumbsUp className="h-3 w-3" />
                <span>Útil ({review.helpful_count})</span>
              </button>
              {isOwner && (
                <button
                  onClick={() => onDelete(review.id)}
                  className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Eliminar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="flex flex-col md:flex-row gap-6 p-4 bg-muted/30 rounded-lg">
        <div className="flex flex-col items-center justify-center md:border-r md:pr-6">
          <div className="text-4xl font-bold text-foreground">
            {stats.averageRating.toFixed(1)}
          </div>
          <StarRating rating={stats.averageRating} size="md" />
          <p className="text-sm text-muted-foreground mt-1">
            {stats.totalReviews} reseña{stats.totalReviews !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution[star] || 0;
            const percent = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs w-3 text-muted-foreground">{star}</span>
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                <Progress value={percent} className="h-2 flex-1" />
                <span className="text-xs w-6 text-muted-foreground text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Review Button / Form */}
      {user && !userReview && (
        <div>
          {!showForm ? (
            <Button
              variant="outline"
              onClick={() => setShowForm(true)}
              className="w-full md:w-auto"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Escribir una reseña
            </Button>
          ) : (
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
        </div>
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
      <div className="space-y-3">
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
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Aún no hay reseñas para este producto
            </p>
            <p className="text-sm text-muted-foreground">
              ¡Sé el primero en compartir tu opinión!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductReviews;
