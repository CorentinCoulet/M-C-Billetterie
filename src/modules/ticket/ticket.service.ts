import prisma from '@/lib/prisma';
import type { CreateTicketDto } from '@/types/dto/ticket/create-ticket.dto';
import type { TicketResponseDto } from '@/types/dto/ticket/ticket-response.dto';

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
    }
  });
}