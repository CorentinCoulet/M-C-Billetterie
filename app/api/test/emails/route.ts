import { NextResponse } from 'next/server';

/**
 * Main test endpoint listing all available email tests
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return NextResponse.json({
    message: 'Email Testing System - Billetterie',
    available_tests: [
      {
        name: 'Welcome Email',
        endpoint: `${baseUrl}/api/test/emails/welcome`,
        method: 'POST',
        description: 'Send welcome email with promo code',
        example_body: {
          email: 'test@example.com',
          name: 'Test User'
        }
      },
      {
        name: 'Order Confirmation',
        endpoint: `${baseUrl}/api/test/emails/order-confirmation`,
        method: 'POST',
        description: 'Send order confirmation with ticket details',
        example_body: {
          email: 'test@example.com',
          name: 'Test User'
        }
      },
      {
        name: 'Ticket Email',
        endpoint: `${baseUrl}/api/test/emails/tickets`,
        method: 'POST',
        description: 'Send tickets with QR codes',
        example_body: {
          email: 'test@example.com',
          name: 'Test User'
        }
      }
    ],
    templates: [
      'welcome.hbs - Welcome email with promo code',
      'registration-confirmation.hbs - Email verification',
      'password-reset.hbs - Password reset with security info',
      'order-confirmation.hbs - Order details and summary',
      'tickets.hbs - Tickets with QR codes',
      'event-reminder.hbs - Event reminder with checklist',
      'layout.hbs - Base template for all emails'
    ],
    features: [
      'Handlebars templating with helpers',
      'Responsive email design',
      'QR code integration',
      'Template caching for performance',
      'Environment variable configuration',
      'Professional email styling'
    ],
    setup_required: {
      environment_variables: [
        'EMAIL_HOST - SMTP server host',
        'EMAIL_PORT - SMTP server port',
        'EMAIL_USER - SMTP username',
        'EMAIL_PASSWORD - SMTP password/app password',
        'EMAIL_FROM - From address',
        'SUPPORT_EMAIL - Support contact email'
      ],
      note: 'Test endpoints only work in development mode'
    }
  });
}
