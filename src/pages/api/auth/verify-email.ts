import authController from '@/modules/auth/auth.controller';
// @ts-expect-error next-connect types are not fully compatible with Next.js types
import nc from 'next-connect';

const handler = nc()
  .get(authController.verifyEmail);

export default handler;