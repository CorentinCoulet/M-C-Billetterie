import bcrypt from 'bcryptjs';
import { PrismaClient } from '../../src/generated/prisma';

export async function seedTestData(prisma: PrismaClient) {
  console.log('🌱 Début du seeding des données de test...');

  try {
    await prisma.ticket.deleteMany();
    await prisma.order.deleteMany();
    await prisma.event.deleteMany();
    await prisma.organizer.deleteMany();
    await prisma.category.deleteMany();
    await prisma.venue.deleteMany();
    await prisma.theme.deleteMany();
    await prisma.user.deleteMany();

    console.log('🧹 Existing data cleaned');

    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    
    const adminUser = await prisma.user.create({
      data: {
        id: 'test-admin-001',
        email: 'admin@test.com',
        password: hashedPassword,
        name: 'Admin Test',
        role: 'ADMIN',
        isVerified: true,
        metadata: { testUser: true }
      }
    });

    const organizerUser = await prisma.user.create({
      data: {
        id: 'test-organizer-001',
        email: 'organizer@test.com',
        password: hashedPassword,
        name: 'Organizer Test',
        role: 'ORGANIZER',
        isVerified: true,
        metadata: { testUser: true }
      }
    });

    const regularUser = await prisma.user.create({
      data: {
        id: 'test-user-001',
        email: 'user@test.com',
        password: hashedPassword,
        name: 'User Test',
        role: 'USER',
        isVerified: true,
        metadata: { testUser: true }
      }
    });

    console.log('👥 Test users created');

    const musicCategory = await prisma.category.create({
      data: {
        id: 'cat-music-001',
        name: 'Musique'
      }
    });

    const sportCategory = await prisma.category.create({
      data: {
        id: 'cat-sport-001',
        name: 'Sport'
      }
    });

    const conferenceCategory = await prisma.category.create({
      data: {
        id: 'cat-conference-001',
        name: 'Conférence'
      }
    });

    console.log('📂 Categories created');

    const venue1 = await prisma.venue.create({
      data: {
        id: 'venue-001',
        name: 'Centre de Congrès Test',
        address: '123 Rue du Test, 75001 Paris',
        capacity: 500
      }
    });

    const venue2 = await prisma.venue.create({
      data: {
        id: 'venue-002',
        name: 'Stade Test',
        address: '456 Avenue du Sport, 75002 Paris',
        capacity: 50000
      }
    });

    console.log('🏢 Venues created');

    const organizer1 = await prisma.organizer.create({
      data: {
        id: 'org-001',
        name: 'Organisateur Test 1'
      }
    });

    const organizer2 = await prisma.organizer.create({
      data: {
        id: 'org-002',
        name: 'Organisateur Test 2'
      }
    });

    console.log('Organisateurs créés');

    const theme1 = await prisma.theme.create({
      data: {
        id: 'theme-001',
        name: 'Thème Modern',
        description: 'Thème moderne et élégant',
        imagePath: '/themes/modern.jpg',
        color: '#2563eb',
        metadata: { testTheme: true }
      }
    });

    console.log('🎨 Thèmes créés');

    const event1 = await prisma.event.create({
      data: {
        id: 'event-001',
        title: 'Concert de Test',
        description: 'Un concert de test fantastique',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Dans 7 jours
        location: 'Salle de Concert Test',
        maxCapacity: 1000,
        isPublished: true,
        isCancelled: false,
        allowAnonymousPurchase: false,
        allowTransfer: true,
        categoryId: musicCategory.id,
        venueId: venue1.id,
        organizerId: organizer1.id,
        themeId: theme1.id,
        metadata: { testEvent: true }
      }
    });

    const event2 = await prisma.event.create({
      data: {
        id: 'event-002',
        title: 'Match de Football Test',
        description: 'Un match de football passionnant',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Dans 14 jours
        location: 'Stade Test',
        maxCapacity: 50000,
        isPublished: true,
        isCancelled: false,
        allowAnonymousPurchase: true,
        allowTransfer: false,
        categoryId: sportCategory.id,
        venueId: venue2.id,
        organizerId: organizer2.id,
        metadata: { testEvent: true }
      }
    });

    const event3 = await prisma.event.create({
      data: {
        id: 'event-003',
        title: 'Conférence Tech Non Publiée',
        description: 'Une conférence sur les nouvelles technologies (en attente d\'approbation)',
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        location: 'Centre de Congrès Test',
        maxCapacity: 500,
        isPublished: false,
        isCancelled: false,
        allowAnonymousPurchase: false,
        allowTransfer: true,
        categoryId: conferenceCategory.id,
        venueId: venue1.id,
        organizerId: organizer1.id,
        metadata: { testEvent: true }
      }
    });

    console.log('🎫 Événements créés');

    const order1 = await prisma.order.create({
      data: {
        id: 'order-001',
        userId: regularUser.id,
        totalPrice: 50.0,
        status: 'paid',
        currency: 'EUR',
        metadata: { testOrder: true }
      }
    });

    const order2 = await prisma.order.create({
      data: {
        id: 'order-002',
        userId: regularUser.id,
        totalPrice: 100.0,
        status: 'pending_payment',
        currency: 'EUR',
        metadata: { testOrder: true }
      }
    });

    console.log('🛒 Commandes créées');

    const ticket1 = await prisma.ticket.create({
      data: {
        id: 'ticket-001',
        userId: regularUser.id,
        eventId: event1.id,
        orderId: order1.id,
        code: 'TEST-TICKET-001',
        status: 'paid',
        seatNumber: 'A12',
        currentQRCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        qrCodeGeneratedAt: new Date(),
        qrRotationInterval: 12,
        isScanned: false,
        metadata: { testTicket: true }
      }
    });

    const ticket2 = await prisma.ticket.create({
      data: {
        id: 'ticket-002',
        userId: regularUser.id,
        eventId: event2.id,
        orderId: order1.id,
        code: 'TEST-TICKET-002',
        status: 'paid',
        seatNumber: 'B15',
        currentQRCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        qrCodeGeneratedAt: new Date(),
        qrRotationInterval: 12,
        isScanned: false,
        metadata: { testTicket: true }
      }
    });

    console.log('🎟️ Tickets créés');

    console.log('✅ Seeding des données de test terminé avec succès!');
    console.log('📊 Données créées:');
    console.log(`   - ${3} utilisateurs (Admin, Organizer, User)`);
    console.log(`   - ${3} catégories`);
    console.log(`   - ${2} lieux`);
    console.log(`   - ${2} organisateurs`);
    console.log(`   - ${1} thème`);
    console.log(`   - ${3} événements (2 publiés, 1 en attente)`);
    console.log(`   - ${2} commandes`);
    console.log(`   - ${2} tickets`);

    return {
      users: { admin: adminUser, organizer: organizerUser, regular: regularUser },
      events: { event1, event2, event3 },
      orders: { order1, order2 },
      tickets: { ticket1, ticket2 },
      categories: { music: musicCategory, sport: sportCategory, conference: conferenceCategory },
      venues: { venue1, venue2 },
      organizers: { organizer1, organizer2 },
      themes: { theme1 }
    };

  } catch (error) {
    console.error('❌ Erreur lors du seeding des données de test:', error);
    throw error;
  }
}

export async function cleanTestData(prisma: PrismaClient) {
  console.log('🧹 Nettoyage des données de test...');



  try {
    await prisma.ticket.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.organizer.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.venue.deleteMany({});
    await prisma.theme.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('✅ Données de test nettoyées');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des données de test:', error);
    throw error;
  }
}

export async function seed() {
  const prisma = new PrismaClient();
  try {
    await seedTestData(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

export async function clean() {
  const prisma = new PrismaClient();
  try {
    await cleanTestData(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

export async function reset() {
  const prisma = new PrismaClient();
  try {
    await cleanTestData(prisma);
    await seedTestData(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'seed':
      seed();
      break;
    case 'clean':
      clean();
      break;
    case 'reset':
      reset();
      break;
    default:
      console.log('Usage: ts-node seed-test.ts [seed|clean|reset]');
  }
}
