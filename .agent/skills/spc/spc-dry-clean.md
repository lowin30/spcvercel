# SKILL: SPC DRY & Clean (spc-dry-clean)

> **Objective**: Eliminate code duplication and maintain a pristine codebase.

## 1. The Pre-Code Audit
**Before writing ANY new component or tool:**
1.  **Search**: Use `grep` or `find` to check if it exists.
    - *Example*: "I need a date picker." -> Search "Calendar" or "Date". -> Found `calendar.tsx`. Use it.
2.  **Evaluate**: Does the existing component meet 80% of needs?
    - **Yes**: Extend it via props.
    - **No**: Refactor it to support the new case (don't copy-paste).

## 2. Shared Logic (Lib & Hooks)
- **Utils**: Math, string manipulation, formatting -> `lib/utils.ts`.
- **Supabase**: Data fetching patterns -> `lib/supabase/`.
- **AI Tools**: Tool definitions -> `lib/ai/tools.ts`.

## 3. TypeScript Strictness
- **No `any`**: Use `unknown` if you must, but prefer generic types `<T>`.
- **Database Types**: Import from `types/supabase.ts` (aka `database.types.ts`).
  ```ts
  import { Database } from '@/types/supabase'
  type Task = Database['public']['Tables']['tareas']['Row']
  ```

## 4. File Naming
- **Components**: `kebab-case.tsx` (e.g., `task-card.tsx`).
- **Hooks**: `use-feature.ts` (e.g., `use-task-acitons.ts`).
- **Server Actions**: `actions.ts` or `feature-actions.ts`.
