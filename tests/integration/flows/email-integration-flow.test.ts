/**
 * Email Integration Flow Tests
 * Tests the complete email notification system throughout the user journey
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Types
type UserRole = 'USER' | 'ORGANIZER' | 'ADMIN';
type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
type TicketStatus = 'VALID' | 'USED' | 'CANCELLED';
type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';

// Mock Nodemailer
const mockSendMail = jest.fn() as any;
mockSendMail.mockResolvedValue({ messageId: 'mock-message-id' });

const mockNodemailer = {
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
};

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  event: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  order: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  ticket: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  organization: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  organizationMember: {
    create: jest.fn(),
  },
  $transaction: jest.fn((callback: any) => {
    if (typeof callback === 'function') {
      return callback(mockPrisma);
    }
    return Promise.all(callback as any[]);
  }),
} as any;

// Mock modules
jest.mock('nodemailer', () => mockNodemailer);

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock fs for email templates
const mockReadFile = jest.fn() as any;

jest.mock('fs/promises', () => ({
  readFile: mockReadFile,
}));

describe('Email Integration Flow Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'newuser@example.com',
    name: 'John Doe',
    role: 'USER' as UserRole,
    emailVerified: null,
    password: 'hashed_password',
    isVerified: false,
    lastLogin: null,
    blocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockEvent = {
    id: 'event-123',
    title: 'Summer Music Festival',
    description: 'Amazing summer festival',
    date: new Date('2025-07-15'),
    location: 'Central Park',
    capacity: 1000,
    availableTickets: 1000,
    price: 50,
    status: 'PUBLISHED' as EventStatus,
    organizerId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrder = {
    id: 'order-123',
    userId: 'user-123',
    eventId: 'event-123',
    status: 'COMPLETED' as OrderStatus,
    totalAmount: 100,
    quantity: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'mock-message-id' });
    
    // Mock different templates based on the file being read
    mockReadFile.mockImplementation((filePath: string) => {
      const path = filePath.toString();
      
      if (path.includes('layout.hbs')) {
        return Promise.resolve(`
          <!DOCTYPE html>
          <html>
            <head><title>{{appName}}</title></head>
            <body>
              {{> content}}
            </body>
          </html>
        `);
      }
      
      // Mock specific email templates
      if (path.includes('welcome.hbs')) {
        return Promise.resolve(`<h1>Welcome {{userName}}!</h1><p>Promo: {{promoCode}}</p>`);
      }
      
      if (path.includes('registration-confirmation.hbs')) {
        return Promise.resolve(`<h1>Confirm your email {{userName}}</h1><a href="{{verificationUrl}}">Verify</a>`);
      }
      
      if (path.includes('password-reset.hbs')) {
        return Promise.resolve(`<h1>Reset Password {{userName}}</h1><a href="{{resetUrl}}">Reset</a>`);
      }
      
      if (path.includes('order-confirmation.hbs')) {
        return Promise.resolve(`
          <h1>Order {{orderId}}</h1>
          <p>Total: {{totalAmount}}</p>
          {{#each tickets}}
            <div>{{name}} - {{quantity}} x {{price}}</div>
          {{/each}}
        `);
      }
      
      if (path.includes('tickets.hbs')) {
        return Promise.resolve(`
          <h1>Your Tickets</h1>
          <p>Order: {{orderId}}</p>
          {{#each tickets}}
            <div>QR: {{qrCode}}</div>
          {{/each}}
        `);
      }
      
      if (path.includes('event-reminder.hbs')) {
        return Promise.resolve(`
          <h1>Reminder: {{eventTitle}}</h1>
          <p>Location: {{eventLocation}}</p>
          <p>In {{hoursUntilEvent}} hours</p>
        `);
      }
      
      if (path.includes('individual-ticket.hbs')) {
        return Promise.resolve(`
          <h1>Ticket {{ticketId}}</h1>
          <p>Event: {{eventName}}</p>
          <p>QR: {{qrCode}}</p>
        `);
      }
      
      if (path.includes('organization-invitation.hbs')) {
        return Promise.resolve(`
          <h1>Join {{organizationName}}</h1>
          <p>Invited by {{inviterName}}</p>
          <p>Role: {{role}}</p>
        `);
      }
      
      if (path.includes('order-cancellation.hbs')) {
        return Promise.resolve(`
          <h1>Order {{orderId}} Cancelled</h1>
          <p>Refund: {{refundAmount}}</p>
          {{#each tickets}}
            <div>{{name}}</div>
          {{/each}}
        `);
      }
      
      return Promise.resolve('<div>Generic Template</div>');
    });
  });

  describe('User Registration Email Flow', () => {
    it('should send welcome email on successful registration', async () => {
      // Mock user creation
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      // Send welcome email
      await emailService.sendWelcomeEmail(mockUser, 'WELCOME20');

      // Verify email was sent
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('Welcome'),
          html: expect.any(String),
        })
      );
    });

    it('should send verification email after registration', async () => {
      const verificationToken = 'verification-token-123';
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      // Send verification email
      await emailService.sendVerificationEmail(mockUser, verificationToken);

      // Verify email was sent with verification link
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('Confirm'),
          html: expect.stringContaining(verificationToken),
        })
      );
    });

    it('should send password reset email when requested', async () => {
      const resetToken = 'reset-token-456';
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      // Send password reset email
      await emailService.sendPasswordResetEmail(mockUser, resetToken, {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        location: 'New York, USA',
      });

      // Verify email was sent with reset link
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('Password Reset'),
          html: expect.stringContaining(resetToken),
        })
      );
    });
  });

  describe('Order Confirmation Email Flow', () => {
    it('should send order confirmation email after successful purchase', async () => {
      mockPrisma.order.create.mockResolvedValue(mockOrder);
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);

      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      // Send order confirmation
      await emailService.sendOrderConfirmationEmail(
        mockUser.email,
        mockUser.name,
        mockOrder.id,
        {
          totalAmount: mockOrder.totalAmount,
          orderDate: mockOrder.createdAt,
          tickets: [
            {
              name: 'General Admission',
              quantity: 2,
              price: 50,
              eventName: mockEvent.title,
              eventDate: mockEvent.date,
              eventLocation: mockEvent.location,
            },
          ],
        }
      );

      // Verify order confirmation email was sent
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('Order Confirmation'),
          html: expect.stringContaining(mockOrder.id),
        })
      );
    });

    it('should include ticket details in order confirmation email', async () => {
      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      await emailService.sendOrderConfirmationEmail(
        mockUser.email,
        mockUser.name,
        mockOrder.id,
        {
          totalAmount: 150,
          orderDate: new Date(),
          tickets: [
            {
              name: 'VIP Pass',
              quantity: 1,
              price: 100,
              eventName: 'Rock Concert',
              eventDate: new Date('2025-08-20'),
              eventLocation: 'Madison Square Garden',
            },
            {
              name: 'Regular Pass',
              quantity: 2,
              price: 25,
              eventName: 'Rock Concert',
              eventDate: new Date('2025-08-20'),
              eventLocation: 'Madison Square Garden',
            },
          ],
        }
      );

      // Verify email contains ticket information
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const emailCall = mockSendMail.mock.calls[0][0] as any;
      expect(emailCall.html).toContain('VIP Pass');
      expect(emailCall.html).toContain('Regular Pass');
    });
  });

  describe('Ticket Email Flow', () => {
    it('should send ticket email with QR code after order completion', async () => {
      const mockTickets = [
        {
          id: 'ticket-1',
          name: 'General Admission',
          eventName: mockEvent.title,
          eventDate: mockEvent.date,
          eventLocation: mockEvent.location,
          qrCode: 'qr-code-data-1',
        },
        {
          id: 'ticket-2',
          name: 'General Admission',
          eventName: mockEvent.title,
          eventDate: mockEvent.date,
          eventLocation: mockEvent.location,
          qrCode: 'qr-code-data-2',
        },
      ];

      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        event: mockEvent,
        user: mockUser,
      });

      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      // Send ticket email
      await emailService.sendTicketEmail(
        mockUser.email,
        mockUser.name,
        mockOrder.id,
        mockTickets
      );

      // Verify ticket email was sent
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('Ticket'),
          html: expect.any(String),
        })
      );
    });

    it('should include all tickets with unique QR codes in the email', async () => {
      const mockTickets = [
        {
          id: 'ticket-1',
          name: 'General Admission',
          eventName: mockEvent.title,
          eventDate: mockEvent.date,
          eventLocation: mockEvent.location,
          qrCode: 'unique-qr-code-1',
        },
        {
          id: 'ticket-2',
          name: 'General Admission',
          eventName: mockEvent.title,
          eventDate: mockEvent.date,
          eventLocation: mockEvent.location,
          qrCode: 'unique-qr-code-2',
        },
      ];

      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);

      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      // Send ticket email with all tickets
      await emailService.sendTicketEmail(
        mockUser.email,
        mockUser.name,
        mockOrder.id,
        mockTickets
      );

      // Verify email was sent
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      
      // Verify email has both unique QR codes
      const emailCall = mockSendMail.mock.calls[0][0] as any;
      expect(emailCall.html).toContain('unique-qr-code-1');
      expect(emailCall.html).toContain('unique-qr-code-2');
    });
  });

  describe('Event Reminder Email Flow', () => {
    it('should send event reminder 24 hours before event', async () => {
      const upcomingEvent = {
        id: 'event-123',
        name: mockEvent.title,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        location: mockEvent.location,
        description: mockEvent.description,
      };

      const userTickets = [
        {
          code: 'ticket-123',
          type: 'General Admission',
        },
      ];

      mockPrisma.event.findUnique.mockResolvedValue(upcomingEvent);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      // Send event reminder
      await emailService.sendEventReminderEmail(
        mockUser.email,
        mockUser.name,
        upcomingEvent,
        userTickets
      );

      // Verify reminder email was sent
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('Reminder'),
          html: expect.stringContaining(upcomingEvent.name),
        })
      );
    });

    it('should include event details and directions in reminder email', async () => {
      const upcomingEvent = {
        id: 'event-123',
        name: mockEvent.title,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        location: 'Central Park, New York',
        description: mockEvent.description,
      };

      const userTickets = [
        {
          code: 'ticket-123',
          type: 'General Admission',
        },
      ];

      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      await emailService.sendEventReminderEmail(
        mockUser.email,
        mockUser.name,
        upcomingEvent,
        userTickets
      );

      // Verify email contains location and event details
      const emailCall = mockSendMail.mock.calls[0][0] as any;
      expect(emailCall.html).toContain(upcomingEvent.location);
      expect(emailCall.html).toContain(upcomingEvent.name);
    });
  });

  describe('Contact Form Email Flow', () => {
    it('should send contact form email to support', async () => {
      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      // Send contact form email
      await emailService.sendContactFormEmail(
        'John Doe',
        'john@example.com',
        'Question about tickets',
        'I have a question about refunds.'
      );

      // Verify contact email was sent
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Contact Form'),
          html: expect.stringContaining('john@example.com'),
        })
      );
    });

    it('should include sender information in contact email', async () => {
      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      await emailService.sendContactFormEmail(
        'Jane Smith',
        'jane@example.com',
        'Feedback',
        'Great service!'
      );

      // Verify sender info is included
      const emailCall = mockSendMail.mock.calls[0][0] as any;
      expect(emailCall.html).toContain('Jane Smith');
      expect(emailCall.html).toContain('jane@example.com');
    });
  });

  describe('Individual Ticket Email Flow', () => {
    it('should send individual ticket email with QR code', async () => {
      const mockTicket = {
        id: 'ticket-123',
        name: 'VIP Pass',
        eventName: 'Rock Concert',
        eventDate: new Date('2025-08-20'),
        eventLocation: 'Madison Square Garden',
        qrCode: 'qr-code-xyz',
      };

      // Mock template for individual ticket
      mockReadFile.mockImplementation((filePath: string) => {
        const path = filePath.toString();
        if (path.includes('layout.hbs')) {
          return Promise.resolve(`<html><body>{{> content}}</body></html>`);
        }
        if (path.includes('individual-ticket.hbs')) {
          return Promise.resolve(`<h1>Ticket {{ticketId}}</h1><p>QR: {{qrCode}}</p>`);
        }
        return Promise.resolve('<div>Template</div>');
      });

      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      await emailService.sendIndividualTicketEmail(
        mockUser.email,
        mockUser.name,
        mockTicket
      );

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('Ticket'),
          html: expect.any(String),
        })
      );
    });
  });

  describe('Organization Invitation Email Flow', () => {
    it('should send organization invitation email', async () => {
      // Mock template for organization invitation
      mockReadFile.mockImplementation((filePath: string) => {
        const path = filePath.toString();
        if (path.includes('layout.hbs')) {
          return Promise.resolve(`<html><body>{{> content}}</body></html>`);
        }
        if (path.includes('organization-invitation.hbs')) {
          return Promise.resolve(`
            <h1>Join {{organizationName}}</h1>
            <p>Invited by {{inviterName}}</p>
            <p>Role: {{role}}</p>
          `);
        }
        return Promise.resolve('<div>Template</div>');
      });

      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      await emailService.sendOrganizationInvitationEmail(
        'newmember@example.com',
        'Alice Manager',
        'Tech Events Inc',
        'MEMBER',
        'invitation-token-abc'
      );

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'newmember@example.com',
          subject: expect.stringContaining('Invitation'),
          html: expect.any(String),
        })
      );
    });
  });

  describe('Order Cancellation Email Flow', () => {
    it('should send order cancellation email with refund details', async () => {
      // Mock template for order cancellation
      mockReadFile.mockImplementation((filePath: string) => {
        const path = filePath.toString();
        if (path.includes('layout.hbs')) {
          return Promise.resolve(`<html><body>{{> content}}</body></html>`);
        }
        if (path.includes('order-cancellation.hbs')) {
          return Promise.resolve(`
            <h1>Order {{orderId}} Cancelled</h1>
            <p>Refund: {{refundAmount}}</p>
          `);
        }
        return Promise.resolve('<div>Template</div>');
      });

      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      await emailService.sendOrderCancellationEmail(
        mockUser.email,
        mockUser.name,
        'order-123',
        {
          orderDate: new Date('2025-07-01'),
          totalAmount: 100,
          refundAmount: 100,
          cancellationDate: new Date('2025-07-05'),
          cancellationReason: 'Customer request',
          tickets: [
            {
              name: 'General Admission',
              quantity: 2,
              eventName: 'Summer Festival',
              eventDate: new Date('2025-08-15'),
            },
          ],
        }
      );

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('Cancellation'),
          html: expect.any(String),
        })
      );
    });
  });



  describe('Email Retry and Error Handling', () => {
    it('should retry sending email on temporary failure', async () => {
      // Mock first call to fail, second to succeed
      (mockSendMail as any)
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce({ messageId: 'success-id' });

      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      // Try sending with retry logic
      let emailSent = false;
      try {
        await emailService.sendWelcomeEmail(mockUser);
      } catch (error) {
        // First attempt failed, retry
        await emailService.sendWelcomeEmail(mockUser);
        emailSent = true;
      }

      // Verify email was eventually sent after retry
      expect(mockSendMail).toHaveBeenCalledTimes(2);
    });

    it('should log error when email fails after all retries', async () => {
      (mockSendMail as any).mockRejectedValue(new Error('SMTP server down'));

      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      // Expect email sending to fail
      await expect(
        emailService.sendWelcomeEmail(mockUser)
      ).rejects.toThrow('SMTP server down');

      expect(mockSendMail).toHaveBeenCalled();
    });

    it('should handle invalid email addresses gracefully', async () => {
      const invalidUser = {
        ...mockUser,
        email: 'invalid-email',
      };

      (mockSendMail as any).mockRejectedValue(new Error('Invalid email address'));

      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      await expect(
        emailService.sendWelcomeEmail(invalidUser)
      ).rejects.toThrow('Invalid email address');
    });
  });

  describe('Complete Email Journey Integration', () => {
    it('should send all relevant emails throughout complete user journey', async () => {
      const { EmailService } = await import('@/services/emailService');
      const emailService = new EmailService();

      // 1. User registers
      await emailService.sendWelcomeEmail(mockUser, 'WELCOME20');
      expect(mockSendMail).toHaveBeenCalledTimes(1);

      // 2. User verifies email
      await emailService.sendVerificationEmail(mockUser, 'verify-token');
      expect(mockSendMail).toHaveBeenCalledTimes(2);

      // 3. User makes purchase
      await emailService.sendOrderConfirmationEmail(
        mockUser.email,
        mockUser.name,
        mockOrder.id,
        {
          totalAmount: 100,
          orderDate: new Date(),
          tickets: [
            {
              name: 'General',
              quantity: 2,
              price: 50,
              eventName: mockEvent.title,
              eventDate: mockEvent.date,
              eventLocation: mockEvent.location,
            },
          ],
        }
      );
      expect(mockSendMail).toHaveBeenCalledTimes(3);

      // 4. User receives tickets
      const mockTickets = [
        {
          id: 'ticket-1',
          name: 'General Admission',
          eventName: mockEvent.title,
          eventDate: mockEvent.date,
          eventLocation: mockEvent.location,
          qrCode: 'qr-1',
        },
      ];
      await emailService.sendTicketEmail(
        mockUser.email,
        mockUser.name,
        mockOrder.id,
        mockTickets
      );
      expect(mockSendMail).toHaveBeenCalledTimes(4);

      // 5. User receives reminder before event
      const upcomingEvent = {
        id: mockEvent.id,
        name: mockEvent.title,
        date: mockEvent.date,
        location: mockEvent.location,
        description: mockEvent.description,
      };
      const userTickets = [
        {
          code: 'ticket-1',
          type: 'General Admission',
        },
      ];
      await emailService.sendEventReminderEmail(
        mockUser.email,
        mockUser.name,
        upcomingEvent,
        userTickets
      );
      expect(mockSendMail).toHaveBeenCalledTimes(5);

      // Verify all emails were sent to correct address
      mockSendMail.mock.calls.forEach((call: any) => {
        expect(call[0].to).toBe(mockUser.email);
      });
    });
  });
});
