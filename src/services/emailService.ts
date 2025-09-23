import fs from 'fs/promises';
import Handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import path from 'path';
import { UserWithRelations } from '../types/user';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@ticketing.com';
const APP_NAME = process.env.APP_NAME || 'M&C Ticketing';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Email service with Handlebars templates for notifications
 */
export class EmailService {
  private templatesPath = path.join(process.cwd(), 'src/templates/emails');
  private compiledTemplates = new Map<string, Handlebars.TemplateDelegate>();

  constructor() {
    // Register common Handlebars helpers
    this.registerHelpers();
  }

  /**
   * Register Handlebars helpers for templates
   */
  private registerHelpers(): void {
    // Format date helper
    Handlebars.registerHelper('formatDate', (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(date));
    });

    // Format currency helper
    Handlebars.registerHelper('formatCurrency', (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    });

    // Calculate total helper
    Handlebars.registerHelper('calculateTotal', (price: number, quantity: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(price * quantity);
    });

    // Time until event helper
    Handlebars.registerHelper('timeUntilEvent', (eventDate: Date) => {
      const now = new Date();
      const event = new Date(eventDate);
      const diffMs = event.getTime() - now.getTime();
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      return diffHours;
    });
  }

  /**
   * Load and compile a Handlebars template
   */
  private async loadTemplate(templateName: string): Promise<Handlebars.TemplateDelegate> {
    // Check if template is already compiled
    if (this.compiledTemplates.has(templateName)) {
      return this.compiledTemplates.get(templateName)!;
    }

    try {
      // Load layout template first
      const layoutPath = path.join(this.templatesPath, 'layout.hbs');
      const layoutSource = await fs.readFile(layoutPath, 'utf-8');
      
      // Load specific template
      const templatePath = path.join(this.templatesPath, `${templateName}.hbs`);
      const templateSource = await fs.readFile(templatePath, 'utf-8');

      // Replace {{> content}} in layout with the actual template content
      const fullTemplate = layoutSource.replace('{{> content}}', templateSource);
      
      // Compile the template
      const compiled = Handlebars.compile(fullTemplate);
      
      // Cache the compiled template
      this.compiledTemplates.set(templateName, compiled);
      
      return compiled;
    } catch (error) {
      console.error(`Error loading template ${templateName}:`, error);
      throw new Error(`Failed to load email template: ${templateName}`);
    }
  }

  /**
   * Render template with data
   */
  private async renderTemplate(templateName: string, data: any): Promise<string> {
    const template = await this.loadTemplate(templateName);
    
    // Add common template variables
    const templateData = {
      ...data,
      appName: APP_NAME,
      baseUrl: APP_URL,
      supportEmail: process.env.SUPPORT_EMAIL || FROM_EMAIL,
      currentYear: new Date().getFullYear(),
      logoUrl: `${APP_URL}/images/logo.png`,
    };

    return template(templateData);
  }

  /**
   * Send a welcome email to a new user
   */
  async sendWelcomeEmail(user: UserWithRelations, promoCode?: string): Promise<void> {
    const html = await this.renderTemplate('welcome', {
      userName: user.name || user.email.split('@')[0],
      userEmail: user.email,
      userId: user.id,
      creationDate: new Date().toLocaleDateString('en-US'),
      promoCode: promoCode || 'WELCOME20',
      discountPercent: 20,
      promoExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'),
      eventsUrl: `${APP_URL}/events`,
      profileUrl: `${APP_URL}/profile`,
      notificationsUrl: `${APP_URL}/settings/notifications`,
      dashboardUrl: `${APP_URL}/dashboard`,
      appStoreUrl: '#', // To be replaced with real URLs
      playStoreUrl: '#',
      chatUrl: `${APP_URL}/support`,
      helpUrl: `${APP_URL}/help`,
      facebookUrl: '#',
      twitterUrl: '#',
      instagramUrl: '#',
      linkedinUrl: '#',
    });

    const mailOptions = {
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: user.email,
      subject: `🎉 Welcome to ${APP_NAME}!`,
      html
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * Send a verification email
   */
  async sendVerificationEmail(user: UserWithRelations, token: string): Promise<void> {
    const verificationLink = `${APP_URL}/verify-email?token=${token}`;
    const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const html = await this.renderTemplate('registration-confirmation', {
      userName: user.name || user.email.split('@')[0],
      userEmail: user.email,
      verificationUrl: verificationLink,
      validityHours: 24,
      expirationDate: expirationDate.toLocaleDateString('en-US'),
      expirationTime: expirationDate.toLocaleTimeString('en-US'),
      loginUrl: `${APP_URL}/login`,
    });

    const mailOptions = {
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: user.email,
      subject: `✅ Confirm your registration - ${APP_NAME}`,
      html
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(
    user: UserWithRelations, 
    token: string, 
    requestInfo?: { 
      ip?: string; 
      userAgent?: string; 
      location?: string; 
    }
  ): Promise<void> {
    const resetLink = `${APP_URL}/reset-password?token=${token}`;
    const expirationDate = new Date(Date.now() + 60 * 60 * 1000);

    const html = await this.renderTemplate('password-reset', {
      userName: user.name || user.email.split('@')[0],
      userEmail: user.email,
      resetUrl: resetLink,
      validityHours: 1,
      expirationDate: expirationDate.toLocaleDateString('en-US'),
      expirationTime: expirationDate.toLocaleTimeString('en-US'),
      requestDate: new Date().toLocaleDateString('en-US'),
      requestTime: new Date().toLocaleTimeString('en-US'),
      userIpAddress: requestInfo?.ip || 'Not available',
      userAgent: requestInfo?.userAgent || 'Not available',
      userLocation: requestInfo?.location || 'Not available',
    });

    const mailOptions = {
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: user.email,
      subject: `🔐 Password Reset - ${APP_NAME}`,
      html
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(
    email: string,
    name: string | null,
    orderId: string,
    orderDetails: {
      totalAmount: number;
      orderDate: Date;
      tickets: Array<{
        name: string;
        quantity: number;
        price: number;
        eventName: string;
        eventDate: Date;
        eventLocation: string;
      }>;
    }
  ): Promise<void> {
    const html = await this.renderTemplate('order-confirmation', {
      customerName: name || email.split('@')[0],
      customerEmail: email,
      orderId,
      orderDate: orderDetails.orderDate,
      totalAmount: orderDetails.totalAmount,
      tickets: orderDetails.tickets,
      orderUrl: `${APP_URL}/orders/${orderId}`,
      ticketsUrl: `${APP_URL}/tickets`,
      invoiceUrl: `${APP_URL}/orders/${orderId}/invoice`,
      paymentMethod: 'Credit Card', // To be retrieved from payment data
    });

    const mailOptions = {
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: `✅ Order Confirmation #${orderId} - ${APP_NAME}`,
      html
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * Send ticket email with QR codes
   */
  async sendTicketEmail(
    email: string,
    name: string | null,
    orderId: string,
    tickets: Array<{
      id: string;
      name: string;
      eventName: string;
      eventDate: Date;
      eventLocation: string;
      qrCode: string;
      qrCodeUrl?: string;
      instructions?: string;
    }>
  ): Promise<void> {
    const html = await this.renderTemplate('tickets', {
      customerName: name || email.split('@')[0],
      customerEmail: email,
      orderId,
      totalTickets: tickets.length,
      tickets,
      orderUrl: `${APP_URL}/orders/${orderId}`,
      ticketsUrl: `${APP_URL}/tickets`,
      qrCodeRefreshTime: '12 hours', // Corresponds to the rotation system
    });

    const mailOptions = {
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: `🎫 Your Electronic Tickets - ${APP_NAME}`,
      html
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * Send event reminder email
   */
  async sendEventReminderEmail(
    email: string,
    name: string | null,
    event: {
      id: string;
      name: string;
      date: Date;
      location: string;
      description?: string;
    },
    userTickets: Array<{
      code: string;
      type: string;
    }>
  ): Promise<void> {
    const now = new Date();
    const eventDate = new Date(event.date);
    const hoursUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    const html = await this.renderTemplate('event-reminder', {
      userName: name || email.split('@')[0],
      eventTitle: event.name,
      eventDate: eventDate,
      eventLocation: event.location,
      hoursUntilEvent,
      ticketCodes: userTickets.map(t => t.code),
      ticketsUrl: `${APP_URL}/tickets`,
    });

    const mailOptions = {
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: `⏰ Reminder: ${event.name} in ${hoursUntilEvent}h!`,
      html
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * Send contact form email
   */
  async sendContactFormEmail(
    name: string,
    email: string,
    subject: string,
    message: string
  ): Promise<void> {
    const mailOptions = {
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: process.env.CONTACT_EMAIL || FROM_EMAIL,
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">New Contact Message</h1>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            ${message.replace(/\n/g, '<br>')}
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  }
}

const emailService = new EmailService();
export default emailService;
