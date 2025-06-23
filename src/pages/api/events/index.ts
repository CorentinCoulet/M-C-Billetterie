import { isAuthenticated } from '@/middlewares/auth';
// @ts-expect-error next-connect types are not fully compatible with Next.js types
import nc from 'next-connect';
import * as eventController from '@/modules/event/event.controller';

const handler = nc()
  .get(eventController.list)
  .use(isAuthenticated)
  .post(eventController.create);

export default handler;