// Import the original email service
import emailServiceInstance from '../../services/emailService';
import { UserWithRelations } from '../../types/user';

// Re-export types
export * from '../../services/emailService';
export { default } from '../../services/emailService';

// Export individual methods used in API routes with proper typing
export const sendWelcomeEmail = (user: UserWithRelations, promoCode?: string): Promise<void> => 
  emailServiceInstance.sendWelcomeEmail(user, promoCode);

export const sendOrderConfirmationEmail = (
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
): Promise<void> => 
  emailServiceInstance.sendOrderConfirmationEmail(email, name, orderId, orderDetails);

export const sendTicketEmail = (
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
): Promise<void> => 
  emailServiceInstance.sendTicketEmail(email, name, orderId, tickets);

export const sendPasswordResetEmail = (
  user: UserWithRelations, 
  resetToken: string, 
  requestInfo?: { 
    ip?: string; 
    userAgent?: string; 
    location?: string; 
  }
): Promise<void> => 
  emailServiceInstance.sendPasswordResetEmail(user, resetToken, requestInfo);

export const sendVerificationEmail = (user: UserWithRelations, token: string): Promise<void> => 
  emailServiceInstance.sendVerificationEmail(user, token);

export const sendEventReminderEmail = (
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
): Promise<void> => 
  emailServiceInstance.sendEventReminderEmail(email, name, event, userTickets);

export const sendContactFormEmail = (
  name: string,
  email: string, 
  subject: string, 
  message: string
): Promise<void> => 
  emailServiceInstance.sendContactFormEmail(name, email, subject, message);

// Aliases for compatibility
export const sendOrderConfirmation = sendOrderConfirmationEmail;
export const sendTicketConfirmation = sendTicketEmail;
