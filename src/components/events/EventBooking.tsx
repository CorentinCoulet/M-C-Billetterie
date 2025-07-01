'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { ShoppingCart } from 'lucide-react';
import { useState } from 'react';

interface EventBookingProps {
  event: {
    id: string;
    title: string;
    date: Date;
    location: string;
    price: number;
    organizer: {
      name: string;
    };
  };
  availableSpots: number | null;
  isEventPassed: boolean;
  isCancelled: boolean;
  isPublished: boolean;
}

export function EventBooking({ 
  event, 
  availableSpots, 
  isEventPassed, 
  isCancelled, 
  isPublished 
}: EventBookingProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const { addItem, openCart } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const handleAddToCart = async () => {
    setIsAdding(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    addItem({
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date.toISOString(),
      eventLocation: event.location,
      price: event.price,
      organizerName: event.organizer.name,
      quantity,
    });

    openCart();
    setIsAdding(false);
  };

  const maxQuantity = Math.min(10, availableSpots || 10);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-3xl font-bold text-blue-600">{formatPrice(event.price)}</p>
        <p className="text-sm text-gray-500">par billet</p>
      </div>

      {!isEventPassed && !isCancelled && isPublished ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="quantity" className="text-sm font-medium">
              Nombre de billets
            </label>
            <select
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="border rounded px-3 py-1"
              disabled={availableSpots === 0}
            >
              {[...Array(maxQuantity)].map((_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>

          {quantity > 1 && (
            <div className="text-center text-sm text-gray-600">
              Total: {formatPrice(event.price * quantity)}
            </div>
          )}

          <Button 
            onClick={handleAddToCart}
            className="w-full" 
            size="lg"
            disabled={availableSpots === 0 || isAdding}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {isAdding 
              ? 'Ajout en cours...' 
              : availableSpots === 0 
                ? 'Complet' 
                : 'Ajouter au panier'
            }
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Paiement sécurisé • Confirmation immédiate
          </p>
        </div>
      ) : (
        <div className="text-center space-y-2">
          {isEventPassed && (
            <Badge variant="outline" className="mb-2">Événement terminé</Badge>
          )}
          {isCancelled && (
            <Badge variant="destructive" className="mb-2">Événement annulé</Badge>
          )}
          {!isPublished && (
            <Badge variant="secondary" className="mb-2">Non publié</Badge>
          )}
          <p className="text-sm text-gray-500">
            Billets non disponibles
          </p>
        </div>
      )}
    </div>
  );
}
