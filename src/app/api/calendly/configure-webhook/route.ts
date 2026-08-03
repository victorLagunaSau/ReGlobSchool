/**
 * POST /api/calendly/configure-webhook
 * Crea automáticamente el webhook en Calendly cuando el usuario conecta OAuth
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function decryptToken(encryptedToken: string, encryptionKey: string): string {
  const [iv, authTag, encryptedData] = encryptedToken.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(encryptionKey, 'hex'),
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(Buffer.from(encryptedData, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf-8');
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 401 });
    }

    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      userId = decoded.sub;
      if (!userId) throw new Error('No user ID in token');
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { global: { headers: { authorization: authHeader } } }
    );

    // Obtener integración de Calendly
    const { data: integration, error: integError } = await supabase
      .from('user_integrations')
      .select('tokens, config')
      .eq('user_id', userId)
      .eq('provider', 'calendly')
      .eq('is_active', true)
      .single();

    if (integError || !integration) {
      return NextResponse.json({ error: 'Calendly not configured' }, { status: 400 });
    }

    const encryptedToken = integration.tokens?.access_token;
    if (!encryptedToken) {
      return NextResponse.json({ error: 'Calendly token missing' }, { status: 400 });
    }

    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const accessToken = decryptToken(encryptedToken, encryptionKey);

    // 1. Obtener user_id de Calendly
    const meResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!meResponse.ok) {
      throw new Error('Failed to get Calendly user');
    }

    const meData = await meResponse.json();
    const calendlyUserId = meData.resource.uri;

    console.log('✅ Got Calendly user:', calendlyUserId);

    // 2. Obtener webhooks existentes
    const webhooksResponse = await fetch(`https://api.calendly.com/users/${calendlyUserId}/webhook_subscriptions`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    let existingWebhook = null;
    const webhookUrl = 'https://re-glob-school.vercel.app/api/calendly/webhook';

    if (webhooksResponse.ok) {
      const webhooksData = await webhooksResponse.json();
      const webhooks = webhooksData.collection || [];
      existingWebhook = webhooks.find((wh: any) => wh.callback_url === webhookUrl);

      if (existingWebhook) {
        console.log('✅ Webhook already exists:', existingWebhook.uri);
        return NextResponse.json({
          success: true,
          message: 'Webhook already configured',
          webhookUri: existingWebhook.uri,
        });
      }
    }

    // 3. Crear nuevo webhook
    const createWebhookResponse = await fetch(
      `https://api.calendly.com/users/${calendlyUserId}/webhook_subscriptions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          events: ['invitee.created'],
          signing_key: process.env.CALENDLY_WEBHOOK_SIGNING_KEY || 'reglobschool-signing-key',
        }),
      }
    );

    if (!createWebhookResponse.ok) {
      const errorData = await createWebhookResponse.json();
      console.error('❌ Webhook creation error:', errorData);
      throw new Error(`Failed to create webhook: ${errorData.message || 'Unknown error'}`);
    }

    const webhookData = await createWebhookResponse.json();
    const webhookUri = webhookData.resource.uri;

    console.log('✅ Webhook created:', webhookUri);

    return NextResponse.json({
      success: true,
      message: 'Webhook configured successfully',
      webhookUri,
    });
  } catch (error) {
    console.error('🔥 Configure webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
