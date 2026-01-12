import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Star, Package, Truck, Loader2, CheckCircle2 } from 'lucide-react';
import { useDeliveryRatings, CreateRatingParams } from '@/hooks/useDeliveryRatings';

interface DeliveryRatingFormProps {
  orderId: string;
  orderDeliveryId?: string;
  orderType?: 'b2b' | 'b2c';
  onRatingSubmitted?: () => void;
  compact?: boolean;
}

const StarRating: React.FC<{
  rating: number;
  onRatingChange: (rating: number) => void;
  disabled?: boolean;
}> = ({ rating, onRatingChange, disabled }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !disabled && onRatingChange(star)}
          onMouseEnter={() => !disabled && setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          disabled={disabled}
          className="p-1 transition-transform hover:scale-110 disabled:cursor-not-allowed"
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              star <= (hoverRating || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export const DeliveryRatingForm: React.FC<DeliveryRatingFormProps> = ({
  orderId,
  orderDeliveryId,
  orderType = 'b2c',
  onRatingSubmitted,
  compact = false,
}) => {
  const { rating: existingRating, isLoading, isSubmitting, submitRating, hasRated } = useDeliveryRatings(orderId);
  
  const [productRating, setProductRating] = useState(existingRating?.product_rating || 0);
  const [productComment, setProductComment] = useState(existingRating?.product_comment || '');
  const [deliveryRating, setDeliveryRating] = useState(existingRating?.delivery_rating || 0);
  const [deliveryComment, setDeliveryComment] = useState(existingRating?.delivery_comment || '');
  const [isAnonymous, setIsAnonymous] = useState(existingRating?.is_anonymous || false);

  React.useEffect(() => {
    if (existingRating) {
      setProductRating(existingRating.product_rating || 0);
      setProductComment(existingRating.product_comment || '');
      setDeliveryRating(existingRating.delivery_rating || 0);
      setDeliveryComment(existingRating.delivery_comment || '');
      setIsAnonymous(existingRating.is_anonymous || false);
    }
  }, [existingRating]);

  const handleSubmit = async () => {
    const params: CreateRatingParams = {
      orderId,
      orderDeliveryId,
      orderType,
      productRating: productRating > 0 ? productRating : undefined,
      productComment: productComment.trim() || undefined,
      deliveryRating: deliveryRating > 0 ? deliveryRating : undefined,
      deliveryComment: deliveryComment.trim() || undefined,
      isAnonymous,
    };

    const success = await submitRating(params);
    if (success && onRatingSubmitted) {
      onRatingSubmitted();
    }
  };

  if (isLoading) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (hasRated && !compact) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div>
              <h3 className="font-semibold text-lg">¡Gracias por tu calificación!</h3>
              <p className="text-muted-foreground">Tu opinión nos ayuda a mejorar</p>
            </div>
            <div className="flex gap-8 mt-2">
              <div className="text-center">
                <div className="flex gap-0.5 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= (existingRating?.product_rating || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">Producto</span>
              </div>
              <div className="text-center">
                <div className="flex gap-0.5 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= (existingRating?.delivery_rating || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">Entrega</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? 'border-0 shadow-none' : ''}>
      {!compact && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            Califica tu experiencia
          </CardTitle>
          <CardDescription>
            Tu opinión es importante para nosotros
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={compact ? 'p-0' : 'space-y-6'}>
        {/* Product Rating */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Calidad del Producto
          </Label>
          <StarRating
            rating={productRating}
            onRatingChange={setProductRating}
            disabled={isSubmitting}
          />
          <Textarea
            placeholder="¿Qué te pareció el producto? (opcional)"
            value={productComment}
            onChange={(e) => setProductComment(e.target.value)}
            disabled={isSubmitting}
            rows={2}
          />
        </div>

        {/* Delivery Rating */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4" />
            Servicio de Entrega
          </Label>
          <StarRating
            rating={deliveryRating}
            onRatingChange={setDeliveryRating}
            disabled={isSubmitting}
          />
          <Textarea
            placeholder="¿Cómo fue tu experiencia con la entrega? (opcional)"
            value={deliveryComment}
            onChange={(e) => setDeliveryComment(e.target.value)}
            disabled={isSubmitting}
            rows={2}
          />
        </div>

        {/* Anonymous Toggle */}
        <div className="flex items-center justify-between pt-4">
          <div className="space-y-0.5">
            <Label htmlFor="anonymous">Calificación anónima</Label>
            <p className="text-xs text-muted-foreground">
              Tu nombre no será visible públicamente
            </p>
          </div>
          <Switch
            id="anonymous"
            checked={isAnonymous}
            onCheckedChange={setIsAnonymous}
            disabled={isSubmitting}
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || (productRating === 0 && deliveryRating === 0)}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Star className="h-4 w-4 mr-2" />
              {hasRated ? 'Actualizar Calificación' : 'Enviar Calificación'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
