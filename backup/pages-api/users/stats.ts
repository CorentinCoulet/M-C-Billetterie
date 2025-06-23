// @ts-expect-error next-connect types are not fully compatible with Next.js types
import nc from 'next-connect';
import * as userController from '@/modules/user/user.controller';
import { authMiddleware } from '@/middlewares/auth';

const handler = nc()
  .get(authMiddleware, userController.getStats);

export default handler;