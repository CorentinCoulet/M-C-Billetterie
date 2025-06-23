import { isAuthenticated } from '@/middlewares/auth';
// @ts-expect-error next-connect types are not fully compatible with Next.js types
import nc from 'next-connect';
import * as userController from '@/modules/user/user.controller';

const handler = nc()
  .use(isAuthenticated)
  .get(userController.getStats);

export default handler;