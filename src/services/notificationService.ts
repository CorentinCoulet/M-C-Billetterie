import { logAuditEvent, safeLogger } from '../lib/logger';
import prisma from '../lib/prisma';
import { BaseService } from './baseService';

/**
 * Notification Service
 * Handles all notification logic including email, push, and in-app notifications
 */

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
  scheduledAt?: Date;
  expiresAt?: Date;
}

export enum NotificationType {
  // User notifications
  WELCOME = 'welcome',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGED = 'password_changed',
  
  // Event notifications
  EVENT_PUBLISHED = 'event_published',
  EVENT_CANCELLED = 'event_cancelled',
  EVENT_UPDATED = 'event_updated',
  EVENT_REMINDER = 'event_reminder',
  
  // Ticket notifications
  TICKET_PURCHASED = 'ticket_purchased',
  TICKET_VALIDATED = 'ticket_validated',
  TICKET_TRANSFERRED = 'ticket_transferred',
  TICKET_CANCELLED = 'ticket_cancelled',
  TICKET_REFUNDED = 'ticket_refunded',
  
  // Payment notifications
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_REFUNDED = 'payment_refunded',
  
  // Security notifications
  LOGIN_FROM_NEW_DEVICE = 'login_from_new_device',
  ACCOUNT_LOCKED = 'account_locked',
  SECURITY_ALERT = 'security_alert',
  
  // Admin notifications
  NEW_USER_REGISTERED = 'new_user_registered',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SYSTEM_ALERT = 'system_alert'
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  emailTemplate?: string;
  pushTemplate?: string;
}

