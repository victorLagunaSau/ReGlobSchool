# Calendly Integration Context

## Objetivo
Completar la integración de Calendly para que:
1. Se creen eventos reales en Calendly cuando se agenda una reunión
2. Se confirme disponibilidad desde Calendly API (en lugar de hardcoded)
3. Se guarden URLs de reunión (Calendly + Zoom)

## ✅ Estado Actual (Completado)

### BD y Datos
- ✅ `lead_meetings` almacena: nombre, email, teléfono, fecha/hora, etapa
- ✅ Múltiples reuniones por lead permitidas (sin constraint UNIQUE)
- ✅ Comentarios guardados con formato: `"Reunión agendada - Etapa 3 - Nombre (email, phone) - timestamp"`
- ✅ Campos `stage_numero`, `stage_clave`, `calendly_uri`, `zoom_uri` listos en DB

### API Route (`/api/calendly/create-event`)
- ✅ Obtiene token encriptado desde `user_integrations` tabla
- ✅ Intenta crear evento en Calendly API
- ✅ Guarda `calendly_uri` en `lead_meetings`
- ✅ Maneja errores gracefully (sigue si Calendly falla)
- ✅ Guarda comentario en `lead_attempt_notes`

### UI Components
- ✅ `CalendlyScheduler.tsx` - Formulario para agendar
- ✅ `StageModal.tsx` - Carga reunión por (lead_id, stage_id)
- ✅ Muestra "Etapa 3" en título
- ✅ Oculta formulario si ya existe reunión en etapa actual

## 🔴 Problemas Pendientes (A Resolver)

### 1. Disponibilidad Hardcoded
**Ubicación:** `/api/calendly/availability`
- Actualmente retorna fechas hardcoded (no desde Calendly API)
- Necesita obtener disponibilidad real desde: `GET https://api.calendly.com/users/me`
- Luego hacer queries de `scheduled_events` y `event_types`

**Datos necesarios:**
```json
{
  "availability": {
    "2026-08-05": ["09:00", "09:30", "10:00", ...],
    "2026-08-06": ["14:00", "14:30", ...],
    ...
  }
}
```

### 2. Crear Evento en Calendly - Endpoint Incorrecto
**Ubicación:** `/api/calendly/create-event` (líneas ~96-120)
- Intenta usar: `POST https://api.calendly.com/scheduled_events` ❌
- **Problema:** Este endpoint es solo para **cancelar**, no crear
- **Solución correcta:** Usar `Calendly Booking Flow` o **"invitee link"**

**Opciones:**
A) Si el usuario tiene evento public en Calendly → generar invitee link + add guest vía link
B) Si tiene webhook setup → usar webhook para capturar booked events
C) Usar `/available_times` endpoint para mostrar disponibilidad y dejar que user haga click en link

### 3. Token Encriptado - Verificar Funciona
- Código asume token encriptado con `ENCRYPTION_KEY`
- Necesita verificar que `decryptToken()` funciona correctamente
- `user_integrations.tokens.access_token` debe estar en formato: `iv:authTag:encryptedData`

### 4. Validar Estructura de Respuesta
**Endpoint retorna:**
```json
{
  "success": true,
  "meetingId": "uuid",
  "message": "Reunión guardada en BD y en Calendly",
  "calendlyUri": "https://calendly.com/...",
  "calendlyError": null
}
```
- UI en `CalendlyScheduler.tsx` línea 149 espera `eventUri` pero API retorna `calendlyUri`
- Necesita ajustar nombres o actualizar UI

## 📁 Archivos Clave

| Archivo | Responsabilidad | Estado |
|---------|-----------------|--------|
| `/api/calendly/availability` | Obtener disponibilidad | 🔴 Hardcoded |
| `/api/calendly/create-event` | Crear evento + guardar BD | 🟡 API incorrecto |
| `CalendlyScheduler.tsx` | UI formulario | ✅ Listo |
| `StageModal.tsx` | Cargar reunión guardada | ✅ Listo |

## 🔗 Referencias Externas

**Calendly API:**
- Docs: https://calendly.com/developers/api-docs
- Auth: OAuth 2.0 (token en `user_integrations`)
- Endpoints necesarios:
  - `GET /users/me` - obtener user ID
  - `GET /user.created_at/event_types` - listar eventos públicos
  - `GET /event_types/{id}/available_times` - disponibilidad real
  - Booking flow: mejor usar "public link" + `/invited_user_events`

## 🎯 Próximos Pasos

1. **Revisar Calendly API docs** para endpoint correcto de crear eventos
2. **Reemplazar disponibilidad hardcoded** con query real a Calendly
3. **Ajustar campo de respuesta** `calendlyUri` → `eventUri` o viceversa
4. **Validar token decryption** funciona con tokens en BD
5. **Test end-to-end:** agendar reunión → debe crear en Calendly + retornar URL

## 📝 Notas

- Usuario OAuth conectado en `/dashboard/settings`
- Token está en `user_integrations` table, encriptado
- Disponibilidad se carga con `?days=14` parameter (14 días por defecto)
- UI oculta formulario si `lead_meetings.status = 'agendada'` para la etapa actual
