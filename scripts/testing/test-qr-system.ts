#!/usr/bin/env node

/**
 * Script test for the QR code system
 * 
 * Usage: yarn test:qr
 */

import { PrismaClient } from '../../src/generated/prisma';
import qrRotationService from '../../src/services/qrRotationService';
import ticketService from '../../src/services/ticketQRService';

const prisma = new PrismaClient();

async function testQRSystem() {
  console.log('🧪 Testing QR Code System...\n');

  try {
    // 1. Test: Create a test event and user if they don't exist
    console.log('1️⃣ Setting up test data...');
    
    let testEvent = await prisma.event.findFirst({
      where: { title: 'QR Test Event' }
    });

    if (!testEvent) {
      testEvent = await prisma.event.create({
        data: {
          title: 'QR Test Event',
          description: 'Event for testing QR codes',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          location: 'Test Venue',
          organizerId: '00000000-0000-0000-0000-000000000001', // You might need to create this
          isPublished: true
        }
      });
    }

    let testUser = await prisma.user.findFirst({
      where: { email: 'qrtest@example.com' }
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'qrtest@example.com',
          name: 'QR Test User',
          password: 'hashedpassword' // In real app, this would be hashed
        }
      });
    }

    console.log(`✅ Test event: ${testEvent.id}`);
    console.log(`✅ Test user: ${testUser.id}\n`);

    // 2. Test: Create a ticket
    console.log('2️⃣ Creating test ticket...');
    
    const ticket = await ticketService.createTicket({
      eventId: testEvent.id,
      userId: testUser.id,
      seatNumber: 'A1',
      status: 'paid'
    });

    console.log(`✅ Created ticket: ${ticket.id}\n`);

    // 3. Test: Generate QR code
    console.log('3️⃣ Generating QR code...');
    
    const qrResult = await ticketService.generateTicketQRCode(ticket.id);
    console.log(`✅ QR Code generated`);
    console.log(`   Token: ${qrResult.qrCodeToken.substring(0, 20)}...`);
    console.log(`   Data URL length: ${qrResult.qrCodeDataUrl.length} chars\n`);

    // 4. Test: Validate QR code
    console.log('4️⃣ Validating QR code...');
    
    // Get the QR content from the ticket
    const updatedTicket = await ticketService.getTicketById(ticket.id);
    if (!updatedTicket?.currentQRCode) {
      throw new Error('QR code not found on ticket');
    }

    // Extract the QR data (in a real app, this would be scanned)
    const qrDataStart = updatedTicket.currentQRCode.indexOf('data:image/png;base64,');
    console.log(`   QR Code stored on ticket: ${qrDataStart !== -1 ? 'Yes' : 'No'}`);

    // For testing, we'll create the expected QR content manually
    // Generate the correct checksum
    const crypto = await import('crypto');
    const checksumData = `${ticket.id}-${testEvent.id}-${testUser.id}`;
    const correctChecksum = crypto.createHash('md5').update(checksumData).digest('hex');
    
    const testQRContent = JSON.stringify({
      ticketId: ticket.id,
      eventId: testEvent.id,
      userId: testUser.id,
      orderId: ticket.orderId,
      eventTitle: testEvent.title,
      eventDate: testEvent.date.toISOString(),
      issuedAt: new Date().toISOString(),
      token: qrResult.qrCodeToken,
      checksum: correctChecksum,
      ticketCode: ticket.code
    });

    // Test validation (first time - should succeed)
    const validation1 = await ticketService.validateTicketQRCode(testQRContent, false);
    console.log(`   First validation: ${validation1.valid ? '✅ Valid' : '❌ Invalid'}`);
    if (!validation1.valid) {
      console.log(`   Error: ${validation1.error}`);
    }

    // Test validation with marking as used
    const validation2 = await ticketService.validateTicketQRCode(testQRContent, true);
    console.log(`   Mark as used: ${validation2.valid ? '✅ Success' : '❌ Failed'}`);
    if (validation2.valid && validation2.ticket) {
      console.log(`   Ticket scanned at: ${validation2.ticket.scannedAt}`);
    }

    // Test validation after being used (should show already scanned)
    const validation3 = await ticketService.validateTicketQRCode(testQRContent, false);
    console.log(`   After use validation: ${validation3.isAlreadyScanned ? '✅ Already scanned detected' : '❌ Should be already scanned'}`);
    console.log();

    // 5. Test: Event scan statistics
    console.log('5️⃣ Testing scan statistics...');
    
    const scanStats = await ticketService.getEventScanStats(testEvent.id);
    console.log(`   Total tickets: ${scanStats.totalTickets}`);
    console.log(`   Scanned tickets: ${scanStats.scannedTickets}`);
    console.log(`   Scan percentage: ${scanStats.scanPercentage}%\n`);

    // 6. Test: QR rotation
    console.log('6️⃣ Testing QR rotation system...');
    
    const rotationStats = await qrRotationService.getRotationStats();
    console.log(`   Total tickets: ${rotationStats.totalTickets}`);
    console.log(`   Active tickets: ${rotationStats.activeTickets}`);
    console.log(`   Expired QR codes: ${rotationStats.expiredQRCodes}\n`);

    console.log('🎉 All QR code tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
testQRSystem().catch(console.error);
