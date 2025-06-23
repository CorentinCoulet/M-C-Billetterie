import { isAuthenticated } from '@/middlewares/auth';
// @ts-expect-error next-connect types are not fully compatible with Next.js types
import nc from 'next-connect';
import * as paymentController from '@/modules/payment/payment.controller';

const handler = nc()
  .use(isAuthenticated)
  .post(paymentController.processPayment);

export default handler;