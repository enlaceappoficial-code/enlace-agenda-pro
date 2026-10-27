# Documento Maestro: ¿Qué es Enlace Barbería Pro (EBP)?

Este documento describe a nivel funcional y de negocio qué es **Enlace Barbería Pro (EBP)**. Sirve como guía de referencia para entender el producto, sus alcances y cómo interactúan sus módulos, ideal para que cualquier Inteligencia Artificial o desarrollador entienda el contexto del negocio rápidamente.

---

## 1. Resumen Ejecutivo

**Enlace Barbería Pro** es una aplicación web *mobile-first* diseñada específicamente para barberías y peluquerías en Chile. Su objetivo es digitalizar la gestión del negocio (citas, finanzas, clientes) y formalizar la operación de microemprendedores que tradicionalmente usan papel o WhatsApp manual.

Forma parte del **Ecosistema Enlace**, lo que significa que está conectada a una Red Social madre que le provee visibilidad y clientes a cambio de que el barbero use la herramienta de gestión.

---

## 2. Módulos Principales (La Barra de Navegación)

La aplicación está estructurada en 5 secciones principales accesibles desde una barra inferior en móviles:

### 📊 A. Inicio (Dashboard)
El centro de control diario. Muestra:
*   **KPIs del día:** Ingresos estimados, citas agendadas, porcentaje de ocupación del tiempo.
*   **Próximas Citas:** Una lista rápida de los clientes que vienen a continuación.
*   **Banner de Onboarding:** Aparece solo a usuarios nuevos sugiriendo editar los servicios de ejemplo.

### 📅 B. Agenda
El corazón operativo de la app.
*   **Visualización:** Calendario interactivo por día, semana o mes.
*   **Agendamiento Manual:** El barbero puede ingresar citas directamente.
*   **Bloqueo de Horarios:** Permite marcar tiempos como "no disponibles" (almuerzo, trámites) para que los clientes no agenden ahí.

### 👥 C. Clientes (CRM)
Base de datos de fidelización.
*   **Ficha de Cliente:** Historial completo de visitas, servicios tomados y pagos.
*   **Fórmula de Color:** Campo específico para peluquerías donde se anota la mezcla exacta de tintura usada en el cliente.
*   **Contacto Directo:** Botón para abrir chat de WhatsApp con el cliente en un toque.

### 💰 D. Caja
Control financiero estricto pero simple.
*   **Cierre Diario:** Calcula ingresos por servicios y propinas.
*   **Gastos Fijos:** Configuración de costos mensuales (arriendo, luz, etc.) que se prorratean para saber la ganancia real.
*   **Extras de Caja:** Registro de ingresos o egresos no programados.

### ⋯ E. Más (Menú Expandido)
Da acceso a configuraciones avanzadas y herramientas de crecimiento:
*   **Servicios:** Gestión de catálogo, precios, duraciones y costos de materiales/equipos para calcular el margen bruto.
*   **Profesionales:** Gestión del equipo de barberos (cada uno con su agenda).
*   **Galería de Trabajos:** Fotos de cortes realizados, visibles también en la red social.
*   **Planes y Suscripción:** Control del plan (Starter, Pro, Premium).

---

## 3. Características Diferenciadoras y Versión PRO

EBP no es solo una agenda; tiene funciones avanzadas que la hacen premium:

*   **🔗 Link de Reservas Público:** El barbero obtiene un link único (ej: `barberia.redenlace.cl/su-slug`) que pone en su Instagram. Los clientes agendan solos viendo la disponibilidad real 24/7.
*   **💳 Ecosistema de Pagos Digitales:**
    *   **Cobro de Seña:** Exige un abono previo para confirmar la cita (evita que el cliente falte).
    *   **Pago Anticipado:** Sugiere pagar el 100% antes de ir.
    *   **Pago Rápido:** Muestra los datos bancarios en el agendamiento para que el cliente los guarde y transfiera rápido al salir.
*   **🌐 Conexión Enlace (Red Social):**
    *   **Toggle de Disponibilidad:** Al encenderlo, el local aparece "Disponible Ahora" en el mapa de la app madre Enlace.
    *   **Publicación Cruzada:** Al subir un trabajo a la galería de EBP, se puede enviar directamente al muro de la red social para atraer clientes.

---

## 4. Filosofía de Diseño

*   **Mobile-First:** Pensada para usarse con una mano en un teléfono inteligente mientras el barbero trabaja.
*   **Aesthetics Premium:** No parece un software aburrido de contabilidad. Usa un modo oscuro elegante (azul marino oscuro `#1a2a4a`), gradientes y bordes redondeados que dan sensación de modernidad y estatus.

---
*Este documento describe la versión 2.1.0 de Enlace Barbería Pro.*
