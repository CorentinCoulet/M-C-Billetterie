import { isAuthenticated } from '@/middlewares/auth';
// @ts-expect-error next-connect types are not fully compatible with Next.js types
import nc from 'next-connect';
import * as eventController from '@/modules/event/event.controller';

const handler = nc()
  .get(eventController.getById)
  .use(isAuthenticated)
  .put(eventController.updateById)
  .delete(eventController.deleteById);

export default handler;