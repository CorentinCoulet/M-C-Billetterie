import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
    NextApiResponse,
    validateBody,
    withAuth
} from '../../../../src/lib/next-api-helpers';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string().min(1, 'Confirmation du mot de passe requise'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

async function handlePost(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    const { data, error } = await validateBody(req, changePasswordSchema);
    if (error) return error;

    try {
      // Import user service
      const { default: userService } = await import('../../../../src/services/userService');

      // Verify current password
      const isCurrentPasswordValid = await userService.verifyPassword(user.id, data.currentPassword);
      if (!isCurrentPasswordValid) {
        logger.warn('Failed password change attempt - incorrect current password', { userId: user.id });
        return NextApiResponse.error('Mot de passe actuel incorrect', 400);
      }

      // Update password
      await userService.updatePassword(user.id, data.newPassword);

      logger.info('Password changed successfully', { userId: user.id });

      return NextApiResponse.success(null, 'Mot de passe modifié avec succès');
    } catch (error: any) {
      logger.error('Change password error', { error, userId: user.id });
      return NextApiResponse.error(
        error.message || 'Erreur lors de la modification du mot de passe',
        500
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return handlePost(request);
}
