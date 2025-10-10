import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createMethodHandler, NextApiResponse, validateBody } from '../../../../src/lib/next-api-helpers';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  newPassword: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

async function handleResetPassword(request: NextRequest) {
  const { data, error } = await validateBody(request, resetPasswordSchema);
  if (error) return error;

  try {
    // Import auth service
    const authServiceModule = await import('../../../../src/modules/auth/auth.service');

    await authServiceModule.resetPassword(data.token, '', data.newPassword);

    return NextApiResponse.success(
      null,
      'Mot de passe réinitialisé avec succès'
    );
  } catch (error: any) {
    const { logger } = await import('../../../../lib/logger');
    logger.error({ error }, 'Reset password error');
    return NextApiResponse.badRequest(
      error.message || 'Erreur lors de la réinitialisation'
    );
  }
}

export default createMethodHandler({
  POST: handleResetPassword,
});