// Notification templates
const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  [NotificationType.WELCOME]: {
    subject: 'Bienvenue sur {{ appName }}',
    body: 'Bienvenue {{ userName }} ! Votre compte a été créé avec succès.',
    emailTemplate: 'welcome'
  },
  
  [NotificationType.EMAIL_VERIFICATION]: {
    subject: 'Vérifiez votre adresse email',
    body: 'Cliquez sur le lien pour vérifier votre adresse email.',
    emailTemplate: 'email-verification'
  },
  
  [NotificationType.PASSWORD_RESET]: {
    subject: 'Réinitialisation de mot de passe',
    body: 'Cliquez sur le lien pour réinitialiser votre mot de passe.',
    emailTemplate: 'password-reset'
  },
  
  [NotificationType.PASSWORD_CHANGED]: {
    subject: 'Mot de passe modifié',
    body: 'Votre mot de passe a été modifié avec succès.',
    emailTemplate: 'password-changed'
  },
  
  [NotificationType.TICKET_PURCHASED]: {
    subject: 'Billet acheté avec succès',
    body: 'Votre billet pour {{ eventTitle }} a été acheté avec succès.',
    emailTemplate: 'ticket-purchased'
  },
  
  [NotificationType.EVENT_REMINDER]: {
    subject: 'Rappel d\'événement',
    body: 'L\'événement {{ eventTitle }} commence dans {{ timeUntil }}.',
    emailTemplate: 'event-reminder',
    pushTemplate: 'event-reminder-push'
  },
  
  [NotificationType.PAYMENT_SUCCESS]: {
    subject: 'Paiement réussi',
    body: 'Votre paiement de {{ amount }} a été traité avec succès.',
    emailTemplate: 'payment-success'
  },
  
  [NotificationType.PAYMENT_FAILED]: {
    subject: 'Échec du paiement',
    body: 'Votre paiement de {{ amount }} a échoué. Veuillez réessayer.',
    emailTemplate: 'payment-failed'
  },
  
  [NotificationType.LOGIN_FROM_NEW_DEVICE]: {
    subject: 'Connexion depuis un nouvel appareil',
    body: 'Une connexion depuis un nouvel appareil a été détectée.',
    emailTemplate: 'security-alert'
  },
  
  [NotificationType.EVENT_PUBLISHED]: {
    subject: 'Votre événement a été publié',
    body: 'L\'événement {{ eventTitle }} a été publié avec succès.',
    emailTemplate: 'event-published'
  },
  
  [NotificationType.EVENT_CANCELLED]: {
    subject: 'Événement annulé',
    body: 'L\'événement {{ eventTitle }} a été annulé.',
    emailTemplate: 'event-cancelled'
  },
  
  [NotificationType.EVENT_UPDATED]: {
    subject: 'Événement mis à jour',
    body: 'L\'événement {{ eventTitle }} a été mis à jour.',
    emailTemplate: 'event-updated'
  },
  
  [NotificationType.TICKET_VALIDATED]: {
    subject: 'Billet validé',
    body: 'Votre billet pour {{ eventTitle }} a été validé.',
    emailTemplate: 'ticket-validated'
  },
  
  [NotificationType.TICKET_TRANSFERRED]: {
    subject: 'Billet transféré',
    body: 'Un billet pour {{ eventTitle }} vous a été transféré.',
    emailTemplate: 'ticket-transferred'
  },
  
  [NotificationType.TICKET_CANCELLED]: {
    subject: 'Billet annulé',
    body: 'Votre billet pour {{ eventTitle }} a été annulé.',
    emailTemplate: 'ticket-cancelled'
  },
  
  [NotificationType.TICKET_REFUNDED]: {
    subject: 'Billet remboursé',
    body: 'Votre billet pour {{ eventTitle }} a été remboursé.',
    emailTemplate: 'ticket-refunded'
  },
  
  [NotificationType.PAYMENT_REFUNDED]: {
    subject: 'Paiement remboursé',
    body: 'Votre paiement de {{ amount }} a été remboursé.',
    emailTemplate: 'payment-refunded'
  },
  
  [NotificationType.ACCOUNT_LOCKED]: {
    subject: 'Compte verrouillé',
    body: 'Votre compte a été temporairement verrouillé pour des raisons de sécurité.',
    emailTemplate: 'account-locked'
  },
  
  [NotificationType.SECURITY_ALERT]: {
    subject: 'Alerte de sécurité',
    body: 'Une activité suspecte a été détectée sur votre compte.',
    emailTemplate: 'security-alert'
  },
  
  [NotificationType.NEW_USER_REGISTERED]: {
    subject: 'Nouvel utilisateur inscrit',
    body: 'Un nouvel utilisateur s\'est inscrit sur la plateforme.',
    emailTemplate: 'admin-new-user'
  },
  
  [NotificationType.SUSPICIOUS_ACTIVITY]: {
    subject: 'Activité suspecte détectée',
    body: 'Une activité suspecte a été détectée sur la plateforme.',
    emailTemplate: 'admin-suspicious-activity'
  },
  
  [NotificationType.SYSTEM_ALERT]: {
    subject: 'Alerte système',
    body: 'Une alerte système nécessite votre attention.',
    emailTemplate: 'admin-system-alert'
  }
};

class NotificationService extends BaseService<any> {
  constructor() {
    super(prisma.notification);
  }

