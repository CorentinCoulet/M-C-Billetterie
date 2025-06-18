import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function list() {
  return prisma.ticket.findMany();
}

export async function create(data: Prisma.TicketCreateInput) {
  return prisma.ticket.create({ data });
}