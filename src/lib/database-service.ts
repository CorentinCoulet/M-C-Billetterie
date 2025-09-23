import { prisma } from './prisma';
import { TicketData } from './qrcode';

export interface DBTicketData {
  id: string;
  orderId: string;
  eventId: string;
  userId: string;
  eventTitle?: string;
  eventDate?: string;
  venue?: string;
  seatInfo?: string;
  issuedAt: string;
  validUntil: string;
  currentQRCode?: string | null;
  qrCodeGeneratedAt?: string | null;
  isScanned?: boolean;
  scannedAt?: string | null;
  qrRotationInterval?: number;
}

export async function getTicketsForRotation(
  offset: number = 0,
  limit: number = 100
): Promise<DBTicketData[]> {
  try {
    const tickets = await prisma.ticket.findMany({
      skip: offset,
      take: limit,
      include: {
        event: {
          select: {
            title: true,
            date: true,
            location: true,
          }
        },
        order: {
          select: {
            id: true,
          }
        },
        user: {
          select: {
            id: true,
          }
        }
      },
      where: {
        // Filtrer seulement les tickets payés et non utilisés
        status: 'paid',
        event: {
          date: {
            gte: new Date() // Événements futurs seulement
          }
        }
      },
      orderBy: {
        qrCodeGeneratedAt: 'asc' // Les plus anciens en premier pour la rotation
      }
    });

    return tickets.map(ticket => ({
      id: ticket.id,
      orderId: ticket.orderId || '',
      eventId: ticket.eventId,
      userId: ticket.userId || '',
      eventTitle: ticket.event?.title,
      eventDate: ticket.event?.date?.toISOString(),
      venue: ticket.event?.location,
      seatInfo: ticket.seatNumber || undefined,
      issuedAt: ticket.purchasedAt.toISOString(),
      validUntil: ticket.event?.date?.toISOString() || new Date().toISOString(),
      currentQRCode: ticket.currentQRCode,
      qrCodeGeneratedAt: ticket.qrCodeGeneratedAt?.toISOString(),
      isScanned: ticket.isScanned,
      scannedAt: ticket.scannedAt?.toISOString(),
      qrRotationInterval: ticket.qrRotationInterval,
    }));
  } catch (error) {
    console.error('Error fetching tickets for rotation:', error);
    return [];
  }
}

export async function updateTicketQRCode(
  ticketId: string,
  updateData: {
    currentQRCode: string;
    qrCodeGeneratedAt: string;
  }
): Promise<void> {
  try {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        currentQRCode: updateData.currentQRCode,
        qrCodeGeneratedAt: new Date(updateData.qrCodeGeneratedAt),
      }
    });
    
    console.log(`✅ Updated ticket ${ticketId} with new QR code`);
    console.log(`📝 QR code length: ${updateData.currentQRCode.length} chars`);
  } catch (error) {
    console.error(`Error updating ticket ${ticketId}:`, error);
    throw error;
  }
}

export async function getTicketById(ticketId: string): Promise<DBTicketData | null> {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: {
          select: {
            title: true,
            date: true,
            location: true,
          }
        },
        order: {
          select: {
            id: true,
          }
        },
        user: {
          select: {
            id: true,
          }
        }
      }
    });

    if (!ticket) {
      return null;
    }

    return {
      id: ticket.id,
      orderId: ticket.orderId || '',
      eventId: ticket.eventId,
      userId: ticket.userId || '',
      eventTitle: ticket.event?.title,
      eventDate: ticket.event?.date?.toISOString(),
      venue: ticket.event?.location,
      seatInfo: ticket.seatNumber || undefined,
      issuedAt: ticket.purchasedAt.toISOString(),
      validUntil: ticket.event?.date?.toISOString() || new Date().toISOString(),
      currentQRCode: ticket.currentQRCode,
      qrCodeGeneratedAt: ticket.qrCodeGeneratedAt?.toISOString(),
      isScanned: ticket.isScanned,
      scannedAt: ticket.scannedAt?.toISOString(),
      qrRotationInterval: ticket.qrRotationInterval,
    };
  } catch (error) {
    console.error(`Error fetching ticket ${ticketId}:`, error);
    return null;
  }
}

export async function markTicketAsScanned(ticketId: string): Promise<void> {
  try {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        isScanned: true,
        scannedAt: new Date(),
      }
    });
    
    console.log(`✅ Marked ticket ${ticketId} as scanned`);
  } catch (error) {
    console.error(`Error marking ticket ${ticketId} as scanned:`, error);
    throw error;
  }
}

export function convertToTicketData(dbTicket: DBTicketData): TicketData {
  return {
    id: dbTicket.id,
    orderId: dbTicket.orderId,
    eventId: dbTicket.eventId,
    userId: dbTicket.userId,
    eventTitle: dbTicket.eventTitle || 'Unknown Event',
    eventDate: dbTicket.eventDate || new Date().toISOString(),
    venue: dbTicket.venue || 'Unknown Venue',
    seatInfo: dbTicket.seatInfo,
    issuedAt: dbTicket.issuedAt,
    validUntil: dbTicket.validUntil,
    currentQRCode: dbTicket.currentQRCode || undefined,
    qrCodeGeneratedAt: dbTicket.qrCodeGeneratedAt || undefined,
    isScanned: dbTicket.isScanned || false,
    scannedAt: dbTicket.scannedAt || undefined,
    qrRotationInterval: dbTicket.qrRotationInterval || 12,
  };
}
