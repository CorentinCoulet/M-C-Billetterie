'use client';

import { TicketDisplay } from '@/components/tickets/TicketDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Ticket } from 'lucide-react';
import { useState } from 'react';

interface GeneratedTicket {
  ticketId: string;
  qrCode: string;
  data: {
    id: string;
    orderId: string;
    eventId: string;
    userId: string;
    eventTitle: string;
    eventDate: string;
    venue: string;
    seatInfo?: string;
    issuedAt: string;
    validUntil: string;
  };
}

export default function TicketTestPage() {
  const [tickets, setTickets] = useState<GeneratedTicket[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    orderId: 'ORDER-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    eventId: 'event-demo-123',
    userId: 'user-demo-456',
    quantity: 2,
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/tickets/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setTickets(result.tickets);
      } else {
        alert('Erreur lors de la génération des billets');
      }
    } catch (error) {
      console.error('Error generating tickets:', error);
      alert('Erreur lors de la génération des billets');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewGeneration = () => {
    setTickets([]);
    setFormData({
      ...formData,
      orderId: 'ORDER-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Test - Génération de Billets</h1>
          <p className="text-muted-foreground">
            Testez la génération de QR codes et l&apos;affichage des billets
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {tickets.length === 0 ? (
          // Form to generate tickets
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Générer des billets de test
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orderId">ID de commande</Label>
                  <Input
                    id="orderId"
                    value={formData.orderId}
                    onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventId">ID de l&apos;événement</Label>
                  <Input
                    id="eventId"
                    value={formData.eventId}
                    onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userId">ID utilisateur</Label>
                  <Input
                    id="userId"
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Nombre de billets</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Ticket className="mr-2 h-4 w-4" />
                      Générer les billets
                    </>
                  )}
                </Button>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  <p className="font-semibold mb-1">ℹ️ Information</p>
                  <p>Les billets générés incluront des QR codes uniques et seront prêts à être scannés.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Display generated tickets
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">
                🎉 Billets générés avec succès !
              </h2>
              <p className="text-muted-foreground mb-6">
                {tickets.length} billet(s) créé(s) pour la commande {formData.orderId}
              </p>
              
              <Button onClick={handleNewGeneration} variant="outline">
                Générer de nouveaux billets
              </Button>
            </div>

            <div className="space-y-6">
              {tickets.map((ticket) => (
                <TicketDisplay
                  key={ticket.ticketId}
                  ticketId={ticket.ticketId}
                  qrCode={ticket.qrCode}
                  data={ticket.data}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
