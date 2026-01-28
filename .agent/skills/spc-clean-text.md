---
name: SPC Clean Text Protocol
description: Enforce text sanitization across the entire system.
---

# SPC CLEAN TEXT PROTOCOL (v3.3)

## The Gold Rule
"Todo texto guardado en la DB debe ser sanitizado: ELIMINAR acentos (á->a), diéresis (ü->u) y caracteres especiales, PERO CONSERVAR la 'ñ' y 'Ñ'."

## Implementation
All strings that might be saved to the database (especially User Inputs) MUST pass through `sanitizeText(text)` before being sent to an RPC or Insert action.

### Helper Function
Located in `lib/utils.ts`.

```typescript
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return ""
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, (match, offset, str) => {
      // Preservar la virgulilla de la ñ
      return str.charAt(offset - 1).toLowerCase() === 'n' ? match : "";
    })
    .normalize("NFC")
    .replace(/[^a-zA-Z0-9ñÑ\s.,-]/g, "")
    .trim()
}
```

## Strategy
1. **Client-Side Visuals**: User can type "Ramón", but we can optionally clean it on blur or submit.
2. **Server-Side Security**: The Server Action MUST call `sanitizeText` on inputs before saving. This is the final gatekeeper.
