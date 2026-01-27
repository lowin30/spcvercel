# SKILL: SPC Security "Zero Leakage" (spc-security-zero-leakage)

> **Objective**: Ensure Supervisor role NEVER sees sensitive Admin financial data.

## 1. Data Mutation Rule (The Golden Rule)
- **Prohibited**: Direct `supabase.from('table').insert/update/delete` from the Client for complex logic.
- **Mandatory**: Use **RPCs** (Remote Procedure Calls) for all business logic mutations.
  - *Why?* To enforce role checks INSIDE the database transaction.

## 2. RLS Awareness
- **Querying**: You can use `supabase.from('..').select()` safely IF AND ONLY IF RLS policies exist on the table.
- **Verification**: If RLS is missing, STOP and create an RLS migration `supabase/migrations/YYYYMMDD_secure_table.sql`.

## 3. Role-Based Logic
- **Admin**: Has `role = 'admin'`. Can see `presupuestos_finales` and `facturas`.
- **Supervisor**: Has `role = 'supervisor'`. Can see `tareas` and `presupuestos_base` (Estimations).
- **Worker**: Has `role = 'trabajador'`. Can see `partes_trabajo`.
- **Enforcement**:
  ```sql
  -- Inside RPC
  IF (auth.jwt() ->> 'role') <> 'admin' THEN
      RAISE EXCEPTION 'Access Denied: You are not an Admin.';
  END IF;
  ```

## 4. AI & Tools Isolation
- **Tool Definition**: When defining a tool in `lib/ai/tools.ts`, explicitly check the allowed role context.
- **RPC Mapping**: The tool should call an RPC that performs the second layer of verification.
