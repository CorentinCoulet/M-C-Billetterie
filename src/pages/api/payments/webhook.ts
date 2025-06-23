// @ts-expect-error next-connect types are not fully compatible with Next.js types
import nc from 'next-connect';
import * as paymentController from '@/modules/payment/payment.controller';

// No authentication middleware for webhooks as they are called by the payment provider
const handler = nc()
  .post(paymentController.webhook);

export default handler;