import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();

export async function getEvents() {
  return prisma.event.findMany({
    orderBy: { date: "asc" },
    take: 10,
  });
}