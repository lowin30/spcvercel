# SKILL: SPC UI Wizardry (spc-ui-wizardry)

> **Objective**: Prevent cognitive overload via "The Rule of 3".

## 1. The "Rule of 3" Trigger
- **Condition**: If a form or interaction requires **more than 3 input fields** (text, select, file, etc.).
- **Action**: MANDATORY conversion to **Step-by-Step Wizard**.

## 2. Wizard Architecture
- **State**: Use a local state `step` (1, 2, 3...) or a specific Wizard Context if complex.
- **Navigation**:
  - "Siguiente" -> Validates current step.
  - "Atrás" -> Preserves data.
- **Progress**: Show a visual indicator (e.g., `<Progress value={33} />` or "Paso 1 de 3").

## 3. Input Grouping Strategy
- **Step 1**: Context (What/Where/Who).
- **Step 2**: Data (Amounts, Descriptions).
- **Step 3**: Evidence (Photos, Files) & Confirmation.

## 4. Chat Integration
- Wizards should ideally live inside the Chat Interface (like `TaskFormChatWrapper`) or as Overlays, avoiding full page redirects.
