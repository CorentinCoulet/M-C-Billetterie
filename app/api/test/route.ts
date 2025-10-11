import { logger } from '@/lib/logger';
import { createMethodHandler, NextApiResponse } from '@/src/lib/next-api-helpers';
import { NextRequest } from 'next/server';

async function handleGet(request: NextRequest) {
  logger.info({ 
    pathname: '/api/test' 
  }, 'Test endpoint accessed');
  
  return NextApiResponse.success({ 
    message: 'Test endpoint works',
    timestamp: new Date().toISOString() 
  });
}

export default createMethodHandler({
  GET: handleGet,
});
