# ARCHITECTURE_SPC.md

> **Status**: ACTIVE
> **Version**: 2.1 (JAN 2026)
> **Role**: Principal Architect Configuration

## 1. Core Stack Profile
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS + Shadcn/ui (Radix Primitives)
- **State**: React Hooks + Server Actions
- **Database**: Supabase (PostgreSQL) + RLS + RPCs
- **AI Core**: Vercel AI SDK (OpenAI/Groq Hybrid)
- **Media**: Cloudinary (Optimized Delivery)

## 2. Design System (`spc-design-system`)
- **Theme**: Semantic Colors (`--primary`, `--background`, `--card`, etc.) via `globals.css` & `tailwind.config.ts`.
- **Dark Mode**: Native support via `class` strategy.
- **Component Source**: `@/components/ui` (Do NOT reinvent the wheel).
- **Motion**: `tailwindcss-animate` + `framer-motion` for smooth transitions.
- **Typography**: Responsive, mobile-first text scaling.

## 3. Security Model "Zero Leakage" (`spc-security-zero-leakage`)
- **Principle**: The frontend is untrusted. All sensitive data mutations MUST go through Supabase RPCs.
- **Enforcement**:
  - **RLS**: Row-Level Security policies on ALL tables.
  - **RPC Roles**: Critical functions (`estimar_costo_tarea`) check `auth.role()` or internal mappings inside PL/pgSQL.
  - **AI Isolation**: The AI Agent impersonates the user's role constraints. It cannot "see" what the user cannot "see".

## 4. AI & Tooling Patterns
- **Location**: `lib/ai/tools.ts` contains the tool definitions.
- **Memory**: Persistent `chat_history` table + `user_vocabulary` for learning.
- **Context**: `system_configuration_report_2026.md` serves as the ground truth for system awareness.

## 5. Development Protocol (`spc-dry-clean`)
1.  **Audit**: Check existing code before writing new code.
2.  **Modularize**: Shared logic goes to `lib/` or `hooks/`.
3.  **Strict Types**: No `any`. Use `Database` types from `types/supabase.ts` (or `supabase.ts`).

## 6. Directory Structure Map
```
src (or root)
├── app/                 # Next.js App Router
├── components/
│   ├── ui/              # Shadcn Components (Strict use)
│   └── ...              # Feature Components
├── lib/
│   ├── ai/              # Tools & AI Configuration
│   └── supabase/        # Client/Server Clients
├── types/               # TypeScript Definitions
├── supabase/
│   └── migrations/      # SQL Source of Truth

## 7. Enterprise DNA Evolution (v2.2)
- **Data Hierarchy**: Supervisor is the **Bridge**. They see their team's efficiency but **NEVER** the Admin's financial margins (ROI).
- **Unit Consistency**: All numbers use `.toLocaleString('es-AR')`. **NO** currency symbols ($) to maintain cleaner UI.
- **Cognitive Memory**: Every new process defined by the user MUST be stored via `learn_term`.
- **UI Wizardry**: Any component with **>3 input fields** MUST be converted to a **Step-by-Step Wizard**. Avoid cognitive overload.
