---
description: SPC Architect Protocol v4.5 - Guidelines for embedding web components in AI Chat
---

# SPC Architect Protocol v4.5: Component Embedding

## Core Philosophy
The user should never be redirected away from the chat interface to complete a task if a suitable UI component already exists in the application. Instead, using the "Embed (Incrustación)" pattern, we bring the UI to the user's conversation stream.

## Implementation Guidelines

### 1. Component Adaptation (`isChatVariant`)
Existing page components (like Wizards, Forms, Dashboards) must be adapted to live inside a chat bubble (constrained width, usually ~400-600px).
- Add a prop `isChatVariant?: boolean` to the component.
- When `true`:
  - **Remove Headers:** Hide page titles, breadcrumbs, or large hero sections.
  - **Reduce Padding:** Remove outer page margins; use tight padding suited for a card.
  - **Simplify Styles:** Remove heavy shadows that clash with the chat bubble aesthetics.
  - **Adjust Controls:** Use smaller button sizes (`size="sm"`) and compact input layouts.

### 2. Wrapper Pattern
Create a specific wrapper component for the chat tool (e.g., `BuildingToolWrapper`) that:
- Imports the adapted core component.
- Passes `isChatVariant={true}`.
- Handles the `onSuccess` event to trigger a visual confirmation state (e.g., replacing the form with a success card) without reloading the chat.

### 3. State Management
- The component should manage its own submission logic (Server Actions / API).
- On success, it should notify the parent chat widget (via callback) to perhaps insert a "System Message" or update the tool's visual state to "Completed".

## Example Pattern

```tsx
// Core Component
export function MyForm({ isChatVariant = false }: Props) {
  return (
    <Card className={isChatVariant ? "border-none shadow-none p-0" : "p-6"}>
       {!isChatVariant && <Header />}
       <Form ... />
    </Card>
  )
}

// Chat Tool Wrapper
export function MyFormTool({ data }) {
   return <MyForm isChatVariant={true} initialData={data} />
}
```