  /**
   * Send a notification
   */
  async sendNotification(data: NotificationData): Promise<any> {
    try {
      const template = NOTIFICATION_TEMPLATES[data.type];
      
      if (!template) {
        throw new Error(`Unknown notification type: ${data.type}`);
      }

      // Create notification in database
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          message: this.renderTemplate(template.body, data.data || {}),
          isRead: null, // null means unread
          sentAt: data.scheduledAt || new Date(),
          ...(data.expiresAt && { expiresAt: data.expiresAt })
        }
      });

      // Send email notification if template exists
      if (template.emailTemplate) {
        await this.sendEmailNotification(data, template);
      }

      // Send push notification if enabled
      if (template.pushTemplate && data.priority !== 'low') {
        await this.sendPushNotification(data, template);
      }

      // Log notification
      safeLogger.info('Notification sent', {
        notificationId: notification.id,
        userId: data.userId,
        type: data.type,
        priority: data.priority || 'medium'
      });

      // Audit log
      logAuditEvent('notification_sent', 'notification', data.userId, {
        type: data.type,
        notificationId: notification.id
      });

      return notification;

    } catch (error) {
      safeLogger.error('Failed to send notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        type: data.type
      });
      throw error;
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(notifications: NotificationData[]): Promise<void> {
    const batchSize = 50;
    
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(notification => this.sendNotification(notification))
      );
      
      // Small delay to prevent overwhelming the system
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string, 
    options: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const { unreadOnly = false, limit = 20, offset = 0 } = options;
    
    return prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: null })
      },
      orderBy: {
        sentAt: 'desc'
      },
      take: limit,
      skip: offset
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        isRead: new Date()
      }
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: null
      },
      data: {
        isRead: new Date()
      }
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId
      }
    });
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId: string) {
    const [total, unread] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: null } })
    ]);

    return {
      total,
      unread,
      read: total - unread
    };
  }

  /**
   * Clean up old notifications (older than 30 days)
   */
  async cleanupExpiredNotifications(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await prisma.notification.deleteMany({
      where: {
        sentAt: {
          lt: thirtyDaysAgo
        }
      }
    });

    safeLogger.info(`Cleaned up ${result.count} old notifications`);
    return result.count;
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(data: NotificationData, template: NotificationTemplate): Promise<void> {
    try {
      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { email: true, name: true }
      });

      if (!user?.email) {
        safeLogger.warn('Cannot send email notification - user email not found', {
          userId: data.userId
        });
        return;
      }

      // Dynamic import to handle optional dependency
      const { sendEmail } = await import('../lib/mailer');
      
      const subject = this.renderTemplate(template.subject, data.data || {});
      const body = this.renderTemplate(template.body, { userName: user.name, ...data.data });
      
      await sendEmail(
        user.email,
        subject,
        body
      );

    } catch (error) {
      safeLogger.error('Failed to send email notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        type: data.type
      });
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(data: NotificationData, template: NotificationTemplate): Promise<void> {
    try {
      // Implementation would depend on push notification service (FCM, APNs, etc.)
      safeLogger.info('Push notification would be sent here', {
        userId: data.userId,
        type: data.type,
        priority: data.priority
      });
    } catch (error) {
      safeLogger.error('Failed to send push notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        type: data.type
      });
    }
  }

  /**
   * Render template with data
   */
  private renderTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;

// Export helper functions
export const NotificationHelpers = {
  /**
   * Send welcome notification
   */
  async sendWelcome(userId: string, userName: string) {
    return notificationService.sendNotification({
      userId,
      type: NotificationType.WELCOME,
      title: 'Bienvenue !',
      message: 'Votre compte a été créé avec succès.',
      data: { userName, appName: process.env.APP_NAME || 'Billetterie' }
    });
  },

  /**
   * Send ticket purchase confirmation
   */
  async sendTicketPurchased(userId: string, ticketData: any) {
    return notificationService.sendNotification({
      userId,
      type: NotificationType.TICKET_PURCHASED,
      title: 'Billet acheté',
      message: `Votre billet pour ${ticketData.eventTitle} a été acheté avec succès.`,
      data: ticketData,
      priority: 'high'
    });
  },

  /**
   * Send payment success notification
   */
  async sendPaymentSuccess(userId: string, amount: string, currency: string = 'EUR') {
    return notificationService.sendNotification({
      userId,
      type: NotificationType.PAYMENT_SUCCESS,
      title: 'Paiement réussi',
      message: `Votre paiement de ${amount} ${currency} a été traité avec succès.`,
      data: { amount: `${amount} ${currency}` },
      priority: 'high'
    });
  },

  /**
   * Send security alert
   */
  async sendSecurityAlert(userId: string, alertType: string, details?: any) {
    return notificationService.sendNotification({
      userId,
      type: NotificationType.SECURITY_ALERT,
      title: 'Alerte de sécurité',
      message: `Une activité de sécurité a été détectée: ${alertType}`,
      data: { alertType, ...details },
      priority: 'high'
    });
  }
};
