import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { resolveTaskWithPipeline } from '../../../../../lib/task-automation';

interface ResolveTaskRequest {
  taskId: string;
  resolution: 'exito' | 'posponer' | 'regresar' | 'reintentar' | 'descartar';
  note: string;
  outcomeData?: {
    reason?: string;
    newScheduledDate?: string;
    nextStageId?: string;
  };
}

interface ResolveTaskResponse {
  success: boolean;
  message: string;
  leadId?: string;
  taskId?: string;
  error?: string;
}

async function validateRequest(req: NextRequest, leadId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return 'No autenticado';

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('authorized, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.authorized) return 'No autorizado para esta acción';

  return null;
}

async function validatePostponementLimit(
  supabase: any,
  leadId: string,
  newScheduledDate: string
): Promise<string | null> {
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('status')
    .eq('id', leadId)
    .single();

  if (leadError) return 'No se pudo validar el lead';

  const { data: stage, error: stageError } = await supabase
    .from('pipeline_stages')
    .select('limite_pospuestas')
    .eq('clave', lead.status)
    .single();

  if (stageError || !stage) return null; // Sin límite configurado

  const { data: postponements, error: postError } = await supabase
    .from('lead_interactions')
    .select('id')
    .eq('lead_id', leadId)
    .eq('action_label', 'Posponer');

  if (postError) return 'No se pudo validar pospuestas anteriores';

  const currentPostponements = postponements?.length || 0;
  if (currentPostponements >= stage.limite_pospuestas) {
    return `Límite de ${stage.limite_pospuestas} pospuestas alcanzado`;
  }

  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ResolveTaskResponse>> {
  try {
    const leadId = params.id;
    const cookieStore = await cookies();

    // Validar autenticación
    const authError = await validateRequest(req, leadId);
    if (authError) {
      return NextResponse.json(
        { success: false, message: authError, error: authError },
        { status: 401 }
      );
    }

    // Parsear request
    const body = (await req.json()) as ResolveTaskRequest;

    // Validar campos requeridos
    if (!body.taskId || !body.resolution || !body.note) {
      return NextResponse.json(
        {
          success: false,
          message: 'Campos requeridos: taskId, resolution, note',
          error: 'Validación fallida',
        },
        { status: 400 }
      );
    }

    if (body.note.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          message: 'La nota debe tener al menos 10 caracteres',
          error: 'Validación fallida',
        },
        { status: 400 }
      );
    }

    // Crear cliente Supabase
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Validar límite de pospuestas si aplica
    if (body.resolution === 'posponer' && body.outcomeData?.newScheduledDate) {
      const postponeError = await validatePostponementLimit(
        supabase,
        leadId,
        body.outcomeData.newScheduledDate
      );
      if (postponeError) {
        return NextResponse.json(
          { success: false, message: postponeError, error: postponeError },
          { status: 400 }
        );
      }
    }

    // Obtener tarea para validar
    const { data: task, error: taskError } = await supabase
      .from('lead_tasks')
      .select('*')
      .eq('id', body.taskId)
      .eq('lead_id', leadId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        {
          success: false,
          message: 'Tarea no encontrada',
          error: 'Tarea no existe o no pertenece a este lead',
        },
        { status: 404 }
      );
    }

    // Ejecutar resolución
    await resolveTaskWithPipeline(
      task,
      body.resolution,
      body.outcomeData?.nextStageId || body.outcomeData?.newScheduledDate,
      body.note,
      body.outcomeData?.reason
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Tarea resuelta correctamente',
        leadId,
        taskId: body.taskId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error resolving task:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    return NextResponse.json(
      {
        success: false,
        message: 'Error al resolver tarea',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
