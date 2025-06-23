import nodemailer from 'nodemailer';
import { SentMessageInfo } from 'nodemailer';
import path from 'path';
import fs from 'fs';
import Handlebars from 'handlebars';

/**
 * Email configuration using Nodemailer
 */

// Email configuration
export const EMAIL_CONFIG = {
  // SMTP configuration
  SMTP: {
    HOST: process.env.SMTP_HOST || 'smtp.example.com',
    PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    SECURE: process.env.SMTP_SECURE === 'true',
    AUTH: {
      USER: process.env.SMTP_USER || 'user@example.com',
      PASS: process.env.SMTP_PASS || 'password',
    },
  },
  
  // Default sender
  FROM: {
    NAME: process.env.EMAIL_FROM_NAME || 'M&C Society',
    EMAIL: process.env.EMAIL_FROM_ADDRESS || 'noreply@mcsociety.com',
  },
  
  // Email templates directory
  TEMPLATES_DIR: path.join(process.cwd(), 'src/templates/emails'),
  
  // Email subjects
  SUBJECTS: {
    WELCOME: 'Welcome to M&C Society',
    VERIFY_EMAIL: 'Please verify your email address',
    RESET_PASSWORD: 'Reset your password',
    ORDER_CONFIRMATION: 'Your order confirmation',
    TICKET_ISSUED: 'Your tickets are ready',
    EVENT_REMINDER: 'Reminder: Upcoming event',
    EVENT_CANCELED: 'Event canceled',
    EVENT_UPDATED: 'Event details updated',
  },
};

// Create a transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_CONFIG.SMTP.HOST,
  port: EMAIL_CONFIG.SMTP.PORT,
  secure: EMAIL_CONFIG.SMTP.SECURE,
  auth: {
    user: EMAIL_CONFIG.SMTP.AUTH.USER,
    pass: EMAIL_CONFIG.SMTP.AUTH.PASS,
  },
});

/**
 * Email template cache
 */
const templateCache: Record<string, HandlebarsTemplateDelegate> = {};

/**
 * Load an email template
 */
export function loadTemplate(templateName: string): HandlebarsTemplateDelegate {
  // Check if template is already cached
  if (templateCache[templateName]) {
    return templateCache[templateName];
  }
  
  // Load template from file
  const templatePath = path.join(EMAIL_CONFIG.TEMPLATES_DIR, `${templateName}.hbs`);
  const templateSource = fs.readFileSync(templatePath, 'utf-8');
  
  // Compile template
  const template = Handlebars.compile(templateSource);
  
  // Cache template
  templateCache[templateName] = template;
  
  return template;
}

/**
 * Send an email
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  template?: string;
  context?: Record<string, any>;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}): Promise<SentMessageInfo> {
  const { to, subject, template, context, text, html, attachments } = options;
  
  // Prepare email content
  let htmlContent = html;
  let textContent = text;
  
  // If template is provided, render it
  if (template && context) {
    try {
      const compiledTemplate = loadTemplate(template);
      htmlContent = compiledTemplate(context);
    } catch (error) {
      console.error(`Error loading template ${template}:`, error);
      throw new Error(`Failed to load email template: ${template}`);
    }
  }
  
  // Send email
  return transporter.sendMail({
    from: `"${EMAIL_CONFIG.FROM.NAME}" <${EMAIL_CONFIG.FROM.EMAIL}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    text: textContent,
    html: htmlContent,
    attachments,
  });
}

/**
 * Send a welcome email
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<SentMessageInfo> {
  return sendEmail({
    to,
    subject: EMAIL_CONFIG.SUBJECTS.WELCOME,
    template: 'welcome',
    context: {
      name,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
    },
  });
}

/**
 * Send a verification email
 */
export async function sendVerificationEmail(to: string, name: string, token: string): Promise<SentMessageInfo> {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  
  return sendEmail({
    to,
    subject: EMAIL_CONFIG.SUBJECTS.VERIFY_EMAIL,
    template: 'verify-email',
    context: {
      name,
      verificationUrl,
    },
  });
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<SentMessageInfo> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  
  return sendEmail({
    to,
    subject: EMAIL_CONFIG.SUBJECTS.RESET_PASSWORD,
    template: 'reset-password',
    context: {
      name,
      resetUrl,
    },
  });
}

/**
 * Send an order confirmation email
 */
export async function sendOrderConfirmationEmail(to: string, name: string, order: any): Promise<SentMessageInfo> {
  return sendEmail({
    to,
    subject: EMAIL_CONFIG.SUBJECTS.ORDER_CONFIRMATION,
    template: 'order-confirmation',
    context: {
      name,
      order,
      orderUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/orders/${order.id}`,
    },
  });
}

/**
 * Send a ticket issued email
 */
export async function sendTicketIssuedEmail(to: string, name: string, order: any, tickets: any[]): Promise<SentMessageInfo> {
  return sendEmail({
    to,
    subject: EMAIL_CONFIG.SUBJECTS.TICKET_ISSUED,
    template: 'ticket-issued',
    context: {
      name,
      order,
      tickets,
      ticketsUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tickets`,
    },
  });
}

export default {
  EMAIL_CONFIG,
  transporter,
  loadTemplate,
  sendEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendTicketIssuedEmail,
};