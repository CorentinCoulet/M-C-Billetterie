// @ts-expect-error next-connect types are not fully compatible with Next.js types
import nc from 'next-connect';
import * as eventController from '@/modules/event/event.controller';

const handler = nc()
  .get(eventController.searchEvents);

export default handler;