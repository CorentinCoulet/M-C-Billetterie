import { authRateLimiter } from '@/middlewares/rateLimit';
import authController from '@/modules/auth/auth.controller';
// @ts-expect-error next-connect types are not fully compatible with Next.js types
import nc from 'next-connect';

const handler = nc()
  .use(authRateLimiter)
  .post(authController.register);

export default handler;