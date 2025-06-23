// @ts-expect-error next-connect types are not fully compatible with Next.js types
import nc from 'next-connect';
import * as paymentController from '@/modules/payment/payment.controller';
import { authMiddleware } from '@/middlewares/auth';

const handler = nc()
  .get(authMiddleware, paymentController.getPaymentById);

export default handler;