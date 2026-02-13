# spc protocol v2.1: constitucion de arquitectura permanente

**estado**: ley suprema
**autoridad**: jesus sanchez
**fecha**: 2026-02-12

## 🧠 regla de oro (fase 0)
antes de intervenir cualquier pagina de las 30 restantes, es **obligatorio** realizar una **AUDITORIA FORENSE (fase 0)** que documente en `docs/audit-[pagina].md`:

1.  **investigacion de db**:
    - lista todas las tablas involucradas.
    - extrae las politicas rls vigentes de esas tablas.
    - identifica rpcs y vistas sql (busca rpcs fantasmas o vistas opacas).
2.  **analisis de interfaz e interaccion**:
    - disecciona como funcionan los dialogos interactivos y modales.
    - verifica si hay formularios wizard y como gestionan la persistencia.
3.  **identidad y seguridad**:
    - busca rastros de `supabase.auth` en el cliente.
    - mapea como se filtran los datos actualmente.
4.  **comunicacion actual**:
    - documenta como habla la pagina actualmente con la db (client fetching vs server actions ilegales).

## 🚀 protocolo de ejecucion (fase 1)
solo tras la aprobacion explicita de la auditoria fase 0, se permite:

1.  **identity bridge**:
    - usar `lib/auth-bridge.ts` (`validateSessionAndGetUser`).
    - prohibido usar `supabase.auth.getUser()` o `getSession()` en server actions.
2.  **server layers**:
    - crear `loader.ts` para fetching (service role + filtros manuales).
    - crear `actions.ts` con validacion de rol estricta.
3.  **preservacion visual**:
    - prohibido modificar clases tailwind o estructura jsx salvo para separar componentes cliente/servidor.

## 📋 estado de la nacion (dashboard)
este documento rige la refactorizacion de todas las rutas listadas en el inventario.
