import { StripeCheckout } from '@/components/payments/StripeCheckout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Euro, MapPin, Users } from 'lucide-react';

export default function DemoEventPage() {
  // Mock event data
  const event = {
    id: 'event-demo-123',
    title: 'Concert de Jazz - Démo',
    description: 'Un concert de jazz exceptionnel pour tester notre système de billetterie.',
    date: '2025-02-15T20:00:00Z',
    venue: 'Salle Pleyel, Paris',
    price: 2500, // 25.00 EUR in cents
    currency: 'EUR',
    availableTickets: 150,
    totalCapacity: 200,
    category: 'Musique',
    image: '/placeholder-concert.jpg',
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: event.currency,
    }).format(price / 100);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Démonstration - Système de Billetterie</h1>
          <p className="text-muted-foreground">
            Testez notre intégration Stripe et la génération de QR codes
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl mb-2">{event.title}</CardTitle>
                    <Badge variant="secondary">{event.category}</Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <p className="text-lg text-muted-foreground">
                  {event.description}
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">Date et heure</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(event.date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">Lieu</p>
                      <p className="text-sm text-muted-foreground">
                        {event.venue}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Euro className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">Prix</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(event.price)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">Disponibilité</p>
                      <p className="text-sm text-muted-foreground">
                        {event.availableTickets} / {event.totalCapacity} places
                      </p>
                    </div>
                  </div>
                </div>

                {/* Demo Notice */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">
                    🧪 Mode Démonstration
                  </h3>
                  <div className="text-sm text-yellow-700 space-y-1">
                    <p>• Utilisez les clés de test Stripe (aucun vrai paiement)</p>
                    <p>• Numéro de carte de test : 4242 4242 4242 4242</p>
                    <p>• Date d&apos;expiration : toute date future</p>
                    <p>• CVC : tout code à 3 chiffres</p>
                    <p>• Les QR codes seront générés automatiquement</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Section */}
          <div className="space-y-6">
            <StripeCheckout
              eventId={event.id}
              eventTitle={event.title}
              price={event.price}
              currency={event.currency}
              quantity={1}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Après le paiement</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>✅ Redirection vers la page de succès</p>
                <p>✅ Génération automatique des QR codes</p>
                <p>✅ Email de confirmation (à implémenter)</p>
                <p>✅ Billets téléchargeables</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fonctionnalités</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>🔒 Paiement sécurisé Stripe</p>
                <p>📱 QR codes uniques par billet</p>
                <p>✅ Vérification des billets</p>
                <p>📧 Notifications par email</p>
                <p>📊 Suivi des commandes</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
