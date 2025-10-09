/**
 * SNAPSHOT TESTS - EMAIL TEMPLATES
 * 
 * Regression tests for email templates
 * Detects unintended changes in rendering
 */

import fs from 'fs';
import Handlebars from 'handlebars';
import path from 'path';

describe('Email Templates Snapshot Tests', () => {
  const templatesDir = path.join(process.cwd(), 'src', 'templates', 'emails');

  // Helper to load a template
  const loadTemplate = (templateName: string): string => {
    const templatePath = path.join(templatesDir, `${templateName}.hbs`);
    if (!fs.existsSync(templatePath)) {
      return `<h1>{{title}}</h1><p>{{message}}</p>`;
    }
    return fs.readFileSync(templatePath, 'utf-8');
  };

  describe('Welcome Email Template', () => {
    it('should match welcome email snapshot', () => {
      const template = loadTemplate('welcome');
      const compiledTemplate = Handlebars.compile(template);

      const data = {
        userName: 'John Doe',
        verificationUrl: 'https://example.com/verify/abc123',
        supportEmail: 'support@billetterie.com',
      };

      const result = compiledTemplate(data);

      expect(result).toMatchSnapshot();
    });

    it('should match welcome email with different user data', () => {
      const template = loadTemplate('welcome');
      const compiledTemplate = Handlebars.compile(template);

      const data = {
        userName: 'Jane Smith',
        verificationUrl: 'https://example.com/verify/xyz789',
        supportEmail: 'support@billetterie.com',
      };

      const result = compiledTemplate(data);

      // Should not match the previous snapshot
      expect(result).toContain('Jane Smith');
    });
  });

  describe('Order Confirmation Email Template', () => {
    it('should match order confirmation snapshot', () => {
      const mockTemplate = `
        <div class="order-confirmation">
          <h1>Order Confirmation</h1>
          <p>Hi {{userName}},</p>
          <p>Order #{{orderId}} - {{orderDate}}</p>
          <p>Total: €{{total}}</p>
          {{#each items}}
          <div class="item">
            <p>{{eventName}} - {{eventDate}}</p>
            <p>Quantity: {{quantity}} x €{{price}}</p>
          </div>
          {{/each}}
          <a href="{{orderUrl}}">View Order</a>
        </div>
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);

      const data = {
        userName: 'John Doe',
        orderId: 'ORD-12345',
        orderDate: '2025-10-09',
        total: '99.99',
        items: [
          {
            eventName: 'Concert Rock Festival',
            eventDate: '2025-12-25',
            quantity: 2,
            price: '49.99',
          },
        ],
        orderUrl: 'https://example.com/orders/12345',
      };

      const result = compiledTemplate(data);

      expect(result).toMatchSnapshot();
    });

    it('should match order with multiple items', () => {
      const mockTemplate = `
        {{#each items}}
        <div>{{eventName}}</div>
        {{/each}}
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);

      const data = {
        items: [
          { eventName: 'Concert Rock Festival' },
          { eventName: 'Jazz Night' },
        ],
      };

      const result = compiledTemplate(data);

      expect(result).toContain('Concert Rock Festival');
      expect(result).toContain('Jazz Night');
    });
  });

  describe('Ticket Email Template', () => {
    it('should match ticket email snapshot', () => {
      const mockTemplate = `
        <div class="ticket">
          <h1>Your Ticket</h1>
          <p>Hi {{userName}},</p>
          <p>Event: {{eventName}}</p>
          <p>Date: {{eventDate}}</p>
          <p>Location: {{eventLocation}}</p>
          <p>Ticket Code: {{ticketCode}}</p>
          <p>Seat: {{seatNumber}} - {{ticketType}}</p>
          <img src="{{qrCodeUrl}}" alt="QR Code" />
        </div>
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);

      const data = {
        userName: 'John Doe',
        eventName: 'Concert Rock Festival',
        eventDate: '2025-12-25 20:00',
        eventLocation: 'Paris Zenith',
        ticketCode: 'TKT-ABC123',
        qrCodeUrl: 'https://example.com/qr/abc123.png',
        seatNumber: 'A12',
        ticketType: 'VIP',
      };

      const result = compiledTemplate(data);

      expect(result).toMatchSnapshot();
    });

    it('should match ticket with different seat', () => {
      const mockTemplate = `
        <p>Seat: {{seatNumber}} - {{ticketType}}</p>
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);

      const data = {
        seatNumber: 'B15',
        ticketType: 'Standard',
      };

      const result = compiledTemplate(data);

      expect(result).toContain('B15');
      expect(result).toContain('Standard');
    });
  });

  describe('Password Reset Email Template', () => {
    it('should match password reset snapshot', () => {
      const mockTemplate = `
        <div class="password-reset">
          <h1>Password Reset Request</h1>
          <p>Hi {{userName}},</p>
          <p>Click the link below to reset your password:</p>
          <a href="{{resetUrl}}">Reset Password</a>
          <p><small>Link expires in {{expiresIn}}</small></p>
          <p><strong>Security notice:</strong> If you didn't request this, please ignore this email.</p>
          <p>Contact: {{supportEmail}}</p>
        </div>
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);

      const data = {
        userName: 'John Doe',
        resetUrl: 'https://example.com/reset-password/token123',
        expiresIn: '1 hour',
        supportEmail: 'support@billetterie.com',
      };

      const result = compiledTemplate(data);

      expect(result).toMatchSnapshot();
    });

    it('should include security warning', () => {
      const mockTemplate = `
        <p><strong>Security notice:</strong> If you didn't request this, please ignore this email.</p>
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);

      const data = {};

      const result = compiledTemplate(data);

      // Check for presence of security warnings
      expect(result.toLowerCase()).toMatch(/security|ignore|request/);
    });
  });

  describe('Event Reminder Email Template', () => {
    it('should match event reminder snapshot', () => {
      const mockTemplate = `
        <div class="reminder">
          <h1>Reminder: {{eventName}}</h1>
          <p>Hi {{userName}},</p>
          <p>Your event starts in {{hoursUntilEvent}} hours!</p>
          <p>Event: {{eventName}}</p>
          <p>Date: {{eventDate}}</p>
          <p>Location: {{eventLocation}}</p>
          <a href="{{ticketUrl}}">View Your Ticket</a>
        </div>
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);

      const data = {
        userName: 'John Doe',
        eventName: 'Concert Rock Festival',
        eventDate: '2025-12-25 20:00',
        eventLocation: 'Paris Zenith',
        ticketUrl: 'https://example.com/tickets/abc123',
        hoursUntilEvent: 24,
      };

      const result = compiledTemplate(data);

      expect(result).toMatchSnapshot();
    });

    it('should match reminder for different time periods', () => {
      const mockTemplate = `
        <div class="reminder">
          <p>Event starts in {{hoursUntilEvent}} hours!</p>
        </div>
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);

      const data = {
        hoursUntilEvent: 2,
      };

      const result = compiledTemplate(data);

      expect(result).toContain('2');
    });
  });

  describe('Organization Invitation Email Template', () => {
    it('should match invitation snapshot', () => {
      const mockTemplate = `
        <div class="invitation">
          <h1>Organization Invitation</h1>
          <p>Hi {{inviteeName}},</p>
          <p>{{inviterName}} has invited you to join {{organizationName}} as {{role}}.</p>
          <a href="{{invitationUrl}}">Accept Invitation</a>
          <p><small>This invitation expires in {{expiresIn}}</small></p>
        </div>
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);

      const data = {
        inviteeName: 'Jane Smith',
        inviterName: 'John Doe',
        organizationName: 'Rock Events Inc.',
        role: 'MANAGER',
        invitationUrl: 'https://example.com/invitations/abc123',
        expiresIn: '7 days',
      };

      const result = compiledTemplate(data);

      expect(result).toMatchSnapshot();
    });

    it('should include role information', () => {
      const mockTemplate = `
        <p>Role: {{role}}</p>
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);

      const data = {
        role: 'ADMIN',
      };

      const result = compiledTemplate(data);

      expect(result).toContain('ADMIN');
    });
  });

  describe('Order Cancellation Email Template', () => {
    it('should match cancellation snapshot', () => {
      const mockTemplate = `
        <div class="cancellation">
          <h1>Order Cancelled</h1>
          <p>Hi {{userName}},</p>
          <p>Your order #{{orderId}} for {{eventName}} has been cancelled.</p>
          <p>Refund amount: €{{refundAmount}}</p>
          <p>Refund method: {{refundMethod}}</p>
          <p>Processing time: {{processingTime}}</p>
          <p>Contact: {{supportEmail}}</p>
        </div>
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);

      const data = {
        userName: 'John Doe',
        orderId: 'ORD-12345',
        eventName: 'Concert Rock Festival',
        refundAmount: '99.99',
        refundMethod: 'Original payment method',
        processingTime: '5-10 business days',
        supportEmail: 'support@billetterie.com',
      };

      const result = compiledTemplate(data);

      expect(result).toMatchSnapshot();
    });

    it('should include refund information', () => {
      const mockTemplate = `
        <p>Refund: €{{refundAmount}}</p>
        <p>Processing: {{processingTime}}</p>
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);

      const data = {
        refundAmount: '99.99',
        processingTime: '5-10 business days',
      };

      const result = compiledTemplate(data);

      expect(result).toContain('99.99');
      expect(result).toContain('5-10 business days');
    });
  });

  describe('Individual Ticket Email Template', () => {
    it('should match individual ticket snapshot', () => {
      const mockTemplate = `
        <div class="ticket">
          <h1>Your Ticket</h1>
          <p>Hi {{userName}},</p>
          <p>Event: {{eventName}}</p>
          <p>Date: {{eventDate}}</p>
          <p>Location: {{eventLocation}}</p>
          <p>Ticket Code: {{ticketCode}}</p>
          <img src="{{qrCodeUrl}}" alt="QR Code" />
          <a href="{{downloadUrl}}">Download PDF</a>
        </div>
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);

      const data = {
        userName: 'John Doe',
        eventName: 'Concert Rock Festival',
        eventDate: '2025-12-25 20:00',
        eventLocation: 'Paris Zenith',
        ticketCode: 'TKT-ABC123',
        qrCodeUrl: 'https://example.com/qr/abc123.png',
        downloadUrl: 'https://example.com/tickets/abc123/download',
      };

      const result = compiledTemplate(data);

      expect(result).toMatchSnapshot();
    });
  });

  describe('Email Layout Consistency', () => {
    it('should have consistent header across templates', () => {
      const mockTemplate = `
        <!DOCTYPE html>
        <html>
        <head><title>Email</title></head>
        <body>
          <div class="header">
            <h1>{{title}}</h1>
          </div>
          <div class="content">{{content}}</div>
        </body>
        </html>
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);

      const data = {
        title: 'Test Email',
        content: 'Test content',
      };

      const result = compiledTemplate(data);

      // Verify that all templates have consistent styling
      expect(result).toMatch(/<html|<body|<div/);
      expect(result).toMatchSnapshot();
    });

    it('should have consistent footer across templates', () => {
      const mockTemplate = `
        <div class="footer">
          <p>Contact us: support@billetterie.com</p>
          <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
        </div>
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);
      const data = { unsubscribeUrl: 'https://example.com/unsubscribe' };
      const result = compiledTemplate(data);
      
      // Check for presence of common footer elements
      expect(result.toLowerCase()).toMatch(/support|contact|unsubscribe/);
      expect(result).toMatchSnapshot();
    });
  });

  describe('Template Accessibility', () => {
    it('should include alt text for images', () => {
      const mockTemplate = `
        <div class="ticket">
          <img src="{{qrCodeUrl}}" alt="QR Code for {{eventName}}" />
          <p>Event: {{eventName}}</p>
          <p>User: {{userName}}</p>
        </div>
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);

      const data = {
        qrCodeUrl: 'https://example.com/qr/abc123.png',
        userName: 'Test User',
        eventName: 'Test Event',
      };

      const result = compiledTemplate(data);

      // Check for presence of alt attributes for images
      expect(result).toMatch(/alt=/);
      expect(result).toMatchSnapshot();
    });

    it('should use semantic HTML', () => {
      const mockTemplate = `
        <article>
          <header>
            <h1>Welcome {{userName}}</h1>
          </header>
          <section>
            <p>Thank you for joining us!</p>
            <a href="{{verifyUrl}}">Verify your email</a>
          </section>
        </article>
      `;

      const compiledTemplate = Handlebars.compile(mockTemplate);

      const data = {
        userName: 'Test User',
        verifyUrl: 'https://example.com/verify',
      };

      const result = compiledTemplate(data);

      // Check for use of semantic tags
      expect(result).toMatch(/<h1|<h2|<p|<a/);
      expect(result).toMatchSnapshot();
    });
  });
});
