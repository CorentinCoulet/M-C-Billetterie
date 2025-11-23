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

    // Si l'inscription renvoie null, vérifier si l'utilisateur existe déjà
    if (!result) {
      try {
        const prismaMod = await import('../../../../src/lib/prisma');
        // Supporte à la fois export nommé et par défaut
        const prisma: any = (prismaMod as any).prisma || (prismaMod as any).default;
        const existingUser = await prisma.user.findUnique({
          where: { email: data.email },
          select: { id: true, email: true, name: true, role: true }
        });

        if (existingUser) {
          // Retourne un succès sans jeton (pas de cookie), utile pour l'invitation de staff
          return NextApiResponse.success(
            { user: existingUser },
            'Utilisateur déjà existant'
          );
        }
      } catch {
        // ignore and fallthrough to error
      }

      return NextApiResponse.error('Erreur lors de l\'inscription', 400);
    }

    // Set auth cookie if token is provided, unless explicitly disabled via query param
    const response = NextApiResponse.success(
      {
        user: result.user,
        token: result.token,
      },
      'Inscription réussie'
    );

    const url = new URL(request.url);
    const noAuthCookie = url.searchParams.get('noAuthCookie') === '1';

    if (result.token && !noAuthCookie) {
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
      error.message || 'Erreur lors de l\'inscription',
      500
    );
  }
}

export async function POST(request: NextRequest) {
  return handleRegister(request);
}
