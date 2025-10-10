import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '../../../../lib/logger';
import { createMethodHandler, NextApiResponse, validateBody } from '../../../../src/lib/next-api-helpers';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
});

async function handlePost(request: NextRequest) {
  const { data, error } = await validateBody(request, forgotPasswordSchema);
  if (error) return error;

  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

  try {
    // Import auth service
    const authServiceModule = await import('../../../../src/modules/auth/auth.service');
    const authService = authServiceModule.default;

    // TODO: Implémenter la réinitialisation de mot de passe
    // Pour le moment, on retourne une réponse générique pour des raisons de sécurité
    logger.info({ email: data.email, ipAddress }, 'Password reset requested');

    return NextApiResponse.success(
      null,
      'Instructions de réinitialisation envoyées par email'
    );
  } catch (error: any) {
    logger.error({ error, email: data.email, ipAddress }, 'Forgot password error');
    // Don't reveal if email exists or not for security
    return NextApiResponse.success(
      null,
      'Instructions de réinitialisation envoyées par email'
    );
  }
}

export default createMethodHandler({
  POST: handlePost,
});
