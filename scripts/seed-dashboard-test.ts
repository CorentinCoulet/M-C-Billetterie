import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function createTestData() {
  console.log('🌱 Création des données de test pour le dashboard...');

  try {
    // Create test users with different roles
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create ADMIN user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@billetterie.test' },
      update: {},
      create: {
        email: 'admin@billetterie.test',
        name: 'Admin Test',
        password: hashedPassword,
        role: 'ADMIN',
        isVerified: true,
      },
    });

    // Create ORGANIZER user
    const organizerUser = await prisma.user.upsert({
      where: { email: 'organizer@billetterie.test' },
      update: {},
      create: {
        email: 'organizer@billetterie.test',
        name: 'Organisateur Test',
        password: hashedPassword,
        role: 'ORGANIZER',
        isVerified: true,
      },
    });

    // Create USER
    const regularUser = await prisma.user.upsert({
      where: { email: 'user@billetterie.test' },
      update: {},
      create: {
        email: 'user@billetterie.test',
        name: 'Utilisateur Test',
        password: hashedPassword,
        role: 'USER',
        isVerified: true,
      },
    });

    // Create organizer entity
    const organizer = await prisma.organizer.upsert({
      where: { id: 'test-organizer-1' },
      update: {},
      create: {
        id: 'test-organizer-1',
        name: 'Test Event Organization',
      },
    });

    // Create team member relation
    await prisma.teamMember.upsert({
      where: { id: 'test-team-member-1' },
      update: {},
      create: {
        id: 'test-team-member-1',
        userId: organizerUser.id,
        organizerId: organizer.id,
        role: 'OWNER',
      },
    });

    // Create test events
    const event1 = await prisma.event.create({
      data: {
        title: 'Concert Rock Test',
        description: 'Un concert de rock exceptionnel pour tester le dashboard',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        location: 'Salle de Test, Paris',
        maxCapacity: 500,
        isPublished: true,
        organizerId: organizer.id,
      },
    });

    const event2 = await prisma.event.create({
      data: {
        title: 'Conférence Tech Test',
        description: 'Une conférence sur les nouvelles technologies',
        date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        location: 'Centre de Conférence Test, Lyon',
        maxCapacity: 200,
        isPublished: true,
        organizerId: organizer.id,
      },
    });

    // Create test tickets
    const ticket1 = await prisma.ticket.create({
      data: {
        eventId: event1.id,
        userId: regularUser.id,
        code: `TICKET-${Date.now()}-1`,
        status: 'paid',
        seatNumber: 'A15',
      },
    });

    const ticket2 = await prisma.ticket.create({
      data: {
        eventId: event2.id,
        userId: regularUser.id,
        code: `TICKET-${Date.now()}-2`,
        status: 'paid',
        seatNumber: 'VIP-05',
      },
    });

    // Create test orders
    const order1 = await prisma.order.create({
      data: {
        userId: regularUser.id,
        totalPrice: 50.0,
        status: 'paid',
        currency: 'EUR',
        tickets: {
          connect: { id: ticket1.id }
        }
      },
    });

    const order2 = await prisma.order.create({
      data: {
        userId: regularUser.id,
        totalPrice: 120.0,
        status: 'paid',
        currency: 'EUR',
        tickets: {
          connect: { id: ticket2.id }
        }
      },
    });

    console.log('✅ Données de test créées avec succès !');
    console.log('');
    console.log('👤 Comptes de test créés :');
    console.log(`   Admin: admin@billetterie.test / password123`);
    console.log(`   Organisateur: organizer@billetterie.test / password123`);
    console.log(`   Utilisateur: user@billetterie.test / password123`);
    console.log('');
    console.log('🎫 Événements de test créés :');
    console.log(`   ${event1.title} (${event1.id})`);
    console.log(`   ${event2.title} (${event2.id})`);
    console.log('');
    console.log('🛒 Commandes de test créées :');
    console.log(`   Commande 1: ${order1.totalPrice}€ (${order1.id})`);
    console.log(`   Commande 2: ${order2.totalPrice}€ (${order2.id})`);

  } catch (error) {
    console.error('❌ Erreur lors de la création des données de test:', error);
    throw error;
  }
}

async function main() {
  await createTestData();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
