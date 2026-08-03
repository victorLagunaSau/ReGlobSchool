/**
 * Calendly OAuth - Step 1: Redirect to Calendly authorization
 * GET /api/auth/calendly/authorize
 */

export async function GET(req: Request) {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/calendly/callback`;

  const params = new URLSearchParams({
    client_id: process.env.CALENDLY_OAUTH_CLIENT_ID || '',
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: [
      'availability:read',
      'availability:write',
      'event_types:read',
      'event_types:write',
      'locations:read',
      'routing_forms:read',
      'shares:write',
      'scheduled_events:read',
      'scheduled_events:write',
      'scheduling_links:write',
      'users:read',
      'groups:read',
      'organizations:read',
      'organizations:write',
    ].join(' '),
  });

  const authUrl = `https://auth.calendly.com/oauth/authorize?${params.toString()}`;
  return Response.redirect(authUrl);
}
