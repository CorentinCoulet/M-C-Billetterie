import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  NextApiResponse,
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

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      const validatedData = changePasswordSchema.parse(body);
      
      // Import user service
      const { default: userService } = await import('../../../../src/services/userService');

      // Verify current password
      const isCurrentPasswordValid = await userService.verifyPassword(user.id, validatedData.currentPassword);
      if (!isCurrentPasswordValid) {
        return NextApiResponse.error('Mot de passe actuel incorrect', 400);
      }

      // Update password
      await userService.updatePassword(user.id, validatedData.newPassword);

      return NextApiResponse.success(null, 'Mot de passe modifié avec succès');
    } catch (error: any) {
      console.error('Change password error:', error);
      return NextApiResponse.error(
        error.message || 'Erreur lors de la modification du mot de passe',
        500
      );
    }
  });
}
