import nodemailer from 'nodemailer';
import { UserWithRelations } from '../types/user';

// This will be imported from the mailer.ts utility file once created
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@billetterie.com';
const APP_NAME = process.env.APP_NAME || 'Billetterie';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Service for email notifications
 */
export class EmailService {
  /**
   * Send a welcome email to a new user
   */
  async sendWelcomeEmail(user: UserWithRelations): Promise<void> {
    const mailOptions = {
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: user.email,
      subject: `Bienvenue sur ${APP_NAME}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Bienvenue sur ${APP_NAME} !</h1>
          <p>Bonjour ${user.name || user.email},</p>
          <p>Nous sommes ravis de vous accueillir sur notre plateforme de billetterie en ligne.</p>
          <p>Vous pouvez dès maintenant explorer les événements disponibles et acheter des billets en toute simplicité.</p>
          <p>
            <a href="${APP_URL}/events" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">
              Découvrir les événements
            </a>
          </p>
          <p>À bientôt sur ${APP_NAME} !</p>
          <p>L'équipe ${APP_NAME}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * Send a verification email
   */
  async sendVerificationEmail(user: UserWithRelations, token: string): Promise<void> {
    const verificationLink = `${APP_URL}/verify-email?token=${token}`;

    const mailOptions = {
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: user.email,
      subject: `Vérifiez votre adresse email - ${APP_NAME}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Vérifiez votre adresse email</h1>
          <p>Bonjour ${user.name || user.email},</p>
          <p>Merci de vous être inscrit sur ${APP_NAME}. Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email :</p>
          <p>
            <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">
              Vérifier mon email
            </a>
          </p>
          <p>Si vous n'avez pas créé de compte sur ${APP_NAME}, vous pouvez ignorer cet email.</p>
          <p>Ce lien expirera dans 24 heures.</p>
          <p>L'équipe ${APP_NAME}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(user: UserWithRelations, token: string): Promise<void> {
    const resetLink = `${APP_URL}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: user.email,
      subject: `Réinitialisation de mot de passe - ${APP_NAME}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Réinitialisation de mot de passe</h1>
          <p>Bonjour ${user.name || user.email},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe. Veuillez cliquer sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
          <p>
            <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">
              Réinitialiser mon mot de passe
            </a>
          </p>
          <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
          <p>Ce lien expirera dans 1 heure.</p>
          <p>L'équipe ${APP_NAME}</p>
        </div>
      `
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
      tickets: Array<{
        name: string;
        quantity: number;
        price: number;
        eventName: string;
        eventDate: Date;
      }>;
    }
  ): Promise<void> {
    const orderLink = `${APP_URL}/orders/${orderId}`;

    const ticketsList = orderDetails.tickets.map(ticket => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${ticket.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${ticket.eventName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(ticket.eventDate).toLocaleDateString()}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${ticket.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${ticket.price.toFixed(2)} €</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${(ticket.price * ticket.quantity).toFixed(2)} €</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: `Confirmation de commande #${orderId} - ${APP_NAME}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Confirmation de commande</h1>
          <p>Bonjour ${name || email},</p>
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
                <td style="padding: 10px;">${orderDetails.totalAmount.toFixed(2)} €</td>
              </tr>
            </tfoot>
          </table>

          <p style="margin-top: 20px;">
            <a href="${orderLink}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Voir ma commande
            </a>
          </p>

          <p>Vous recevrez vos billets par email dans un message séparé.</p>
          <p>Merci de votre confiance !</p>
          <p>L'équipe ${APP_NAME}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * Send ticket email with QR code
   */
  async sendTicketEmail(
    email: string,
    name: string | null,
    tickets: Array<{
      id: string;
      name: string;
      eventName: string;
      eventDate: Date;
      eventLocation: string;
      qrCodeUrl: string;
    }>
  ): Promise<void> {
    const ticketsList = tickets.map(ticket => `
      <div style="margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
        <h2 style="color: #333; margin-top: 0;">${ticket.eventName}</h2>
        <p><strong>Billet :</strong> ${ticket.name}</p>
        <p><strong>Date :</strong> ${new Date(ticket.eventDate).toLocaleDateString()} à ${new Date(ticket.eventDate).toLocaleTimeString()}</p>
        <p><strong>Lieu :</strong> ${ticket.eventLocation}</p>
        <div style="text-align: center; margin-top: 20px;">
          <img src="${ticket.qrCodeUrl}" alt="QR Code" style="max-width: 200px; height: auto;" />
          <p style="margin-top: 10px; font-size: 12px; color: #666;">Présentez ce QR code à l'entrée de l'événement</p>
        </div>
      </div>
    `).join('');

    const mailOptions = {
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: `Vos billets - ${APP_NAME}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Vos billets</h1>
          <p>Bonjour ${name || email},</p>
          <p>Veuillez trouver ci-dessous vos billets pour les événements à venir :</p>

          ${ticketsList}

          <p>Nous vous souhaitons un excellent événement !</p>
          <p>L'équipe ${APP_NAME}</p>
        </div>
      `
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
      description: string;
    }
  ): Promise<void> {
    const eventLink = `${APP_URL}/events/${event.id}`;
    const eventDate = new Date(event.date);
    const formattedDate = `${eventDate.toLocaleDateString()} à ${eventDate.toLocaleTimeString()}`;

    const mailOptions = {
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: `Rappel : ${event.name} - ${formattedDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Rappel d'événement</h1>
          <p>Bonjour ${name || email},</p>
          <p>Nous vous rappelons que l'événement <strong>${event.name}</strong> aura lieu demain :</p>

          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Date :</strong> ${formattedDate}</p>
            <p><strong>Lieu :</strong> ${event.location}</p>
            <p><strong>Description :</strong> ${event.description}</p>
          </div>

          <p>N'oubliez pas d'apporter vos billets (format électronique ou imprimé).</p>

          <p>
            <a href="${eventLink}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">
              Voir les détails de l'événement
            </a>
          </p>

          <p>À très bientôt !</p>
          <p>L'équipe ${APP_NAME}</p>
        </div>
      `
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
      subject: `Formulaire de contact : ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Nouveau message de contact</h1>
          <p><strong>Nom :</strong> ${name}</p>
          <p><strong>Email :</strong> ${email}</p>
          <p><strong>Sujet :</strong> ${subject}</p>
          <p><strong>Message :</strong></p>
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
