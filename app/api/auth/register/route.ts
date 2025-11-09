import { NextRequest } from 'next/server';
import { z } from 'zod';
import { NextApiResponse, validateBody } from '../../../../src/lib/next-api-helpers';

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.confirmPassword && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

async function handleRegister(request: NextRequest) {
  const { data, error } = await validateBody(request, registerSchema);
  if (error) return error;

  try {
    // Import auth service
    const authServiceModule = await import('../../../../src/modules/auth/auth.service');
    const authService = authServiceModule.default;

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Register user
    const result = await authService.register(data.email, data.password, data.name);

    if (!result) {
      return NextApiResponse.error('Erreur lors de l\'inscription', 400);
    }

    // Set auth cookie if token is provided
    const response = NextApiResponse.success(
      {
        user: result.user,
        token: result.token,
      },
      'Inscription réussie'
    );

    if (result.token) {
      response.cookies.set('auth-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return response;
  } catch (error: any) {
    return NextApiResponse.error(
      error.message || 'Erreur lors de l\'inscription',
      500
    );
  }
}

export async function POST(request: NextRequest) {
  return handleRegister(request);
}
