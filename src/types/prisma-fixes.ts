// Types for OrderStatus compatible with Prisma
export const OrderStatus = {
  PENDING: 'pending',
  PAID: 'paid', 
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DRAFT: 'draft'
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

// Types pour TicketStatus compatibles avec Prisma
export const TicketStatus = {
  AVAILABLE: 'available',
  PENDING: 'pending', 
  PAID: 'paid',
  USED: 'used',
  CANCELLED: 'cancelled',
  ISSUED: 'issued'
} as const;

export type TicketStatusType = typeof TicketStatus[keyof typeof TicketStatus];

// Types pour PaymentStatus
export const PaymentStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
} as const;

export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];

// Types pour UserRole
export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  ORGANIZER: 'ORGANIZER',
  MODERATOR: 'MODERATOR'
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Stripe type corrections
export const StripeApiVersion = '2025-08-27.basil' as const;

// Mapping of Stripe events to payment statuses
export const StripeEventMapping = {
  'payment_intent.succeeded': PaymentStatus.COMPLETED,
  'payment_failed': PaymentStatus.FAILED,
  'payment_intent.payment_failed': PaymentStatus.FAILED,
  'charge.dispute.created': PaymentStatus.FAILED,
  'invoice.payment_succeeded': PaymentStatus.COMPLETED,
  'invoice.payment_failed': PaymentStatus.FAILED,
} as const;

// Type for valid Stripe events
export type StripeEventType = keyof typeof StripeEventMapping;

// Interface for corrected OrderWithRelations
export interface OrderWithRelations {
  id: string;
  userId: string;
  totalPrice: number;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: OrderStatusType;
  promoCode: string | null;
  discountAmount: number | null;
  currency: string;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
  tickets: TicketType[];
  user?: any;
  payments?: any[];
}

// Interface pour TicketType corrigée
export interface TicketType {
  id: string;
  name?: string;
  price?: number;
  eventId: string;
  userId?: string | null;
  orderId?: string | null;
  code: string;
  status: TicketStatusType;
  quantity?: number;
  seatNumber?: string | null;
  isScanned: boolean;
  scannedAt?: Date | null;
  usedAt?: Date | null;
  purchasedAt: Date;
  currentQRCode?: string | null;
  qrCodeGeneratedAt?: Date | null;
  metadata?: any;
}

// Interface pour les événements avec relations
export interface EventWithDetails {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  location: string;
  maxCapacity: number | null;
  isPublished: boolean;
  isCancelled: boolean;
  allowAnonymousPurchase: boolean;
  allowTransfer: boolean;
  categoryId: string | null;
  venueId: string | null;
  organizerId: string;
  themeId: string | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
  tickets?: TicketType[];
  name?: string; // Pour compatibilité avec les tests
}

// Types pour les corrections d'API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Type guards pour vérifier les énumérations
export function isValidOrderStatus(status: string): status is OrderStatusType {
  return Object.values(OrderStatus).includes(status as OrderStatusType);
}

export function isValidTicketStatus(status: string): status is TicketStatusType {
  return Object.values(TicketStatus).includes(status as TicketStatusType);
}

export function isValidPaymentStatus(status: string): status is PaymentStatusType {
  return Object.values(PaymentStatus).includes(status as PaymentStatusType);
}

// Utilitaires de conversion pour compatibilité
export const TypeConverters = {
  // Convertir les anciens status vers les nouveaux
  convertOrderStatus: (oldStatus: string): OrderStatusType => {
    const mapping: Record<string, OrderStatusType> = {
      'PENDING': 'pending',
      'COMPLETED': 'completed', 
      'CANCELLED': 'cancelled',
      'PAID': 'paid',
      'DRAFT': 'draft'
    };
    return mapping[oldStatus] || 'pending';
  },

  convertTicketStatus: (oldStatus: string): TicketStatusType => {
    const mapping: Record<string, TicketStatusType> = {
      'PENDING': 'pending',
      'PAID': 'paid',
      'USED': 'used',
      'CANCELLED': 'cancelled',
      'AVAILABLE': 'available',
      'ISSUED': 'issued'
    };
    return mapping[oldStatus] || 'pending';
  },

  // Convertir les nouveaux vers les anciens pour compatibilité
  toUpperCaseStatus: (status: string): string => {
    return status.toUpperCase();
  }
};

export default {
  OrderStatus,
  TicketStatus,
  PaymentStatus,
  UserRole,
  StripeApiVersion,
  TypeConverters,
  isValidOrderStatus,
  isValidTicketStatus,
  isValidPaymentStatus
};
