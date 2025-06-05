import { isAuthenticated } from '@/middlewares/auth';
import * as ticketController from '@/modules/ticket/ticket.controller';
// @ts-expect-error next-connect types are not fully compatible with Next.js types
import nc from 'next-connect';

const handler = nc()
  .use(isAuthenticated)
  .get(ticketController.list)  
  .post(ticketController.create); 

export default handler;