// @ts-expect-error next-connect types are not fully compatible with Next.js types
import nc from 'next-connect';
import * as ticketController from '@/modules/ticket/ticket.controller';
import { authMiddleware } from '@/middlewares/auth';

const handler = nc()
  .get(authMiddleware, ticketController.getById);

export default handler;