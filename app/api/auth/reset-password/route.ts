import { NextRequest } from 'next/server';
import { z } from 'zod';
import { NextApiResponse, validateBody } from '../../../../src/lib/next-api-helpers';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Le token est requis'),
  newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
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
    return NextApiResponse.badRequest(
      error.message || 'Erreur lors de la réinitialisation'
    );
  }
}

export async function POST(request: NextRequest) {
  return handleResetPassword(request);
}
