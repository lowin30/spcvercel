# SKILL: SPC Design System (spc-design-system)

> **Objective**: Maintain absolute visual consistency in the SPC interface.

## 1. Component Rules
- **Strict Adherence**: ONLY use components from `@/components/ui` (Shadcn/ui).
- **Prohibited**: Do not create generic HTML elements (`div`, `button`) if a Shadcn component exists (`Card`, `Button`).
- **Imports**: `import { Button } from "@/components/ui/button"`

## 2. Animation Protocols
- **Engine**: Framer Motion only.
- **Micro-interactions**: Use `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}` for interactive elements.
- **Entrances**: Use staggering for lists.
  ```tsx
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} />
  ```

## 3. Visual Vibe (The "Premium" Feel)
- **Glassmorphism**: Use `bg-white/80 dark:bg-black/50 backdrop-blur-md` for overlays/sticky headers.
- **Borders**: Subtle. `border-gray-200 dark:border-gray-800`.
- **Text**: `text-gray-900 dark:text-gray-100` for primary. `text-muted-foreground` for secondary.
- **Dark Mode**: ALL new UI must be verified in Dark Mode. Use `dark:` variants explicitly if needed, but rely on semantic variables (`bg-background`).

## 4. Responsive Handlers
- **Touch Targets**: Min 44px for buttons on mobile.

## 5. Unit Consistency (Enterprise DNA)
- **Numbers**: Use `.toLocaleString('es-AR')` for all display values.
- **Currency Symbols**: **PROHIBITED**. No `$`.
  - *Correct*: `15.400`
  - *Incorrect*: `$ 15.400`
- **Rationale**: Minimalist, clean UI. The user knows the currency context.
