import { z } from 'zod';

/**
 * Common validation schemas
 */

// User schemas
export const userSchema = z.object({
  id: z.string().optional(),
  email: z.string().email({ message: 'Email invalide' }),
  name: z.string().min(2, { message: 'Le nom doit contenir au moins 2 caractères' }).optional().nullable(),
  password: z.string().min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' }).optional(),
  role: z.enum(['USER', 'ADMIN', 'ORGANISATEUR']).optional(),
  isEmailVerified: z.boolean().optional(),
});

export const registerSchema = z.object({
  email: z.string().email({ message: 'Email invalide' }),
  password: z.string().min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' }),
  name: z.string().min(2, { message: 'Le nom doit contenir au moins 2 caractères' }).optional(),
});

export const loginSchema = z.object({
  email: z.string().email({ message: 'Email invalide' }),
  password: z.string().min(1, { message: 'Le mot de passe est requis' }),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, { message: 'Le mot de passe actuel est requis' }),
  newPassword: z.string().min(8, { message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' }),
});

export const resetPasswordRequestSchema = z.object({
  email: z.string().email({ message: 'Email invalide' }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'Le token est requis' }),
  newPassword: z.string().min(8, { message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' }),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, { message: 'Le nom doit contenir au moins 2 caractères' }).optional(),
  email: z.string().email({ message: 'Email invalide' }).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// Event schemas
export const eventSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: 'Le nom doit contenir au moins 3 caractères' }),
  description: z.string().min(10, { message: 'La description doit contenir au moins 10 caractères' }),
  date: z.string().or(z.date()),
  location: z.string().min(3, { message: 'Le lieu doit contenir au moins 3 caractères' }),
  category: z.string().optional(),
  imageUrl: z.string().url({ message: 'URL d\'image invalide' }).optional().nullable(),
  organizerId: z.string().optional(),
  published: z.boolean().optional(),
  capacity: z.number().int().positive().optional(),
});

export const eventFilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  organizerId: z.string().optional(),
  published: z.boolean().optional(),
});

// Ticket schemas
export const ticketSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: 'Le nom doit contenir au moins 3 caractères' }),
  description: z.string().optional(),
  price: z.number().positive({ message: 'Le prix doit être positif' }),
  quantity: z.number().int().positive({ message: 'La quantité doit être un nombre entier positif' }),
  type: z.string().optional(),
  eventId: z.string(),
});

export const ticketPurchaseSchema = z.object({
  ticketId: z.string(),
  quantity: z.number().int().positive({ message: 'La quantité doit être un nombre entier positif' }),
});

// Order schemas
export const orderSchema = z.object({
  userId: z.string(),
  tickets: z.array(
    z.object({
      ticketId: z.string(),
      quantity: z.number().int().positive({ message: 'La quantité doit être un nombre entier positif' }),
    })
  ).min(1, { message: 'Au moins un billet est requis' }),
  customerInfo: z.object({
    name: z.string().optional(),
    email: z.string().email({ message: 'Email invalide' }).optional(),
    phone: z.string().optional(),
  }).optional(),
});

// Payment schemas
export const paymentIntentSchema = z.object({
  orderId: z.string(),
});

export const refundSchema = z.object({
  paymentId: z.string(),
  amount: z.number().positive().optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
});

// Contact form schema
export const contactFormSchema = z.object({
  name: z.string().min(2, { message: 'Le nom doit contenir au moins 2 caractères' }),
  email: z.string().email({ message: 'Email invalide' }),
  subject: z.string().min(3, { message: 'Le sujet doit contenir au moins 3 caractères' }),
  message: z.string().min(10, { message: 'Le message doit contenir au moins 10 caractères' }),
});

/**
 * Validate data against a schema
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Format Zod validation errors
 */
export function formatZodErrors(errors: z.ZodError): Array<{ path: string[]; message: string }> {
  return errors.errors.map(error => ({
    path: error.path.map(String),
    message: error.message,
  }));
}

/**
 * Validate request body against a schema
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; errors: Array<{ path: string[]; message: string }> } {
  const result = validate(schema, body);
  if (!result.success) {
    return { success: false, errors: formatZodErrors(result.errors) };
  }
  return result;
}

export default {
  validate,
  validateRequest,
  formatZodErrors,
};