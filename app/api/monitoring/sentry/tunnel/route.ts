import { logger } from '@/lib/logger';
import { createMethodHandler, NextApiResponse } from '@/src/lib/next-api-helpers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Sentry tunnel endpoint to bypass ad blockers
 * This proxies Sentry requests through our domain
 */
async function handlePost(request: NextRequest) {
  try {
    const envelope = await request.text();
    
    if (!envelope) {
      logger.warn({ 
        pathname: '/api/monitoring/sentry/tunnel' 
      }, 'Empty Sentry envelope received');
      return NextApiResponse.error('Empty envelope', 400);
    }

    // Parse the envelope header to get the DSN
    const envelopeHeader = envelope.split('\n')[0];
    const headerData = JSON.parse(envelopeHeader);
    
    if (!headerData.dsn) {
      logger.warn({ 
        pathname: '/api/monitoring/sentry/tunnel' 
      }, 'No DSN in envelope');
      return NextApiResponse.error('No DSN in envelope', 400);
    }

    // Extract project ID from DSN
    const dsnMatch = headerData.dsn.match(/https:\/\/(.+)@(.+)\/(.+)/);
    if (!dsnMatch) {
      logger.warn({ 
        dsn: headerData.dsn,
        pathname: '/api/monitoring/sentry/tunnel' 
      }, 'Invalid DSN format');
      return NextApiResponse.error('Invalid DSN format', 400);
    }

    const [, publicKey, host, projectId] = dsnMatch;
    
    // Forward to Sentry
    const sentryUrl = `https://${host}/api/${projectId}/envelope/`;
    
    logger.debug({ 
      sentryUrl,
      projectId,
      pathname: '/api/monitoring/sentry/tunnel' 
    }, 'Forwarding to Sentry');

    const response = await fetch(sentryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7,sentry_key=${publicKey},sentry_client=sentry.javascript.nextjs/7.0.0`,
      },
      body: envelope,
    });

    if (!response.ok) {
      logger.error({ 
        status: response.status,
        statusText: response.statusText,
        pathname: '/api/monitoring/sentry/tunnel' 
      }, 'Sentry tunnel failed');
      return NextResponse.json({ 
        error: 'Failed to forward to Sentry',
        status: response.status 
      }, { status: response.status });
    }

    logger.debug({ 
      pathname: '/api/monitoring/sentry/tunnel' 
    }, 'Successfully forwarded to Sentry');

    return new NextResponse(null, { status: 200 });

  } catch (error) {
    logger.error({ 
      error,
      pathname: '/api/monitoring/sentry/tunnel' 
    }, 'Sentry tunnel error');
    return NextResponse.json({ 
      error: 'Tunnel processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export default createMethodHandler({
  POST: handlePost,
});
