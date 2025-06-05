import { authRateLimiter } from '@/middlewares/rateLimit';
import authController from '@/modules/auth/auth.controller';
import type { NextApiRequest, NextApiResponse } from 'next';
// @ts-expect-error next-connect types are not fully compatible with Next.js types
import nc from 'next-connect';

const handler = nc<NextApiRequest, NextApiResponse>()
  .use(authRateLimiter)
  .post(authController.resetPassword);

export default handler;