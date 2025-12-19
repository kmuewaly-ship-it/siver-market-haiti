import { useState } from "react";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubmitReview } from "@/hooks/useTrendingStores";
import type { TrendingStore } from "@/hooks/useTrendingStores";

interface StoreReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: TrendingStore;
  onReviewSubmitted?: () => void;
}

const StoreReviewModal = ({ isOpen, onClose, store, onReviewSubmitted }: StoreReviewModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { submitReview } = useSubmitReview();
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para dejar una reseña",
        variant: "destructive",
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: "Calificación requerida",
        description: "Por favor selecciona una calificación de 1 a 5 estrellas",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitReview(store.id, user.id, rating, comment || undefined, isAnonymous);
      toast({
        title: "Reseña enviada",
        description: "¡Gracias por tu opinión!",
      });
      onReviewSubmitted?.();
      onClose();
      // Reset form
      setRating(0);
      setComment("");
      setIsAnonymous(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la reseña. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {store.logo ? (
              <img 
                src={store.logo} 
                alt={store.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {store.name.charAt(0)}
              </div>
            )}
            Reseña para {store.name}
          </DialogTitle>
          <DialogDescription>
            Comparte tu experiencia con esta tienda
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Calificación</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 transition-transform hover:scale-110"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "fill-orange-400 text-orange-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating > 0 && (
                  rating === 5 ? "Excelente" :
                  rating === 4 ? "Muy bueno" :
                  rating === 3 ? "Bueno" :
                  rating === 2 ? "Regular" :
                  "Malo"
                )}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comentario (opcional)</Label>
            <Textarea
              id="comment"
              placeholder="Cuéntanos tu experiencia con esta tienda..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>

          {/* Anonymous option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked === true)}
            />
            <Label htmlFor="anonymous" className="text-sm cursor-pointer">
              Publicar como anónimo
            </Label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || rating === 0}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isSubmitting ? "Enviando..." : "Enviar reseña"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoreReviewModal;
