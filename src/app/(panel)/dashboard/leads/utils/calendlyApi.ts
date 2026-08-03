/**
 * Calendly API Utility
 * Integración con Calendly para consultar disponibilidad y crear eventos
 * API key se pasa como parámetro (guardado en user_integrations)
 */

const CALENDLY_API_BASE = 'https://api.calendly.com';

interface AvailableSlot {
  date: string;
  start_time: string;
  end_time: string;
}

interface CalendlyEventData {
  invitee_email: string;
  invitee_full_name: string;
  invitee_phone?: string;
  start_time: string;
}

/**
 * Obtener el ID del usuario de Calendly usando el token
 */
export async function getCalendlyUserId(apiKey: string): Promise<string | null> {
  if (!apiKey) {
    console.error('API key de Calendly no proporcionada');
    return null;
  }

  try {
    const response = await fetch(`${CALENDLY_API_BASE}/users/me`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error getting Calendly user:', response.statusText, errorText);
      return null;
    }

    const data = await response.json();
    console.log('Calendly user response:', data);
    // Retornar la URI completa, no solo el ID
    const userUri = data.resource?.uri;
    if (!userUri) {
      console.error('No se encontró user URI en la respuesta:', data);
      return null;
    }
    console.log('Calendly user URI:', userUri);
    return userUri;
  } catch (error) {
    console.error('Error calling Calendly API:', error);
    return null;
  }
}

/**
 * Obtener tipos de eventos (event types) disponibles
 */
export async function getEventTypes(apiKey: string) {
  if (!apiKey) {
    console.error('API key de Calendly no proporcionada');
    return [];
  }

  try {
    console.log('Getting Calendly user ID with token:', apiKey.substring(0, 20) + '...');
    const userId = await getCalendlyUserId(apiKey);
    console.log('Calendly userId result:', userId, 'Type:', typeof userId, 'Length:', userId?.length);

    if (!userId) {
      console.error('No userId returned from getCalendlyUserId - returning empty array');
      return [];
    }

    const encodedUserId = encodeURIComponent(userId);
    console.log('Encoded userId:', encodedUserId);
    const eventTypesUrl = `${CALENDLY_API_BASE}/event_types?user=${encodedUserId}`;
    console.log('Full event types URL:', eventTypesUrl);

    const response = await fetch(eventTypesUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Event types response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Event types error:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    console.log('Event types data:', data);
    if (data.collection && data.collection.length > 0) {
      console.log('First event type structure:', JSON.stringify(data.collection[0]));
    }
    const eventTypes = data.collection || [];
    console.log('Returning event types count:', eventTypes.length);
    return eventTypes;
  } catch (error) {
    console.error('Error getting event types:', error);
    return [];
  }
}

/**
 * Obtener disponibilidad para un rango de fechas
 * Retorna slots disponibles
 */
export async function getAvailableSlots(
  apiKey: string,
  eventTypeUri: string,
  startDate: string,
  endDate: string
): Promise<AvailableSlot[]> {
  if (!apiKey) {
    console.error('API key de Calendly no proporcionada');
    return [];
  }

  try {
    // Extraer el ID de la URI (última parte después del último /)
    const eventTypeId = eventTypeUri.split('/').pop();
    if (!eventTypeId) {
      console.error('No se pudo extraer event type ID de la URI:', eventTypeUri);
      return [];
    }

    console.log('Getting available slots for event type:', eventTypeId, 'from', startDate, 'to', endDate);
    const response = await fetch(
      `${CALENDLY_API_BASE}/event_types/${eventTypeId}/available_times?` +
      `min_date=${startDate}&max_date=${endDate}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Available slots response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error getting available slots:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    console.log('Available slots data:', data);
    return data.collection || [];
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return [];
  }
}

/**
 * Crear un evento agendado en Calendly
 * Retorna el evento creado si es exitoso
 */
export async function createScheduledEvent(
  apiKey: string,
  eventTypeUri: string,
  eventData: CalendlyEventData
): Promise<any | null> {
  if (!apiKey) {
    console.error('API key de Calendly no proporcionada');
    return null;
  }

  try {
    // Extraer el ID de la URI (última parte después del último /)
    const eventTypeId = eventTypeUri.split('/').pop();
    if (!eventTypeId) {
      console.error('No se pudo extraer event type ID de la URI:', eventTypeUri);
      return null;
    }

    console.log('Creating scheduled event for:', eventTypeId, 'at', eventData.start_time);
    const response = await fetch(
      `${CALENDLY_API_BASE}/scheduled_events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: eventTypeId,
          invitee: {
            email: eventData.invitee_email,
            name: eventData.invitee_full_name,
            phone_number: eventData.invitee_phone,
          },
          start_time: eventData.start_time,
        }),
      }
    );

    console.log('Create event response status:', response.status);
    if (!response.ok) {
      const error = await response.text();
      console.error('Error creating event:', response.status, error);
      return null;
    }

    const data = await response.json();
    console.log('Event created successfully:', data);
    return data.resource || null;
  } catch (error) {
    console.error('Error calling createScheduledEvent:', error);
    return null;
  }
}

/**
 * Cancelar un evento agendado
 */
export async function cancelScheduledEvent(
  apiKey: string,
  eventId: string
): Promise<boolean> {
  if (!apiKey) {
    console.error('API key de Calendly no proporcionada');
    return false;
  }

  try {
    const response = await fetch(
      `${CALENDLY_API_BASE}/scheduled_events/${eventId}/cancellation`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Cancelled via ReGlobSchool',
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error cancelling event:', error);
    return false;
  }
}

/**
 * Obtener un evento agendado por su ID
 */
export async function getScheduledEvent(apiKey: string, eventId: string) {
  if (!apiKey) {
    console.error('API key de Calendly no proporcionada');
    return null;
  }

  try {
    const response = await fetch(
      `${CALENDLY_API_BASE}/scheduled_events/${eventId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.resource || null;
  } catch (error) {
    console.error('Error getting scheduled event:', error);
    return null;
  }
}
