'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface StripeCheckoutProps {
  eventId: string;
  eventTitle: string;
  price: number;
  currency?: string;
  quantity?: number;
}

export function StripeCheckout({ 
  eventId, 
  eventTitle, 
  price, 
  currency = 'EUR', 
  quantity = 1 
}: StripeCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);
    
    try {
      // For now, we'll use a mock user ID
      const userId = 'mock-user-123';

      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          quantity,
          userId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Une erreur est survenue lors du paiement. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
    }).format(price / 100);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Réservation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold">{eventTitle}</h3>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Quantité:</span>
            <span>{quantity}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Prix unitaire:</span>
            <span>{formatPrice(price)}</span>
          </div>
          <hr />
          <div className="flex justify-between items-center font-semibold">
            <span>Total:</span>
            <span>{formatPrice(price * quantity)}</span>
          </div>
        </div>
        
        <Button 
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirection...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Payer avec Stripe
            </>
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          Paiement sécurisé par Stripe. Vos données sont protégées.
        </p>
      </CardContent>
    </Card>
  );
}
