import { PrismaClient } from '../generated/prisma';
import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();

// OAuth 2.0 / OpenID Connect Configuration
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  issuer: string;
}

// OAuth Grant Types
enum GrantType {
  AUTHORIZATION_CODE = 'authorization_code',
  REFRESH_TOKEN = 'refresh_token',
  CLIENT_CREDENTIALS = 'client_credentials',
}

// OAuth Scopes
export const OAUTH_SCOPES = {
  OPENID: 'openid',
  PROFILE: 'profile',
  EMAIL: 'email',
  TICKETS: 'tickets',
  EVENTS: 'events:read',
  ADMIN: 'admin',
} as const;

// Token Types
interface AccessToken {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

interface IDToken {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  auth_time: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

// Validation schemas
const authorizationRequestSchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string(),
  redirect_uri: z.string().url(),
  scope: z.string(),
  state: z.string().optional(),
  nonce: z.string().optional(),
  code_challenge: z.string().optional(), // PKCE
  code_challenge_method: z.enum(['S256']).optional(),
});

const tokenRequestSchema = z.object({
  grant_type: z.nativeEnum(GrantType),
  code: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  client_id: z.string(),
  client_secret: z.string().optional(),
  refresh_token: z.string().optional(),
  code_verifier: z.string().optional(), // PKCE
});

export class OAuthService {
  private static readonly ACCESS_TOKEN_EXPIRY = 3600; // 1 hour
  private static readonly REFRESH_TOKEN_EXPIRY = 2592000; // 30 days
  private static readonly AUTH_CODE_EXPIRY = 600; // 10 minutes

  /**
   * Register OAuth client application
   */
  static async registerClient(
    name: string,
    redirectUris: string[],
    scopes: string[]
  ): Promise<{ clientId: string; clientSecret: string }> {
    const clientId = crypto.randomUUID();
    const clientSecret = crypto.randomBytes(32).toString('hex');

    // Store client in database
    await prisma.$executeRaw`
      INSERT INTO oauth_clients (
        client_id, 
        client_secret_hash, 
        name, 
        redirect_uris, 
        allowed_scopes,
        created_at
      ) VALUES (
        ${clientId},
        ${crypto.createHash('sha256').update(clientSecret).digest('hex')},
        ${name},
        ${JSON.stringify(redirectUris)},
        ${JSON.stringify(scopes)},
        NOW()
      )
    `;

    return { clientId, clientSecret };
  }

  /**
   * OAuth 2.0 Authorization Endpoint
   */
  static async authorize(req: express.Request, res: express.Response) {
    try {
      const params = authorizationRequestSchema.parse(req.query);
      
      // Verify client exists
      const client = await prisma.$queryRaw`
        SELECT client_id, name, redirect_uris, allowed_scopes 
        FROM oauth_clients 
        WHERE client_id = ${params.client_id}
      ` as any[];

      if (client.length === 0) {
        return res.status(400).json({ 
          error: 'invalid_client',
          error_description: 'Invalid client_id' 
        });
      }

      const clientData = client[0];
      const allowedRedirectUris = JSON.parse(clientData.redirect_uris);
      
      // Verify redirect URI
      if (!allowedRedirectUris.includes(params.redirect_uri)) {
        return res.status(400).json({ 
          error: 'invalid_request',
          error_description: 'Invalid redirect_uri' 
        });
      }

      // Verify scopes
      const requestedScopes = params.scope.split(' ');
      const allowedScopes = JSON.parse(clientData.allowed_scopes);
      
      if (!requestedScopes.every(scope => allowedScopes.includes(scope))) {
        return res.status(400).json({ 
          error: 'invalid_scope',
          error_description: 'One or more requested scopes are invalid' 
        });
      }

      // Check if user is authenticated
      const user = (req as any).user;
      if (!user) {
        // Redirect to login with return URL
        const loginUrl = `/api/auth/login?return_url=${encodeURIComponent(req.originalUrl)}`;
        return res.redirect(loginUrl);
      }

      // Check if user has already approved this client
      const existingConsent = await prisma.$queryRaw`
        SELECT id FROM oauth_consents 
        WHERE user_id = ${user.id} AND client_id = ${params.client_id}
        AND scopes @> ${JSON.stringify(requestedScopes)}
      ` as any[];

      // If no consent or new scopes requested, show consent screen
      if (existingConsent.length === 0) {
        return res.render('oauth/consent', {
          client: clientData,
          scopes: requestedScopes,
          user: user,
          params: params,
        });
      }

      // Generate authorization code
      const authCode = crypto.randomBytes(32).toString('hex');
      const codeChallenge = params.code_challenge;
      
      await prisma.$executeRaw`
        INSERT INTO oauth_authorization_codes (
          code, 
          client_id, 
          user_id, 
          redirect_uri, 
          scopes, 
          code_challenge,
          nonce,
          expires_at
        ) VALUES (
          ${authCode},
          ${params.client_id},
          ${user.id},
          ${params.redirect_uri},
          ${JSON.stringify(requestedScopes)},
          ${codeChallenge},
          ${params.nonce},
          ${new Date(Date.now() + this.AUTH_CODE_EXPIRY * 1000)}
        )
      `;

      // Redirect back to client with authorization code
      const redirectUrl = new URL(params.redirect_uri);
      redirectUrl.searchParams.set('code', authCode);
      if (params.state) {
        redirectUrl.searchParams.set('state', params.state);
      }

      res.redirect(redirectUrl.toString());
      
    } catch (error) {
      console.error('OAuth authorize error:', error);
      res.status(500).json({ 
        error: 'server_error',
        error_description: 'Internal server error' 
      });
    }
  }

