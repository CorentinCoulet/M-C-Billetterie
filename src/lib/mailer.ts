import nodemailer, { SentMessageInfo } from 'nodemailer';

// Email configuration from environment variables
const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  from: process.env.EMAIL_FROM || 'noreply@billetterie.com',
};

// Check if email configuration is valid
if (!emailConfig.host || !emailConfig.auth.user || !emailConfig.auth.pass) {
  console.warn('Email configuration is incomplete. Email functionality will not work correctly.');
}

/**
 * Nodemailer transporter instance
 */
export const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: emailConfig.auth,
});

/**
 * Email template types
 */
export type EmailTemplate = 
  | 'welcome'
  | 'verification'
  | 'password-reset'
  | 'order-confirmation'
  | 'ticket'
  | 'event-reminder'
  | 'contact-form';

/**
 * Send an email
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  options: {
    from?: string;
    text?: string;
    attachments?: Array<{
      filename: string;
      content?: Buffer | string;
      path?: string;
      contentType?: string;
    }>;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
  } = {}
): Promise<SentMessageInfo> {
  const { from = emailConfig.from, text, attachments, cc, bcc, replyTo } = options;

  return transporter.sendMail({
    from,
    to,
    cc,
    bcc,
    replyTo,
    subject,
    text,
    html,
    attachments,
  });
}

/**
 * Send an email with template
 */
export async function sendTemplateEmail(
  template: EmailTemplate,
  to: string | string[],
  subject: string,
  data: Record<string, any>,
  options: {
    from?: string;
    attachments?: Array<{
      filename: string;
      content?: Buffer | string;
      path?: string;
      contentType?: string;
    }>;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
  } = {}
): Promise<SentMessageInfo> {
  const html = await renderEmailTemplate(template, data);
  return sendEmail(to, subject, html, options);
}

/**
 * Render an email template
 */
async function renderEmailTemplate(
  template: EmailTemplate,
  data: Record<string, any>
): Promise<string> {
  // In a real implementation, this would use a template engine like Handlebars or EJS
  // For simplicity, we're using a basic switch statement with template literals
  
  const appName = process.env.APP_NAME || 'Billetterie';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  switch (template) {
    case 'welcome':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Bienvenue sur ${appName} !</h1>
          <p>Bonjour ${data.name || data.email},</p>
          <p>Nous sommes ravis de vous accueillir sur notre plateforme de billetterie en ligne.</p>
          <p>Vous pouvez dès maintenant explorer les événements disponibles et acheter des billets en toute simplicité.</p>
          <p>
            <a href="${appUrl}/events" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">
              Découvrir les événements
            </a>
          </p>
          <p>À bientôt sur ${appName} !</p>
          <p>L'équipe ${appName}</p>
        </div>
      `;
      
    case 'verification':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Vérifiez votre adresse email</h1>
          <p>Bonjour ${data.name || data.email},</p>
          <p>Merci de vous être inscrit sur ${appName}. Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email :</p>
          <p>
            <a href="${data.verificationLink}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">
              Vérifier mon email
            </a>
          </p>
          <p>Si vous n'avez pas créé de compte sur ${appName}, vous pouvez ignorer cet email.</p>
          <p>Ce lien expirera dans 24 heures.</p>
          <p>L'équipe ${appName}</p>
        </div>
      `;
      
    case 'password-reset':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Réinitialisation de mot de passe</h1>
          <p>Bonjour ${data.name || data.email},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe. Veuillez cliquer sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
          <p>
            <a href="${data.resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">
              Réinitialiser mon mot de passe
            </a>
          </p>
          <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
          <p>Ce lien expirera dans 1 heure.</p>
          <p>L'équipe ${appName}</p>
        </div>
      `;
      
    case 'order-confirmation':
      const ticketsList = data.tickets.map((ticket: any) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${ticket.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${ticket.eventName}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(ticket.eventDate).toLocaleDateString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${ticket.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${ticket.price.toFixed(2)} €</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${(ticket.price * ticket.quantity).toFixed(2)} €</td>
        </tr>
      `).join('');
      
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Confirmation de commande</h1>
          <p>Bonjour ${data.name || data.email},</p>
          <p>Nous vous remercions pour votre commande. Voici le récapitulatif de votre achat :</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 10px; text-align: left;">Billet</th>
                <th style="padding: 10px; text-align: left;">Événement</th>
                <th style="padding: 10px; text-align: left;">Date</th>
                <th style="padding: 10px; text-align: left;">Quantité</th>
                <th style="padding: 10px; text-align: left;">Prix unitaire</th>
                <th style="padding: 10px; text-align: left;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${ticketsList}
            </tbody>
            <tfoot>
              <tr style="font-weight: bold;">
                <td colspan="5" style="padding: 10px; text-align: right;">Total :</td>
                <td style="padding: 10px;">${data.totalAmount.toFixed(2)} €</td>
              </tr>
            </tfoot>
          </table>
          
          <p style="margin-top: 20px;">
            <a href="${appUrl}/orders/${data.orderId}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Voir ma commande
            </a>
          </p>
          
          <p>Vous recevrez vos billets par email dans un message séparé.</p>
          <p>Merci de votre confiance !</p>
          <p>L'équipe ${appName}</p>
        </div>
      `;
      
    // Add more templates as needed
    
    default:
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">${data.title || 'Notification'}</h1>
          <p>${data.message || 'Aucun message fourni.'}</p>
          <p>L'équipe ${appName}</p>
        </div>
      `;
  }
}

/**
 * Verify email configuration by sending a test email
 */
export async function verifyEmailConfig(): Promise<boolean> {
  if (!emailConfig.host || !emailConfig.auth.user || !emailConfig.auth.pass) {
    return false;
  }
  
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email configuration verification failed:', error);
    return false;
  }
}

export const emailService = {
  transporter,
  sendEmail,
  sendTemplateEmail,
  verifyEmailConfig,
};

export default emailService;