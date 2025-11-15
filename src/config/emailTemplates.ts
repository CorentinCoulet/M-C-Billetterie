/**
 * Configuration file for email templates
 * Contains template variables and constants
 */

export const EMAIL_TEMPLATE_CONFIG = {
  // Common variables for all templates
  COMMON_VARS: {
    appName: process.env.APP_NAME || 'Billetterie',
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@billetterie.com',
    logoUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/images/logo.png`,
    currentYear: new Date().getFullYear(),
  },

  // Social media links
  SOCIAL_LINKS: {
    facebook: '#',
    twitter: '#', 
    instagram: '#',
    linkedin: '#',
  },

  // App store links
  APP_LINKS: {
    appStore: '#',
    playStore: '#',
  },

  // Template-specific defaults
  DEFAULTS: {
    WELCOME: {
      discountPercent: 20,
      promoValidityDays: 30,
    },
    PASSWORD_RESET: {
      validityHours: 1,
    },
    VERIFICATION: {
      validityHours: 24,
    },
    QR_ROTATION: {
      intervalHours: 12,
    },
  },

  // Template names
  TEMPLATES: {
    WELCOME: 'welcome',
    REGISTRATION_CONFIRMATION: 'registration-confirmation',
    PASSWORD_RESET: 'password-reset',
    ORDER_CONFIRMATION: 'order-confirmation', 
    TICKETS: 'tickets',
    EVENT_REMINDER: 'event-reminder',
    LAYOUT: 'layout',
  } as const,
};

/**
 * Sample data for testing templates
 */
export const SAMPLE_DATA = {
  USER: {
    id: 'test-user-123',
    name: 'Jean Dupont',
    email: 'jean.dupont@test.local',
  },

  ORDER: {
    id: 'ORDER-2024-001',
    totalAmount: 95.50,
    orderDate: new Date(),
    tickets: [
      {
        name: 'Billet Standard',
        quantity: 2,
        price: 35.00,
        eventName: 'Concert Jazz Festival 2024',
        eventDate: new Date('2024-07-15T20:00:00'),
        eventLocation: 'Salle Pleyel, Paris'
      },
      {
        name: 'Billet VIP',
        quantity: 1,
        price: 25.50,
        eventName: 'Théâtre des Champs-Élysées',
        eventDate: new Date('2024-08-20T19:30:00'),
        eventLocation: 'Théâtre des Champs-Élysées, Paris'
      }
    ]
  },

  TICKETS: [
    {
      id: 'ticket-001',
      name: 'Billet Standard #001',
      eventName: 'Concert Jazz Festival 2024',
      eventDate: new Date('2024-07-15T20:00:00'),
      eventLocation: 'Salle Pleyel, Paris',
      qrCode: 'QR123456789ABC',
      instructions: 'Présentez ce QR code à l\'entrée principale'
    },
    {
      id: 'ticket-002',
      name: 'Billet Standard #002',
      eventName: 'Concert Jazz Festival 2024',
      eventDate: new Date('2024-07-15T20:00:00'),
      eventLocation: 'Salle Pleyel, Paris',
      qrCode: 'QR987654321DEF',
      instructions: 'Présentez ce QR code à l\'entrée principale'
    }
  ],

  EVENT: {
    id: 'event-jazz-2024',
    name: 'Concert Jazz Festival 2024',
    date: new Date(Date.now() + 12 * 60 * 60 * 1000), // Dans 12 heures
    location: 'Salle Pleyel, 252 Rue du Faubourg Saint-Honoré, 75008 Paris'
  },

  TOKEN: 'test-token-123456789',

  REQUEST_INFO: {
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    location: 'Paris, France'
  }
};

/**
 * Email subject templates
 */
export const EMAIL_SUBJECTS = {
  WELCOME: (appName: string) => `🎉 Bienvenue sur ${appName} !`,
  VERIFICATION: (appName: string) => `✅ Confirmez votre inscription - ${appName}`,
  PASSWORD_RESET: (appName: string) => `🔐 Réinitialisation de mot de passe - ${appName}`,
  ORDER_CONFIRMATION: (appName: string, orderId: string) => `✅ Confirmation de commande #${orderId} - ${appName}`,
  TICKETS: (appName: string) => `🎫 Vos billets électroniques - ${appName}`,
  EVENT_REMINDER: (eventName: string, hoursUntil: number) => `⏰ Rappel : ${eventName} dans ${hoursUntil}h !`,
};

export default EMAIL_TEMPLATE_CONFIG;
