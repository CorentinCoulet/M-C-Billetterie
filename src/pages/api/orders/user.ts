import { isAuthenticated } from '@/middlewares/auth';
// @ts-expect-error next-connect types are not fully compatible with Next.js types
import nc from 'next-connect';
import * as orderController from '@/modules/order/order.controller';

const handler = nc()
  .use(isAuthenticated)
  .get(orderController.getUserOrders);

export default handler;