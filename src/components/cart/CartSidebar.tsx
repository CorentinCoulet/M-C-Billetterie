'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';
import {
    Calendar,
    CreditCard,
    MapPin,
    Minus,
    Plus,
    ShoppingCart,
    Trash2,
    X
} from 'lucide-react';
import Link from 'next/link';

export function CartSidebar() {
  const { state, removeItem, updateQuantity, closeCart } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  if (!state.isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={closeCart}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Mon panier</h2>
            {state.totalItems > 0 && (
              <Badge variant="default">{state.totalItems}</Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={closeCart}
            className="p-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {state.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <ShoppingCart className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Votre panier est vide
              </h3>
              <p className="text-gray-500 mb-4">
                Découvrez nos événements et ajoutez des billets à votre panier
              </p>
              <Button asChild onClick={closeCart}>
                <Link href="/">
                  Découvrir les événements
                </Link>
              </Button>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {state.items.map((item) => (
                <Card key={item.eventId}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Titre et organisateur */}
                      <div>
                        <h3 className="font-medium text-sm leading-tight">
                          {item.eventTitle}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Par {item.organizerName}
                        </p>
                      </div>

                      {/* Date et lieu */}
                      <div className="space-y-1">
                        <div className="flex items-center text-xs text-gray-600">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(item.eventDate)}
                        </div>
                        <div className="flex items-center text-xs text-gray-600">
                          <MapPin className="h-3 w-3 mr-1" />
                          {item.eventLocation}
                        </div>
                      </div>

                      {/* Prix et quantité */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => updateQuantity(item.eventId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => updateQuantity(item.eventId, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={() => removeItem(item.eventId)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer avec total et checkout */}
        {state.items.length > 0 && (
          <div className="border-t bg-gray-50 p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-lg font-bold text-blue-600">
                {formatPrice(state.totalPrice)}
              </span>
            </div>
            
            <div className="space-y-2">
              <Button 
                className="w-full" 
                size="lg"
                asChild
                onClick={closeCart}
              >
                <Link href="/checkout">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Procéder au paiement
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={closeCart}
                asChild
              >
                <Link href="/">
                  Continuer mes achats
                </Link>
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Paiement sécurisé • Confirmation par email
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export function CartButton() {
  const { state, toggleCart } = useCart();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleCart}
      className="relative"
    >
      <ShoppingCart className="h-4 w-4" />
      {state.totalItems > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
        >
          {state.totalItems}
        </Badge>
      )}
      <span className="ml-2 hidden sm:inline">
        Panier
        {state.totalItems > 0 && ` (${state.totalItems})`}
      </span>
    </Button>
  );
}
