import { NextRequest, NextResponse } from 'next/server';

/**
 * Sentry tunnel endpoint to bypass ad blockers
 * This proxies Sentry requests through our domain
 */
export async function POST(request: NextRequest) {
  try {
    const envelope = await request.text();
    
    if (!envelope) {
      return NextResponse.json({ error: 'Empty envelope' }, { status: 400 });
    }

    // Parse the envelope header to get the DSN
    const envelopeHeader = envelope.split('\n')[0];
    const headerData = JSON.parse(envelopeHeader);
    
    if (!headerData.dsn) {
      return NextResponse.json({ error: 'No DSN in envelope' }, { status: 400 });
    }

    // Extract project ID from DSN
    const dsnMatch = headerData.dsn.match(/https:\/\/(.+)@(.+)\/(.+)/);
    if (!dsnMatch) {
      return NextResponse.json({ error: 'Invalid DSN format' }, { status: 400 });
    }

    const [, publicKey, host, projectId] = dsnMatch;
    
    // Forward to Sentry
    const sentryUrl = `https://${host}/api/${projectId}/envelope/`;
    
    const response = await fetch(sentryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7,sentry_key=${publicKey},sentry_client=sentry.javascript.nextjs/7.0.0`,
      },
      body: envelope,
    });

    if (!response.ok) {
      console.error(`Sentry tunnel failed: ${response.status} ${response.statusText}`);
      return NextResponse.json({ 
        error: 'Failed to forward to Sentry',
        status: response.status 
      }, { status: response.status });
    }

    return new NextResponse(null, { status: 200 });

  } catch (error) {
    console.error('Sentry tunnel error:', error);
    return NextResponse.json({ 
      error: 'Tunnel processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
