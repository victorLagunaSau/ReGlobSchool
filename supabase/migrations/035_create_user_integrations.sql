-- Tabla para guardar integraciones del usuario (Google Calendar, Calendly, etc.)
CREATE TABLE user_integrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'google', 'calendly', 'slack', etc.
  account_email text,
  config jsonb DEFAULT '{}', -- { calendar_id, calendar_name, etc }
  tokens jsonb, -- { access_token, refresh_token, expires_at } - Should be encrypted
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Row Level Security
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Users can read own integrations
CREATE POLICY "Users can read own integrations"
  ON user_integrations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert own integrations
CREATE POLICY "Users can insert own integrations"
  ON user_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own integrations
CREATE POLICY "Users can update own integrations"
  ON user_integrations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete own integrations
CREATE POLICY "Users can delete own integrations"
  ON user_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Index para búsquedas rápidas
CREATE INDEX idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX idx_user_integrations_provider ON user_integrations(provider);
