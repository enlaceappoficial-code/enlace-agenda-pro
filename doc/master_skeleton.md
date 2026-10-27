# Documento Maestro: Esqueleto Universal para Apps Enlace

Este documento define el **esqueleto base (boilerplate)** extraído de *Enlace Barbería Pro (EBP)*. Sirve como estándar de oro para crear cualquiera de las 15 aplicaciones verticales del ecosistema Enlace. Al clonar o replicar este esqueleto, solo se deben modificar los módulos específicos de cada rubro.

---

## 1. Stack Tecnológico Estándar

Todas las apps del ecosistema deben usar estrictamente este stack para facilitar el mantenimiento:

*   **Monorepo:** npm workspaces (Carpeta `apps/api` y `apps/web`).
*   **Backend:** Node.js + Express.
*   **Base de Datos:** SQLite (local por negocio) gestionado con **Prisma ORM**.
*   **Frontend:** React (Vite) + Vanilla CSS (Aesthetics Premium).
*   **Estilo Visual:** Dark mode por defecto, paleta marina/oscura (`#1a2a4a`), micro-animaciones.

---

## 2. El Esqueleto del Backend (`apps/api`)

### 2.1 Base de Datos Mínima Obligatoria (`schema.prisma`)
Toda app nueva debe incluir al menos estos modelos para funcionar en el ecosistema:

```prisma
model Shop {
  id                 String        @id @default(cuid())
  appId              AppId         // Identificador de la app (ej: PELUQUERIA)
  slug               String        @unique
  name               String
  enlaceProfileId    String?       // ID en la Red Social Madre
  enlaceTokenApp     String?       // Token de comunicación
  enlaceDisponible   Boolean       @default(false)
  enlaceMsg          String        @default("Disponible ahora")
  
  admins             AdminUser[]
  outbox             EnlaceOutbox[]
}

model AdminUser {
  id           String   @id @default(cuid())
  shopId       String
  email        String   @unique
  passwordHash String
  shop         Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
}

model EnlaceOutbox {
  id            String   @id @default(cuid())
  shopId        String
  endpoint      String   // 'publicar-foto', 'sync-catalogo', etc.
  method        String   @default("POST")
  body          Json
  status        String   @default("PENDING") // PENDING, SENT, FAILED
  attempts      Int      @default(0)
  nextAttemptAt DateTime @default(now())
  
  shop          Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
}
```

### 2.2 Rutas y Controladores Base
El archivo `index.js` debe mantener:
1.  **Auth System:** `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`.
2.  **Middlewares:** `requireAuth` (verifica sesión), `asyncHandler` (captura errores).
3.  **Conexión Enlace:**
    *   `POST /api/enlace/link`: Vincula con el código de 6 dígitos.
    *   `POST /api/enlace/unlink`: Desvincula.
    *   `POST /api/enlace/toggle`: Cambia visibilidad en el mapa.
4.  **Procesador Outbox:** El `setInterval` que corre cada 30 segundos procesando `EnlaceOutbox` para asegurar que los datos lleguen a la red social aunque falle la conexión temporalmente.

---

## 3. El Esqueleto del Frontend (`apps/web`)

### 3.1 Estructura de Navegación y Layout
El archivo `AdminShell.jsx` es el contenedor principal y debe mantener:
*   **Bottom Nav (Mobile-First):** 5 pestañas máximo (Inicio, Agenda/Módulo Principal, Clientes, Caja, Más).
*   **Header Premium:** Título en gradiente, botón de modo oscuro y el botón de ayuda `❓` para el tutorial.
*   **Tutorial Interactivo:** El modal paso a paso que se abre la primera vez.

### 3.2 Cliente API (`api.js`)
El archivo que centraliza las peticiones debe incluir:
*   `apiGet(url)`
*   `apiPost(url, body)`
*   `apiPatch(url, body)`
*   `apiDelete(url, body)` (con soporte para body JSON).

### 3.3 Páginas Comunes que No Cambian
*   **Login / Register:** Mismo diseño minimalista y oscuro.
*   **Página Enlace (`Enlace.jsx`):** El centro de mando para vincularse a la red social, publicar fotos y encender el toggle de disponibilidad.
*   **Configuración (`Configuracion.jsx`):** Datos del negocio, datos bancarios y la "Zona Peligrosa" para eliminar cuenta.

---

## 4. Lo que se Modifica por Aplicación

Cuando crees una nueva app (ej: *Enlace Gimnasio*), debes buscar y modificar solo estos puntos:

1.  **`APP_SLUG` en `.env`:** Cambiar `peluqueria` por el slug correspondiente (ej: `gimnasio`).
2.  **Módulo Principal:** Reemplazar la "Agenda" por el módulo core del rubro:
    *   *Gimnasio:* Control de acceso y membresías.
    *   *Constructor:* Presupuestos APU.
    *   *Restorán:* Gestión de mesas y comandas.
3.  **Formularios Específicos:**
    *   En Clientes: La peluquería guarda "Fórmula de color", el gimnasio guardará "Ficha médica/Física", el mecánico guardará "Datos del vehículo".
4.  **Página Pública de Reservas (Booking):** Adaptar el flujo de reserva (actualmente en 4 pasos para peluquería) al tipo de servicio (ej: agendar una clase, reservar una mesa, etc.).

---

## 5. Checklist para Iniciar una App Nueva

1.  [ ] Duplicar la estructura de carpetas de EBP.
2.  [ ] Cambiar nombres en `package.json` de la raíz y de las apps.
3.  [ ] Actualizar `schema.prisma` con las tablas específicas del nuevo rubro.
4.  [ ] Configurar variables de entorno (`SUPABASE_URL`, `ANON_KEY`, `APP_SLUG`).
5.  [ ] Rediseñar el módulo central en el frontend manteniendo el `AdminShell`.

---
*Este documento es de propiedad de Bajo Deslinde SPA y rige para todo el desarrollo del Ecosistema Enlace.*
