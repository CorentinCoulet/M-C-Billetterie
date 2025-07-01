'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Download, Hash, MapPin, QrCode, User } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface TicketData {
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
}

interface TicketDisplayProps {
  ticketId: string;
  qrCode: string;
  data: TicketData;
}

export function TicketDisplay({ ticketId, qrCode, data }: TicketDisplayProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      // Create a canvas to generate a full ticket image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas not supported');
      }

      // Set canvas size
      canvas.width = 800;
      canvas.height = 400;

      // Draw ticket background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw border
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      // Draw title
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 32px Arial';
      ctx.fillText(data.eventTitle, 30, 60);

      // Draw event details
      ctx.font = '18px Arial';
      ctx.fillStyle = '#6b7280';
      
      const eventDate = new Date(data.eventDate).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      
      ctx.fillText(`📅 ${eventDate}`, 30, 100);
      ctx.fillText(`📍 ${data.venue}`, 30, 130);
      ctx.fillText(`🎫 ${data.seatInfo || 'Billet général'}`, 30, 160);

      // Draw ticket info
      ctx.font = '14px Arial';
      ctx.fillText(`Billet ID: ${ticketId.substring(0, 8)}...`, 30, 200);
      ctx.fillText(`Commande: ${data.orderId}`, 30, 220);

      // Draw QR code
      const qrImg = new window.Image();
      qrImg.onload = () => {
        ctx.drawImage(qrImg, canvas.width - 250, 80, 200, 200);
        
        // Download the image
        const link = document.createElement('a');
        link.download = `ticket-${ticketId.substring(0, 8)}.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
      qrImg.src = qrCode;
      
    } catch (error) {
      console.error('Error generating ticket image:', error);
      alert('Erreur lors de la génération du billet');
    } finally {
      setIsDownloading(false);
    }
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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
        <CardTitle className="flex items-center justify-between">
          <span>{data.eventTitle}</span>
          <QrCode className="h-6 w-6" />
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Ticket Details */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(data.eventDate)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{data.venue}</span>
              </div>
              
              {data.seatInfo && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{data.seatInfo}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono">{ticketId.substring(0, 8)}...</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Valide jusqu&apos;au: {formatDate(data.validUntil)}
              </p>
              <p className="text-xs text-muted-foreground">
                Émis le: {formatDate(data.issuedAt)}
              </p>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-muted-foreground/30">
              <Image
                src={qrCode}
                alt="QR Code du billet"
                width={160}
                height={160}
                className="mx-auto"
              />
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              Présentez ce QR code à l&apos;entrée
            </p>
            
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? 'Génération...' : 'Télécharger'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
