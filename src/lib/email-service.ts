import fs from 'fs';
import Handlebars from 'handlebars';
import nodemailer, { SentMessageInfo, Transporter } from 'nodemailer';
import path from 'path';
import { CONFIG } from '../core/config';

/**
 * Unified Email Service using centralized configuration
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  template?: {
    name: string;
    context: Record<string, any>;
  };
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(process.cwd(), 'src/templates/emails');
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  private initializeTransporter(): void {
    if (!CONFIG.FEATURES.EMAIL) {
      console.log('Email service disabled by feature flag');
      return;
    }

    if (!CONFIG.EMAIL.SMTP.HOST || !CONFIG.EMAIL.SMTP.USER) {
      console.log('Email service not configured - missing SMTP settings');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: CONFIG.EMAIL.SMTP.HOST,
        port: CONFIG.EMAIL.SMTP.PORT,
        secure: CONFIG.EMAIL.SMTP.PORT === 465,
        auth: {
          user: CONFIG.EMAIL.SMTP.USER,
          pass: CONFIG.EMAIL.SMTP.PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<SentMessageInfo | null> {
    if (!this.transporter) {
      console.warn('Email service not available');
      return null;
    }

    try {
      let html = options.html;

      // Process template if provided
      if (options.template) {
        html = await this.renderTemplate(options.template.name, options.template.context);
      }

      const mailOptions = {
        from: `"Billetterie" <${CONFIG.EMAIL.FROM}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo || CONFIG.EMAIL.CONTACT,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return result;

    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Render email template
   */
  private async renderTemplate(templateName: string, context: Record<string, any>): Promise<string> {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Email template not found: ${templateName}`);
      }

      const templateSource = fs.readFileSync(templatePath, 'utf-8');
      const template = Handlebars.compile(templateSource);
      
      return template({
        ...context,
        appUrl: CONFIG.URLS.APP,
        companyName: 'Billetterie',
        supportEmail: CONFIG.EMAIL.CONTACT,
      });

    } catch (error) {
      console.error(`Failed to render email template ${templateName}:`, error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${CONFIG.URLS.APP}/auth/reset-password?token=${resetToken}`;
    
    await this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      template: {
        name: 'password-reset',
        context: {
          resetUrl,
          email,
        },
      },
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Welcome to Billetterie!',
      template: {
        name: 'welcome',
        context: {
          firstName,
          email,
        },
      },
    });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(
    email: string, 
    orderDetails: {
      orderId: string;
      eventName: string;
      ticketCount: number;
      totalAmount: number;
      eventDate: Date;
    }
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Order Confirmation - ${orderDetails.eventName}`,
      template: {
        name: 'order-confirmation',
        context: {
          ...orderDetails,
          formattedAmount: new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: CONFIG.STRIPE.CURRENCY,
          }).format(orderDetails.totalAmount),
          formattedDate: orderDetails.eventDate.toLocaleDateString('fr-FR'),
        },
      },
    });
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('Email service connection test passed');
      return true;
    } catch (error) {
      console.error('Email service connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export named functions for backward compatibility
export const sendPasswordResetEmail = emailService.sendPasswordResetEmail.bind(emailService);
export const sendWelcomeEmail = emailService.sendWelcomeEmail.bind(emailService);
export const sendOrderConfirmationEmail = emailService.sendOrderConfirmationEmail.bind(emailService);
export const sendEmail = emailService.sendEmail.bind(emailService);

export default emailService;
