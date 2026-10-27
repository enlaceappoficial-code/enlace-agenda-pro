# API (Peluquería)

## Variables de entorno (opcional)

### Enlace API (conector general)

- `ENLACE_API_BASE` (default: `https://api.enlace.cl/api/v1`)
- `ENLACE_ENDPOINT_AGENDA_RESERVA` (override para el endpoint de agenda-reserva)
- `ENLACE_ENDPOINT_AGENDA_CANCELAR` (override para el endpoint de agenda-cancelar)
- `ENLACE_ENDPOINT_AGENDA_STATUS` (override para el endpoint de agenda-status)

### Enlace Agenda (modo Supabase directo)

Si Enlace Agenda está montada sobre Supabase (tabla `appointments`), se puede activar la sincronización directa
configurando:

- `ENLACE_AGENDA_SUPABASE_URL`
- `ENLACE_AGENDA_SUPABASE_ANON_KEY`

Esto permite que los eventos `agenda-reserva`, `agenda-status` y `agenda-cancelar` se escriban vía REST en
`/rest/v1/appointments` sin depender de endpoints propios.