  /**
   * OAuth 2.0 Token Endpoint
   */
  static async token(req: express.Request, res: express.Response) {
    try {
      const params = tokenRequestSchema.parse(req.body);

      if (params.grant_type === GrantType.AUTHORIZATION_CODE) {
        return await this.handleAuthorizationCodeGrant(params, req, res);
      } else if (params.grant_type === GrantType.REFRESH_TOKEN) {
        return await this.handleRefreshTokenGrant(params, req, res);
      } else if (params.grant_type === GrantType.CLIENT_CREDENTIALS) {
        return await this.handleClientCredentialsGrant(params, req, res);
      }

      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Grant type not supported'
      });

    } catch (error) {
      console.error('OAuth token error:', error);
      res.status(500).json({ 
        error: 'server_error',
        error_description: 'Internal server error' 
      });
    }
  }

  /**
   * Handle authorization code grant
   */
  private static async handleAuthorizationCodeGrant(
    params: any,
    req: express.Request,
    res: express.Response
  ) {
    if (!params.code || !params.redirect_uri) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required parameters'
      });
    }

    // Verify client credentials
    const client = await this.verifyClient(params.client_id, params.client_secret);
    if (!client) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid client credentials'
      });
    }

    // Get authorization code
    const authCodeData = await prisma.$queryRaw`
      SELECT * FROM oauth_authorization_codes 
      WHERE code = ${params.code} AND client_id = ${params.client_id}
      AND expires_at > NOW()
    ` as any[];

    if (authCodeData.length === 0) {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code'
      });
    }

    const authCode = authCodeData[0];

    // Verify redirect URI
    if (authCode.redirect_uri !== params.redirect_uri) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Redirect URI mismatch'
      });
    }

    // Verify PKCE if used
    if (authCode.code_challenge) {
      if (!params.code_verifier) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Code verifier required'
        });
      }

      const hash = crypto.createHash('sha256').update(params.code_verifier).digest('base64url');
      if (hash !== authCode.code_challenge) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid code verifier'
        });
      }
    }

    // Generate tokens
    const scopes = JSON.parse(authCode.scopes);
    const tokens = await this.generateTokens(authCode.user_id, params.client_id, scopes, authCode.nonce);

    // Delete used authorization code
    await prisma.$executeRaw`
      DELETE FROM oauth_authorization_codes WHERE code = ${params.code}
    `;

    // Log token issuance
    await prisma.auditLog.create({
      data: {
        action: 'oauth.token_issued',
        resourceType: 'oauth_token',
        resourceId: tokens.jti,
        userId: authCode.user_id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        details: JSON.stringify({ 
          client_id: params.client_id,
          scopes: scopes,
          grant_type: params.grant_type
        }),
        result: 'success',
        riskLevel: 'medium',
        eventHash: crypto.randomBytes(16).toString('hex'),
      }
    });

    res.json(tokens.accessToken);
  }

  /**
   * Handle refresh token grant
   */
  private static async handleRefreshTokenGrant(
    params: any,
    req: express.Request,
    res: express.Response
  ) {
    if (!params.refresh_token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing refresh token'
      });
    }

    const client = await this.verifyClient(params.client_id, params.client_secret);
    if (!client) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid client credentials'
      });
    }

    // Verify refresh token
    const refreshTokenData = await prisma.$queryRaw`
      SELECT * FROM oauth_refresh_tokens 
      WHERE token_hash = ${crypto.createHash('sha256').update(params.refresh_token).digest('hex')}
      AND client_id = ${params.client_id}
      AND expires_at > NOW()
    ` as any[];

    if (refreshTokenData.length === 0) {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Invalid or expired refresh token'
      });
    }

    const refreshToken = refreshTokenData[0];
    const scopes = JSON.parse(refreshToken.scopes);

    // Generate new tokens
    const tokens = await this.generateTokens(refreshToken.user_id, params.client_id, scopes);

    // Revoke old refresh token and create new one
    await prisma.$executeRaw`
      DELETE FROM oauth_refresh_tokens WHERE token_hash = ${crypto.createHash('sha256').update(params.refresh_token).digest('hex')}
    `;

    res.json(tokens.accessToken);
  }

  /**
   * Generate access and refresh tokens
   */
  private static async generateTokens(
    userId: string,
    clientId: string,
    scopes: string[],
    nonce?: string
  ) {
    const jti = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    // Access token payload
    const accessTokenPayload = {
      iss: process.env.OAUTH_ISSUER || 'https://yourdomain.com',
      sub: userId,
      aud: clientId,
      exp: now + this.ACCESS_TOKEN_EXPIRY,
      iat: now,
      jti: jti,
      scope: scopes.join(' '),
      token_type: 'access_token',
    };

    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.JWT_SECRET!,
      { algorithm: 'HS256' }
    );

    // Refresh token
    const refreshTokenValue = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');

    await prisma.$executeRaw`
      INSERT INTO oauth_refresh_tokens (
        token_hash,
        user_id,
        client_id,
        scopes,
        expires_at
      ) VALUES (
        ${refreshTokenHash},
        ${userId},
        ${clientId},
        ${JSON.stringify(scopes)},
        ${new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY * 1000)}
      )
    `;

    // ID token (if openid scope requested)
    let idToken: string | undefined;
    if (scopes.includes(OAUTH_SCOPES.OPENID)) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, isVerified: true }
      });

      if (user) {
        const idTokenPayload: IDToken = {
          iss: process.env.OAUTH_ISSUER || 'https://yourdomain.com',
          sub: userId,
          aud: clientId,
          exp: now + this.ACCESS_TOKEN_EXPIRY,
          iat: now,
          auth_time: now,
          nonce,
        };

        if (scopes.includes(OAUTH_SCOPES.EMAIL)) {
          idTokenPayload.email = user.email;
          idTokenPayload.email_verified = user.isVerified;
        }

        if (scopes.includes(OAUTH_SCOPES.PROFILE)) {
          idTokenPayload.name = user.name || undefined;
        }

        idToken = jwt.sign(
          idTokenPayload,
          process.env.JWT_SECRET!,
          { algorithm: 'HS256' }
        );
      }
    }

    const response: AccessToken = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: this.ACCESS_TOKEN_EXPIRY,
      scope: scopes.join(' '),
      refresh_token: refreshTokenValue,
    };

    if (idToken) {
      (response as any).id_token = idToken;
    }

    return { accessToken: response, jti };
  }

  /**
   * Verify client credentials
   */
  private static async verifyClient(clientId: string, clientSecret?: string): Promise<boolean> {
    if (!clientSecret) return false;

    const client = await prisma.$queryRaw`
      SELECT client_secret_hash FROM oauth_clients 
      WHERE client_id = ${clientId}
    ` as any[];

    if (client.length === 0) return false;

    const expectedHash = crypto.createHash('sha256').update(clientSecret).digest('hex');
    return client[0].client_secret_hash === expectedHash;
  }

  /**
   * OpenID Connect UserInfo Endpoint
   */
  static async userInfo(req: express.Request, res: express.Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'invalid_token' });
      }

      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        if (decoded.token_type !== 'access_token') {
          return res.status(401).json({ error: 'invalid_token' });
        }

        const scopes = decoded.scope.split(' ');
        if (!scopes.includes(OAUTH_SCOPES.OPENID)) {
          return res.status(403).json({ error: 'insufficient_scope' });
        }

        const user = await prisma.user.findUnique({
          where: { id: decoded.sub },
          select: { id: true, email: true, name: true, isVerified: true }
        });

        if (!user) {
          return res.status(404).json({ error: 'user_not_found' });
        }

        const userInfo: any = { sub: user.id };

        if (scopes.includes(OAUTH_SCOPES.EMAIL)) {
          userInfo.email = user.email;
          userInfo.email_verified = user.isVerified;
        }

        if (scopes.includes(OAUTH_SCOPES.PROFILE)) {
          userInfo.name = user.name;
        }

        res.json(userInfo);

      } catch (jwtError) {
        return res.status(401).json({ error: 'invalid_token' });
      }

    } catch (error) {
      console.error('UserInfo error:', error);
      res.status(500).json({ error: 'server_error' });
    }
  }

  /**
   * OpenID Connect Discovery Document
   */
  static getDiscoveryDocument() {
    const issuer = process.env.OAUTH_ISSUER || 'https://yourdomain.com';
    
    return {
      issuer,
      authorization_endpoint: `${issuer}/api/oauth/authorize`,
      token_endpoint: `${issuer}/api/oauth/token`,
      userinfo_endpoint: `${issuer}/api/oauth/userinfo`,
      jwks_uri: `${issuer}/api/oauth/jwks`,
      scopes_supported: Object.values(OAUTH_SCOPES),
      response_types_supported: ['code'],
      grant_types_supported: Object.values(GrantType),
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['HS256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
      code_challenge_methods_supported: ['S256'],
    };
  }
}
