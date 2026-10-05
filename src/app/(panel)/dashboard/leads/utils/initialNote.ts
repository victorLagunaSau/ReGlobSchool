import { supabase } from '@/src/lib/supabase/client';

// Guarda el comentario capturado al dar de alta un lead (manual o CSV) como
// la primera nota de su historial en lead_interactions.
export async function saveInitialNote(
  leadId: string,
  message: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const text = message.trim();
  if (!text) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('lead_interactions').insert({
    lead_id: leadId,
    interaction_type: 'note',
    actor_id: user.id,
    action_label: 'Nota inicial',
    message: text,
    metadata,
  });

  if (error) console.error('Error al guardar nota inicial:', error);
}
