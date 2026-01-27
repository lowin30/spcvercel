# SKILL: SPC Hierarchy Protocol (spc-hierarchy-protocol)

> **Objective**: Enforce the STRICT data visibility hierarchy.

## 1. The Supervisor Bridge Rule
- **Role**: Supervisor is the connection between Admin Strategy and Worker Execution.
- **Visibility**:
  - ✅ Can see: Team performance, Task Completion rates, Estimations (`presupuestos_base`).
  - ❌ CANNOT see: `presupuestos_finales`, `facturas`, or ROI calculations.
- **Implementation**:
  - Always check `auth.role()` in RPCs.
  - In Frontend: `if (role === 'supervisor') return <SupervisorView />` (Hide Admin Components).

## 2. ROI Isolation (The Firewall)
- **Concept**: Profit margins are "Eyes Only" for Admins.
- **Enforcement**:
  - API Routes returning financial data MUST filter out `ganancia_neta`, `roi`, `margen` if user is not admin.
  - UI Components: `<ProfitMarginCard />` must be gated.

## 3. Worker Focus
- **Role**: Execution only.
- **Visibility**: Only their own active tasks and payment history (`liquidaciones`).
- **Blocked**: Everything else.
