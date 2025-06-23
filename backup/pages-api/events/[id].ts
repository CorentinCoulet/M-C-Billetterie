// @ts-expect-error next-connect types are not fully compatible with Next.js types
import nc from 'next-connect';
import * as eventController from '@/modules/event/event.controller';
import { authMiddleware } from '@/middlewares/auth';

const handler = nc()
  .get(eventController.getById)
  .put(authMiddleware, eventController.updateById)
  .delete(authMiddleware, eventController.deleteById);

export default handler;