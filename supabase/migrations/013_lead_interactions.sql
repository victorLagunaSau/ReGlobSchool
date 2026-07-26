-- Create lead_interactions table for unified interaction history/chat-like timeline
CREATE TABLE lead_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'task_outcome', 'stage_change', 'note', 'status_change'
  actor_id UUID NOT NULL REFERENCES profiles(id),
  action_label TEXT, -- 'Success', 'Postponed', 'Moved to Negociación', etc.
  message TEXT, -- The mandatory note/message from user
  metadata JSONB, -- {previous_stage, new_stage, new_scheduled_date, reason, attempt_number, ...}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure RLS: All authorized users can read interactions
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_interactions_read ON lead_interactions
  FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE authorized = true));

CREATE POLICY lead_interactions_write ON lead_interactions
  FOR INSERT USING (auth.uid() = actor_id);

-- Indexes for efficient queries
CREATE INDEX idx_lead_interactions_lead_id ON lead_interactions(lead_id, created_at DESC);
CREATE INDEX idx_lead_interactions_created_at ON lead_interactions(created_at DESC);
CREATE INDEX idx_lead_interactions_actor_id ON lead_interactions(actor_id);
