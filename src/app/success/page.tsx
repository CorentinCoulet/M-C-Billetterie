import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle, Download, MapPin } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

// Composant pour afficher les détails du succès
function SuccessContent() {
  // Pour l'instant, on utilise des données mock
  // Quand la DB sera prête, on récupérera les vraies données
  const mockOrder = {
    id: 'order_123',
    eventTitle: 'Concert de Jazz',
    quantity: 2,
    totalAmount: 50.00,
    eventDate: '2025-02-15',
    venue: 'Salle Pleyel, Paris',
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">
            Paiement réussi !
          </CardTitle>
          <p className="text-muted-foreground">
            Votre commande a été confirmée et vos billets sont en cours de génération.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Détails de la commande */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Détails de votre commande</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span>Commande N°:</span>
                <span className="font-mono">{mockOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Événement:</span>
                <span>{mockOrder.eventTitle}</span>
              </div>
              <div className="flex justify-between">
                <span>Quantité:</span>
                <span>{mockOrder.quantity} billet(s)</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total payé:</span>
                <span>{mockOrder.totalAmount.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Détails de l'événement */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Détails de l&apos;événement</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{new Date(mockOrder.eventDate).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{mockOrder.venue}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex-1" disabled>
              <Download className="w-4 h-4 mr-2" />
              Télécharger les billets
              <span className="text-xs ml-2">(bientôt disponible)</span>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                Retour à l&apos;accueil
              </Link>
            </Button>
          </div>

          {/* Information */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Un email de confirmation vous sera envoyé sous peu avec vos billets.
              <br />
              Les QR codes seront générés automatiquement.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
