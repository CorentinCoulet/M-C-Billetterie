import prisma from '@/lib/prisma';
import type { CreateTicketDto } from '@/types/dto/ticket/create-ticket.dto';
import type { TicketResponseDto } from '@/types/dto/ticket/ticket-response.dto';
import { generatePdf } from '@/services/pdfService';
import { generateQRCode } from '@/services/qrCodeService';

export async function list(userId: string, role?: string): Promise<TicketResponseDto[]> {
  const where = role === 'admin'
    ? {}
    : { userId };

  return prisma.ticket.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      eventId: true,
      userId: true,
      price: true,
      createdAt: true,
      status: true,
      event: {
        select: {
          title: true,
          date: true,
          location: true,
          organizerId: true,
        }
      }
    }
  });
}

export async function create(data: CreateTicketDto): Promise<TicketResponseDto> {
  const event = await prisma.event.findUnique({ where: { id: data.eventId } });
  if (!event) {
    throw new Error('Event not found');
  }
  return prisma.ticket.create({
    data,
    select: {
      id: true,
      eventId: true,
      userId: true,
      price: true,
      createdAt: true,
      status: true,
      event: {
        select: {
          title: true,
          date: true,
          location: true,
          organizerId: true,
        }
      }
    }
  });
}

export async function getById(ticketId: number): Promise<TicketResponseDto | null> {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      eventId: true,
      userId: true,
      price: true,
      createdAt: true,
      status: true,
      event: {
        select: {
          title: true,
          date: true,
          location: true,
          organizerId: true,
        }
      }
    }
  });
}

export async function reserve(userId: string, eventId: number, quantity: number = 1): Promise<TicketResponseDto[]> {
  // Check if event exists and has available tickets
  const event = await prisma.event.findUnique({
    where: { id: eventId.toString() },
    select: {
      id: true,
      title: true,
      capacity: true,
      _count: {
        select: {
          tickets: {
            where: {
              status: {
                in: ['RESERVED', 'PAID', 'VALIDATED']
              }
            }
          }
        }
      }
    }
  });

  if (!event) {
    throw new Error('Event not found');
  }

  const availableTickets = event.capacity - event._count.tickets;
  if (availableTickets < quantity) {
    throw new Error(`Only ${availableTickets} tickets available`);
  }

  // Create tickets in a transaction
  const tickets = await prisma.$transaction(
    Array(quantity).fill(0).map(() => 
      prisma.ticket.create({
        data: {
          eventId: eventId.toString(),
          userId,
          price: 0, // Price will be set later during payment
          status: 'RESERVED',
        },
        select: {
          id: true,
          eventId: true,
          userId: true,
          price: true,
          createdAt: true,
          status: true,
          event: {
            select: {
              title: true,
              date: true,
              location: true,
              organizerId: true,
            }
          }
        }
      })
    )
  );

  return tickets;
}

export async function validate(ticketId: number): Promise<TicketResponseDto> {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'VALIDATED', validatedAt: new Date() },
    select: {
      id: true,
      eventId: true,
      userId: true,
      price: true,
      createdAt: true,
      status: true,
      validatedAt: true,
      event: {
        select: {
          title: true,
          date: true,
          location: true,
          organizerId: true,
        }
      }
    }
  });
}

export async function cancel(ticketId: number): Promise<TicketResponseDto> {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
    select: {
      id: true,
      eventId: true,
      userId: true,
      price: true,
      createdAt: true,
      status: true,
      cancelledAt: true,
      event: {
        select: {
          title: true,
          date: true,
          location: true,
          organizerId: true,
        }
      }
    }
  });
}

export async function generateTicketPdf(ticketId: number): Promise<Buffer> {
  const ticket = await getById(ticketId);
  if (!ticket) {
    throw new Error('Ticket not found');
  }

  // Generate QR code for the ticket
  const qrCodeData = `ticket:${ticketId}`;
  const qrCodeImage = await generateQRCode(qrCodeData);

  // Create PDF content
  const content = {
    ticket,
    qrCode: qrCodeImage,
  };

  // Generate PDF
  return generatePdf('ticket', content);
}

export async function generateQRCodeForTicket(ticketId: number): Promise<string> {
  const ticket = await getById(ticketId);
  if (!ticket) {
    throw new Error('Ticket not found');
  }

  // Generate QR code for the ticket
  const qrCodeData = `ticket:${ticketId}`;
  return generateQRCode(qrCodeData);
}
