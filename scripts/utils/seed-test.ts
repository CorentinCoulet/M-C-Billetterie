import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../../src/generated/prisma';

/**
 * Cleans all test data from the database
 */
export async function cleanTestData(prisma: PrismaClient) {
  console.log('🧹 Cleaning test data...');

  // Delete in order to respect foreign key constraints
  await prisma.loginAttempt.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.passwordHistory.deleteMany();
  await prisma.securityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.eventLog.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.blockedUser.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.review.deleteMany();
  // Remove qRCode as it doesn't exist in schema
  await prisma.ticket.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.event.deleteMany();
  await prisma.organizer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.category.deleteMany();
  await prisma.theme.deleteMany();
  await prisma.blockedIP.deleteMany();
  await prisma.systemBackup.deleteMany();
  await prisma.translation.deleteMany();

  console.log('✅ Test data cleaned');
}

/**
 * Inserts test data into the database
 */
export async function seedTestData(prisma: PrismaClient) {
  console.log('🌱 Inserting test data...');

  const hashedPassword = await bcrypt.hash('test123', 10);

  // Create themes
  const theme1 = await prisma.theme.create({
    data: {
      name: 'Modern',
      description: 'Modern and elegant theme',
      imagePath: '/themes/modern.jpg',
      color: '#3B82F6',
    },
  });

  const theme2 = await prisma.theme.create({
    data: {
      name: 'Vintage',
      description: 'Retro and vintage theme',
      imagePath: '/themes/vintage.jpg',
      color: '#EF4444',
    },
  });

  // Create categories
  const categoryMusic = await prisma.category.create({
    data: {
      name: 'Music',
    },
  });

  const categoryConference = await prisma.category.create({
    data: {
      name: 'Conference',
    },
  });

  const categorySport = await prisma.category.create({
    data: {
      name: 'Sports',
    },
  });

  // Create venues
  const venue1 = await prisma.venue.create({
    data: {
      name: 'Test Zenith',
      address: '123 Test Street, 75000 Paris',
      capacity: 5000,
    },
  });

  const venue2 = await prisma.venue.create({
    data: {
      name: 'Test Center',
      address: '456 Test Avenue, 75000 Paris',
      capacity: 1000,
    },
  });

  // Create test users
  const testUser1 = await prisma.user.create({
    data: {
      email: 'test1@example.com',
      name: 'Test User 1',
      password: hashedPassword,
      role: 'USER',
      isVerified: true,
    },
  });

  const testUser2 = await prisma.user.create({
    data: {
      email: 'test2@example.com',
      name: 'Test User 2',
      password: hashedPassword,
      role: 'USER',
      isVerified: true,
    },
  });

  const testOrganizer = await prisma.user.create({
    data: {
      email: 'organizer@test.com',
      name: 'Test Organizer',
      password: hashedPassword,
      role: 'ORGANIZER',
      isVerified: true,
    },
  });

  const testAdmin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      name: 'Test Admin',
      password: hashedPassword,
      role: 'ADMIN',
      isVerified: true,
    },
  });

  // Create an organizer
  const organizer = await prisma.organizer.create({
    data: {
      name: 'Test Event Organization',
    },
  });

  // Create test events
  const event1 = await prisma.event.create({
    data: {
      title: 'Test Concert',
      description: 'A test concert for test data',
      date: new Date('2024-06-01T20:00:00Z'),
      location: 'Test Zenith',
      maxCapacity: 1000,
      isPublished: true,
      categoryId: categoryMusic.id,
      venueId: venue1.id,
      organizerId: organizer.id,
      themeId: theme1.id,
    },
  });

  const event2 = await prisma.event.create({
    data: {
      title: 'Tech Conference Test',
      description: 'A test conference about technology',
      date: new Date('2024-06-15T09:00:00Z'),
      location: 'Test Center',
      maxCapacity: 500,
      isPublished: true,
      categoryId: categoryConference.id,
      venueId: venue2.id,
      organizerId: organizer.id,
      themeId: theme2.id,
    },
  });

  const event3 = await prisma.event.create({
    data: {
      title: 'Test Match',
      description: 'A test sports match',
      date: new Date('2024-07-01T15:00:00Z'),
      location: 'Test Stadium',
      maxCapacity: 2000,
      isPublished: false, // Unpublished event for testing
      categoryId: categorySport.id,
      venueId: venue1.id,
      organizerId: organizer.id,
    },
  });

  // Create test orders
  const order1 = await prisma.order.create({
    data: {
      userId: testUser1.id,
      totalPrice: 50.0,
      status: 'paid',
      currency: 'EUR',
    },
  });

  const order2 = await prisma.order.create({
    data: {
      userId: testUser2.id,
      totalPrice: 30.0,
      status: 'pending_payment',
      currency: 'EUR',
    },
  });

  // Create test tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      userId: testUser1.id,
      eventId: event1.id,
      orderId: order1.id,
      code: 'TEST-TICKET-001',
      status: 'paid',
      seatNumber: 'A1',
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      userId: testUser1.id,
      eventId: event1.id,
      orderId: order1.id,
      code: 'TEST-TICKET-002',
      status: 'paid',
      seatNumber: 'A2',
    },
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      userId: testUser2.id,
      eventId: event2.id,
      orderId: order2.id,
      code: 'TEST-TICKET-003',
      status: 'pending',
      seatNumber: 'B1',
    },
  });

  // Create test payments
  await prisma.payment.create({
    data: {
      orderId: order1.id,
      paymentMethod: 'CARD',
      paymentStatus: 'COMPLETED',
      paymentDate: new Date(),
      transactionId: 'TEST-TRANS-001',
      currency: 'EUR',
    },
  });

  // QR codes are now integrated in Ticket model - no separate creation needed

  // Create test reviews
  await prisma.review.create({
    data: {
      userId: testUser1.id,
      eventId: event1.id,
      rating: 5,
      comment: 'Excellent test event!',
    },
  });

  await prisma.review.create({
    data: {
      userId: testUser2.id,
      eventId: event1.id,
      rating: 4,
      comment: 'Very good test event.',
    },
  });

  // Create test team members
  await prisma.teamMember.create({
    data: {
      organizerId: organizer.id,
      userId: testOrganizer.id,
      role: 'MANAGER',
    },
  });

  // Create test sessions
  await prisma.userSession.create({
    data: {
      userId: testUser1.id,
      token: 'test-session-token-1',
      ipAddress: '127.0.0.1',
      userAgent: 'Test User Agent',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
  });

  // Create test notifications
  await prisma.notification.create({
    data: {
      userId: testUser1.id,
      type: 'TICKET_PURCHASED',
      message: 'Your ticket has been purchased successfully',
      sentAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId: testUser2.id,
      type: 'PAYMENT_PENDING',
      message: 'Your payment is pending',
      sentAt: new Date(),
    },
  });

  // Create test activity logs
  await prisma.activityLog.create({
    data: {
      userId: testUser1.id,
      action: 'TICKET_PURCHASE',
      targetType: 'TICKET',
      targetId: ticket1.id,
    },
  });

  await prisma.eventLog.create({
    data: {
      userId: testUser1.id,
      type: 'USER_LOGIN',
      context: 'Test login event',
    },
  });

  console.log('✅ Test data inserted successfully');
  console.log('📊 Summary of created data:');
  console.log('   - 4 test users');
  console.log('   - 1 organizer');
  console.log('   - 3 events');
  console.log('   - 3 categories');
  console.log('   - 2 venues');
  console.log('   - 2 themes');
  console.log('   - 2 orders');
  console.log('   - 3 tickets');
  console.log('   - 1 payment');
  console.log('   - 2 QR codes');
  console.log('   - 2 reviews');
  console.log('   - 1 team member');
  console.log('   - 1 session');
  console.log('   - 2 notifications');
  console.log('   - 2 logs');
  console.log('');
  console.log('🔐 Test accounts created:');
  console.log('   - test1@example.com / test123 (USER)');
  console.log('   - test2@example.com / test123 (USER)');
  console.log('   - organizer@test.com / test123 (ORGANIZER)');
  console.log('   - admin@test.com / test123 (ADMIN)');
}
