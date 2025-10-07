/**
 * Test script for the email service with Handlebars templates
 * Tests all email templates with sample data
 */

import emailService from '../../src/services/emailService';
import { UserWithRelations } from '../../src/types/user';

async function testEmailTemplates() {
  console.log('🧪 Testing Email Service with Handlebars Templates\n');

  // Test data
  const testUser: UserWithRelations = {
    id: 'test-user-123',
    name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    password: 'hashed-password',
    role: 'USER',
    isVerified: true,
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    blocked: null,
  };

  const testOrderId = 'ORDER-2024-001';
  const testToken = 'test-token-123456789';

  try {
    // Test 1: Welcome Email
    console.log('✅ Test 1: Welcome Email');
    await emailService.sendWelcomeEmail(testUser, 'WELCOME25');
    console.log('   ✓ Welcome email sent successfully\n');

    // Test 2: Email Verification
    console.log('✅ Test 2: Email Verification');
    await emailService.sendVerificationEmail(testUser, testToken);
    console.log('   ✓ Verification email sent successfully\n');

    // Test 3: Password Reset
    console.log('✅ Test 3: Password Reset');
    await emailService.sendPasswordResetEmail(testUser, testToken, {
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: 'Paris, France'
    });
    console.log('   ✓ Password reset email sent successfully\n');

    // Test 4: Order Confirmation
    console.log('✅ Test 4: Order Confirmation');
    await emailService.sendOrderConfirmationEmail(
      testUser.email,
      testUser.name,
      testOrderId,
      {
        totalAmount: 95.50,
        orderDate: new Date(),
        tickets: [
          {
            name: 'Billet Standard',
            quantity: 2,
            price: 35.00,
            eventName: 'Concert Jazz Festival 2024',
            eventDate: new Date('2024-07-15T20:00:00'),
            eventLocation: 'Salle Pleyel, Paris'
          },
          {
            name: 'Billet VIP',
            quantity: 1,
            price: 25.50,
            eventName: 'Théâtre des Champs-Élysées',
            eventDate: new Date('2024-08-20T19:30:00'),
            eventLocation: 'Théâtre des Champs-Élysées, Paris'
          }
        ]
      }
    );
    console.log('   ✓ Order confirmation email sent successfully\n');

    // Test 5: Ticket Email with QR Codes
    console.log('✅ Test 5: Ticket Email with QR Codes');
    await emailService.sendTicketEmail(
      testUser.email,
      testUser.name,
      testOrderId,
      [
        {
          id: 'ticket-001',
          name: 'Billet Standard #001',
          eventName: 'Concert Jazz Festival 2024',
          eventDate: new Date('2024-07-15T20:00:00'),
          eventLocation: 'Salle Pleyel, Paris',
          qrCode: 'QR123456789ABC',
          instructions: 'Présentez ce QR code à l\'entrée principale'
        },
        {
          id: 'ticket-002',
          name: 'Billet Standard #002',
          eventName: 'Concert Jazz Festival 2024',
          eventDate: new Date('2024-07-15T20:00:00'),
          eventLocation: 'Salle Pleyel, Paris',
          qrCode: 'QR987654321DEF',
          instructions: 'Présentez ce QR code à l\'entrée principale'
        }
      ]
    );
    console.log('   ✓ Ticket email sent successfully\n');

    // Test 6: Event Reminder
    console.log('✅ Test 6: Event Reminder');
    await emailService.sendEventReminderEmail(
      testUser.email,
      testUser.name,
      {
        id: 'event-jazz-2024',
        name: 'Concert Jazz Festival 2024',
        date: new Date(Date.now() + 12 * 60 * 60 * 1000), // In 12 hours
        location: 'Salle Pleyel, 252 Rue du Faubourg Saint-Honoré, 75008 Paris'
      },
      [
        { code: 'TICKET-001-QR123', type: 'Standard' },
        { code: 'TICKET-002-QR456', type: 'Standard' }
      ]
    );
    console.log('   ✓ Event reminder email sent successfully\n');

    console.log('🎉 All email templates tested successfully!');
    console.log('📧 Check your email inbox to verify the templates rendering');
    
  } catch (error) {
    console.error('❌ Error testing email templates:', error);
  }
}

async function testTemplateRendering() {
  console.log('\n🎨 Testing Template Rendering Performance\n');

  // Test data
  const testUser: UserWithRelations = {
    id: 'test-user-123',
    name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    password: 'hashed-password',
    role: 'USER',
    isVerified: true,
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    blocked: null,
  };

  const startTime = Date.now();
  
  try {
    // Test template compilation caching
    for (let i = 0; i < 5; i++) {
      await emailService.sendWelcomeEmail({
        ...testUser,
        id: `user-${i}`,
        name: `Test User ${i}`,
        email: `user${i}@example.com`,
      }, 'WELCOME25');
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Template caching test completed in ${duration}ms`);
    console.log(`⚡ Average time per email: ${duration / 5}ms`);
    
  } catch (error) {
    console.error('❌ Error testing template performance:', error);
  }
}

async function displayTemplateInfo() {
  console.log('\n📋 Email Template System Information\n');
  
  console.log('📁 Available templates:');
  console.log('   • welcome.hbs - Welcome email with promo code');
  console.log('   • registration-confirmation.hbs - Registration confirmation');
  console.log('   • password-reset.hbs - Password reset');
  console.log('   • order-confirmation.hbs - Order confirmation');
  console.log('   • tickets.hbs - Ticket delivery with QR codes');
  console.log('   • event-reminder.hbs - Event reminder');
  console.log('   • layout.hbs - Common base template');
  
  console.log('\n🔧 Available Handlebars Helpers:');
  console.log('   • {{formatDate date}} - French date format');
  console.log('   • {{formatCurrency amount}} - Euro currency format');
  console.log('   • {{calculateTotal price quantity}} - Total calculation');
  console.log('   • {{timeUntilEvent eventDate}} - Hours until event');
  
  console.log('\n📨 Common variables available in all templates:');
  console.log('   • appName, baseUrl, supportEmail, currentYear');
  console.log('   • logoUrl, facebookUrl, twitterUrl, etc.');
  
  console.log('\n🎯 Integration with existing system:');
  console.log('   • Uses existing emailService.ts service');
  console.log('   • Compatible with QR code system');
  console.log('   • Responsive templates for mobile/desktop');
  console.log('   • Consistent branding with application');
}

// Main execution
async function main() {
  console.log('🚀 Email Service Testing Suite');
  console.log('============================\n');

  await displayTemplateInfo();
  
  // Uncomment to test actual email sending (requires SMTP configuration)
  // await testEmailTemplates();
  // await testTemplateRendering();
  
  console.log('\n✨ To test email sending:');
  console.log('1. Configure SMTP environment variables');
  console.log('2. Uncomment test calls in the script');
  console.log('3. Run: yarn test:emails\n');
}

if (require.main === module) {
  main().catch(console.error);
}

export { testEmailTemplates, testTemplateRendering };

