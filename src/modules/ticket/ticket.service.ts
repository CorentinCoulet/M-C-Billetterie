import prisma from '@/lib/prisma';

export async function list() {
  return prisma.ticket.findMany();
}

export async function create(data: any) {
  return prisma.ticket.create({ data });
}