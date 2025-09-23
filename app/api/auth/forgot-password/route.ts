import { NextRequest } from 'next/server';
import { z } from 'zod';
import { NextApiResponse, validateBody } from '../../../../src/lib/next-api-helpers';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
});

export async function POST(request: NextRequest) {
  const { data, error } = await validateBody(request, forgotPasswordSchema);
  if (error) return error;

  try {
    // Import auth service
    const authServiceModule = await import('../../../../src/modules/auth/auth.service');
    const authService = authServiceModule.default;

    // TODO: Implémenter la réinitialisation de mot de passe
    // Pour le moment, on retourne une réponse générique pour des raisons de sécurité
    console.log('Password reset requested for:', data.email);

    return NextApiResponse.success(
      null,
      'Instructions de réinitialisation envoyées par email'
    );
  } catch (error: any) {
    console.error('Forgot password error:', error);
    // Don't reveal if email exists or not for security
    return NextApiResponse.success(
      null,
      'Instructions de réinitialisation envoyées par email'
    );
  }
}
