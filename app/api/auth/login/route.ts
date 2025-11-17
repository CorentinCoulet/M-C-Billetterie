import { NextRequest } from 'next/server';
import { z } from 'zod';
import { NextApiResponse, validateBody } from '../../../../src/lib/next-api-helpers';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

async function handlePost(request: NextRequest) {
  const { data, error } = await validateBody(request, loginSchema);
  if (error) return error;

  try {
    // Import auth service
    const authServiceModule = await import('../../../../src/modules/auth/auth.service');
    const authService = authServiceModule.default;

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Login user
    const result = await authService.login(data.email, data.password);

    if (!result) {
      return NextApiResponse.error('Identifiant ou mot de passe incorrect', 401);
    }

    // Create response with user data
    const response = NextApiResponse.success(
      {
        user: result.user,
        token: result.token,
      },
      'Connexion réussie'
    );

    // Set auth cookie
    // Important: ensure cookie is available on all paths for middleware and API routes
    if (result.token) {
      response.cookies.set('auth-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return response;
  } catch (error: any) {
    return NextApiResponse.error(
      error.message || 'Erreur lors de la connexion',
      500
    );
  }
}

export async function POST(request: NextRequest) {
  return handlePost(request);
}

// Export par défaut pour compatibilité avec certains tests (Jest)
export default async function handler(request: NextRequest) {
  if (request.method === 'POST') {
    return handlePost(request);
  }
  return NextApiResponse.error('Method Not Allowed', 405);
}
